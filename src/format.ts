const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }

/** Every API value goes through this before reaching innerHTML; OSM tags are user-editable. */
export function esc(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c])
}

/** Only http(s) links are rendered. */
export function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null
  } catch {
    return null
  }
}

/** A calendar date (YYYY-MM-DD) formatted without shifting it through the viewer's timezone. */
export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }): string {
  const [y, m, d] = iso.split("-").map(Number)
  return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)))
}

export function formatRetrieved(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "unknown time"
  const time = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(d)
  const day = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(d)
  return `${day}, ${time} (your time)`
}

export function cityLabel(c: { name: string; admin1: string | null; country: string | null }): string {
  return [c.name, c.admin1, c.country].filter((p, i, arr) => p && (i === 0 || p !== arr[i - 1])).join(", ")
}

export function round(n: number | null, digits = 0): string {
  if (n === null || Number.isNaN(n)) return "–"
  const f = 10 ** digits
  return String(Math.round(n * f) / f)
}

export function flagEmoji(code: string | null): string {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return ""
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}
