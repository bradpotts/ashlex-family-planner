import "@phcdevworks/spectre-ui/index.css"
import { defineSpectreButton } from "@phcdevworks/spectre-components/button"
import { bootstrapApp, bootReady, type ShellPlugin } from "@phcdevworks/spectre-shell"
import type { Route } from "@phcdevworks/spectre-shell-router"
import { effect, signal } from "@phcdevworks/spectre-shell-signals"

defineSpectreButton()

const root = document.getElementById("app")!
const navStatus = document.getElementById("nav-status")!
const count = signal(0)
const navigating = signal(false)

const bootLoggerPlugin: ShellPlugin = {
  name: "boot-logger",
  install({ bootReady }) {
    effect(() => {
      if (bootReady.value) console.info("[spectre-app] boot ready")
    })
  },
}

effect(() => {
  if (!bootReady.value) {
    navStatus.textContent = "Booting…"
  } else {
    navStatus.textContent = navigating.value ? "Loading…" : ""
  }
})

bootstrapApp({
  root,
  beforeMount() {
    console.info("[spectre-app] mounting")
  },
  afterMount() {
    console.info("[spectre-app] mounted")
  },
  plugins: [bootLoggerPlugin],
  routerOptions: {
    onNavigationStart: () => {
      navigating.value = true
    },
    onNavigationEnd: () => {
      navigating.value = false
    },
    afterNavigate: (context) => {
      const title = context.meta?.title
      document.title = typeof title === "string" ? `${title} · Spectre App` : "Spectre App"
    },
  },
  routes(): Route[] {
    return [
      {
        path: "/",
        meta: { title: "Home" },
        loader: async () => {
          let stopEffect: (() => void) | null = null

          return {
            render({ root }) {
              root.innerHTML = `
                <h1>Home</h1>
                <p>Count: <span id="count-value" style="color: var(--sp-text-on-page-brand)">0</span></p>
                <sp-button variant="primary">+1</sp-button>
                <a href="/about">Go to About</a>
              `
              stopEffect = effect(() => {
                const el = root.querySelector<HTMLElement>("#count-value")
                if (el) el.textContent = String(count.value)
              })
              root.querySelector("sp-button")!.addEventListener("click", () => {
                count.value++
              })
            },
            destroy() {
              stopEffect?.()
            },
          }
        },
      },
      {
        path: "/about",
        meta: { title: "About" },
        loader: async () => ({
          render({ root }) {
            root.innerHTML = `
              <h1>About</h1>
              <p>Count from home: ${count.peek()}</p>
              <a href="/">Back Home</a>
            `
          },
        }),
      },
    ]
  },
})
