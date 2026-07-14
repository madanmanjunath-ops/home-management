import 'dotenv/config'
import http from 'http'
import express from 'express'
import cors from 'cors'

import { attachWebSocket } from './realtime.js'
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

const app = express()

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN?.split(',') ?? '*',
  })
)
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'griha' }))

app.use('/api/auth', authRouter)
app.use('/api/state', stateRouter)
app.use('/api/staff', staffRouter)
app.use('/api/tasks', tasksRouter)
app.use('/api/attendance', attendanceRouter)
app.use('/api/shopping', shoppingRouter)
app.use('/api/documents', documentsRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/leaves', leavesRouter)
app.use('/api/expenses', expensesRouter)
app.use('/api/payroll', payrollRouter)

// Fallback error handler so route throws become clean JSON.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Something went wrong' })
})

const server = http.createServer(app)
attachWebSocket(server)

const PORT = Number(process.env.PORT) || 4000
server.listen(PORT, () => {
  console.log(`🏠 Griha API listening on http://localhost:${PORT}`)
})
