import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useData, useStore } from '../store'

const NAV: [string, string, string][] = [
  ['/', '⌂', 'Overview'],
  ['/staff', '♟', 'Staff'],
  ['/tasks', '✓', 'Tasks'],
  ['/attendance', '◷', 'Attendance'],
  ['/shopping', '◈', 'Shopping'],
  ['/salary', '₹', 'Salary'],
  ['/leave', '☂', 'Leave'],
  ['/expenses', '▤', 'Expenses'],
  ['/calendar', '▦', 'Calendar'],
  ['/documents', '▣', 'Documents'],
  ['/notifications', '●', 'Notifications'],
]

export function OwnerLayout() {
  const { session, logout, connected } = useStore()
  const data = useData()
  const navigate = useNavigate()
  const unread = data.notifications.filter((n) => !n.read).length

  return (
    <div className="app">
      <header className="top">
        <div>
          <div className="brand">
            Griha <small>{session?.household.name}</small>
          </div>
        </div>
        <div className="top-right">
          <div className="toggle">
            <button className="active">Owner app</button>
            <button onClick={() => navigate('/tablet')}>Staff tablet</button>
          </div>
          <span className={`dot ${connected ? 'live' : ''}`} title={connected ? 'Live' : 'Reconnecting…'} />
          <button className="text-button" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>
      <div className="layout">
        <nav className="nav">
          {NAV.map(([path, icon, label]) => (
            <NavLink key={path} to={path} end={path === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="icon">{icon}</span>
              {label}
              {path === '/notifications' && unread > 0 ? ' •' : ''}
            </NavLink>
          ))}
        </nav>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
