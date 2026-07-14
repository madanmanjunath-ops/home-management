import type { Server } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { verifyToken } from './auth.js'

// Track which household each socket belongs to, so we only push to the right home.
const clients = new Map<WebSocket, string>()

let wss: WebSocketServer | null = null

export function attachWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws, req) => {
    // Token is passed as ?token= on the ws URL.
    const url = new URL(req.url ?? '', 'http://localhost')
    const token = url.searchParams.get('token')
    const auth = token ? verifyToken(token) : null

    if (!auth) {
      ws.close(4001, 'unauthorized')
      return
    }

    clients.set(ws, auth.householdId)

    ws.on('close', () => clients.delete(ws))
    ws.on('error', () => clients.delete(ws))

    // Greet so the client knows the channel is live.
    ws.send(JSON.stringify({ type: 'connected' }))
  })
}

/**
 * Tell every connected client of a household that its data changed.
 * Clients respond by refetching the household snapshot.
 */
export function broadcast(householdId: string, resource = 'state') {
  const payload = JSON.stringify({ type: 'sync', resource })
  for (const [ws, hid] of clients) {
    if (hid === householdId && ws.readyState === WebSocket.OPEN) {
      ws.send(payload)
    }
  }
}
