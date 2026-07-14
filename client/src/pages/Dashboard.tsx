import { useNavigate } from 'react-router-dom'
import { useData, useStore } from '../store'
import { Avatar, Card, PageHeader } from '../components/ui'
import { TaskRow } from '../components/TaskRow'
import { rupeesShort, relativeTime } from '../lib/format'

export function Dashboard() {
  const data = useData()
  const { session } = useStore()
  const navigate = useNavigate()

  const complete = data.tasks.filter((t) => t.done).length
  const pending = data.tasks.length - complete
  const present = data.staff.filter((s) => s.present).length
  const shoppingPending = data.shopping.filter((s) => s.state === 'Pending').length
  const payroll = data.staff.reduce((a, s) => a + s.salary, 0)
  const notPresent = data.staff.length - present

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <>
      <PageHeader
        title={`${greeting}, ${session?.user?.name ?? 'there'}`}
        subtitle="Here’s how the home is doing today."
      />

      <div className="grid metrics">
        <Card className="metric">
          <div className="label">Staff present</div>
          <div className="value">
            {present}/{data.staff.length}
          </div>
          <div className={`hint ${notPresent ? 'warn' : ''}`}>
            {notPresent === 0 ? 'Everyone is in' : `${notPresent} not checked in`}
          </div>
        </Card>
        <Card className="metric">
          <div className="label">Tasks completed</div>
          <div className="value">
            {complete}/{data.tasks.length}
          </div>
          <div className="hint warn">{pending} still to do</div>
        </Card>
        <Card className="metric">
          <div className="label">Shopping requests</div>
          <div className="value">{shoppingPending}</div>
          <div className="hint warn">Awaiting approval</div>
        </Card>
        <Card className="metric">
          <div className="label">This month’s payroll</div>
          <div className="value">{rupeesShort(payroll)}</div>
          <div className="hint">{data.staff.length} staff</div>
        </Card>
      </div>

      <div className="grid split">
        <Card>
          <div className="header-row">
            <h2>Today’s tasks</h2>
            <button className="text-button" onClick={() => navigate('/tasks')}>
              View all
            </button>
          </div>
          {data.tasks.slice(0, 5).map((t) => (
            <TaskRow key={t.id} task={t} staff={data.staff} />
          ))}
          {data.tasks.length === 0 && <div className="empty">No tasks yet.</div>}
        </Card>

        <Card>
          <div className="header-row">
            <h2>Recent activity</h2>
            <button className="text-button" onClick={() => navigate('/notifications')}>
              View all
            </button>
          </div>
          <ul className="list">
            {data.notifications.slice(0, 5).map((n) => (
              <li key={n.id}>
                <Avatar symbol="✓" />
                <div className="grow">
                  {n.text}
                  <div className="small">{relativeTime(n.createdAt)}</div>
                </div>
              </li>
            ))}
            {data.notifications.length === 0 && <div className="empty">No activity yet.</div>}
          </ul>
        </Card>
      </div>
    </>
  )
}
