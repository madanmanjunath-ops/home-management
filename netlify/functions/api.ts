import serverless from 'serverless-http'
// Imports the compiled Express app (server is built to dist during the Netlify build).
import { createApp } from '../../server/dist/app.js'

const slsHandler = serverless(createApp())

// Netlify rewrites /api/* to this function. Strip the function prefix so the
// Express routes (mounted at '/') match the request path.
export const handler = async (event: Record<string, unknown>, context: unknown) => {
  if (typeof event.path === 'string') {
    event.path = event.path.replace(/^\/\.netlify\/functions\/api/, '') || '/'
  }
  return slsHandler(event as never, context as never)
}
