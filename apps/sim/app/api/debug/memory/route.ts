/**
 * Debug endpoint for memory profiling
 * Protected by INTERNAL_API_SECRET
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Track allocations over time
const memorySnapshots: Array<{ timestamp: string; heapUsed: number }> = []
const MAX_SNAPSHOTS = 100

/**
 * Validates the request has the correct INTERNAL_API_SECRET
 */
function validateAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: 'INTERNAL_API_SECRET not configured' },
      { status: 503 }
    )
  }

  const authHeader = req.headers.get('authorization')
  const providedSecret = authHeader?.replace('Bearer ', '')

  if (providedSecret !== secret) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  return null
}

/**
 * GET /api/debug/memory - Returns current memory stats and known caches
 */
export async function GET(req: NextRequest) {
  const authError = validateAuth(req)
  if (authError) return authError

  const memUsage = process.memoryUsage()

  // Check Redis and queue status
  let redisStatus: any = null
  try {
    const { getRedisClient } = await import('@/lib/core/config/redis')
    const redis = getRedisClient()
    redisStatus = {
      available: redis !== null,
      type: redis ? 'connected' : 'unavailable (using in-memory fallback)',
    }
  } catch (e) {
    redisStatus = { available: false, error: String(e) }
  }

  // Take a snapshot for tracking growth
  memorySnapshots.push({
    timestamp: new Date().toISOString(),
    heapUsed: memUsage.heapUsed,
  })
  if (memorySnapshots.length > MAX_SNAPSHOTS) {
    memorySnapshots.shift()
  }

  // Calculate growth rate if we have enough data
  let growthInfo = null
  if (memorySnapshots.length >= 2) {
    const first = memorySnapshots[0]
    const last = memorySnapshots[memorySnapshots.length - 1]
    const timeDiff = new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime()
    const memDiff = last.heapUsed - first.heapUsed
    const growthPerMinute = timeDiff > 0 ? (memDiff / timeDiff) * 60000 : 0

    growthInfo = {
      totalGrowth: `${Math.round(memDiff / 1024 / 1024)} MB`,
      overMinutes: Math.round(timeDiff / 60000),
      growthPerMinute: `${Math.round(growthPerMinute / 1024 / 1024)} MB/min`,
      snapshots: memorySnapshots.length,
    }
  }

  // Try to inspect known module-level caches
  const cacheInfo = await inspectKnownCaches()

  const stats = {
    timestamp: new Date().toISOString(),
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)} MB`,
      arrayBuffers: `${Math.round(memUsage.arrayBuffers / 1024 / 1024)} MB`,
    },
    raw: memUsage,
    growthTracking: growthInfo,
    redis: redisStatus,
    knownCaches: cacheInfo,
    uptime: `${Math.round(process.uptime())} seconds`,
    instructions: {
      heapSnapshot:
        'POST with {"action":"snapshot"} to create a .heapsnapshot file (open in Chrome DevTools)',
      inspector: 'Run: bun --inspect apps/sim/server.js then open chrome://inspect',
      continuousMonitoring: 'Call this endpoint repeatedly to track growth over time',
    },
  }

  return NextResponse.json(stats)
}

/**
 * Inspect known caches in the codebase
 */
async function inspectKnownCaches(): Promise<Record<string, any>> {
  const caches: Record<string, any> = {}

  try {
    // Check encoding cache (tiktoken)
    const estimators = await import('@/lib/tokenization/estimators').catch(() => null)
    if (estimators && typeof (estimators as any).encodingCache !== 'undefined') {
      // Can't directly access, but we can note it exists
      caches.encodingCache = 'exists (tiktoken encoders)'
    }
  } catch {
    // Module not available
  }

  // Check global objects that might hold data
  try {
    const globalKeys = Object.keys(globalThis).filter(
      (k) => !k.startsWith('_') && typeof (globalThis as any)[k] === 'object'
    )
    caches.globalObjectCount = globalKeys.length
  } catch {
    // Ignore
  }

  // Try to get Next.js cache info
  try {
    const nextCache = (globalThis as any).__NEXT_DATA__
    if (nextCache) {
      caches.nextDataSize = JSON.stringify(nextCache).length
    }
  } catch {
    // Ignore
  }

  return caches
}

/**
 * POST /api/debug/memory - Trigger heap snapshot, GC, or get detailed info
 * Body: { action: 'snapshot' | 'gc' | 'detailed' }
 */
export async function POST(req: NextRequest) {
  const authError = validateAuth(req)
  if (authError) return authError

  const body = await req.json().catch(() => ({}))
  const action = body.action || 'snapshot'

  if (action === 'gc') {
    if (typeof globalThis.gc === 'function') {
      const before = process.memoryUsage()
      globalThis.gc()
      const after = process.memoryUsage()
      return NextResponse.json({
        success: true,
        message: 'GC triggered',
        before: {
          heapUsed: `${Math.round(before.heapUsed / 1024 / 1024)} MB`,
          rss: `${Math.round(before.rss / 1024 / 1024)} MB`,
        },
        after: {
          heapUsed: `${Math.round(after.heapUsed / 1024 / 1024)} MB`,
          rss: `${Math.round(after.rss / 1024 / 1024)} MB`,
        },
        freed: {
          heap: `${Math.round((before.heapUsed - after.heapUsed) / 1024 / 1024)} MB`,
          rss: `${Math.round((before.rss - after.rss) / 1024 / 1024)} MB`,
        },
      })
    }
    return NextResponse.json({
      success: false,
      message: 'GC not exposed. Run with: node --expose-gc or bun --smol',
    })
  }

  if (action === 'snapshot') {
    try {
      const v8 = await import('v8')
      const { join } = await import('path')
      const filename = `heap-${Date.now()}.heapsnapshot`
      const filepath = join(process.cwd(), filename)

      const snapshotPath = v8.writeHeapSnapshot(filepath)

      return NextResponse.json({
        success: true,
        message: 'Heap snapshot created',
        file: snapshotPath || filepath,
        size: 'Check file size - large files indicate lots of retained objects',
        instructions: [
          '1. Open Chrome DevTools',
          '2. Go to Memory tab',
          '3. Click "Load" and select the .heapsnapshot file',
          '4. Look at "Retained Size" column to find what\'s holding memory',
          '5. Filter by "Detached" to find leaked DOM nodes',
        ],
      })
    } catch (error) {
      return NextResponse.json({
        success: false,
        message: `Failed to create snapshot: ${error}`,
        alternative: {
          bun: 'Run: bun --inspect your-script.js',
          connect: 'Then open chrome://inspect and click "inspect"',
          memory: 'Go to Memory tab and take a heap snapshot there',
        },
      })
    }
  }

  if (action === 'detailed') {
    // Get V8 heap statistics if available
    try {
      const v8 = await import('v8')
      const heapStats = v8.getHeapStatistics()
      const heapSpace = v8.getHeapSpaceStatistics()

      return NextResponse.json({
        success: true,
        heapStatistics: {
          totalHeapSize: `${Math.round(heapStats.total_heap_size / 1024 / 1024)} MB`,
          usedHeapSize: `${Math.round(heapStats.used_heap_size / 1024 / 1024)} MB`,
          heapSizeLimit: `${Math.round(heapStats.heap_size_limit / 1024 / 1024)} MB`,
          totalAvailable: `${Math.round(heapStats.total_available_size / 1024 / 1024)} MB`,
          mallocedMemory: `${Math.round(heapStats.malloced_memory / 1024 / 1024)} MB`,
          peakMallocedMemory: `${Math.round(heapStats.peak_malloced_memory / 1024 / 1024)} MB`,
          externalMemory: `${Math.round(heapStats.external_memory / 1024 / 1024)} MB`,
        },
        heapSpaces: heapSpace.map((space) => ({
          name: space.space_name,
          size: `${Math.round(space.space_size / 1024 / 1024)} MB`,
          used: `${Math.round(space.space_used_size / 1024 / 1024)} MB`,
          available: `${Math.round(space.space_available_size / 1024 / 1024)} MB`,
        })),
      })
    } catch (error) {
      return NextResponse.json({
        success: false,
        message: `V8 heap stats not available: ${error}`,
      })
    }
  }

  if (action === 'reset') {
    memorySnapshots.length = 0
    return NextResponse.json({
      success: true,
      message: 'Memory tracking reset',
    })
  }

  return NextResponse.json(
    { error: 'Unknown action. Use: snapshot, gc, detailed, reset' },
    { status: 400 }
  )
}
