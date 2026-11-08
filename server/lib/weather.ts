import { cached, fetchJson, SourceError, type Cached } from "./http.ts"
import { targetWeekend, type LocalNow } from "./weekend.ts"

export type IconKey = "sun" | "partly" | "cloud" | "fog" | "rain" | "snow" | "storm"

export function describeWmo(code: number | null): { label: string; icon: IconKey } {
  if (code === null || Number.isNaN(code)) return { label: "Conditions unavailable", icon: "cloud" }
  if (code === 0) return { label: "Clear sky", icon: "sun" }
  if (code === 1) return { label: "Mainly clear", icon: "sun" }
  if (code === 2) return { label: "Partly cloudy", icon: "partly" }
  if (code === 3) return { label: "Overcast", icon: "cloud" }
  if (code === 45 || code === 48) return { label: "Fog", icon: "fog" }
  if (code >= 51 && code <= 55) return { label: "Drizzle", icon: "rain" }
  if (code === 56 || code === 57) return { label: "Freezing drizzle", icon: "rain" }
  if (code === 61) return { label: "Light rain", icon: "rain" }
  if (code === 63) return { label: "Rain", icon: "rain" }
  if (code === 65) return { label: "Heavy rain", icon: "rain" }
  if (code === 66 || code === 67) return { label: "Freezing rain", icon: "rain" }
  if (code === 71) return { label: "Light snow", icon: "snow" }
  if (code === 73) return { label: "Snow", icon: "snow" }
  if (code === 75) return { label: "Heavy snow", icon: "snow" }
  if (code === 77) return { label: "Snow grains", icon: "snow" }
  if (code >= 80 && code <= 82) return { label: code === 82 ? "Violent rain showers" : "Rain showers", icon: "rain" }
  if (code === 85 || code === 86) return { label: "Snow showers", icon: "snow" }
  if (code === 95) return { label: "Thunderstorm", icon: "storm" }
  if (code === 96 || code === 99) return { label: "Thunderstorm with hail", icon: "storm" }
  return { label: "Unknown conditions", icon: "cloud" }
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

export interface WeekendWeather {
  timezone: string
  localDate: string
  localTime: string
  saturday: string
  sunday: string
  units: { temperature: string; precipitation: string; probability: string }
  days: WeatherDay[]
  wet: boolean
  source: { name: string; url: string }
}

interface ForecastResponse {
  daily_units?: Record<string, string>
  daily?: Record<string, Array<number | null> | string[]>
}

const TTL_MS = 30 * 60_000

export function isWet(days: WeatherDay[]): boolean {
  return days.some((d) => (d.precipProbMax ?? 0) >= 50 || (d.precipSum ?? 0) >= 2)
}

/**
 * The cache key includes the target Saturday so a cached forecast is never
 * reused once the target weekend rolls over.
 */
export async function getWeekendWeather(lat: number, lon: number, tz: string): Promise<{ weather: WeekendWeather; local: LocalNow; retrievedAt: string }> {
  const wk = targetWeekend(tz)
  const key = `weather:${lat.toFixed(3)},${lon.toFixed(3)}:${tz}:${wk.saturday}`
  const result: Cached<Omit<WeekendWeather, "localDate" | "localTime">> = await cached(key, TTL_MS, async () => {
    const url = new URL("https://api.open-meteo.com/v1/forecast")
    url.searchParams.set("latitude", String(lat))
    url.searchParams.set("longitude", String(lon))
    url.searchParams.set("timezone", tz)
    url.searchParams.set("start_date", wk.saturday)
    url.searchParams.set("end_date", wk.sunday)
    url.searchParams.set(
      "daily",
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max",
    )
    const json = (await fetchJson("weather", url.toString(), 15_000)) as ForecastResponse
    const daily = json.daily
    const times = (daily?.time as string[] | undefined) ?? []
    if (!daily || times.length === 0) {
      throw new SourceError("weather", "No forecast was returned for this weekend.")
    }
    const num = (field: string, i: number): number | null => {
      const v = (daily[field] as Array<number | null> | undefined)?.[i]
      return typeof v === "number" ? v : null
    }
    const days: WeatherDay[] = times.map((date, i) => {
      const code = num("weather_code", i)
      const { label, icon } = describeWmo(code)
      return {
        date,
        weekday: date === wk.saturday ? "Saturday" : "Sunday",
        code,
        label,
        icon,
        tempMax: num("temperature_2m_max", i),
        tempMin: num("temperature_2m_min", i),
        precipSum: num("precipitation_sum", i),
        precipProbMax: num("precipitation_probability_max", i),
      }
    })
    const u = json.daily_units ?? {}
    return {
      timezone: tz,
      saturday: wk.saturday,
      sunday: wk.sunday,
      units: {
        temperature: u.temperature_2m_max ?? "°C",
        precipitation: u.precipitation_sum ?? "mm",
        probability: u.precipitation_probability_max ?? "%",
      },
      days,
      wet: isWet(days),
      source: { name: "Open-Meteo", url: "https://open-meteo.com/" },
    }
  })
  return {
    weather: { ...result.data, localDate: wk.local.date, localTime: wk.local.time },
    local: wk.local,
    retrievedAt: result.retrievedAt,
  }
}
