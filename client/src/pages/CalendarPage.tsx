import { useState } from 'react'
import { useData } from '../store'
import { Card, PageHeader } from '../components/ui'
import { rupeesShort } from '../lib/format'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function CalendarPage() {
  const data = useData()
  const now = new Date(data.today + 'T00:00:00')
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() })

  const first = new Date(cursor.year, cursor.month, 1)
  const startWeekday = first.getDay()
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
  const monthName = first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  const staffName = (id: string) => data.staff.find((s) => s.id === id)?.name ?? 'Staff'

  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const shift = (delta: number) => {
    setCursor((c) => {
      const m = c.month + delta
      return { year: c.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 }
    })
  }

  return (
    <>
      <PageHeader
        title="Calendar"
        subtitle="Tasks, leave and salary at a glance."
        action={
          <div className="toggle">
            <button onClick={() => shift(-1)}>‹</button>
            <button className="active" style={{ minWidth: 140 }}>
              {monthName}
            </button>
            <button onClick={() => shift(1)}>›</button>
          </div>
        }
      />

      <Card>
        <div className="calendar">
          {WEEKDAYS.map((w) => (
            <div key={w} className="cal-head">
              {w}
            </div>
          ))}
          {cells.map((day, idx) => {
            if (day === null) return <div key={`b${idx}`} className="day blank" />
            const date = iso(cursor.year, cursor.month, day)
            const isToday = date === data.today

            const leaves = data.leaves.filter(
              (l) => l.status !== 'Declined' && l.startDate <= date && date <= l.endDate
            )
            const expenses = data.expenses.filter((e) => e.date === date)
            const payday = day === 1

            return (
              <div key={date} className={`day ${isToday ? 'today' : ''}`}>
                <div className="daynum">{day}</div>
                {payday && <span className="event salary">Payroll due</span>}
                {leaves.map((l) => (
                  <span key={l.id} className="event leave" title={`${staffName(l.staffId)} — ${l.reason}`}>
                    🌴 {staffName(l.staffId)}
                  </span>
                ))}
                {expenses.map((e) => (
                  <span key={e.id} className="event" title={e.description}>
                    {rupeesShort(e.amount)} {e.description}
                  </span>
                ))}
              </div>
            )
          })}
        </div>
      </Card>
    </>
  )
}
