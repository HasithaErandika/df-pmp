import { Modal } from '../../components/ui/Modal'
import type { TrackerTask } from '../../types'
import { TaskForm } from './TaskForm'
import { TaskUpdates } from './TaskUpdates'

type Props = { board: string; task?: TrackerTask; open: boolean; onClose: () => void }

/** Create a task, or edit one beside its target history and progress log. */
export function TaskDialog({ board, task, open, onClose }: Props) {
  return (
    <Modal
      open={open}
      title={task ? `${task.id}${task.refNo ? ` · #${task.refNo}` : ''}` : 'New tracker task'}
      description={task?.title}
      onClose={onClose}
      size={task ? 'xl' : 'lg'}
    >
      {task ? (
        <div className="task-dialog">
          <TaskForm key={task.id + task.updatedAt} board={board} task={task} onClose={onClose} />
          <TaskUpdates task={task} />
        </div>
      ) : (
        <TaskForm board={board} onClose={onClose} />
      )}
    </Modal>
  )
}
