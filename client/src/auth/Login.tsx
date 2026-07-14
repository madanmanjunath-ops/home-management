import { useState } from 'react'
import { useStore } from '../store'

type Mode = 'login' | 'register' | 'tablet'

export function Login() {
  const { loginOwner, registerOwner, joinTablet } = useStore()
  const [mode, setMode] = useState<Mode>('login')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // form fields
  const [email, setEmail] = useState('owner@griha.app')
  const [password, setPassword] = useState('griha123')
  const [name, setName] = useState('')
  const [householdName, setHouseholdName] = useState('')
  const [joinCode, setJoinCode] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'login') await loginOwner(email, password)
      else if (mode === 'register') await registerOwner({ email, password, name, householdName })
      else await joinTablet(joinCode)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <div className="auth-brand">
        <div className="brand">
          Griha <small>your home, in sync</small>
        </div>
        <h1>Run your household with calm and clarity.</h1>
        <p>
          Assign tasks, track attendance, approve shopping, manage salaries and leave — for your whole home
          team, on one warm, simple screen.
        </p>
        <ul className="auth-points">
          <li>👐 An owner app and a shared staff tablet</li>
          <li>⚡ Live updates the moment anything changes</li>
          <li>🔒 Your household, private to you</li>
        </ul>
      </div>

      <div className="auth-panel">
        <div className="auth-tabs">
          <button className={mode !== 'tablet' ? 'active' : ''} onClick={() => setMode('login')}>
            Owner
          </button>
          <button className={mode === 'tablet' ? 'active' : ''} onClick={() => setMode('tablet')}>
            Staff tablet
          </button>
        </div>

        <form onSubmit={submit} className="auth-form">
          {mode === 'tablet' ? (
            <>
              <h2>Join your home</h2>
              <p className="subtitle">Enter the code shown in the owner’s app.</p>
              <label>
                Household code
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. HOME24"
                  autoCapitalize="characters"
                  required
                />
              </label>
            </>
          ) : (
            <>
              <h2>{mode === 'login' ? 'Welcome back' : 'Create your home'}</h2>
              <p className="subtitle">
                {mode === 'login' ? 'Sign in to your household.' : 'Set up Griha for your household.'}
              </p>
              {mode === 'register' && (
                <>
                  <label>
                    Your name
                    <input value={name} onChange={(e) => setName(e.target.value)} required />
                  </label>
                  <label>
                    Household name
                    <input
                      value={householdName}
                      onChange={(e) => setHouseholdName(e.target.value)}
                      placeholder="e.g. Sharma Home"
                      required
                    />
                  </label>
                </>
              )}
              <label>
                Email
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </label>
            </>
          )}

          {error && <div className="auth-error">{error}</div>}

          <button className="button" disabled={busy} type="submit">
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create home' : 'Join home'}
          </button>

          {mode !== 'tablet' && (
            <div className="auth-switch">
              {mode === 'login' ? (
                <>
                  New here?{' '}
                  <button type="button" className="text-button" onClick={() => setMode('register')}>
                    Create a household
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button type="button" className="text-button" onClick={() => setMode('login')}>
                    Sign in
                  </button>
                </>
              )}
            </div>
          )}

          {mode === 'login' && (
            <div className="auth-demo">
              Demo · <code>owner@griha.app</code> / <code>griha123</code> · tablet code <code>HOME24</code>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
