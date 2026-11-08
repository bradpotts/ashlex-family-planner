import {
  coords,
  distanceKm,
  formatAddress,
  getPlaces,
  osmUrl,
  safeWebsite,
  type OsmElement
} from './overpass.ts'
import type { WeekendWeather } from './weather.ts'

interface Category {
  key: string
  label: string
  base: number
  indoor: boolean
  why: string
}

const CATEGORIES: Record<string, Category> = {
  zoo: {
    key: 'zoo',
    label: 'Zoo',
    base: 10,
    indoor: false,
    why: 'Seeing animals up close is a reliable hit with 4–8 year olds, and the day can be paced around short attention spans.'
  },
  aquarium: {
    key: 'aquarium',
    label: 'Aquarium',
    base: 10,
    indoor: true,
    why: 'Tanks at child eye level, calm lighting, and compact routes suit young children; it works in any weather.'
  },
  children_museum: {
    key: 'children_museum',
    label: "Children's museum",
    base: 10,
    indoor: true,
    why: "Children's museums are designed around hands-on play for exactly this age group."
  },
  science_museum: {
    key: 'science_museum',
    label: 'Science museum',
    base: 9,
    indoor: true,
    why: 'Science museums typically have interactive exhibits that let curious 4–8 year olds touch and experiment.'
  },
  planetarium: {
    key: 'planetarium',
    label: 'Planetarium',
    base: 8,
    indoor: true,
    why: 'Dome shows about stars and planets capture young imaginations; check show length and age guidance.'
  },
  natural_history_museum: {
    key: 'natural_history_museum',
    label: 'Natural history museum',
    base: 8,
    indoor: true,
    why: 'Dinosaurs, fossils, and animal displays are big favourites with early-primary-age children.'
  },
  nature_centre: {
    key: 'nature_centre',
    label: 'Nature museum',
    base: 7,
    indoor: true,
    why: 'Nature exhibits introduce local wildlife at a gentle pace that suits younger children.'
  },
  indoor_play: {
    key: 'indoor_play',
    label: 'Indoor play centre',
    base: 9,
    indoor: true,
    why: 'Built for burning off energy whatever the weather; most cater specifically to under-10s.'
  },
  theme_park: {
    key: 'theme_park',
    label: 'Theme park',
    base: 7,
    indoor: false,
    why: 'A full day out with rides; check height limits, as some rides suit older children only.'
  },
  water_park: {
    key: 'water_park',
    label: 'Water park',
    base: 7,
    indoor: false,
    why: 'Splash areas and shallow pools are a hit with this age group; supervise closely around water.'
  },
  library: {
    key: 'library',
    label: 'Library',
    base: 5,
    indoor: true,
    why: "Free and calm, usually with a children's section; check the library's own site for story times or events."
  },
  playground: {
    key: 'playground',
    label: 'Playground',
    base: 6,
    indoor: false,
    why: 'Free, flexible, and made for this age: climbing, swings, and slides at child scale.'
  },
  park: {
    key: 'park',
    label: 'Park',
    base: 4,
    indoor: false,
    why: 'Open space to run, picnic, and explore, easy to fit around naps and snacks.'
  }
}

function categorize(tags: Record<string, string>): Category | null {
  const tourism = tags.tourism
  const leisure = tags.leisure
  const museum = (tags.museum ?? '').toLowerCase()
  if (tourism === 'zoo') return CATEGORIES.zoo
  if (tourism === 'aquarium') return CATEGORIES.aquarium
  if (tourism === 'theme_park') return CATEGORIES.theme_park
  if (tags.amenity === 'planetarium') return CATEGORIES.planetarium
  if (tourism === 'museum') {
    if (museum.includes('children')) return CATEGORIES.children_museum
    if (museum.includes('science')) return CATEGORIES.science_museum
    if (museum.includes('natural_history'))
      return CATEGORIES.natural_history_museum
    if (museum.includes('nature')) return CATEGORIES.nature_centre
    return null
  }
  if (leisure === 'water_park') return CATEGORIES.water_park
  if (leisure === 'indoor_play') return CATEGORIES.indoor_play
  if (tags.amenity === 'library') return CATEGORIES.library
  if (leisure === 'playground') return CATEGORIES.playground
  if (leisure === 'park') return CATEGORIES.park
  return null
}

/** Max distance per category, matching the query radii, since bbox corners reach ~1.4× further. */
function radiusKmFor(category: string, scale: number): number {
  if (category === 'library') return 8 * scale
  if (category === 'playground' || category === 'park') return 4 * scale
  return 15 * scale
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

export interface WeatherContext {
  known: boolean
  wet: boolean
  maxTemp: number | null
  unit: string
}

export function weatherContext(w: WeekendWeather | null): WeatherContext {
  if (!w) return { known: false, wet: false, maxTemp: null, unit: '°C' }
  const temps = w.days
    .map((d) => d.tempMax)
    .filter((t): t is number => t !== null)
  return {
    known: true,
    wet: w.wet,
    maxTemp: temps.length ? Math.max(...temps) : null,
    unit: w.units.temperature
  }
}

function weatherAdjust(
  indoor: boolean,
  ctx: WeatherContext
): { delta: number; note: string | null } {
  if (!ctx.known) return { delta: 0, note: null }
  if (ctx.wet) {
    return indoor
      ? {
          delta: 5,
          note: 'Rain is likely this weekend, so this indoor option is a good bet.'
        }
      : {
          delta: -5,
          note: 'Rain is likely this weekend; check the forecast before heading out.'
        }
  }
  // Open-Meteo temperatures default to °C; the mild-weather boost only applies when we know the unit.
  const celsius = ctx.unit.includes('C')
  if (
    !indoor &&
    celsius &&
    ctx.maxTemp !== null &&
    ctx.maxTemp >= 15 &&
    ctx.maxTemp <= 30
  ) {
    return {
      delta: 2,
      note: 'Dry, mild weather is forecast, which is ideal for being outdoors.'
    }
  }
  if (!indoor && celsius && ctx.maxTemp !== null && ctx.maxTemp > 30) {
    return {
      delta: 0,
      note: 'It looks hot, so plan for shade, water, and sun protection.'
    }
  }
  if (!indoor && celsius && ctx.maxTemp !== null && ctx.maxTemp < 5) {
    return { delta: 0, note: 'It looks cold, so wrap up warm.' }
  }
  return { delta: 0, note: indoor ? null : 'Dry weather is forecast.' }
}

export function rankCandidates(
  elements: OsmElement[],
  center: { lat: number; lon: number },
  ctx: WeatherContext,
  radiusScale = 1
): ActivityCandidate[] {
  const seen = new Set<string>()
  const out: ActivityCandidate[] = []
  for (const el of elements) {
    const tags = el.tags ?? {}
    const name = tags.name?.trim()
    const pos = coords(el)
    const cat = categorize(tags)
    if (!name || !pos || !cat) continue
    const km = distanceKm(center, pos)
    if (km > radiusKmFor(cat.key, radiusScale)) continue
    const id = `${el.type}/${el.id}`
    // The same place is often mapped as both a node and an area.
    const dedupe = `${name.toLowerCase()}|${cat.key}`
    if (seen.has(id) || seen.has(dedupe)) continue
    seen.add(id)
    seen.add(dedupe)

    const indoor =
      tags.indoor === 'yes' || tags.covered === 'yes' ? true : cat.indoor
    const notable = tags.wikidata || tags.wikipedia || safeWebsite(tags) ? 2 : 0
    const { delta, note } = weatherAdjust(indoor, ctx)
    out.push({
      id,
      name,
      category: cat.key,
      categoryLabel: cat.label,
      indoor,
      why: cat.why,
      weatherNote: note,
      address: formatAddress(tags),
      website: safeWebsite(tags),
      osmUrl: osmUrl(el),
      distanceKm: Math.round(km * 10) / 10,
      score: Math.round((cat.base + notable - 0.2 * km + delta) * 100) / 100
    })
  }
  return out.sort((a, b) => b.score - a.score)
}

/** Raw OSM results are cached (shared with the restaurant route); ranking is redone per request so it reflects the current weather. */
export async function getActivityElements(
  lat: number,
  lon: number
): Promise<{
  elements: OsmElement[]
  retrievedAt: string
  radiusScale: number
}> {
  const { elements, retrievedAt } = await getPlaces(lat, lon)
  return { elements, retrievedAt, radiusScale: 1 }
}
