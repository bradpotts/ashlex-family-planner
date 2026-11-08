import { fetchJson, SourceError } from "./http.ts"

const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]

export interface OsmElement {
  type: "node" | "way" | "relation"
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

async function queryMirror(endpoint: string, query: string, timeoutMs: number): Promise<OsmElement[]> {
  const json = (await fetchJson("overpass", endpoint, timeoutMs, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ data: query }).toString(),
  })) as { elements?: OsmElement[]; remark?: string }
  if (!Array.isArray(json.elements)) throw new SourceError("overpass", "Unexpected response from OpenStreetMap.")
  // Overpass reports server-side timeouts as a 200 with a remark and partial data.
  if (json.remark && /runtime error|timed out/i.test(json.remark) && json.elements.length === 0) {
    throw new SourceError("overpass", "OpenStreetMap query timed out.")
  }
  return json.elements
}

const HEDGE_DELAY_MS = 4_000

/**
 * Hedged requests across public mirrors: the primary starts immediately and
 * each backup starts a few seconds later (or at once if the previous one fails
 * fast). The first success wins. Public Overpass latency swings from 1s to
 * 25s+, so a strict sequential fallback would usually exceed the timeout.
 */
export function overpass(query: string, timeoutMs = 30_000): Promise<OsmElement[]> {
  return new Promise((resolve, reject) => {
    let settled = false
    let started = 0
    let failed = 0
    let lastError: unknown
    const timers: ReturnType<typeof setTimeout>[] = []

    const startNext = () => {
      if (settled || started >= MIRRORS.length) return
      const endpoint = MIRRORS[started++]
      queryMirror(endpoint, query, timeoutMs).then(
        (elements) => {
          if (settled) return
          settled = true
          timers.forEach(clearTimeout)
          resolve(elements)
        },
        (err) => {
          lastError = err
          failed++
          if (settled) return
          if (failed === MIRRORS.length) {
            settled = true
            timers.forEach(clearTimeout)
            reject(lastError instanceof SourceError ? lastError : new SourceError("overpass", "OpenStreetMap data could not be reached."))
          } else {
            startNext()
          }
        },
      )
      timers.push(setTimeout(startNext, HEDGE_DELAY_MS))
    }
    startNext()
  })
}

export function coords(el: OsmElement): { lat: number; lon: number } | null {
  if (typeof el.lat === "number" && typeof el.lon === "number") return { lat: el.lat, lon: el.lon }
  if (el.center) return el.center
  return null
}

export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/**
 * Overpass bbox filter "(s,w,n,e)" enclosing a radius. Bbox filters are far
 * cheaper than `around:` on the public servers; exact distance is checked in Node.
 */
export function bbox(lat: number, lon: number, radiusM: number): string {
  const dLat = radiusM / 111_320
  const dLon = radiusM / (111_320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01))
  const f = (n: number) => n.toFixed(5)
  return `(${f(Math.max(lat - dLat, -90))},${f(Math.max(lon - dLon, -180))},${f(Math.min(lat + dLat, 90))},${f(Math.min(lon + dLon, 180))})`
}

export function osmUrl(el: OsmElement): string {
  return `https://www.openstreetmap.org/${el.type}/${el.id}`
}

export function formatAddress(tags: Record<string, string>): string | null {
  if (tags["addr:full"]) return tags["addr:full"]
  const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ")
  const locality = [tags["addr:postcode"], tags["addr:city"]].filter(Boolean).join(" ")
  const out = [street, locality].filter(Boolean).join(", ")
  return out || null
}

/** Only pass through http(s) links; OSM tags are user-editable. */
export function safeWebsite(tags: Record<string, string>): string | null {
  const raw = tags.website ?? tags["contact:website"] ?? tags.url
  if (!raw) return null
  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`)
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null
  } catch {
    return null
  }
}
