import type { IconKey } from './api.ts'

const svg = (body: string, cls = 'icon') =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`

const SUN = `<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.3 4.3l1.6 1.6M18.1 18.1l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.3 19.7l1.6-1.6M18.1 5.9l1.6-1.6"/>`
const CLOUD = `<path d="M7 18.5h10.2a4.3 4.3 0 0 0 .4-8.6A6 6 0 0 0 6.1 11.3 3.6 3.6 0 0 0 7 18.5Z"/>`

const WEATHER: Record<IconKey, string> = {
  sun: SUN,
  partly: `<circle cx="8.5" cy="8.5" r="3.2"/><path d="M8.5 2.5v1.4M2.5 8.5h1.4M4.3 4.3l1 1M12.7 4.3l-1 1"/><path d="M9 19.5h9a3.8 3.8 0 0 0 .3-7.6 5.3 5.3 0 0 0-9.8 1.2A3.2 3.2 0 0 0 9 19.5Z"/>`,
  cloud: CLOUD,
  fog: `<path d="M7 13.5h10.2a4 4 0 0 0 .3-8A5.6 5.6 0 0 0 6.6 6.8 3.4 3.4 0 0 0 7 13.5Z"/><path d="M4 17h16M6 20.5h12"/>`,
  rain: `<path d="M7 14.5h10.2a4.1 4.1 0 0 0 .3-8.2A5.8 5.8 0 0 0 6.4 7.5 3.5 3.5 0 0 0 7 14.5Z"/><path d="M8 17.5l-1 2.5M12.5 17.5l-1 2.5M17 17.5l-1 2.5"/>`,
  snow: `<path d="M7 14h10.2a4.1 4.1 0 0 0 .3-8.2A5.8 5.8 0 0 0 6.4 7 3.5 3.5 0 0 0 7 14Z"/><path d="M8 18h.01M12 20h.01M16 18h.01M10 21.5h.01M14 21.5h.01" stroke-width="2.6"/>`,
  storm: `<path d="M7 14h10.2a4.1 4.1 0 0 0 .3-8.2A5.8 5.8 0 0 0 6.4 7 3.5 3.5 0 0 0 7 14Z"/><path d="M12.5 14.5 10 18.5h3.5L11 22.5"/>`
}

export const weatherIcon = (key: IconKey) =>
  svg(WEATHER[key] ?? CLOUD, 'icon icon--weather')

export const icons = {
  search: svg(`<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>`),
  pin: svg(
    `<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.4"/>`
  ),
  clock: svg(`<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>`),
  calendar: svg(
    `<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>`
  ),
  external: svg(
    `<path d="M14 4h6v6M20 4l-8.5 8.5M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>`
  ),
  map: svg(
    `<path d="m9 4-5.5 2v14L9 18l6 2 5.5-2V4L15 6 9 4Z"/><path d="M9 4v14M15 6v14"/>`
  ),
  home: svg(
    `<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/>`
  ),
  tree: svg(
    `<path d="M12 3 6.5 11h3L6 16h12l-3.5-5h3L12 3Z"/><path d="M12 16v5"/>`
  ),
  utensils: svg(
    `<path d="M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10"/><path d="M17 21V3c-2.2 1.4-3.5 4-3.5 7v3H17"/>`
  ),
  kite: svg(
    `<path d="M12 2.5 19 9l-7 9.5L5 9l7-6.5Z"/><path d="M5 9h14M12 2.5v16M12 18.5c0 1.8-1.4 3-3 3"/>`
  ),
  drop: svg(
    `<path d="M12 3.5s6 6.4 6 10.7a6 6 0 0 1-12 0c0-4.3 6-10.7 6-10.7Z"/>`
  ),
  phone: svg(
    `<path d="M5 4h3.5l1.7 4.3-2.2 1.4a11 11 0 0 0 6.3 6.3l1.4-2.2L20 15.5V19a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4Z"/>`
  ),
  info: svg(`<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>`),
  logo: svg(
    `<circle cx="12" cy="12" r="9"/><path d="M8.2 13.5a4 4 0 0 0 7.6 0M9 9.5h.01M15 9.5h.01"/>`,
    'icon icon--logo'
  )
}
