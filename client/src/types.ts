export type Role = 'owner' | 'tablet'

export interface Household {
  id: string
  name: string
  joinCode: string
}

export interface User {
  id: string
  name: string
  email: string
}

export interface Session {
  token: string
  role: Role
  user: User | null
  household: Household
}

export interface Staff {
  id: string
  name: string
  role: string
  phone: string
  language: string
  salary: number
  color: 'clay' | 'green' | 'blue'
  present: boolean
}

export interface Task {
  id: string
  title: string
  due: string
  recurring: string
  done: boolean
  assigneeId: string | null
}

export interface Attendance {
  id: string
  staffId: string
  date: string
  checkIn: string | null
  checkOut: string | null
}

export type ShoppingState = 'Pending' | 'Approved' | 'Rejected' | 'Purchased'
export interface ShoppingItem {
  id: string
  item: string
  qty: string
  requestedBy: string
  state: ShoppingState
}

export interface Document {
  id: string
  type: string
  staffId: string
  expiry: string | null
}

export interface Notification {
  id: string
  text: string
  read: boolean
  createdAt: string
}

export type LeaveStatus = 'Pending' | 'Approved' | 'Declined'
export interface Leave {
  id: string
  staffId: string
  startDate: string
  endDate: string
  reason: string
  status: LeaveStatus
}

export type ExpenseCategory = 'Groceries' | 'Household' | 'Utilities' | 'Other'
export interface Expense {
  id: string
  amount: number
  description: string
  category: ExpenseCategory
  date: string
  staffId: string | null
}

export interface Payroll {
  id: string
  staffId: string
  month: string
  base: number
  advance: number
  net: number
  status: 'Scheduled' | 'Paid'
}

export interface HouseholdState {
  today: string
  staff: Staff[]
  tasks: Task[]
  attendance: Attendance[]
  shopping: ShoppingItem[]
  documents: Document[]
  notifications: Notification[]
  leaves: Leave[]
  expenses: Expense[]
  payroll: Payroll[]
}
