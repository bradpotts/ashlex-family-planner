import express, { type NextFunction, type Request, type Response } from "express"
import { existsSync } from "node:fs"
import net from "node:net"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { getActivityElements, rankCandidates, weatherContext } from "./lib/activities.ts"
import { cached, fetchJson, SourceError, type Source } from "./lib/http.ts"
import { getRestaurant } from "./lib/restaurant.ts"
import { getWeekendWeather } from "./lib/weather.ts"
import { isValidTimeZone } from "./lib/weekend.ts"

// Node's 250ms default per-address connect attempt is too short for some
// multi-address hosts (overpass-api.de failed with ETIMEDOUT while curl worked).
net.setDefaultAutoSelectFamilyAttemptTimeout(2500)

const HOST = process.env.HOST ?? "127.0.0.1"
const PORT = Number(process.env.PORT ?? 3000)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const DIST = path.join(ROOT, "dist")

class BadRequest extends Error {}

const app = express()
app.disable("x-powered-by")
app.set("trust proxy", "loopback")

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff")
  res.setHeader("X-Frame-Options", "DENY")
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin")
  res.setHeader("Permissions-Policy", "geolocation=(), camera=(), microphone=()")
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  )
  next()
})

// ---- input helpers -------------------------------------------------------

function str(req: Request, name: string): string {
  const v = req.query[name]
  return typeof v === "string" ? v.trim() : ""
}

function num(req: Request, name: string, min: number, max: number): number {
  const raw = str(req, name)
  const n = Number(raw)
  if (raw === "" || !Number.isFinite(n) || n < min || n > max) {
    throw new BadRequest(`Parameter "${name}" must be a number between ${min} and ${max}.`)
  }
  return n
}

function tz(req: Request): string {
  const v = str(req, "tz")
  if (!isValidTimeZone(v)) throw new BadRequest('Parameter "tz" must be a valid IANA time zone.')
  return v
}

/** Demo hook: `?simulateFail=weather` makes that source fail so error states can be shown on demand. */
function simulate(req: Request, source: Source): void {
  if (str(req, "simulateFail") === source) {
    throw new SourceError(source, "Simulated outage (simulateFail demo parameter).", 503)
  }
}

type Handler = (req: Request, res: Response) => Promise<void>
const route = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next)

// ---- routes --------------------------------------------------------------

interface GeoResult {
  id: number
  name: string
  admin1?: string
  country?: string
  country_code?: string
  latitude: number
  longitude: number
  timezone?: string
  population?: number
}

app.get(
  "/api/geocode",
  route(async (req, res) => {
    const q = str(req, "q")
    if (q.length < 2 || q.length > 80) throw new BadRequest("Search text must be 2–80 characters.")
    simulate(req, "geocode")
    const result = await cached(`geocode:${q.toLowerCase()}`, 24 * 60 * 60_000, async () => {
      const url = new URL("https://geocoding-api.open-meteo.com/v1/search")
      url.searchParams.set("name", q)
      url.searchParams.set("count", "8")
      url.searchParams.set("language", "en")
      url.searchParams.set("format", "json")
      const json = (await fetchJson("geocode", url.toString(), 12_000)) as { results?: GeoResult[] }
      return (json.results ?? [])
        .filter((r) => r.timezone && isValidTimeZone(r.timezone))
        .map((r) => ({
          id: r.id,
          name: r.name,
          admin1: r.admin1 ?? null,
          country: r.country ?? null,
          country_code: r.country_code ?? null,
          lat: r.latitude,
          lon: r.longitude,
          timezone: r.timezone as string,
          population: r.population ?? null,
        }))
    })
    res.json({ results: result.data, source: { name: "Open-Meteo Geocoding", url: "https://open-meteo.com/en/docs/geocoding-api" }, retrievedAt: result.retrievedAt })
  }),
)

app.get(
  "/api/weekend",
  route(async (req, res) => {
    const lat = num(req, "lat", -90, 90)
    const lon = num(req, "lon", -180, 180)
    const zone = tz(req)
    simulate(req, "weather")
    const { weather, retrievedAt } = await getWeekendWeather(lat, lon, zone)
    res.json({ ...weather, retrievedAt })
  }),
)

app.get(
  "/api/activities",
  route(async (req, res) => {
    const lat = num(req, "lat", -90, 90)
    const lon = num(req, "lon", -180, 180)
    const zone = tz(req)

    // Weather only tunes the ranking; if it fails we still recommend, and say so.
    let weatherNote: string | null = null
    let weather = null
    try {
      simulate(req, "weather")
      weather = (await getWeekendWeather(lat, lon, zone)).weather
    } catch {
      weatherNote = "Weather data is unavailable, so activities are ranked without it."
    }

    simulate(req, "overpass")
    const { elements, retrievedAt, radiusScale } = await getActivityElements(lat, lon)
    const ctx = weatherContext(weather)
    const candidates = rankCandidates(elements, { lat, lon }, ctx, radiusScale).slice(0, 25)
    res.json({
      candidates,
      weather: { known: ctx.known, wet: ctx.wet, note: weatherNote },
      searchRadiusKm: { attractions: 15 * radiusScale, libraries: 8 * radiusScale, parks: 4 * radiusScale },
      source: { name: "OpenStreetMap contributors", url: "https://www.openstreetmap.org/copyright" },
      disclaimer: "Suitability is inferred from each place's OpenStreetMap category, not from reviews or visits.",
      retrievedAt,
    })
  }),
)

app.get(
  "/api/restaurant",
  route(async (req, res) => {
    const lat = num(req, "lat", -90, 90)
    const lon = num(req, "lon", -180, 180)
    simulate(req, "overpass")
    const { restaurant, searchedKm, retrievedAt } = await getRestaurant(lat, lon)
    res.json({
      restaurant,
      message: restaurant
        ? null
        : `We couldn't verify an Italian restaurant within ${searchedKm} km of the city centre on OpenStreetMap, so we're not suggesting one.`,
      source: { name: "OpenStreetMap contributors", url: "https://www.openstreetmap.org/copyright" },
      retrievedAt,
    })
  }),
)

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() })
})

app.use("/api", (_req, res) => {
  res.status(404).json({ error: { message: "Not found." } })
})

// ---- static SPA ----------------------------------------------------------

if (existsSync(DIST)) {
  app.use(
    express.static(DIST, {
      index: false,
      setHeaders(res, filePath) {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable")
        }
      },
    }),
  )
  app.get("/{*splat}", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache")
    res.sendFile(path.join(DIST, "index.html"))
  })
}

// ---- errors --------------------------------------------------------------

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const retrievedAt = new Date().toISOString()
  if (err instanceof BadRequest) {
    res.status(400).json({ error: { message: err.message }, retrievedAt })
    return
  }
  if (err instanceof SourceError) {
    console.warn(`[source:${err.source}] ${err.message}`)
    res.status(err.status === 504 ? 504 : err.status === 503 ? 503 : 502).json({ error: { source: err.source, message: err.message }, retrievedAt })
    return
  }
  console.error("[server] unexpected error", err)
  res.status(500).json({ error: { message: "Something went wrong on our side." }, retrievedAt })
})

app.listen(PORT, HOST, () => {
  console.info(`Family Weekend Planner listening on http://${HOST}:${PORT}`)
})
