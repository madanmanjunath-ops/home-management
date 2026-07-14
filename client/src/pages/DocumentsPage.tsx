import { useState } from 'react'
import { api } from '../api'
import { useData } from '../store'
import { Card, Field, Modal, Notice, PageHeader } from '../components/ui'
import { shortDate } from '../lib/format'

const DOC_TYPES = ['Aadhaar', 'PAN', 'Police verification', 'Medical report', 'Reference letter']

export function DocumentsPage() {
  const data = useData()
  const [adding, setAdding] = useState(false)
  const staffName = (id: string) => data.staff.find((s) => s.id === id)?.name ?? '—'

  return (
    <>
      <PageHeader
        title="Documents"
        subtitle="Private records for your household team."
        action={
          <button className="button" onClick={() => setAdding(true)} disabled={data.staff.length === 0}>
            + Add document
          </button>
        }
      />

      <Notice>
        Use encrypted cloud storage and role-based access before uploading identity documents in production.
      </Notice>

      <Card>
        {data.documents.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>DOCUMENT</th>
                <th>STAFF</th>
                <th>EXPIRY</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.documents.map((d) => (
                <tr key={d.id}>
                  <td>
                    <strong>{d.type}</strong>
                  </td>
                  <td>{staffName(d.staffId)}</td>
                  <td>{d.expiry ? shortDate(d.expiry) : '—'}</td>
                  <td>
                    <button className="text-button danger" onClick={() => api.deleteDocument(d.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">No documents added yet.</div>
        )}
      </Card>

      {adding && <DocumentModal onClose={() => setAdding(false)} />}
    </>
  )
}

function DocumentModal({ onClose }: { onClose: () => void }) {
  const data = useData()
  const [form, setForm] = useState({ type: DOC_TYPES[0], staffId: data.staff[0]?.id ?? '', expiry: '' })
  const [busy, setBusy] = useState(false)
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    setBusy(true)
    try {
      await api.addDocument({ ...form, expiry: form.expiry || null })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Add document" onClose={onClose} onSubmit={submit} submitLabel={busy ? 'Saving…' : 'Save'}>
      <Field label="Document type">
        <select value={form.type} onChange={(e) => set('type', e.target.value)}>
          {DOC_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </Field>
      <Field label="Staff member">
        <select value={form.staffId} onChange={(e) => set('staffId', e.target.value)}>
          {data.staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Expiry date (optional)" full>
        <input type="date" value={form.expiry} onChange={(e) => set('expiry', e.target.value)} />
      </Field>
    </Modal>
  )
}
