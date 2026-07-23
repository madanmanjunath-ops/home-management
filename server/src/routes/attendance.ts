import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth, requireHousehold } from '../auth.js'
import { broadcast } from '../realtime.js'
import { notify } from '../notify.js'

export const attendanceRouter = Router()

attendanceRouter.use(requireAuth, requireHousehold)

function today(): string {
  return new Date().toISOString().slice(0, 10)
}
function now(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const staffBody = z.object({ staffId: z.string().min(1) })

async function assertStaff(householdId: string, staffId: string) {
  return prisma.staff.findFirst({ where: { id: staffId, householdId } })
}

// Check in — creates today's record and marks the person present.
attendanceRouter.post('/check-in', async (req, res) => {
  const parsed = staffBody.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'staffId required' })
    return
  }
  const householdId = req.auth!.householdId
  const staff = await assertStaff(householdId, parsed.data.staffId)
  if (!staff) {
    res.status(404).json({ error: 'Staff not found' })
    return
  }

  await prisma.attendance.upsert({
    where: { staffId_date: { staffId: staff.id, date: today() } },
    create: { householdId, staffId: staff.id, date: today(), checkIn: now() },
    update: { checkIn: now() },
  })
  await prisma.staff.update({ where: { id: staff.id }, data: { present: true } })
  await notify(householdId, `${staff.name} checked in`)
  broadcast(householdId)
  res.json({ ok: true })
})

// Check out — stamps checkout time and marks not present.
attendanceRouter.post('/check-out', async (req, res) => {
  const parsed = staffBody.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'staffId required' })
    return
  }
  const householdId = req.auth!.householdId
  const staff = await assertStaff(householdId, parsed.data.staffId)
  if (!staff) {
    res.status(404).json({ error: 'Staff not found' })
    return
  }

  const record = await prisma.attendance.findUnique({
    where: { staffId_date: { staffId: staff.id, date: today() } },
  })
  if (!record) {
    res.status(400).json({ error: 'Not checked in yet' })
    return
  }
  await prisma.attendance.update({
    where: { staffId_date: { staffId: staff.id, date: today() } },
    data: { checkOut: now() },
  })
  await prisma.staff.update({ where: { id: staff.id }, data: { present: false } })
  broadcast(householdId)
  res.json({ ok: true })
})

// Owner convenience: check in everyone not yet recorded today.
attendanceRouter.post('/check-all', async (req, res) => {
  const householdId = req.auth!.householdId
  const staff = await prisma.staff.findMany({ where: { householdId } })
  for (const s of staff) {
    const existing = await prisma.attendance.findUnique({
      where: { staffId_date: { staffId: s.id, date: today() } },
    })
    if (!existing) {
      await prisma.attendance.create({
        data: { householdId, staffId: s.id, date: today(), checkIn: now() },
      })
      await prisma.staff.update({ where: { id: s.id }, data: { present: true } })
    }
  }
  broadcast(householdId)
  res.json({ ok: true })
})
