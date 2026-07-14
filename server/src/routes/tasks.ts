import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth, requireOwner } from '../auth.js'
import { broadcast } from '../realtime.js'
import { notify } from '../notify.js'

export const tasksRouter = Router()

tasksRouter.use(requireAuth)

const createSchema = z.object({
  title: z.string().min(1),
  assigneeId: z.string().nullable().optional(),
  due: z.string().default('10:00'),
  recurring: z.string().default('Once'),
})

// Owners create/assign tasks.
tasksRouter.post('/', requireOwner, async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid task' })
    return
  }
  const householdId = req.auth!.householdId
  const task = await prisma.task.create({ data: { ...parsed.data, householdId } })
  const assignee = task.assigneeId
    ? await prisma.staff.findUnique({ where: { id: task.assigneeId } })
    : null
  await notify(householdId, `New task assigned${assignee ? ` to ${assignee.name}` : ''}: “${task.title}”`)
  broadcast(householdId)
  res.json(task)
})

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  assigneeId: z.string().nullable().optional(),
  due: z.string().optional(),
  recurring: z.string().optional(),
  done: z.boolean().optional(),
})

// Both owner and tablet can update (e.g. staff marking done).
tasksRouter.patch('/:id', async (req, res) => {
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid update' })
    return
  }
  const householdId = req.auth!.householdId
  const existing = await prisma.task.findFirst({ where: { id: req.params.id, householdId } })
  if (!existing) {
    res.status(404).json({ error: 'Task not found' })
    return
  }
  const task = await prisma.task.update({ where: { id: existing.id }, data: parsed.data })

  // Announce completions (the most useful signal on the owner dashboard).
  if (parsed.data.done === true && !existing.done) {
    const assignee = task.assigneeId
      ? await prisma.staff.findUnique({ where: { id: task.assigneeId } })
      : null
    await notify(householdId, `${assignee?.name ?? 'Someone'} completed “${task.title}”`)
  }
  broadcast(householdId)
  res.json(task)
})

tasksRouter.delete('/:id', requireOwner, async (req, res) => {
  const householdId = req.auth!.householdId
  const existing = await prisma.task.findFirst({ where: { id: req.params.id, householdId } })
  if (!existing) {
    res.status(404).json({ error: 'Task not found' })
    return
  }
  await prisma.task.delete({ where: { id: existing.id } })
  broadcast(householdId)
  res.json({ ok: true })
})
