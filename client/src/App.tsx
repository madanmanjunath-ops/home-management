import { Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store'
import { Login } from './auth/Login'
import { OwnerLayout } from './components/OwnerLayout'
import { Dashboard } from './pages/Dashboard'
import { StaffPage } from './pages/StaffPage'
import { TasksPage } from './pages/TasksPage'
import { AttendancePage } from './pages/AttendancePage'
import { ShoppingPage } from './pages/ShoppingPage'
import { SalaryPage } from './pages/SalaryPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { LeavePage } from './pages/LeavePage'
import { ExpensesPage } from './pages/ExpensesPage'
import { CalendarPage } from './pages/CalendarPage'
import { TabletApp } from './tablet/TabletApp'

export function App() {
  const { session, state, loading } = useStore()

  if (!session) return <Login />

  if (loading || !state) {
    return (
      <div className="boot">
        <div className="boot-brand">Griha</div>
        <div className="small">Loading your home…</div>
      </div>
    )
  }

  if (session.role === 'tablet') return <TabletApp />

  return (
    <Routes>
      {/* Owner preview of the staff tablet (same session). */}
      <Route path="/tablet" element={<TabletApp preview />} />
      <Route element={<OwnerLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/staff" element={<StaffPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/shopping" element={<ShoppingPage />} />
        <Route path="/salary" element={<SalaryPage />} />
        <Route path="/leave" element={<LeavePage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
