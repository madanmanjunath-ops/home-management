import { useState } from 'react'
import { api } from '../api'
import { useData } from '../store'
import { Card, Field, Modal, PageHeader } from '../components/ui'

const RECURRING = ['Once', 'Daily', 'Weekly', 'Mon, Wed, Fri', 'Weekends']

export function TasksPage() {
  const data = useData()
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState<'all' | 'todo' | 'done'>('all')

  const tasks = data.tasks.filter((t) => (filter === 'all' ? true : filter === 'todo' ? !t.done : t.done))

  return (
    <>
      <PageHeader
        title="Tasks"
        subtitle="Clear instructions make every day easier."
        action={
          <button className="button" onClick={() => setAdding(true)}>
            + New task
          </button>
        }
      />

      <Card>
        <div className="toolbar">
          {(['all', 'todo', 'done'] as const).map((f) => (
            <button
              key={f}
              className={`pill ${filter === f ? '' : ''}`}
              onClick={() => setFilter(f)}
              style={{
                cursor: 'pointer',
                border: 0,
                background: filter === f ? 'var(--clay)' : '#f1e4d5',
                color: filter === f ? '#fff' : 'var(--clay-dark)',
              }}
            >
              {f === 'all' ? 'All' : f === 'todo' ? 'To do' : 'Done'}
            </button>
          ))}
        </div>

        {tasks.map((t) => {
          const assignee = data.staff.find((s) => s.id === t.assigneeId)
          return (
            <div className="task" key={t.id}>
              <button
                className={`check ${t.done ? 'done' : ''}`}
                onClick={() => api.updateTask(t.id, { done: !t.done })}
                aria-label="Toggle task"
              />
              <div className="grow">
                <strong>{t.title}</strong>
                <div className="small">
                  {assignee?.name ?? 'Unassigned'} · {t.due} · {t.recurring}
                </div>
              </div>
              <span className="pill">{t.done ? 'Done' : 'To do'}</span>
              <button
                className="text-button danger"
                onClick={() => api.deleteTask(t.id)}
                aria-label="Delete task"
              >
                Delete
              </button>
            </div>
          )
        })}
        {tasks.length === 0 && <div className="empty">No tasks here. Create the first one.</div>}
      </Card>

      {adding && <TaskModal onClose={() => setAdding(false)} />}
    </>
  )
}

function TaskModal({ onClose }: { onClose: () => void }) {
  const data = useData()
  const [form, setForm] = useState({
    title: '',
    assigneeId: data.staff[0]?.id ?? '',
    due: '10:00',
    recurring: 'Once',
  })
  const [busy, setBusy] = useState(false)
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    setBusy(true)
    try {
      await api.addTask({ ...form, assigneeId: form.assigneeId || null })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Create task" onClose={onClose} onSubmit={submit} submitLabel={busy ? 'Saving…' : 'Save'}>
      <Field label="Task title" full>
        <input
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="e.g. Clean the balcony"
          required
        />
      </Field>
      <Field label="Assign to">
        <select value={form.assigneeId} onChange={(e) => set('assigneeId', e.target.value)}>
          <option value="">Unassigned</option>
          {data.staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Due time">
        <input type="time" value={form.due} onChange={(e) => set('due', e.target.value)} />
      </Field>
      <Field label="Repeats" full>
        <select value={form.recurring} onChange={(e) => set('recurring', e.target.value)}>
          {RECURRING.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </Field>
    </Modal>
  )
}
