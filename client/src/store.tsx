import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { api, setToken } from './api'
import { DEMO, subscribeDemo } from './demo/mock'
import type { HouseholdState, Session } from './types'

const SESSION_KEY = 'griha.session'

interface Store {
  session: Session | null
  state: HouseholdState | null
  loading: boolean
  connected: boolean
  loginOwner: (email: string, password: string) => Promise<void>
  registerOwner: (p: { email: string; password: string; name: string; householdName: string }) => Promise<void>
  joinTablet: (joinCode: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
}

const StoreContext = createContext<Store | null>(null)

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    const s = loadSession()
    if (s) setToken(s.token)
    return s
  })
  const [state, setState] = useState<HouseholdState | null>(null)
  const [loading, setLoading] = useState<boolean>(!!session)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const persist = useCallback((s: Session | null) => {
    setSession(s)
    setToken(s?.token ?? null)
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s))
    else localStorage.removeItem(SESSION_KEY)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const snapshot = await api.state()
      setState(snapshot)
    } catch (e) {
      // A dead/expired token logs us out cleanly.
      if ((e as { status?: number }).status === 401) {
        persist(null)
        setState(null)
      }
    }
  }, [persist])

  // Keep a live WebSocket while we have a session; refetch on any "sync".
  useEffect(() => {
    if (!session) {
      setState(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    refresh().finally(() => {
      if (!cancelled) setLoading(false)
    })

    // Hosted preview: no WebSocket — refresh whenever the in-browser mock changes.
    if (DEMO) {
      const unsub = subscribeDemo(() => refresh())
      return () => {
        cancelled = true
        unsub()
      }
    }

    const connect = () => {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws'
      const ws = new WebSocket(`${proto}://${location.host}/ws?token=${encodeURIComponent(session.token)}`)
      wsRef.current = ws
      ws.onopen = () => setConnected(true)
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          if (msg.type === 'sync') refresh()
        } catch {
          /* ignore */
        }
      }
      ws.onclose = () => {
        setConnected(false)
        if (!cancelled) reconnectRef.current = setTimeout(connect, 2000)
      }
      ws.onerror = () => ws.close()
    }
    connect()

    return () => {
      cancelled = true
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      wsRef.current?.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token])

  const loginOwner = useCallback(
    async (email: string, password: string) => {
      const r = await api.login(email, password)
      persist({ token: r.token, role: 'owner', user: r.user, household: r.household })
    },
    [persist]
  )

  const registerOwner = useCallback(
    async (p: { email: string; password: string; name: string; householdName: string }) => {
      const r = await api.register(p)
      persist({ token: r.token, role: 'owner', user: r.user, household: r.household })
    },
    [persist]
  )

  const joinTablet = useCallback(
    async (joinCode: string) => {
      const r = await api.tablet(joinCode)
      persist({ token: r.token, role: 'tablet', user: null, household: r.household })
    },
    [persist]
  )

  const logout = useCallback(() => {
    persist(null)
    setState(null)
  }, [persist])

  return (
    <StoreContext.Provider
      value={{ session, state, loading, connected, loginOwner, registerOwner, joinTablet, logout, refresh }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore(): Store {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

/** Convenience hook: the snapshot, guaranteed non-null inside authed views. */
export function useData(): HouseholdState {
  const { state } = useStore()
  if (!state) throw new Error('useData used before state loaded')
  return state
}
