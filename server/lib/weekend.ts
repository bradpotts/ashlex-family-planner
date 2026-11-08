const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_MS = 86_400_000

export function isValidTimeZone(tz: string): boolean {
  if (!tz || tz.length > 64) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export interface LocalNow {
  /** YYYY-MM-DD in the city's timezone */
  date: string
  /** HH:mm (24h) in the city's timezone */
  time: string
  /** 0 = Sunday … 6 = Saturday */
  weekday: number
}

export function localNow(tz: string, now: Date = new Date()): LocalNow {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
    weekday: WEEKDAYS.indexOf(get('weekday'))
  }
}

/** Saturday → today; Sunday → the following Saturday (6 days); otherwise the upcoming Saturday. */
export function daysUntilSaturday(weekday: number): number {
  return (6 - weekday + 7) % 7
}

function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS)
    .toISOString()
    .slice(0, 10)
}

export interface TargetWeekend {
  local: LocalNow
  saturday: string
  sunday: string
}

export function targetWeekend(
  tz: string,
  now: Date = new Date()
): TargetWeekend {
  const local = localNow(tz, now)
  const saturday = addDays(local.date, daysUntilSaturday(local.weekday))
  return { local, saturday, sunday: addDays(saturday, 1) }
}
