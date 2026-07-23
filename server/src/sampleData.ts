import { prisma } from './db.js'

function today(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}
function thisMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

/**
 * Populate a brand-new household with a small, friendly sample so the owner's
 * first screen isn't empty. Everything here is deletable from the UI.
 */
export async function populateHousehold(householdId: string): Promise<void> {
  const shanta = await prisma.staff.create({
    data: {
      householdId,
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
      householdId,
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
      householdId,
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
      {
        householdId,
        title: 'Clean the living room',
        assigneeId: shanta.id,
        due: '09:30',
        recurring: 'Daily',
        done: true,
      },
      {
        householdId,
        title: 'Prepare lunch',
        assigneeId: ravi.id,
        due: '12:30',
        recurring: 'Daily',
        done: false,
      },
      {
        householdId,
        title: 'Water balcony plants',
        assigneeId: shanta.id,
        due: '16:00',
        recurring: 'Mon, Wed, Fri',
        done: false,
      },
      {
        householdId,
        title: 'Organise children’s books',
        assigneeId: lakshmi.id,
        due: '17:00',
        recurring: 'Once',
        done: false,
      },
    ],
  })

  await prisma.shoppingItem.createMany({
    data: [
      { householdId, item: 'Basmati rice', qty: '5 kg', requestedBy: 'Ravi', state: 'Pending' },
      { householdId, item: 'Dish soap', qty: '2 bottles', requestedBy: 'Shanta', state: 'Approved' },
      { householdId, item: 'Bananas', qty: '12', requestedBy: 'Ravi', state: 'Purchased' },
    ],
  })

  await prisma.attendance.createMany({
    data: [
      { householdId, staffId: shanta.id, date: today(), checkIn: '09:00' },
      { householdId, staffId: ravi.id, date: today(), checkIn: '08:45' },
    ],
  })

  await prisma.notification.createMany({
    data: [
      { householdId, text: 'Ravi completed “Clean kitchen counters”' },
      { householdId, text: 'Welcome to Griha — this is sample data you can edit or delete.' },
    ],
  })

  await prisma.leave.create({
    data: {
      householdId,
      staffId: lakshmi.id,
      startDate: today(2),
      endDate: today(4),
      reason: 'Family function',
      status: 'Pending',
    },
  })

  await prisma.expense.createMany({
    data: [
      {
        householdId,
        amount: 850,
        description: 'Vegetables & fruit',
        category: 'Groceries',
        date: today(-1),
        staffId: ravi.id,
      },
      {
        householdId,
        amount: 1200,
        description: 'Cleaning supplies',
        category: 'Household',
        date: today(-3),
        staffId: shanta.id,
      },
    ],
  })

  const month = thisMonth()
  for (const s of [shanta, ravi, lakshmi]) {
    await prisma.payroll.create({
      data: {
        householdId,
        staffId: s.id,
        month,
        base: s.salary,
        advance: 0,
        net: s.salary,
        status: 'Scheduled',
      },
    })
  }
}
