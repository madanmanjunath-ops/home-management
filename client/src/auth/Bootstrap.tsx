import { useState } from 'react'
import { useStore } from '../store'

// Shown once, right after an owner signs up: name themselves and their household.
export function Bootstrap() {
  const { bootstrap, logout } = useStore()
  const [name, setName] = useState('')
  const [householdName, setHouseholdName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await bootstrap(name, householdName)
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
          Griha <small>welcome</small>
        </div>
        <h1>Let’s set up your home.</h1>
        <p>
          Tell us who you are and name your household. We’ll add a little sample data to get you started — you
          can change or delete it anytime.
        </p>
      </div>

      <div className="auth-panel">
        <form onSubmit={submit} className="auth-form">
          <h2>Almost there</h2>
          <p className="subtitle">This creates your household.</p>
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

          {error && <div className="auth-error">{error}</div>}

          <button className="button" disabled={busy} type="submit">
            {busy ? 'Setting up…' : 'Create my home'}
          </button>
          <div className="auth-switch">
            <button type="button" className="text-button" onClick={() => logout()}>
              Sign out
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
