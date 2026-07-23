import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth, requireOwner, requireHousehold } from '../auth.js'
import { broadcast } from '../realtime.js'
import { notify } from '../notify.js'

export const shoppingRouter = Router()

shoppingRouter.use(requireAuth, requireHousehold)

const createSchema = z.object({
  item: z.string().min(1),
  qty: z.string().min(1),
  requestedBy: z.string().min(1),
})

// Owner or staff (tablet) can add a request.
shoppingRouter.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid item' })
    return
  }
  const householdId = req.auth!.householdId
  const item = await prisma.shoppingItem.create({ data: { ...parsed.data, householdId } })
  await notify(householdId, `${item.requestedBy} requested ${item.item}`)
  broadcast(householdId)
  res.json(item)
})

const stateSchema = z.object({
  state: z.enum(['Pending', 'Approved', 'Rejected', 'Purchased']),
})

// Only owners approve / reject / mark purchased.
shoppingRouter.patch('/:id', requireOwner, async (req, res) => {
  const parsed = stateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid state' })
    return
  }
  const householdId = req.auth!.householdId
  const existing = await prisma.shoppingItem.findFirst({ where: { id: req.params.id, householdId } })
  if (!existing) {
    res.status(404).json({ error: 'Item not found' })
    return
  }
  const item = await prisma.shoppingItem.update({
    where: { id: existing.id },
    data: { state: parsed.data.state },
  })
  await notify(householdId, `Shopping request for ${item.item} was ${item.state.toLowerCase()}`)
  broadcast(householdId)
  res.json(item)
})

shoppingRouter.delete('/:id', requireOwner, async (req, res) => {
  const householdId = req.auth!.householdId
  const existing = await prisma.shoppingItem.findFirst({ where: { id: req.params.id, householdId } })
  if (!existing) {
    res.status(404).json({ error: 'Item not found' })
    return
  }
  await prisma.shoppingItem.delete({ where: { id: existing.id } })
  broadcast(householdId)
  res.json({ ok: true })
})
