// In-browser mock of the Griha backend, used only for the hosted preview build
// (VITE_DEMO). It seeds the same demo data as the server and mirrors each route's
// effect on an in-memory snapshot, emitting a change event so the store refreshes
// exactly like the real WebSocket would.
import type { HouseholdState } from '../types'

export const DEMO = (import.meta as unknown as { env?: Record<string, unknown> }).env?.VITE_DEMO === 'true'

type Listener = () => void
const listeners = new Set<Listener>()
export function subscribeDemo(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
function emit() {
  listeners.forEach((l) => l())
}

let counter = 1000
const id = (p: string) => `${p}${counter++}`
const todayISO = () => new Date().toISOString().slice(0, 10)
const monthISO = () => new Date().toISOString().slice(0, 7)
function addDays(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
function nowHM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

interface Store {
  staff: any[]
  tasks: any[]
  attendance: any[]
  shopping: any[]
  documents: any[]
  notifications: any[]
  leaves: any[]
  expenses: any[]
  payroll: any[]
}

const S: Store = seed()

function seed(): Store {
  const shanta = {
    id: 'st_shanta',
    name: 'Shanta',
    role: 'Housekeeper',
    phone: '98450 12345',
    language: 'Kannada',
    color: 'clay',
    salary: 18000,
    present: true,
  }
  const ravi = {
    id: 'st_ravi',
    name: 'Ravi',
    role: 'Cook',
    phone: '98451 55432',
    language: 'Hindi',
    color: 'green',
    salary: 22000,
    present: true,
  }
  const lakshmi = {
    id: 'st_lakshmi',
    name: 'Lakshmi',
    role: 'Nanny',
    phone: '99021 88419',
    language: 'Tamil',
    color: 'blue',
    salary: 20000,
    present: false,
  }
  const month = monthISO()
  return {
    staff: [shanta, ravi, lakshmi],
    tasks: [
      {
        id: id('tk_'),
        title: 'Clean the living room',
        assigneeId: shanta.id,
        due: '09:30',
        recurring: 'Daily',
        done: true,
      },
      {
        id: id('tk_'),
        title: 'Prepare lunch',
        assigneeId: ravi.id,
        due: '12:30',
        recurring: 'Daily',
        done: false,
      },
      {
        id: id('tk_'),
        title: 'Water balcony plants',
        assigneeId: shanta.id,
        due: '16:00',
        recurring: 'Mon, Wed, Fri',
        done: false,
      },
      {
        id: id('tk_'),
        title: 'Organise children’s books',
        assigneeId: lakshmi.id,
        due: '17:00',
        recurring: 'Once',
        done: false,
      },
    ],
    attendance: [
      { id: id('at_'), staffId: shanta.id, date: todayISO(), checkIn: '09:00', checkOut: null },
      { id: id('at_'), staffId: ravi.id, date: todayISO(), checkIn: '08:45', checkOut: null },
    ],
    shopping: [
      { id: id('sh_'), item: 'Basmati rice', qty: '5 kg', requestedBy: 'Ravi', state: 'Pending' },
      { id: id('sh_'), item: 'Dish soap', qty: '2 bottles', requestedBy: 'Shanta', state: 'Approved' },
      { id: id('sh_'), item: 'Bananas', qty: '12', requestedBy: 'Ravi', state: 'Purchased' },
    ],
    documents: [],
    notifications: [
      {
        id: id('nt_'),
        text: 'Ravi completed “Clean kitchen counters”',
        read: false,
        createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
      },
      {
        id: id('nt_'),
        text: 'Lakshmi has not checked in today',
        read: false,
        createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
      },
    ],
    leaves: [
      {
        id: id('lv_'),
        staffId: lakshmi.id,
        startDate: addDays(2),
        endDate: addDays(4),
        reason: 'Family function',
        status: 'Pending',
      },
    ],
    expenses: [
      {
        id: id('ex_'),
        amount: 850,
        description: 'Vegetables & fruit',
        category: 'Groceries',
        date: addDays(-1),
        staffId: ravi.id,
      },
      {
        id: id('ex_'),
        amount: 1200,
        description: 'Cleaning supplies',
        category: 'Household',
        date: addDays(-3),
        staffId: shanta.id,
      },
    ],
    payroll: [shanta, ravi, lakshmi].map((s) => ({
      id: id('pr_'),
      staffId: s.id,
      month,
      base: s.salary,
      advance: 0,
      net: s.salary,
      status: 'Scheduled',
    })),
  }
}

function notify(text: string) {
  S.notifications.unshift({ id: id('nt_'), text, read: false, createdAt: new Date().toISOString() })
}

const household = { id: 'h_demo', name: 'Madan’s Home', joinCode: 'HOME24' }
const owner = { id: 'u_demo', name: 'Madan', email: 'owner@griha.app' }

function snapshot(): HouseholdState {
  const today = todayISO()
  const month = monthISO()
  return {
    today,
    staff: [...S.staff],
    tasks: [...S.tasks],
    attendance: S.attendance.filter((a) => a.date === today),
    shopping: [...S.shopping],
    documents: [...S.documents],
    notifications: [...S.notifications],
    leaves: [...S.leaves],
    expenses: [...S.expenses].sort((a, b) => (a.date < b.date ? 1 : -1)),
    payroll: S.payroll.filter((p) => p.month === month),
  } as HouseholdState
}

function staffName(sid: string | null): string {
  return S.staff.find((s) => s.id === sid)?.name ?? 'Someone'
}

// Route the request to the right in-memory handler. Mirrors server/src/routes/*.
export async function demoHandle(path: string, method: string, body?: any): Promise<any> {
  const m = method.toUpperCase()

  // --- Auth ---
  if (path === '/auth/login') return { token: 'demo', role: 'owner', user: owner, household }
  if (path === '/auth/register') return { token: 'demo', role: 'owner', user: owner, household }
  if (path === '/auth/tablet') return { token: 'demo', role: 'tablet', household }
  if (path === '/auth/me') return { role: 'owner', user: owner, household }

  // --- Snapshot ---
  if (path === '/state') return snapshot()

  let out: any = { ok: true }

  // --- Staff ---
  if (path === '/staff' && m === 'POST') {
    const s = { id: id('st_'), present: false, color: 'clay', ...body, salary: Number(body.salary) }
    S.staff.push(s)
    notify(`${s.name} was added to your staff`)
    out = s
  } else if (path.startsWith('/staff/') && m === 'PUT') {
    const s = S.staff.find((x) => x.id === path.split('/')[2])
    if (s) Object.assign(s, body, body.salary != null ? { salary: Number(body.salary) } : {})
    if (s) notify(`${s.name}’s profile was updated`)
    out = s
  } else if (path.startsWith('/staff/') && m === 'DELETE') {
    const sid = path.split('/')[2]
    S.staff = S.staff.filter((x) => x.id !== sid)
    S.tasks = S.tasks.filter((t) => t.assigneeId !== sid)
    S.attendance = S.attendance.filter((a) => a.staffId !== sid)
  }

  // --- Tasks ---
  else if (path === '/tasks' && m === 'POST') {
    const t = { id: id('tk_'), done: false, due: '10:00', recurring: 'Once', ...body }
    S.tasks.push(t)
    notify(`New task assigned${t.assigneeId ? ` to ${staffName(t.assigneeId)}` : ''}: “${t.title}”`)
    out = t
  } else if (path.startsWith('/tasks/') && m === 'PATCH') {
    const t = S.tasks.find((x) => x.id === path.split('/')[2])
    if (t) {
      const wasDone = t.done
      Object.assign(t, body)
      if (body.done === true && !wasDone) notify(`${staffName(t.assigneeId)} completed “${t.title}”`)
    }
    out = t
  } else if (path.startsWith('/tasks/') && m === 'DELETE') {
    S.tasks = S.tasks.filter((x) => x.id !== path.split('/')[2])
  }

  // --- Attendance ---
  else if (path === '/attendance/check-in') {
    const s = S.staff.find((x) => x.id === body.staffId)
    if (s) {
      s.present = true
      const a = S.attendance.find((x) => x.staffId === s.id && x.date === todayISO())
      if (a) a.checkIn = nowHM()
      else
        S.attendance.push({
          id: id('at_'),
          staffId: s.id,
          date: todayISO(),
          checkIn: nowHM(),
          checkOut: null,
        })
      notify(`${s.name} checked in`)
    }
  } else if (path === '/attendance/check-out') {
    const s = S.staff.find((x) => x.id === body.staffId)
    const a = S.attendance.find((x) => x.staffId === body.staffId && x.date === todayISO())
    if (a) a.checkOut = nowHM()
    if (s) s.present = false
  } else if (path === '/attendance/check-all') {
    S.staff.forEach((s) => {
      if (!S.attendance.find((a) => a.staffId === s.id && a.date === todayISO())) {
        S.attendance.push({
          id: id('at_'),
          staffId: s.id,
          date: todayISO(),
          checkIn: nowHM(),
          checkOut: null,
        })
        s.present = true
      }
    })
  }

  // --- Shopping ---
  else if (path === '/shopping' && m === 'POST') {
    const it = { id: id('sh_'), state: 'Pending', ...body }
    S.shopping.unshift(it)
    notify(`${it.requestedBy} requested ${it.item}`)
    out = it
  } else if (path.startsWith('/shopping/') && m === 'PATCH') {
    const it = S.shopping.find((x) => x.id === path.split('/')[2])
    if (it) {
      it.state = body.state
      notify(`Shopping request for ${it.item} was ${it.state.toLowerCase()}`)
    }
    out = it
  } else if (path.startsWith('/shopping/') && m === 'DELETE') {
    S.shopping = S.shopping.filter((x) => x.id !== path.split('/')[2])
  }

  // --- Documents ---
  else if (path === '/documents' && m === 'POST') {
    const d = { id: id('dc_'), expiry: null, ...body }
    S.documents.unshift(d)
    notify(`${d.type} added for ${staffName(d.staffId)}`)
    out = d
  } else if (path.startsWith('/documents/') && m === 'DELETE') {
    S.documents = S.documents.filter((x) => x.id !== path.split('/')[2])
  }

  // --- Notifications ---
  else if (path === '/notifications/read-all') {
    S.notifications.forEach((n) => (n.read = true))
  }

  // --- Leaves ---
  else if (path === '/leaves' && m === 'POST') {
    const l = { id: id('lv_'), status: 'Pending', ...body }
    S.leaves.push(l)
    notify(`${staffName(l.staffId)} requested leave (${l.startDate} → ${l.endDate})`)
    out = l
  } else if (path.startsWith('/leaves/') && m === 'PATCH') {
    const l = S.leaves.find((x) => x.id === path.split('/')[2])
    if (l) {
      l.status = body.status
      notify(`${staffName(l.staffId)}’s leave was ${l.status.toLowerCase()}`)
    }
    out = l
  } else if (path.startsWith('/leaves/') && m === 'DELETE') {
    S.leaves = S.leaves.filter((x) => x.id !== path.split('/')[2])
  }

  // --- Expenses ---
  else if (path === '/expenses' && m === 'POST') {
    const e = { id: id('ex_'), staffId: null, ...body, amount: Number(body.amount) }
    S.expenses.unshift(e)
    out = e
  } else if (path.startsWith('/expenses/') && m === 'DELETE') {
    S.expenses = S.expenses.filter((x) => x.id !== path.split('/')[2])
  }

  // --- Payroll ---
  else if (path === '/payroll/pay') {
    const month = body?.month || monthISO()
    S.staff.forEach((s) => {
      let row = S.payroll.find((p) => p.staffId === s.id && p.month === month)
      const advance = row?.advance ?? 0
      if (!row) {
        row = {
          id: id('pr_'),
          staffId: s.id,
          month,
          base: s.salary,
          advance,
          net: s.salary - advance,
          status: 'Paid',
        }
        S.payroll.push(row)
      } else {
        row.status = 'Paid'
        row.base = s.salary
        row.net = Math.max(0, s.salary - advance)
      }
    })
    notify(`Payroll for ${month} marked as paid`)
  } else if (path === '/payroll/advance') {
    const month = body.month || monthISO()
    const s = S.staff.find((x) => x.id === body.staffId)
    if (s) {
      let row = S.payroll.find((p) => p.staffId === s.id && p.month === month)
      const advance = Number(body.advance)
      if (!row) {
        row = {
          id: id('pr_'),
          staffId: s.id,
          month,
          base: s.salary,
          advance,
          net: Math.max(0, s.salary - advance),
          status: 'Scheduled',
        }
        S.payroll.push(row)
      } else {
        row.advance = advance
        row.net = Math.max(0, s.salary - advance)
      }
      out = row
    }
  }

  // Any mutation triggers a refresh, mirroring the real WebSocket 'sync'.
  if (path !== '/state') emit()
  return out
}
