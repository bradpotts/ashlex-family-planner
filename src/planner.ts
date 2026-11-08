import { effect, signal } from "@phcdevworks/spectre-shell-signals"
import { api, ApiError, type ActivitiesResponse, type ActivityCandidate, type City, type RestaurantResponse, type WeekendResponse } from "./api.ts"
import { cityLabel, esc, formatDate, formatRetrieved, round, safeUrl } from "./format.ts"
import { icons, weatherIcon } from "./icons.ts"

type Section<T> = { status: "idle" } | { status: "loading" } | { status: "ok"; data: T } | { status: "error"; message: string }

const city = signal<City | null>(null)
const weekend = signal<Section<WeekendResponse>>({ status: "idle" })
const activities = signal<Section<ActivitiesResponse>>({ status: "idle" })
const restaurant = signal<Section<RestaurantResponse>>({ status: "idle" })
const filters = signal({ indoor: true, outdoor: true })

const errorMessage = (err: unknown) => (err instanceof ApiError ? err.message : "Something unexpected went wrong.")

let controller: AbortController | null = null

/**
 * Upstream timeouts (Overpass is often slow) get one automatic retry before
 * the error is shown. Simulated outages and bad input fail straight away.
 */
async function withRetry<T>(fetcher: (signal: AbortSignal) => Promise<T>, signal: AbortSignal): Promise<T> {
  try {
    return await fetcher(signal)
  } catch (err) {
    const transient = err instanceof ApiError && err.source === "overpass" && !/simulated/i.test(err.message)
    if (!transient || signal.aborted) throw err
    await new Promise((r) => setTimeout(r, 1500))
    return fetcher(signal)
  }
}

function load<T>(target: { value: Section<T> }, fetcher: (signal: AbortSignal) => Promise<T>, signal: AbortSignal) {
  target.value = { status: "loading" }
  withRetry(fetcher, signal).then(
    (data) => {
      if (!signal.aborted) target.value = { status: "ok", data }
    },
    (err) => {
      if (!signal.aborted) target.value = { status: "error", message: errorMessage(err) }
    },
  )
}

function selectCity(c: City) {
  controller?.abort()
  controller = new AbortController()
  const s = controller.signal
  city.value = c
  load(weekend, (sig) => api.weekend(c, sig), s)
  load(activities, (sig) => api.activities(c, sig), s)
  load(restaurant, (sig) => api.restaurant(c, sig), s)
}

function retry(section: string) {
  const c = city.value
  if (!c || !controller) return
  const s = controller.signal
  if (section === "weekend") load(weekend, (sig) => api.weekend(c, sig), s)
  if (section === "activities") load(activities, (sig) => api.activities(c, sig), s)
  if (section === "restaurant") load(restaurant, (sig) => api.restaurant(c, sig), s)
}

// ---- shared bits -----------------------------------------------------------

const link = (url: string | null, label: string, icon = icons.external) => {
  const safe = safeUrl(url)
  return safe ? `<a class="pill-link" href="${esc(safe)}" target="_blank" rel="noopener noreferrer">${icon}<span>${esc(label)}</span></a>` : ""
}

const sectionHead = (icon: string, title: string, sub: string) => `
  <header class="section-head">
    <span class="section-icon">${icon}</span>
    <div><h2>${esc(title)}</h2><p class="muted">${esc(sub)}</p></div>
  </header>`

const meta = (source: { name: string; url: string }, retrievedAt: string) => `
  <p class="section-meta">${icons.clock}<span>Retrieved ${esc(formatRetrieved(retrievedAt))} · Source: ${link(source.url, source.name)}</span></p>`

const errorState = (section: string, message: string) => `
  <sp-alert variant="danger" title="This information is unavailable right now">
    <p>${esc(message)} We're not showing anything in its place rather than guess.</p>
    <sp-button variant="secondary" size="sm" data-retry="${section}">Try again</sp-button>
  </sp-alert>`

const skeletonCards = (n: number, hint?: string) => `
  <div class="card-grid" aria-busy="true">
    ${Array.from({ length: n }, () => `<sp-card variant="outline" padded="md"><div class="skel"><sp-skeleton shape="circle" class="skel-circle"></sp-skeleton><sp-skeleton shape="text"></sp-skeleton><sp-skeleton shape="text" class="skel-short"></sp-skeleton><sp-skeleton shape="rect" class="skel-block"></sp-skeleton></div></sp-card>`).join("")}
  </div>
  ${hint ? `<p class="muted small loading-hint" role="status">${esc(hint)}</p>` : `<span class="visually-hidden" role="status">Loading…</span>`}`

// ---- sections --------------------------------------------------------------

function renderHeader(): string {
  const c = city.value
  if (!c) return ""
  const w = weekend.value
  const when =
    w.status === "ok"
      ? `<span class="chip">${icons.calendar}<span>Weekend of <strong>${esc(formatDate(w.data.saturday))} – ${esc(formatDate(w.data.sunday))}</strong></span></span>
         <span class="chip">${icons.clock}<span>Local time ${esc(w.data.localTime)} · ${esc(formatDate(w.data.localDate, { weekday: "long", day: "numeric", month: "long" }))}</span></span>`
      : w.status === "loading"
        ? `<span class="chip chip--ghost">Working out the weekend dates in ${esc(c.timezone)}…</span>`
        : ""
  return `
    <section class="city-head" aria-labelledby="city-title">
      <p class="eyebrow">${icons.pin}<span>Your weekend in</span></p>
      <h1 id="city-title">${esc(c.name)} ${c.country_code ? `<span class="cc" aria-hidden="true">${esc(c.country_code)}</span>` : ""}</h1>
      <p class="city-sub">${esc([c.admin1, c.country].filter(Boolean).join(", "))}</p>
      <div class="chips">${when}</div>
    </section>`
}

function renderWeather(): string {
  const s = weekend.value
  const head = sectionHead(weatherIcon("partly"), "Weekend weather", "Saturday and Sunday forecast for the city")
  if (s.status === "idle") return ""
  if (s.status === "loading") return head + skeletonCards(2)
  if (s.status === "error") return head + errorState("weekend", s.message)
  const d = s.data
  const u = d.units
  if (d.days.length === 0) {
    return head + `<sp-alert variant="warning" title="No forecast yet">The forecast for this weekend isn't available yet.</sp-alert>`
  }
  const cards = d.days
    .map(
      (day) => `
      <sp-card variant="elevated" padded="lg" class="weather-card weather-card--${esc(day.icon)}">
        <div class="weather-top">
          <div>
            <p class="weather-day">${esc(day.weekday)}</p>
            <p class="muted">${esc(formatDate(day.date, { day: "numeric", month: "long", year: "numeric" }))}</p>
          </div>
          <span class="weather-glyph">${weatherIcon(day.icon)}</span>
        </div>
        <p class="weather-label">${esc(day.label)}</p>
        <p class="temps"><span class="temp-hi" aria-label="High">${esc(round(day.tempMax))}${esc(u.temperature)}</span><span class="temp-lo" aria-label="Low">${esc(round(day.tempMin))}${esc(u.temperature)}</span></p>
        <dl class="rain">
          <div><dt>${icons.drop}Chance of rain</dt><dd>${day.precipProbMax === null ? "Not available" : `${esc(round(day.precipProbMax))}${esc(u.probability)}`}</dd></div>
          <div><dt>${icons.drop}Expected rain</dt><dd>${day.precipSum === null ? "Not available" : `${esc(round(day.precipSum, 1))} ${esc(u.precipitation)}`}</dd></div>
        </dl>
      </sp-card>`,
    )
    .join("")
  const summary = d.wet
    ? `<sp-alert variant="info" title="Rain is likely">We've favoured indoor activities below.</sp-alert>`
    : ""
  return head + `<div class="card-grid">${cards}</div>${summary}${meta(d.source, d.retrievedAt)}`
}

/** Highest-scoring two with different categories, so we don't suggest two playgrounds. */
export function pickTop(candidates: ActivityCandidate[], f: { indoor: boolean; outdoor: boolean }): ActivityCandidate[] {
  const pool = candidates.filter((c) => (c.indoor ? f.indoor : f.outdoor))
  const picks: ActivityCandidate[] = []
  for (const c of pool) {
    if (picks.length === 2) break
    if (!picks.some((p) => p.category === c.category)) picks.push(c)
  }
  for (const c of pool) {
    if (picks.length === 2) break
    if (!picks.includes(c)) picks.push(c)
  }
  return picks
}

function renderActivities(): string {
  const s = activities.value
  const f = filters.value
  const head = sectionHead(icons.kite, "Two things to do with the kids", "Picked for ages 4–8, with the weather in mind")
  if (s.status === "idle") return ""
  if (s.status === "loading") return head + skeletonCards(2, "Searching OpenStreetMap for family-friendly places. This can take up to 30 seconds.")
  if (s.status === "error") return head + errorState("activities", s.message)
  const d = s.data
  const toggles = `
    <fieldset class="filters">
      <legend class="visually-hidden">Show indoor or outdoor activities</legend>
      <label class="toggle"><input type="checkbox" data-filter="indoor" ${f.indoor ? "checked" : ""}/>${icons.home}<span>Indoor</span></label>
      <label class="toggle"><input type="checkbox" data-filter="outdoor" ${f.outdoor ? "checked" : ""}/>${icons.tree}<span>Outdoor</span></label>
    </fieldset>`
  const weatherNote = d.weather.note ? `<sp-alert variant="warning" title="Ranked without weather">${esc(d.weather.note)}</sp-alert>` : ""
  const picks = pickTop(d.candidates, f)
  let body: string
  if (picks.length === 0) {
    const onlyOne = f.indoor !== f.outdoor
    body = `<sp-alert variant="neutral" title="No verified activities found">
      ${onlyOne ? `We didn't find any ${f.indoor ? "indoor" : "outdoor"} options nearby. Try including ${f.indoor ? "outdoor" : "indoor"} activities.` : `OpenStreetMap doesn't list suitable named places within ${esc(d.searchRadiusKm.attractions)} km of the centre, so we aren't suggesting any.`}
    </sp-alert>`
  } else {
    body = `<div class="card-grid">${picks
      .map(
        (a, i) => `
        <sp-card variant="elevated" padded="lg" class="activity-card">
          <div class="activity-top">
            <span class="rank" aria-hidden="true">${i + 1}</span>
            <div class="tags">
              <sp-tag variant="primary" size="sm">${esc(a.categoryLabel)}</sp-tag>
              <sp-tag variant="${a.indoor ? "info" : "success"}" size="sm">${a.indoor ? "Indoor" : "Outdoor"}</sp-tag>
            </div>
          </div>
          <h3>${esc(a.name)}</h3>
          <p class="muted small place-line">${icons.pin}<span>${a.address ? esc(a.address) + " · " : ""}${esc(a.distanceKm)} km from centre</span></p>
          <p><strong>Why it suits ages 4–8:</strong> ${esc(a.why)}</p>
          ${a.weatherNote ? `<p class="weather-note">${weatherIcon(d.weather.wet ? "rain" : "sun")}<span>${esc(a.weatherNote)}</span></p>` : ""}
          <div class="links">${link(a.website, "Website")}${link(a.osmUrl, "OpenStreetMap", icons.map)}</div>
        </sp-card>`,
      )
      .join("")}</div>`
    if (picks.length === 1) body += `<p class="muted small">Only one suitable place matched these filters.</p>`
  }
  return head + toggles + weatherNote + body + `<p class="muted small disclaimer">${icons.info}<span>${esc(d.disclaimer)} Check opening times before you go.</span></p>` + meta(d.source, d.retrievedAt)
}

function renderRestaurant(): string {
  const s = restaurant.value
  const head = sectionHead(icons.utensils, "An Italian place for dinner", "A local, family-friendly option")
  if (s.status === "idle") return ""
  if (s.status === "loading") return head + skeletonCards(1, "Looking up Italian restaurants nearby…")
  if (s.status === "error") return head + errorState("restaurant", s.message)
  const d = s.data
  const r = d.restaurant
  if (!r) {
    return head + `<sp-alert variant="warning" title="We couldn't verify an Italian restaurant here">${esc(d.message ?? "")}</sp-alert>` + meta(d.source, d.retrievedAt)
  }
  return (
    head +
    `<sp-card variant="elevated" padded="lg" class="restaurant-card">
      <div class="tags"><sp-tag variant="accent" size="sm">${esc(r.cuisine)}</sp-tag>${r.familyFeatures.map((x) => `<sp-tag variant="success" size="sm">${esc(x)}</sp-tag>`).join("")}</div>
      <h3>${esc(r.name)}</h3>
      <p class="muted small place-line">${icons.pin}<span>${r.address ? esc(r.address) : "Street address not listed"} · ${esc(r.distanceKm)} km from centre</span></p>
      <p>${esc(r.explanation)}</p>
      ${r.openingHours ? `<p class="small hours">${icons.clock}<span><strong>Hours:</strong> ${esc(r.openingHours)} <em class="muted">(${esc(r.openingHoursNote)})</em></span></p>` : `<p class="small muted">Opening hours aren't listed, so check before you go.</p>`}
      <div class="links">${link(r.website, "Website")}${link(r.osmUrl, "OpenStreetMap", icons.map)}${r.phone ? `<a class="pill-link" href="tel:${esc(r.phone.replace(/[^+\d]/g, ""))}">${icons.phone}<span>${esc(r.phone)}</span></a>` : ""}</div>
    </sp-card>` +
    meta(d.source, d.retrievedAt)
  )
}

// ---- search ------------------------------------------------------------------

function mountSearch(root: HTMLElement) {
  const input = root.querySelector<HTMLInputElement>("#city-input")!
  const list = root.querySelector<HTMLUListElement>("#city-results")!
  const status = root.querySelector<HTMLElement>("#search-status")!
  let results: City[] = []
  let active = -1
  let timer: ReturnType<typeof setTimeout> | undefined
  let searchCtl: AbortController | null = null

  const close = () => {
    list.hidden = true
    input.setAttribute("aria-expanded", "false")
    input.removeAttribute("aria-activedescendant")
    active = -1
  }

  const paint = () => {
    list.innerHTML = results
      .map(
        (c, i) => `<li role="option" id="city-opt-${i}" class="option${i === active ? " is-active" : ""}" aria-selected="${i === active}" data-index="${i}">
          <span class="cc" aria-hidden="true">${esc(c.country_code ?? "··")}</span>
          <span><strong>${esc(c.name)}</strong><span class="muted">${esc([c.admin1, c.country].filter(Boolean).join(", "))}</span></span>
        </li>`,
      )
      .join("")
    list.hidden = results.length === 0
    input.setAttribute("aria-expanded", String(results.length > 0))
    if (active >= 0) input.setAttribute("aria-activedescendant", `city-opt-${active}`)
    else input.removeAttribute("aria-activedescendant")
  }

  const choose = (i: number) => {
    const c = results[i]
    if (!c) return
    input.value = cityLabel(c)
    close()
    status.textContent = `Selected ${cityLabel(c)}.`
    selectCity(c)
    root.querySelector("#plan")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const search = async (q: string) => {
    searchCtl?.abort()
    searchCtl = new AbortController()
    status.textContent = "Searching…"
    status.className = "search-status"
    try {
      const res = await api.geocode(q, searchCtl.signal)
      results = res.results
      active = results.length ? 0 : -1
      paint()
      status.textContent = results.length
        ? `${results.length} matching ${results.length === 1 ? "place" : "places"}. Use the arrow keys to choose.`
        : `No cities found for “${q}”. Check the spelling or try a nearby larger city.`
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return
      results = []
      paint()
      status.textContent = errorMessage(err)
      status.className = "search-status is-error"
    }
  }

  input.addEventListener("input", () => {
    clearTimeout(timer)
    const q = input.value.trim()
    if (q.length < 2) {
      results = []
      paint()
      status.textContent = q.length ? "Keep typing…" : ""
      return
    }
    timer = setTimeout(() => search(q), 300)
  })

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" && results.length) {
      e.preventDefault()
      active = (active + 1) % results.length
      paint()
    } else if (e.key === "ArrowUp" && results.length) {
      e.preventDefault()
      active = (active - 1 + results.length) % results.length
      paint()
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (!list.hidden && active >= 0) choose(active)
    } else if (e.key === "Escape") {
      close()
    }
  })

  // mousedown so the choice lands before the input's blur closes the list
  list.addEventListener("mousedown", (e) => {
    const li = (e.target as HTMLElement).closest<HTMLElement>("[data-index]")
    if (!li) return
    e.preventDefault()
    choose(Number(li.dataset.index))
  })
  input.addEventListener("blur", () => setTimeout(close, 100))
  input.addEventListener("focus", () => {
    if (results.length) paint()
  })
  root.querySelector("form")!.addEventListener("submit", (e) => e.preventDefault())
}

// ---- page --------------------------------------------------------------------

export function renderPlanner(root: HTMLElement): () => void {
  root.innerHTML = `
    <div class="page">
      <header class="topbar">
        <div class="wrap topbar-inner">
          <a class="brand" href="/">${icons.logo}<span>Family Weekend Planner</span></a>
        </div>
      </header>
      <main id="main">
        <section class="hero">
          <div class="wrap hero-inner">
            <h1 class="hero-title">Plan a happy family weekend, anywhere.</h1>
            <p class="hero-lede">Weekend weather, two kid-friendly activities for ages 4–8, and an Italian spot for dinner, all from live, linked sources.</p>
            <form class="search" role="search" autocomplete="off">
              <label for="city-input" class="visually-hidden">Search for a city</label>
              <div class="search-box">
                ${icons.search}
                <input id="city-input" class="sp-input sp-input--lg" type="text" placeholder="Search any city…"
                  role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="city-results" aria-describedby="search-status" maxlength="80" spellcheck="false" />
              </div>
              <ul id="city-results" class="results" role="listbox" aria-label="Matching cities" hidden></ul>
              <p id="search-status" class="search-status" aria-live="polite"></p>
            </form>
          </div>
        </section>
        <div id="plan" class="wrap plan">
          <div id="city-head"></div>
          <div id="empty" class="empty">
            <div class="empty-art">${weatherIcon("sun")}${icons.kite}${icons.utensils}</div>
            <h2>Where are you heading?</h2>
            <p class="muted">Try Portland, Paris or Springfield. If several places share a name, we'll show the region and country so you can pick the right one.</p>
          </div>
          <div class="plan-grid">
            <section id="sec-weather" class="plan-section plan-section--wide" aria-live="polite"></section>
            <section id="sec-activities" class="plan-section" aria-live="polite"></section>
            <section id="sec-restaurant" class="plan-section" aria-live="polite"></section>
          </div>
        </div>
      </main>
      <footer class="footer">
        <div class="wrap footer-inner">
          <p>Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo.com</a> (CC BY 4.0). Places © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>.</p>
          <p class="muted">Child suitability is inferred from each place's type, not from reviews. Opening hours and details can change, so please check with the venue before you go.</p>
        </div>
      </footer>
    </div>`

  mountSearch(root)

  const byId = (id: string) => root.querySelector<HTMLElement>(`#${id}`)!
  const stops = [
    effect(() => {
      byId("city-head").innerHTML = renderHeader()
      byId("empty").hidden = city.value !== null
      if (city.value) document.title = `${city.value.name} weekend · Family Weekend Planner`
    }),
    effect(() => {
      byId("sec-weather").innerHTML = renderWeather()
    }),
    effect(() => {
      byId("sec-activities").innerHTML = renderActivities()
    }),
    effect(() => {
      byId("sec-restaurant").innerHTML = renderRestaurant()
    }),
  ]

  const onClick = (e: Event) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-retry]")
    if (btn) retry(btn.dataset.retry!)
  }
  const onChange = (e: Event) => {
    const box = e.target as HTMLInputElement
    const key = box.dataset.filter as "indoor" | "outdoor" | undefined
    if (!key) return
    const next = { ...filters.value, [key]: box.checked }
    // At least one must stay on; otherwise there'd be nothing to recommend.
    if (!next.indoor && !next.outdoor) {
      box.checked = true
      return
    }
    filters.value = next
    root.querySelector<HTMLInputElement>(`[data-filter="${key}"]`)?.focus()
  }
  root.addEventListener("click", onClick)
  root.addEventListener("change", onChange)

  return () => {
    stops.forEach((stop) => stop())
    root.removeEventListener("click", onClick)
    root.removeEventListener("change", onChange)
    controller?.abort()
  }
}
