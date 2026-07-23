import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { api, setToken, setOnChange } from './api'
import { supabase } from './supabase'
import { DEMO, subscribeDemo } from './demo/mock'
import type { HouseholdState, Session } from './types'

const TABLET_KEY = 'griha.tablet'
const POLL_MS = 4000

interface Store {
  session: Session | null
  state: HouseholdState | null
  loading: boolean
  needsBootstrap: boolean
  authError: string | null
  signInOwner: (email: string, password: string) => Promise<void>
  signUpOwner: (email: string, password: string) => Promise<{ needsEmailConfirm: boolean }>
  bootstrap: (name: string, householdName: string) => Promise<void>
  joinTablet: (joinCode: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const StoreContext = createContext<Store | null>(null)

interface TabletSaved {
  token: string
  household: Session['household']
}

// Turn a failed post-login API call into a message that hints at the cause
// (the status code tells us which server setting is likely wrong).
function describeAuthError(e: unknown): string {
  const status = (e as { status?: number }).status
  const message = (e as { message?: string }).message ?? 'Unknown error'
  const detail = (e as { detail?: string }).detail
  if (status === 401) {
    return 'Signed in, but the server rejected the session. This usually means SUPABASE_JWT_SECRET (or SUPABASE_URL) in the hosting settings is wrong.'
  }
  if (status === 500) {
    const base =
      'Signed in, but the server hit an error — usually the database connection (check DATABASE_URL) or that the setup SQL was run.'
    return detail ? `${base}\n\nDetails: ${detail}` : base
  }
  if (status === undefined) {
    return 'Signed in, but could not reach the server. Please check your connection and try again.'
  }
  return `Signed in, but loading your home failed (${status}): ${message}${detail ? `\n\nDetails: ${detail}` : ''}`
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [state, setState] = useState<HouseholdState | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsBootstrap, setNeedsBootstrap] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    try {
      setState(await api.state())
    } catch (e) {
      const status = (e as { status?: number }).status
      if (status === 409) setNeedsBootstrap(true)
    }
  }, [])

  // Refresh instantly after any mutation (POST/PATCH/PUT/DELETE).
  useEffect(() => {
    setOnChange(() => refresh())
    return () => setOnChange(null)
  }, [refresh])

  // ---------- Session bootstrapping ----------
  useEffect(() => {
    let cancelled = false

    // Demo build: no Supabase — preseed an owner session and use the mock.
    if (DEMO) {
      if (!localStorage.getItem('griha.session')) {
        localStorage.setItem('griha.session', '1')
      }
      setSession({
        token: 'demo',
        role: 'owner',
        user: { id: 'u_demo', name: 'Madan', email: 'owner@griha.app' },
        household: { id: 'h_demo', name: 'Madan’s Home', joinCode: 'HOME24' },
      })
      refresh().finally(() => !cancelled && setLoading(false))
      const unsub = subscribeDemo(() => refresh())
      return () => {
        cancelled = true
        unsub()
      }
    }

    // 1) Staff tablet session (our own token) takes precedence on shared devices.
    const savedTablet = localStorage.getItem(TABLET_KEY)
    if (savedTablet) {
      try {
        const t = JSON.parse(savedTablet) as TabletSaved
        setToken(t.token)
        setSession({ token: t.token, role: 'tablet', user: null, household: t.household })
        refresh().finally(() => !cancelled && setLoading(false))
        return () => {
          cancelled = true
        }
      } catch {
        localStorage.removeItem(TABLET_KEY)
      }
    }

    // 2) Owner session via Supabase.
    if (!supabase) {
      setLoading(false)
      return () => {
        cancelled = true
      }
    }

    const handleOwnerToken = async (accessToken: string) => {
      setToken(accessToken)
      try {
        const me = await api.me()
        if (cancelled) return
        if (me.needsBootstrap || !me.user || !me.household) {
          setNeedsBootstrap(true)
          setSession(null)
        } else {
          setNeedsBootstrap(false)
          setSession({ token: accessToken, role: 'owner', user: me.user, household: me.household })
          await refresh()
        }
        setAuthError(null)
      } catch (e) {
        if (!cancelled) setAuthError(describeAuthError(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      if (data.session) handleOwnerToken(data.session.access_token)
      else setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sbSession) => {
      if (cancelled) return
      if (sbSession) {
        handleOwnerToken(sbSession.access_token)
      } else {
        setToken(null)
        setSession(null)
        setNeedsBootstrap(false)
        setState(null)
      }
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------- Polling (replaces the old WebSocket push) ----------
  useEffect(() => {
    if (!session || DEMO) return
    const tick = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    pollRef.current = setInterval(tick, POLL_MS)
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [session, refresh])

  // ---------- Actions ----------
  const signInOwner = useCallback(async (email: string, password: string) => {
    const sb = supabase
    if (!sb) throw new Error('Sign-in is not configured yet — the app was built without Supabase keys.')
    setAuthError(null)
    const { error } = await sb.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
  }, [])

  const signUpOwner = useCallback(async (email: string, password: string) => {
    const sb = supabase
    if (!sb) throw new Error('Sign-up is not configured yet.')
    const { data, error } = await sb.auth.signUp({ email, password })
    if (error) throw new Error(error.message)
    return { needsEmailConfirm: !data.session }
  }, [])

  const bootstrap = useCallback(
    async (name: string, householdName: string) => {
      const r = await api.bootstrap({ name, householdName })
      setNeedsBootstrap(false)
      const token = supabase
        ? ((await supabase.auth.getSession()).data.session?.access_token ?? 'owner')
        : 'owner'
      setSession({ token, role: 'owner', user: r.user, household: r.household })
      await refresh()
    },
    [refresh]
  )

  const joinTablet = useCallback(
    async (joinCode: string) => {
      const r = await api.tablet(joinCode)
      const saved: TabletSaved = { token: r.token, household: r.household }
      localStorage.setItem(TABLET_KEY, JSON.stringify(saved))
      setToken(r.token)
      setSession({ token: r.token, role: 'tablet', user: null, household: r.household })
      await refresh()
    },
    [refresh]
  )

  const logout = useCallback(async () => {
    if (session?.role === 'tablet') {
      localStorage.removeItem(TABLET_KEY)
    } else if (supabase) {
      await supabase.auth.signOut()
    }
    setToken(null)
    setSession(null)
    setNeedsBootstrap(false)
    setState(null)
  }, [session])

  return (
    <StoreContext.Provider
      value={{
        session,
        state,
        loading,
        needsBootstrap,
        authError,
        signInOwner,
        signUpOwner,
        bootstrap,
        joinTablet,
        logout,
        refresh,
      }}
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

export function useData(): HouseholdState {
  const { state } = useStore()
  if (!state) throw new Error('useData used before state loaded')
  return state
}
