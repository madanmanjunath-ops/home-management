import { createApp } from './app.js'

// Local development server. In production the same app runs as a Netlify Function
// (see netlify/functions/api.ts).
const app = createApp()
const PORT = Number(process.env.PORT) || 4000

app.listen(PORT, () => {
  console.log(`🏠 Griha API listening on http://localhost:${PORT}`)
})
