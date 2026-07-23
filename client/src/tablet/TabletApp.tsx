import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useData, useStore } from '../store'
import { Avatar, Field, Modal, StatusPill } from '../components/ui'
import { initials, longDate } from '../lib/format'
import type { Staff } from '../types'

export function TabletApp({ preview = false }: { preview?: boolean }) {
  const data = useData()
  const { session, logout } = useStore()
  const navigate = useNavigate()
  const [shoppingFor, setShoppingFor] = useState<Staff | null>(null)

  const present = data.staff.filter((s) => s.present).length

  return (
    <div className="tablet">
      <header className="top">
        <div className="brand">
          Griha <small>today at home · {session?.household.name}</small>
        </div>
        <div className="top-right">
          <div className="toggle">
            <button className="active">Staff tablet</button>
            {preview ? (
              <button onClick={() => navigate('/')}>Owner app</button>
            ) : (
              <button onClick={logout}>Exit</button>
            )}
          </div>
        </div>
      </header>

      <section className="tablet-head">
        <div>
          <strong>{longDate(data.today)}</strong>
          <div className="small">Tap a task when it is complete.</div>
        </div>
        <div className="attendance-dots">
          {data.staff.map((s) => (
            <span key={s.id} title={s.name} className={s.present ? 'here' : ''}>
              {initials(s.name)}
            </span>
          ))}
        </div>
      </section>

      <section className="staff-shopping">
        <div>
          <h2>Shopping list</h2>
          <div className="small">
            Need something? Add it here for the owner to approve. {present}/{data.staff.length} here today.
          </div>
        </div>
        <div className="shopping-actions">
          {data.staff.map((s) => (
            <button key={s.id} className="button secondary" onClick={() => setShoppingFor(s)}>
              + {s.name} adds item
            </button>
          ))}
        </div>
      </section>

      <section className="staff-board">
        {data.staff.map((s) => {
          const assigned = data.tasks.filter((t) => t.assigneeId === s.id)
          const completed = assigned.filter((t) => t.done).length
          return (
            <article key={s.id} className={`staff-column ${s.color}`}>
              <header>
                <div className="cell-name">
                  <Avatar staff={s} />
                  <div>
                    <h2>{s.name}</h2>
                    <div className="small">
                      {s.role} · {completed}/{assigned.length} done
                    </div>
                  </div>
                </div>
                <StatusPill label={s.present ? 'Here' : 'Away'} tone={s.present ? 'green' : 'late'} />
              </header>
              <div className="column-tasks">
                {assigned.length ? (
                  assigned.map((t) => (
                    <div key={t.id} className={`board-task ${t.done ? 'done' : ''}`}>
                      <button
                        className={`check ${t.done ? 'done' : ''}`}
                        onClick={() => api.updateTask(t.id, { done: !t.done })}
                        aria-label={`Mark ${t.title} complete`}
                      />
                      <div className="grow">
                        <strong>{t.title}</strong>
                        <div className="small">
                          {t.due} · {t.recurring}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty">No tasks assigned today.</div>
                )}
              </div>
            </article>
          )
        })}
        {data.staff.length === 0 && <div className="empty">No staff yet. Add them in the owner app.</div>}
      </section>

      {shoppingFor && <StaffShoppingModal staff={shoppingFor} onClose={() => setShoppingFor(null)} />}
    </div>
  )
}

function StaffShoppingModal({ staff, onClose }: { staff: Staff; onClose: () => void }) {
  const [form, setForm] = useState({ item: '', qty: '' })
  const [busy, setBusy] = useState(false)
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    setBusy(true)
    try {
      await api.addShopping({ ...form, requestedBy: staff.name })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={`${staff.name} — request an item`}
      onClose={onClose}
      onSubmit={submit}
      submitLabel={busy ? 'Sending…' : 'Send to owner'}
    >
      <Field label="Item">
        <input value={form.item} onChange={(e) => set('item', e.target.value)} required />
      </Field>
      <Field label="Quantity">
        <input
          value={form.qty}
          onChange={(e) => set('qty', e.target.value)}
          placeholder="e.g. 2 kg"
          required
        />
      </Field>
    </Modal>
  )
}
