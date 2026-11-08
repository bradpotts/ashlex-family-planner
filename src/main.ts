import '@phcdevworks/spectre-ui/index.css'
import './styles.css'
import { defineSpectreAlert } from '@phcdevworks/spectre-components/alert'
import { defineSpectreButton } from '@phcdevworks/spectre-components/button'
import { defineSpectreCard } from '@phcdevworks/spectre-components/card'
import { defineSpectreSkeleton } from '@phcdevworks/spectre-components/skeleton'
import { defineSpectreTag } from '@phcdevworks/spectre-components/tag'
import { bootstrapApp } from '@phcdevworks/spectre-shell'
import type { Route } from '@phcdevworks/spectre-shell-router'

defineSpectreAlert()
defineSpectreButton()
defineSpectreCard()
defineSpectreSkeleton()
defineSpectreTag()

const root = document.getElementById('app')!

bootstrapApp({
  root,
  routes(): Route[] {
    return [
      {
        path: '/',
        meta: { title: 'Family Weekend Planner' },
        loader: async () => {
          const { renderPlanner } = await import('./planner.ts')
          let destroy: (() => void) | null = null
          return {
            render({ root }) {
              destroy = renderPlanner(root)
            },
            destroy() {
              destroy?.()
            }
          }
        }
      }
    ]
  }
})
