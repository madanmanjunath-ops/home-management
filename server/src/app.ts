import 'dotenv/config'
import 'express-async-errors' // route rejections reach the error handler (clean 500, not a 502)
import express from 'express'
import cors from 'cors'

import { authRouter } from './routes/auth.js'
import { stateRouter } from './routes/state.js'
import { staffRouter } from './routes/staff.js'
import { tasksRouter } from './routes/tasks.js'
import { attendanceRouter } from './routes/attendance.js'
import { shoppingRouter } from './routes/shopping.js'
import { documentsRouter } from './routes/documents.js'
import { notificationsRouter } from './routes/notifications.js'
import { leavesRouter } from './routes/leaves.js'
import { expensesRouter } from './routes/expenses.js'
import { payrollRouter } from './routes/payroll.js'

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN?.split(',') ?? true,
    })
  )
  app.use(express.json())

  const api = express.Router()
  api.get('/health', (_req, res) => res.json({ ok: true, service: 'griha' }))
  api.use('/auth', authRouter)
  api.use('/state', stateRouter)
  api.use('/staff', staffRouter)
  api.use('/tasks', tasksRouter)
  api.use('/attendance', attendanceRouter)
  api.use('/shopping', shoppingRouter)
  api.use('/documents', documentsRouter)
  api.use('/notifications', notificationsRouter)
  api.use('/leaves', leavesRouter)
  api.use('/expenses', expensesRouter)
  api.use('/payroll', payrollRouter)

  // Mounted at both /api (local dev) and /.netlify/functions/api (serverless).
  app.use('/api', api)
  app.use('/', api)

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err)
    const name = (err as { name?: string })?.name ?? ''
    const code = (err as { code?: string })?.code ?? ''
    const message = (err as { message?: string })?.message ?? ''
    const isDbError =
      name.includes('PrismaClient') ||
      /database|ECONNREFUSED|ENOTFOUND|Can't reach|connection|password authentication|prepared statement|Tenant or user/i.test(
        message
      )
    res.status(500).json({
      error: isDbError ? 'Database error' : 'Server error',
      // Included to help diagnose deploy issues; safe (no secrets).
      detail: [name, code].filter(Boolean).join(' ') + (message ? ': ' + message : ''),
    })
  })

  return app
}
