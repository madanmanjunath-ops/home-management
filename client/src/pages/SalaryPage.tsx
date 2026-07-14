import { useState } from 'react'
import { api } from '../api'
import { useData } from '../store'
import { Card, Field, Modal, Notice, PageHeader, StatusPill } from '../components/ui'
import { monthLabel, rupees, todayISO } from '../lib/format'
import type { Staff } from '../types'

export function SalaryPage() {
  const data = useData()
  const month = todayISO().slice(0, 7)
  const [advanceFor, setAdvanceFor] = useState<Staff | null>(null)

  const rows = data.staff.map((s) => {
    const p = data.payroll.find((row) => row.staffId === s.id)
    const advance = p?.advance ?? 0
    return {
      staff: s,
      base: s.salary,
      advance,
      net: Math.max(0, s.salary - advance),
      status: p?.status ?? 'Scheduled',
    }
  })
  const totalNet = rows.reduce((a, r) => a + r.net, 0)
  const allPaid = rows.length > 0 && rows.every((r) => r.status === 'Paid')

  return (
    <>
      <PageHeader
        title="Salary"
        subtitle="Monthly payroll, advances and records."
        action={
          <button className="button" onClick={() => api.payPayroll(month)} disabled={allPaid}>
            {allPaid ? 'All paid' : `Mark ${monthLabel(month).split(' ')[0]} paid`}
          </button>
        }
      />

      <Notice>
        Payments are tracked locally. Connect a payment provider before issuing real payouts.
      </Notice>

      <Card>
        <div className="header-row">
          <h2>{monthLabel(month)} payroll</h2>
          <span className="pill">{rupees(totalNet)} net</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>STAFF</th>
              <th>BASE SALARY</th>
              <th>ADVANCE</th>
              <th>NET PAYABLE</th>
              <th>STATUS</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.staff.id}>
                <td>
                  <strong>{r.staff.name}</strong>
                  <div className="small">{r.staff.role}</div>
                </td>
                <td>{rupees(r.base)}</td>
                <td>{rupees(r.advance)}</td>
                <td>
                  <strong>{rupees(r.net)}</strong>
                </td>
                <td>
                  <StatusPill label={r.status} tone={r.status === 'Paid' ? 'green' : 'pending'} />
                </td>
                <td>
                  <button className="text-button" onClick={() => setAdvanceFor(r.staff)}>
                    Set advance
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="empty">Add staff to run payroll.</div>}
      </Card>

      {advanceFor && <AdvanceModal staff={advanceFor} current={data.payroll.find((p) => p.staffId === advanceFor.id)?.advance ?? 0} onClose={() => setAdvanceFor(null)} />}
    </>
  )
}

function AdvanceModal({ staff, current, onClose }: { staff: Staff; current: number; onClose: () => void }) {
  const [advance, setAdvance] = useState(current)
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    setBusy(true)
    try {
      await api.setAdvance(staff.id, advance)
      onClose()
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title={`Advance for ${staff.name}`} onClose={onClose} onSubmit={submit} submitLabel={busy ? 'Saving…' : 'Save'}>
      <Field label="Advance amount (₹)" full>
        <input type="number" min={0} max={staff.salary} value={advance} onChange={(e) => setAdvance(Number(e.target.value))} />
      </Field>
      <div className="full small">Net payable becomes {rupees(Math.max(0, staff.salary - advance))}.</div>
    </Modal>
  )
}
