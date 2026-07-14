import { useState } from 'react'
import { api } from '../api'
import { useData } from '../store'
import { Avatar, Card, Field, Modal, PageHeader, StatusPill } from '../components/ui'
import { shortDate, todayISO } from '../lib/format'
import type { LeaveStatus } from '../types'

function tone(s: LeaveStatus): 'green' | 'pending' | 'late' {
  if (s === 'Approved') return 'green'
  if (s === 'Declined') return 'late'
  return 'pending'
}

export function LeavePage() {
  const data = useData()
  const [adding, setAdding] = useState(false)
  const staff = (id: string) => data.staff.find((s) => s.id === id)

  const pending = data.leaves.filter((l) => l.status === 'Pending')
  const others = data.leaves.filter((l) => l.status !== 'Pending')

  return (
    <>
      <PageHeader
        title="Leave & holidays"
        subtitle="Approve time off so absences aren’t flagged as missing."
        action={
          <button className="button" onClick={() => setAdding(true)} disabled={data.staff.length === 0}>
            + Request leave
          </button>
        }
      />

      <Card>
        <div className="header-row">
          <h2>Requests</h2>
        </div>
        {data.leaves.length === 0 && <div className="empty">No leave requests.</div>}
        {[...pending, ...others].map((l) => {
          const s = staff(l.staffId)
          return (
            <div className="task" key={l.id}>
              {s && <Avatar staff={s} />}
              <div className="grow">
                <strong>{s?.name ?? 'Unknown'}</strong>
                <div className="small">
                  {shortDate(l.startDate)} → {shortDate(l.endDate)} · {l.reason}
                </div>
              </div>
              <StatusPill label={l.status} tone={tone(l.status)} />
              <div className="actions">
                {l.status === 'Pending' ? (
                  <>
                    <button className="text-button" onClick={() => api.setLeaveStatus(l.id, 'Approved')}>
                      Approve
                    </button>
                    <button className="text-button danger" onClick={() => api.setLeaveStatus(l.id, 'Declined')}>
                      Decline
                    </button>
                  </>
                ) : (
                  <button className="text-button danger" onClick={() => api.deleteLeave(l.id)}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </Card>

      {adding && <LeaveModal onClose={() => setAdding(false)} />}
    </>
  )
}

function LeaveModal({ onClose }: { onClose: () => void }) {
  const data = useData()
  const [form, setForm] = useState({
    staffId: data.staff[0]?.id ?? '',
    startDate: todayISO(),
    endDate: todayISO(),
    reason: '',
  })
  const [busy, setBusy] = useState(false)
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    setBusy(true)
    try {
      await api.addLeave(form)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Request leave" onClose={onClose} onSubmit={submit} submitLabel={busy ? 'Saving…' : 'Save'}>
      <Field label="Staff member" full>
        <select value={form.staffId} onChange={(e) => set('staffId', e.target.value)}>
          {data.staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="From">
        <input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} required />
      </Field>
      <Field label="To">
        <input type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} required />
      </Field>
      <Field label="Reason" full>
        <input value={form.reason} onChange={(e) => set('reason', e.target.value)} placeholder="e.g. Family function" required />
      </Field>
    </Modal>
  )
}
