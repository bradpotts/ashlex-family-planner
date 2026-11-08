export const USER_AGENT = "FamilyWeekendPlanner/1.0 (assessment demo)"

export type Source = "geocode" | "weather" | "overpass"

/** An upstream data source failed. `message` is safe to show to users. */
export class SourceError extends Error {
  source: Source
  status: number
  constructor(source: Source, message: string, status = 502) {
    super(message)
    this.source = source
    this.status = status
  }
}

export interface Cached<T> {
  data: T
  /** When the upstream data was actually fetched, not when it was served. */
  retrievedAt: string
}

interface Entry {
  expires: number
  value: Cached<unknown>
}

const MAX_ENTRIES = 500
const store = new Map<string, Entry>()

/**
 * Small in-memory TTL cache. It keeps the original retrievedAt so the UI
 * never presents cached data as freshly fetched. Concurrent misses for the
 * same key share one in-flight request.
 */
const inflight = new Map<string, Promise<Cached<unknown>>>()

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<Cached<T>> {
  const hit = store.get(key)
  if (hit && hit.expires > Date.now()) return hit.value as Cached<T>

  const pending = inflight.get(key)
  if (pending) return pending as Promise<Cached<T>>

  const p = (async () => {
    try {
      const data = await load()
      const value: Cached<T> = { data, retrievedAt: new Date().toISOString() }
      if (store.size >= MAX_ENTRIES) {
        const oldest = store.keys().next().value
        if (oldest !== undefined) store.delete(oldest)
      }
      store.set(key, { expires: Date.now() + ttlMs, value })
      return value
    } finally {
      inflight.delete(key)
    }
  })()
  inflight.set(key, p)
  return p
}

export function peekCache<T>(key: string): Cached<T> | undefined {
  const hit = store.get(key)
  return hit && hit.expires > Date.now() ? (hit.value as Cached<T>) : undefined
}

export async function fetchJson(
  source: Source,
  url: string,
  timeoutMs: number,
  init: RequestInit = {},
): Promise<unknown> {
  let res: Response
  try {
    res = await fetch(url, {
      ...init,
      headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")
    throw new SourceError(source, timedOut ? "The data source took too long to respond." : "The data source could not be reached.", 504)
  }
  if (!res.ok) {
    throw new SourceError(source, `The data source returned an error (HTTP ${res.status}).`, 502)
  }
  try {
    return await res.json()
  } catch {
    throw new SourceError(source, "The data source returned an unreadable response.", 502)
  }
}
