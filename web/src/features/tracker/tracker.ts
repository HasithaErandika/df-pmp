import { addDays, today } from '../../lib/dates'
import type { TrackerTask } from '../../types'

/** Days ahead that count as "due soon". */
export const DUE_SOON_DAYS = 14

/** The last configured tracker status marks a task as completed (mirrors the API). */
export const doneStatus = (statuses: string[]) => statuses[statuses.length - 1]

export const isDone = (task: TrackerTask, done: string) => task.status === done

export const isTaskOverdue = (task: TrackerTask, done: string) =>
  !isDone(task, done) && task.targetDate !== null && task.targetDate < today()

export const isDueSoon = (task: TrackerTask, done: string) =>
  !isDone(task, done) &&
  task.targetDate !== null &&
  task.targetDate >= today() &&
  task.targetDate <= addDays(today(), DUE_SOON_DAYS)

/** Number of times the target date has moved. */
export const slips = (task: TrackerTask) => task.targetHistory.length

export type TaskFilter = 'all' | 'open' | 'overdue' | 'due-soon' | 'slipped' | `status:${string}`

export function filterTask(task: TrackerTask, filter: TaskFilter, done: string) {
  switch (filter) {
    case 'all':
      return true
    case 'open':
      return !isDone(task, done)
    case 'overdue':
      return isTaskOverdue(task, done)
    case 'due-soon':
      return isDueSoon(task, done)
    case 'slipped':
      return !isDone(task, done) && slips(task) > 0
    default:
      return task.status === filter.slice('status:'.length)
  }
}

export type TaskSort = 'tracker' | 'target' | 'updated'

const byTarget = (a: TrackerTask, b: TrackerTask) =>
  (a.targetDate ?? '9999').localeCompare(b.targetDate ?? '9999')

export function sortTasks(tasks: TrackerTask[], sort: TaskSort) {
  if (sort === 'tracker') return tasks
  const copy = [...tasks]
  if (sort === 'target') return copy.sort(byTarget)
  return copy.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/** Distinct owner names across tasks, alphabetically. */
export const ownerNames = (tasks: TrackerTask[]) =>
  [...new Set(tasks.flatMap((t) => t.owners))].sort((a, b) => a.localeCompare(b))

export function summarize(tasks: TrackerTask[], done: string) {
  const completed = tasks.filter((t) => isDone(t, done)).length
  return {
    total: tasks.length,
    open: tasks.length - completed,
    completed,
    overdue: tasks.filter((t) => isTaskOverdue(t, done)).length,
    dueSoon: tasks.filter((t) => isDueSoon(t, done)).length,
    slipped: tasks.filter((t) => !isDone(t, done) && slips(t) > 0).length,
    percent: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
  }
}

/** Writable fields of a task, e.g. to change only its status. */
export const toInput = (task: TrackerTask) => ({
  board: task.board,
  title: task.title,
  owners: task.owners,
  buOwner: task.buOwner,
  status: task.status,
  targetDate: task.targetDate ?? '',
  remarks: task.remarks,
})

/** Query keys refreshed after any tracker change. */
export const refreshTracker = () => ['tracker-']
