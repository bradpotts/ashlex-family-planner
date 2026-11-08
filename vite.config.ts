import { defineConfig } from "vite"

export default defineConfig({
  server: {
    // Dev only: forward API calls to the Node server (`npm run dev:api`).
    proxy: { "/api": "http://127.0.0.1:3000" },
  },
})
