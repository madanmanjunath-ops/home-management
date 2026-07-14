import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DEMO_EMAIL = 'owner@griha.app'
const DEMO_PASSWORD = 'griha123'
const DEMO_JOIN_CODE = 'HOME24'

function today(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

function thisMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

async function main() {
  // Clean slate (dev seed) — order respects FK constraints via cascade.
  await prisma.household.deleteMany({})

  const household = await prisma.household.create({
    data: {
      name: 'Madan’s Home',
      joinCode: DEMO_JOIN_CODE,
    },
  })

  await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
      name: 'Madan',
      householdId: household.id,
    },
  })

  const shanta = await prisma.staff.create({
    data: {
      householdId: household.id,
      name: 'Shanta',
      role: 'Housekeeper',
      phone: '98450 12345',
      language: 'Kannada',
      color: 'clay',
      salary: 18000,
      present: true,
    },
  })
  const ravi = await prisma.staff.create({
    data: {
      householdId: household.id,
      name: 'Ravi',
      role: 'Cook',
      phone: '98451 55432',
      language: 'Hindi',
      color: 'green',
      salary: 22000,
      present: true,
    },
  })
  const lakshmi = await prisma.staff.create({
    data: {
      householdId: household.id,
      name: 'Lakshmi',
      role: 'Nanny',
      phone: '99021 88419',
      language: 'Tamil',
      color: 'blue',
      salary: 20000,
      present: false,
    },
  })

  await prisma.task.createMany({
    data: [
      { householdId: household.id, title: 'Clean the living room', assigneeId: shanta.id, due: '09:30', recurring: 'Daily', done: true },
      { householdId: household.id, title: 'Prepare lunch', assigneeId: ravi.id, due: '12:30', recurring: 'Daily', done: false },
      { householdId: household.id, title: 'Water balcony plants', assigneeId: shanta.id, due: '16:00', recurring: 'Mon, Wed, Fri', done: false },
      { householdId: household.id, title: 'Organise children’s books', assigneeId: lakshmi.id, due: '17:00', recurring: 'Once', done: false },
    ],
  })

  await prisma.shoppingItem.createMany({
    data: [
      { householdId: household.id, item: 'Basmati rice', qty: '5 kg', requestedBy: 'Ravi', state: 'Pending' },
      { householdId: household.id, item: 'Dish soap', qty: '2 bottles', requestedBy: 'Shanta', state: 'Approved' },
      { householdId: household.id, item: 'Bananas', qty: '12', requestedBy: 'Ravi', state: 'Purchased' },
    ],
  })

  // Shanta & Ravi already checked in today (they are marked present).
  await prisma.attendance.createMany({
    data: [
      { householdId: household.id, staffId: shanta.id, date: today(), checkIn: '09:00' },
      { householdId: household.id, staffId: ravi.id, date: today(), checkIn: '08:45' },
    ],
  })

  await prisma.notification.createMany({
    data: [
      { householdId: household.id, text: 'Ravi completed “Clean kitchen counters”', read: false },
      { householdId: household.id, text: 'Lakshmi has not checked in today', read: false },
    ],
  })

  await prisma.leave.create({
    data: {
      householdId: household.id,
      staffId: lakshmi.id,
      startDate: today(2),
      endDate: today(4),
      reason: 'Family function',
      status: 'Pending',
    },
  })

  await prisma.expense.createMany({
    data: [
      { householdId: household.id, amount: 850, description: 'Vegetables & fruit', category: 'Groceries', date: today(-1), staffId: ravi.id },
      { householdId: household.id, amount: 1200, description: 'Cleaning supplies', category: 'Household', date: today(-3), staffId: shanta.id },
    ],
  })

  // Current-month payroll rows, scheduled.
  const month = thisMonth()
  for (const s of [shanta, ravi, lakshmi]) {
    await prisma.payroll.create({
      data: {
        householdId: household.id,
        staffId: s.id,
        month,
        base: s.salary,
        advance: 0,
        net: s.salary,
        status: 'Scheduled',
      },
    })
  }

  console.log('✅ Seeded Griha demo household.')
  console.log(`   Owner login  →  ${DEMO_EMAIL} / ${DEMO_PASSWORD}`)
  console.log(`   Tablet code  →  ${DEMO_JOIN_CODE}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
