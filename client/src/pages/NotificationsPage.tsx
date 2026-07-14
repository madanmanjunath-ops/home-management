import { api } from '../api'
import { useData } from '../store'
import { Card, PageHeader } from '../components/ui'
import { relativeTime } from '../lib/format'

export function NotificationsPage() {
  const data = useData()
  const hasUnread = data.notifications.some((n) => !n.read)

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="A quiet feed of what needs your attention."
        action={
          <button className="button secondary" onClick={() => api.readAllNotifications()} disabled={!hasUnread}>
            Mark all read
          </button>
        }
      />

      <Card>
        <ul className="list">
          {data.notifications.map((n) => (
            <li key={n.id}>
              <div className={`avatar ${n.read ? '' : 'green'}`}>{n.read ? '·' : '!'}</div>
              <div className="grow">
                <strong>{n.text}</strong>
                <div className="small">{relativeTime(n.createdAt)}</div>
              </div>
              {!n.read && <span className="pill">New</span>}
            </li>
          ))}
        </ul>
        {data.notifications.length === 0 && <div className="empty">Nothing yet.</div>}
      </Card>
    </>
  )
}
