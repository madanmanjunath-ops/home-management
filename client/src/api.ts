import type { HouseholdState, Session } from './types'
import { DEMO, demoHandle } from './demo/mock'

let token: string | null = null

export function setToken(t: string | null) {
  token = t
}

// The store registers a callback here so any mutation immediately refreshes the
// household snapshot (instead of waiting for the next poll). This is what makes
// clicks — like toggling a task — feel instant.
let onChange: (() => void) | null = null
export function setOnChange(fn: (() => void) | null) {
  onChange = fn
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase()

  // Hosted preview build: serve everything from the in-browser mock, no network.
  if (DEMO) {
    const body = options.body ? JSON.parse(options.body as string) : undefined
    const result = (await demoHandle(path, method, body)) as T
    if (method !== 'GET') onChange?.()
    return result
  }

  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    let message = 'Request failed'
    let detail: string | undefined
    try {
      const body = await res.json()
      message = body.error || message
      detail = body.detail
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status, detail)
  }
  const data = res.status === 204 ? (undefined as T) : ((await res.json()) as T)
  if (method !== 'GET') onChange?.()
  return data
}

export class ApiError extends Error {
  status: number
  detail?: string
  constructor(message: string, status: number, detail?: string) {
    super(message)
    this.status = status
    this.detail = detail
  }
}

export const api = {
  // --- Auth ---
  // Owner: create the household after Supabase sign-up (idempotent).
  bootstrap: (payload: { name: string; householdName: string }) =>
    request<{ role: 'owner'; user: Session['user']; household: Session['household'] }>('/auth/bootstrap', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  // Staff tablet: exchange a join code for a scoped token.
  tablet: (joinCode: string) =>
    request<{ role: 'tablet'; token: string; household: Session['household'] }>('/auth/tablet', {
      method: 'POST',
      body: JSON.stringify({ joinCode }),
    }),
  me: () =>
    request<{
      role: string
      user?: Session['user']
      household?: Session['household']
      needsBootstrap?: boolean
    }>('/auth/me'),

  // --- Snapshot ---
  state: () => request<HouseholdState>('/state'),

  // --- Staff ---
  addStaff: (data: Record<string, unknown>) =>
    request('/staff', { method: 'POST', body: JSON.stringify(data) }),
  updateStaff: (id: string, data: Record<string, unknown>) =>
    request(`/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStaff: (id: string) => request(`/staff/${id}`, { method: 'DELETE' }),

  // --- Tasks ---
  addTask: (data: Record<string, unknown>) =>
    request('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: string, data: Record<string, unknown>) =>
    request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTask: (id: string) => request(`/tasks/${id}`, { method: 'DELETE' }),

  // --- Attendance ---
  checkIn: (staffId: string) =>
    request('/attendance/check-in', { method: 'POST', body: JSON.stringify({ staffId }) }),
  checkOut: (staffId: string) =>
    request('/attendance/check-out', { method: 'POST', body: JSON.stringify({ staffId }) }),
  checkAll: () => request('/attendance/check-all', { method: 'POST' }),

  // --- Shopping ---
  addShopping: (data: Record<string, unknown>) =>
    request('/shopping', { method: 'POST', body: JSON.stringify(data) }),
  setShoppingState: (id: string, state: string) =>
    request(`/shopping/${id}`, { method: 'PATCH', body: JSON.stringify({ state }) }),
  deleteShopping: (id: string) => request(`/shopping/${id}`, { method: 'DELETE' }),

  // --- Documents ---
  addDocument: (data: Record<string, unknown>) =>
    request('/documents', { method: 'POST', body: JSON.stringify(data) }),
  deleteDocument: (id: string) => request(`/documents/${id}`, { method: 'DELETE' }),

  // --- Notifications ---
  readAllNotifications: () => request('/notifications/read-all', { method: 'POST' }),

  // --- Leaves ---
  addLeave: (data: Record<string, unknown>) =>
    request('/leaves', { method: 'POST', body: JSON.stringify(data) }),
  setLeaveStatus: (id: string, status: string) =>
    request(`/leaves/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteLeave: (id: string) => request(`/leaves/${id}`, { method: 'DELETE' }),

  // --- Expenses ---
  addExpense: (data: Record<string, unknown>) =>
    request('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  deleteExpense: (id: string) => request(`/expenses/${id}`, { method: 'DELETE' }),

  // --- Payroll ---
  payPayroll: (month?: string) =>
    request('/payroll/pay', { method: 'POST', body: JSON.stringify({ month }) }),
  setAdvance: (staffId: string, advance: number) =>
    request('/payroll/advance', { method: 'POST', body: JSON.stringify({ staffId, advance }) }),
}
