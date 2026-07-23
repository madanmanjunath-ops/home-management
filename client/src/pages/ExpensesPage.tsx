import { useState } from 'react'
import { api } from '../api'
import { useData, useStore } from '../store'
import { Card, Field, Modal, PageHeader, StatusPill } from '../components/ui'
import { rupees, shortDate, todayISO } from '../lib/format'
import type { ExpenseCategory } from '../types'

const CATEGORIES: ExpenseCategory[] = ['Groceries', 'Household', 'Utilities', 'Other']

export function ExpensesPage() {
  const data = useData()
  const [adding, setAdding] = useState(false)
  const staffName = (id: string | null) => (id ? (data.staff.find((s) => s.id === id)?.name ?? '—') : 'Owner')

  const month = todayISO().slice(0, 7)
  const monthTotal = data.expenses
    .filter((e) => e.date.slice(0, 7) === month)
    .reduce((a, e) => a + e.amount, 0)

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle="Track petty cash for groceries and errands."
        action={
          <button className="button" onClick={() => setAdding(true)}>
            + Log expense
          </button>
        }
      />

      <div className="grid metrics" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        <Card className="metric">
          <div className="label">Spent this month</div>
          <div className="value">{rupees(monthTotal)}</div>
          <div className="hint">
            {data.expenses.filter((e) => e.date.slice(0, 7) === month).length} entries
          </div>
        </Card>
        <Card className="metric">
          <div className="label">All-time logged</div>
          <div className="value">{rupees(data.expenses.reduce((a, e) => a + e.amount, 0))}</div>
          <div className="hint">{data.expenses.length} entries</div>
        </Card>
      </div>

      <Card>
        <table className="table">
          <thead>
            <tr>
              <th>DATE</th>
              <th>DESCRIPTION</th>
              <th>CATEGORY</th>
              <th>SPENT BY</th>
              <th>AMOUNT</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.expenses.map((e) => (
              <tr key={e.id}>
                <td>{shortDate(e.date)}</td>
                <td>
                  <strong>{e.description}</strong>
                </td>
                <td>
                  <StatusPill label={e.category} tone="neutral" />
                </td>
                <td>{staffName(e.staffId)}</td>
                <td>
                  <strong>{rupees(e.amount)}</strong>
                </td>
                <td>
                  <button className="text-button danger" onClick={() => api.deleteExpense(e.id)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.expenses.length === 0 && <div className="empty">No expenses logged yet.</div>}
      </Card>

      {adding && <ExpenseModal onClose={() => setAdding(false)} />}
    </>
  )
}

function ExpenseModal({ onClose }: { onClose: () => void }) {
  const data = useData()
  const { session } = useStore()
  const [form, setForm] = useState({
    amount: 0,
    description: '',
    category: 'Groceries' as ExpenseCategory,
    date: todayISO(),
    staffId: '',
  })
  const [busy, setBusy] = useState(false)
  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    setBusy(true)
    try {
      await api.addExpense({ ...form, staffId: form.staffId || null })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Log expense" onClose={onClose} onSubmit={submit} submitLabel={busy ? 'Saving…' : 'Save'}>
      <Field label="Amount (₹)">
        <input
          type="number"
          min={0}
          value={form.amount}
          onChange={(e) => set('amount', Number(e.target.value))}
          required
        />
      </Field>
      <Field label="Date">
        <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
      </Field>
      <Field label="Description" full>
        <input
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="e.g. Vegetables"
          required
        />
      </Field>
      <Field label="Category">
        <select value={form.category} onChange={(e) => set('category', e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      <Field label="Spent by">
        <select value={form.staffId} onChange={(e) => set('staffId', e.target.value)}>
          <option value="">{session?.user?.name ?? 'Owner'}</option>
          {data.staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
    </Modal>
  )
}
