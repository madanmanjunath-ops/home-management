import { api } from '../api'
import type { Staff, Task } from '../types'

export function TaskRow({ task, staff }: { task: Task; staff: Staff[] }) {
  const assignee = staff.find((s) => s.id === task.assigneeId)
  const toggle = () => api.updateTask(task.id, { done: !task.done })
  return (
    <div className="task">
      <button
        className={`check ${task.done ? 'done' : ''}`}
        onClick={toggle}
        aria-label={task.done ? 'Mark task not done' : 'Mark task complete'}
      />
      <div className="grow">
        <strong>{task.title}</strong>
        <div className="small">
          {assignee?.name ?? 'Unassigned'} · {task.due} · {task.recurring}
        </div>
      </div>
      <span className="pill">{task.done ? 'Done' : 'To do'}</span>
    </div>
  )
}
