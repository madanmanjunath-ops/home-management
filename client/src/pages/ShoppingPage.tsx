import { useState } from 'react'
import { api } from '../api'
import { useData, useStore } from '../store'
import { Card, Field, Modal, PageHeader, StatusPill } from '../components/ui'
import type { ShoppingState } from '../types'

function tone(state: ShoppingState): 'green' | 'pending' | 'late' | 'neutral' {
  if (state === 'Pending') return 'pending'
  if (state === 'Rejected') return 'late'
  if (state === 'Purchased') return 'neutral'
  return 'green'
}

export function ShoppingPage() {
  const data = useData()
  const { session } = useStore()
  const [adding, setAdding] = useState(false)

  return (
    <>
      <PageHeader
        title="Shopping list"
        subtitle="Approve requests before they become errands."
        action={
          <button className="button" onClick={() => setAdding(true)}>
            + Add item
          </button>
        }
      />

      <Card>
        <table className="table">
          <thead>
            <tr>
              <th>ITEM</th>
              <th>QUANTITY</th>
              <th>REQUESTED BY</th>
              <th>STATUS</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.shopping.map((i) => (
              <tr key={i.id}>
                <td>
                  <strong>{i.item}</strong>
                </td>
                <td>{i.qty}</td>
                <td>{i.requestedBy}</td>
                <td>
                  <StatusPill label={i.state} tone={tone(i.state)} />
                </td>
                <td>
                  <div className="actions">
                    {i.state === 'Pending' && (
                      <>
                        <button className="text-button" onClick={() => api.setShoppingState(i.id, 'Approved')}>
                          Approve
                        </button>
                        <button className="text-button danger" onClick={() => api.setShoppingState(i.id, 'Rejected')}>
                          Reject
                        </button>
                      </>
                    )}
                    {i.state === 'Approved' && (
                      <button className="text-button" onClick={() => api.setShoppingState(i.id, 'Purchased')}>
                        Mark purchased
                      </button>
                    )}
                    <button className="text-button danger" onClick={() => api.deleteShopping(i.id)}>
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.shopping.length === 0 && <div className="empty">No shopping requests yet.</div>}
      </Card>

      {adding && (
        <ShoppingModal defaultBy={session?.user?.name ?? 'Owner'} onClose={() => setAdding(false)} />
      )}
    </>
  )
}

function ShoppingModal({ defaultBy, onClose }: { defaultBy: string; onClose: () => void }) {
  const data = useData()
  const [form, setForm] = useState({ item: '', qty: '', requestedBy: defaultBy })
  const [busy, setBusy] = useState(false)
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    setBusy(true)
    try {
      await api.addShopping(form)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const names = [defaultBy, ...data.staff.map((s) => s.name)]

  return (
    <Modal title="Add shopping item" onClose={onClose} onSubmit={submit} submitLabel={busy ? 'Saving…' : 'Save'}>
      <Field label="Item">
        <input value={form.item} onChange={(e) => set('item', e.target.value)} required />
      </Field>
      <Field label="Quantity">
        <input value={form.qty} onChange={(e) => set('qty', e.target.value)} placeholder="e.g. 2 kg" required />
      </Field>
      <Field label="Requested by" full>
        <select value={form.requestedBy} onChange={(e) => set('requestedBy', e.target.value)}>
          {names.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </Field>
    </Modal>
  )
}
