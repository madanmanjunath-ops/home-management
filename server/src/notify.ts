import { prisma } from './db.js'
import { broadcast } from './realtime.js'

/** Create a notification and push a live sync to the household. */
export async function notify(householdId: string, text: string) {
  await prisma.notification.create({ data: { householdId, text } })
  broadcast(householdId)
}
