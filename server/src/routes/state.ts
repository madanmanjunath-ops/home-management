import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth, requireHousehold } from '../auth.js'

export const stateRouter = Router()

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

// One snapshot of the whole household — the client's single source of truth.
stateRouter.get('/', requireAuth, requireHousehold, async (req, res) => {
  const householdId = req.auth!.householdId

  const [staff, tasks, attendance, shopping, documents, notifications, leaves, expenses, payroll] =
    await Promise.all([
      prisma.staff.findMany({ where: { householdId }, orderBy: { createdAt: 'asc' } }),
      prisma.task.findMany({ where: { householdId }, orderBy: { createdAt: 'asc' } }),
      prisma.attendance.findMany({ where: { householdId, date: today() } }),
      prisma.shoppingItem.findMany({ where: { householdId }, orderBy: { createdAt: 'desc' } }),
      prisma.document.findMany({ where: { householdId }, orderBy: { createdAt: 'desc' } }),
      prisma.notification.findMany({ where: { householdId }, orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.leave.findMany({ where: { householdId }, orderBy: { startDate: 'asc' } }),
      prisma.expense.findMany({ where: { householdId }, orderBy: { date: 'desc' } }),
      prisma.payroll.findMany({ where: { householdId, month: today().slice(0, 7) } }),
    ])

  res.json({
    today: today(),
    staff,
    tasks,
    attendance,
    shopping,
    documents,
    notifications,
    leaves,
    expenses,
    payroll,
  })
})
