import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth, requireOwner } from '../auth.js'
import { broadcast } from '../realtime.js'

export const notificationsRouter = Router()

notificationsRouter.use(requireAuth, requireOwner)

notificationsRouter.post('/read-all', async (req, res) => {
  const householdId = req.auth!.householdId
  await prisma.notification.updateMany({ where: { householdId, read: false }, data: { read: true } })
  broadcast(householdId)
  res.json({ ok: true })
})
