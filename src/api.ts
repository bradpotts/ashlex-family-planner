export interface City {
  id: number
  name: string
  admin1: string | null
  country: string | null
  country_code: string | null
  lat: number
  lon: number
  timezone: string
  population: number | null
}

export interface Source {
  name: string
  url: string
}

export interface WeatherDay {
  date: string
  weekday: "Saturday" | "Sunday"
  code: number | null
  label: string
  icon: IconKey
  tempMax: number | null
  tempMin: number | null
  precipSum: number | null
  precipProbMax: number | null
}

export type IconKey = "sun" | "partly" | "cloud" | "fog" | "rain" | "snow" | "storm"

export interface WeekendResponse {
  timezone: string
  localDate: string
  localTime: string
  saturday: string
  sunday: string
  units: { temperature: string; precipitation: string; probability: string }
  days: WeatherDay[]
  wet: boolean
  source: Source
  retrievedAt: string
}

export interface ActivityCandidate {
  id: string
  name: string
  category: string
  categoryLabel: string
  indoor: boolean
  why: string
  weatherNote: string | null
  address: string | null
  website: string | null
  osmUrl: string
  distanceKm: number
  score: number
}

export interface ActivitiesResponse {
  candidates: ActivityCandidate[]
  weather: { known: boolean; wet: boolean; note: string | null }
  searchRadiusKm: { attractions: number; libraries: number; parks: number }
  source: Source
  disclaimer: string
  retrievedAt: string
}

export interface Restaurant {
  name: string
  address: string | null
  distanceKm: number
  cuisine: string
  website: string | null
  phone: string | null
  openingHours: string | null
  openingHoursNote: string | null
  familyFeatures: string[]
  explanation: string
  osmUrl: string
}

export interface RestaurantResponse {
  restaurant: Restaurant | null
  message: string | null
  source: Source
  retrievedAt: string
}

export class ApiError extends Error {
  source: string | null
  constructor(message: string, source: string | null) {
    super(message)
    this.source = source
  }
}

/** `?simulateFail=weather|geocode|overpass` on the page URL is forwarded so failure states can be demoed. */
const simulateFail = new URLSearchParams(location.search).get("simulateFail")

async function get<T>(path: string, params: Record<string, string | number>, signal?: AbortSignal): Promise<T> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))
  if (simulateFail) qs.set("simulateFail", simulateFail)
  let res: Response
  try {
    res = await fetch(`${path}?${qs}`, { signal, headers: { Accept: "application/json" } })
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err
    throw new ApiError("We couldn't reach the planner service. Check your connection and try again.", null)
  }
  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    // fall through to the generic error below
  }
  if (!res.ok) {
    const e = (body as { error?: { message?: string; source?: string } } | null)?.error
    throw new ApiError(e?.message ?? `Request failed (HTTP ${res.status}).`, e?.source ?? null)
  }
  return body as T
}

export const api = {
  geocode: (q: string, signal?: AbortSignal) =>
    get<{ results: City[]; retrievedAt: string }>("/api/geocode", { q }, signal),
  weekend: (c: City, signal?: AbortSignal) =>
    get<WeekendResponse>("/api/weekend", { lat: c.lat, lon: c.lon, tz: c.timezone }, signal),
  activities: (c: City, signal?: AbortSignal) =>
    get<ActivitiesResponse>("/api/activities", { lat: c.lat, lon: c.lon, tz: c.timezone }, signal),
  restaurant: (c: City, signal?: AbortSignal) =>
    get<RestaurantResponse>("/api/restaurant", { lat: c.lat, lon: c.lon }, signal),
}
