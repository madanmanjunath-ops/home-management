import { useState } from 'react'
import { api } from '../api'
import { useData } from '../store'
import { Avatar, Card, Field, Modal, PageHeader, StatusPill } from '../components/ui'
import { rupees } from '../lib/format'
import type { Staff } from '../types'

const ROLES = ['Housekeeper', 'Cook', 'Nanny', 'Driver', 'Gardener', 'Caretaker']
const LANGUAGES = ['Kannada', 'Hindi', 'Tamil', 'Telugu', 'Malayalam', 'English']

export function StaffPage() {
  const data = useData()
  const [editing, setEditing] = useState<Staff | 'new' | null>(null)
  const [search, setSearch] = useState('')

  const list = data.staff.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      <PageHeader
        title="Your staff"
        subtitle="Profiles, roles and contact details."
        action={
          <button className="button" onClick={() => setEditing('new')}>
            + Add staff member
          </button>
        }
      />

      <Card>
        <div className="toolbar">
          <input
            className="search"
            placeholder="Search staff"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>STAFF MEMBER</th>
              <th>ROLE &amp; LANGUAGE</th>
              <th>PHONE</th>
              <th>SALARY</th>
              <th>STATUS</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id}>
                <td>
                  <div className="cell-name">
                    <Avatar staff={s} />
                    <strong>{s.name}</strong>
                  </div>
                </td>
                <td>
                  {s.role}
                  <div className="small">{s.language}</div>
                </td>
                <td>{s.phone}</td>
                <td>{rupees(s.salary)}</td>
                <td>
                  <StatusPill
                    label={s.present ? 'Present' : 'Not checked in'}
                    tone={s.present ? 'green' : 'late'}
                  />
                </td>
                <td>
                  <button className="text-button" onClick={() => setEditing(s)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <div className="empty">No staff found.</div>}
      </Card>

      {editing && <StaffModal staff={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function StaffModal({ staff, onClose }: { staff: Staff | null; onClose: () => void }) {
  const [form, setForm] = useState({
    name: staff?.name ?? '',
    role: staff?.role ?? ROLES[0],
    phone: staff?.phone ?? '',
    language: staff?.language ?? LANGUAGES[0],
    salary: staff?.salary ?? 15000,
    color: staff?.color ?? 'clay',
  })
  const [busy, setBusy] = useState(false)

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    setBusy(true)
    try {
      if (staff) await api.updateStaff(staff.id, form)
      else await api.addStaff(form)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!staff) return
    if (!confirm(`Remove ${staff.name}? This deletes their tasks, attendance and records.`)) return
    await api.deleteStaff(staff.id)
    onClose()
  }

  return (
    <Modal
      title={staff ? 'Edit staff member' : 'Add staff member'}
      onClose={onClose}
      onSubmit={submit}
      submitLabel={busy ? 'Saving…' : 'Save'}
      notice="Photo, Aadhaar scan and OTP verification need a secure integration. This profile captures the operational details first."
    >
      <Field label="Full name">
        <input value={form.name} onChange={(e) => set('name', e.target.value)} required />
      </Field>
      <Field label="Role">
        <select value={form.role} onChange={(e) => set('role', e.target.value)}>
          {ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </Field>
      <Field label="Phone number">
        <input
          value={form.phone}
          onChange={(e) => set('phone', e.target.value)}
          placeholder="98765 43210"
          required
        />
      </Field>
      <Field label="Language">
        <select value={form.language} onChange={(e) => set('language', e.target.value)}>
          {LANGUAGES.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </Field>
      <Field label="Monthly salary (₹)">
        <input
          type="number"
          value={form.salary}
          onChange={(e) => set('salary', Number(e.target.value))}
          min={0}
          required
        />
      </Field>
      <Field label="Profile colour">
        <select value={form.color} onChange={(e) => set('color', e.target.value)}>
          <option value="clay">Terracotta</option>
          <option value="green">Green</option>
          <option value="blue">Blue</option>
        </select>
      </Field>
      {staff && (
        <div className="full">
          <button type="button" className="text-button danger" onClick={remove}>
            Remove staff member
          </button>
        </div>
      )}
    </Modal>
  )
}
