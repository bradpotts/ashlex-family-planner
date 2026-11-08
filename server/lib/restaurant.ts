import {
  coords,
  distanceKm,
  formatAddress,
  getPlaces,
  osmUrl,
  safeWebsite,
  type OsmElement
} from './overpass.ts'

export interface Restaurant {
  name: string
  address: string | null
  distanceKm: number
  lat: number
  lon: number
  cuisine: string
  website: string | null
  phone: string | null
  openingHours: string | null
  openingHoursNote: string | null
  familyFeatures: string[]
  explanation: string
  osmUrl: string
}

function familyFeatures(tags: Record<string, string>): string[] {
  const f: string[] = []
  if (tags.highchair === 'yes') f.push('high chairs')
  if (
    tags.kids_area === 'yes' ||
    tags['kids_area:indoor'] === 'yes' ||
    tags['kids_area:outdoor'] === 'yes'
  )
    f.push("a kids' area")
  if (tags.changing_table === 'yes') f.push('baby changing')
  if (tags.wheelchair === 'yes') f.push('step-free access')
  return f
}

function cuisineLabel(raw: string): string {
  return raw
    .split(';')
    .map((c) => c.trim().replace(/_/g, ' '))
    .filter(Boolean)
    .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
    .join(', ')
}

export function pickRestaurant(
  elements: OsmElement[],
  center: { lat: number; lon: number },
  maxKm = Infinity
): Restaurant | null {
  let best: {
    el: OsmElement
    score: number
    km: number
    pos: { lat: number; lon: number }
  } | null = null
  for (const el of elements) {
    const tags = el.tags ?? {}
    const pos = coords(el)
    if (!tags.name || !pos) continue
    // The shared places query also returns activities; keep Italian restaurants only.
    if (tags.amenity !== 'restaurant' || !/italian/i.test(tags.cuisine ?? ''))
      continue
    // Skip places mapped as closed; we can't verify they still trade.
    if (
      tags['disused:amenity'] ||
      tags['was:amenity'] ||
      tags.opening_hours === 'closed'
    )
      continue
    const km = distanceKm(center, pos)
    if (km > maxKm) continue
    let score = 0
    if (safeWebsite(tags)) score += 3
    if (formatAddress(tags)) score += 2
    if (tags.opening_hours) score += 1
    if (tags.phone || tags['contact:phone']) score += 0.5
    if (tags.highchair === 'yes') score += 2
    if (tags.kids_area === 'yes') score += 1.5
    score -= 0.4 * km
    if (!best || score > best.score) best = { el, score, km, pos }
  }
  if (!best) return null
  const tags = best.el.tags ?? {}
  const features = familyFeatures(tags)
  const km = Math.round(best.km * 10) / 10
  const cuisine = cuisineLabel(tags.cuisine)
  const parts = [
    `Listed on OpenStreetMap as an Italian restaurant (cuisine: ${cuisine}), about ${km} km from the city centre.`,
    features.length
      ? `OpenStreetMap notes ${features.join(', ')}, which helps with young children.`
      : "Chosen for having the most complete listing nearby (website, address, hours). Family facilities aren't recorded, so call ahead about high chairs."
  ]
  return {
    name: tags.name,
    address: formatAddress(tags),
    distanceKm: km,
    lat: best.pos.lat,
    lon: best.pos.lon,
    cuisine,
    website: safeWebsite(tags),
    phone: tags.phone ?? tags['contact:phone'] ?? null,
    openingHours: tags.opening_hours
      ? tags.opening_hours.replace(/^"+|"+$/g, '')
      : null,
    openingHoursNote: tags.opening_hours
      ? 'Per OpenStreetMap; may be outdated. Check with the restaurant.'
      : null,
    familyFeatures: features,
    explanation: parts.join(' '),
    osmUrl: osmUrl(best.el)
  }
}

export async function getRestaurant(
  lat: number,
  lon: number
): Promise<{
  restaurant: Restaurant | null
  searchedKm: number
  retrievedAt: string
}> {
  const { elements, retrievedAt } = await getPlaces(lat, lon)
  const center = { lat, lon }
  // Prefer something close; widen only if nothing qualifies (no extra network call).
  for (const km of [5, 15]) {
    const pick = pickRestaurant(elements, center, km)
    if (pick) return { restaurant: pick, searchedKm: km, retrievedAt }
  }
  return { restaurant: null, searchedKm: 15, retrievedAt }
}
