import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  daysUntilSaturday,
  isValidTimeZone,
  localNow,
  targetWeekend
} from '../server/lib/weekend.ts'
import { isWet, type WeatherDay } from '../server/lib/weather.ts'

// 2026-11-11 is a Wednesday; 2026-11-14 a Saturday; 2026-11-15 a Sunday.
const at = (iso: string) => new Date(iso)

describe('daysUntilSaturday', () => {
  it('is 0 on Saturday, 6 on Sunday, and counts forward on weekdays', () => {
    assert.deepEqual(
      [0, 1, 2, 3, 4, 5, 6].map(daysUntilSaturday),
      [6, 5, 4, 3, 2, 1, 0]
    )
  })
})

describe('targetWeekend', () => {
  it('weekday → the upcoming Saturday and Sunday', () => {
    const w = targetWeekend('UTC', at('2026-11-11T12:00:00Z'))
    assert.equal(w.local.date, '2026-11-11')
    assert.equal(w.saturday, '2026-11-14')
    assert.equal(w.sunday, '2026-11-15')
  })

  it('Friday → tomorrow and the day after', () => {
    const w = targetWeekend('UTC', at('2026-11-13T23:59:00Z'))
    assert.equal(w.saturday, '2026-11-14')
    assert.equal(w.sunday, '2026-11-15')
  })

  it('Saturday → today and tomorrow', () => {
    const w = targetWeekend('UTC', at('2026-11-14T08:00:00Z'))
    assert.equal(w.saturday, '2026-11-14')
    assert.equal(w.sunday, '2026-11-15')
  })

  it('Sunday → the following Saturday and Sunday', () => {
    const w = targetWeekend('UTC', at('2026-11-15T10:00:00Z'))
    assert.equal(w.saturday, '2026-11-21')
    assert.equal(w.sunday, '2026-11-22')
  })

  it("uses the city's local date, not UTC (same instant, different weekend)", () => {
    // Sun 15 Nov 06:00 UTC is still Saturday evening in Los Angeles but Sunday in Tokyo.
    const instant = at('2026-11-15T06:00:00Z')
    const la = targetWeekend('America/Los_Angeles', instant)
    assert.equal(la.local.date, '2026-11-14')
    assert.equal(la.saturday, '2026-11-14')
    const tokyo = targetWeekend('Asia/Tokyo', instant)
    assert.equal(tokyo.local.date, '2026-11-15')
    assert.equal(tokyo.saturday, '2026-11-21')
  })

  it('crosses month and year boundaries', () => {
    const w = targetWeekend('UTC', at('2026-12-30T12:00:00Z')) // Wednesday
    assert.equal(w.saturday, '2027-01-02')
    assert.equal(w.sunday, '2027-01-03')
  })
})

describe('localNow / isValidTimeZone', () => {
  it('formats 24h local time', () => {
    assert.equal(
      localNow('Asia/Kolkata', at('2026-11-11T00:00:00Z')).time,
      '05:30'
    )
  })

  it('rejects invalid time zones', () => {
    assert.equal(isValidTimeZone('Europe/London'), true)
    assert.equal(isValidTimeZone('Not/AZone'), false)
    assert.equal(isValidTimeZone(''), false)
  })
})

describe('isWet', () => {
  const day = (p: number | null, s: number | null) =>
    ({ precipProbMax: p, precipSum: s }) as WeatherDay
  it('flags ≥50% probability or ≥2 mm on either day', () => {
    assert.equal(isWet([day(10, 0), day(20, 0.5)]), false)
    assert.equal(isWet([day(10, 0), day(50, 0)]), true)
    assert.equal(isWet([day(null, 2.4), day(null, null)]), true)
  })
})
