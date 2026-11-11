import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { SelectField, TextAreaField, TextField, toOptions } from '../../components/ui/Field'
import { TagInput } from '../../components/ui/TagInput'
import { useConfig } from '../../context/ConfigContext'
import { useSession } from '../../context/SessionContext'
import { useToast } from '../../context/ToastContext'
import { required, useForm } from '../../hooks/useForm'
import { invalidate, useQuery } from '../../hooks/useQuery'
import { trackerApi } from '../../lib/trackerApi'
import type { TrackerTask, TrackerTaskInput } from '../../types'
import { ownerNames, refreshTracker, toInput } from './tracker'

type Props = { board: string; task?: TrackerTask; onClose: () => void }

/** Task fields. Saving a new target keeps the previous one in the task's target history. */
export function TaskForm({ board, task, onClose }: Props) {
  const { workflow } = useConfig()
  const { can } = useSession()
  const notify = useToast()
  const boards = useQuery('tracker-boards', trackerApi.boards)
  const known = useQuery(`tracker-tasks:${board}`, (signal) => trackerApi.tasks(board, signal))
  const [confirming, setConfirming] = useState(false)
  const editable = task ? can('tracker:update') : can('tracker:create')

  const { values, errors, set, submitting, handleSubmit } = useForm<TrackerTaskInput>({
    initial: task
      ? toInput(task)
      : {
          board,
          title: '',
          owners: [],
          buOwner: '',
          status: workflow.trackerStatuses[1] ?? workflow.trackerStatuses[0],
          targetDate: '',
          remarks: '',
        },
    validate: (v) => ({
      title: required(v.title, 'Describe the task.'),
      board: required(v.board, 'Choose a board.'),
    }),
    onSubmit: async (v) => {
      const saved = task ? await trackerApi.update(task.id, v) : await trackerApi.create(v)
      invalidate(...refreshTracker())
      notify(task ? `${saved.id} updated.` : `${saved.id} added.`)
      if (!task) onClose()
    },
  })

  const remove = async () => {
    if (!task) return
    await trackerApi.remove(task.id)
    invalidate(...refreshTracker())
    notify(`${task.id} deleted.`)
    onClose()
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit} noValidate>
      <fieldset disabled={!editable} className="form-grid span-2">
        <TextAreaField
          label="Task"
          required
          rows={2}
          maxLength={300}
          value={values.title}
          error={errors.title}
          onChange={(e) => set('title', e.target.value)}
          className="span-2"
        />
        <SelectField
          label="Status"
          options={toOptions(workflow.trackerStatuses)}
          value={values.status}
          error={errors.status}
          onChange={(e) => set('status', e.target.value)}
        />
        <TextField
          label="Target date"
          type="date"
          value={values.targetDate}
          error={errors.targetDate}
          hint={
            task?.targetDate && values.targetDate !== task.targetDate
              ? 'The current target will be kept in the history.'
              : 'Leave empty when the target is TBD.'
          }
          onChange={(e) => set('targetDate', e.target.value)}
        />
        <TagInput
          label="Responsible people"
          value={values.owners}
          suggestions={ownerNames(known.data ?? [])}
          placeholder="Type a name and press Enter"
          error={errors.owners}
          disabled={!editable}
          onChange={(owners) => set('owners', owners)}
          className="span-2"
        />
        <TextField
          label="BU/PO owner"
          maxLength={120}
          value={values.buOwner}
          error={errors.buOwner}
          onChange={(e) => set('buOwner', e.target.value)}
        />
        <SelectField
          label="Board"
          options={(boards.data ?? []).map((b) => ({ value: b.key, label: b.name }))}
          value={values.board}
          error={errors.board}
          onChange={(e) => set('board', e.target.value)}
        />
        <TextAreaField
          label="Latest remark / delay reason"
          maxLength={2000}
          value={values.remarks}
          error={errors.remarks}
          onChange={(e) => set('remarks', e.target.value)}
          className="span-2"
        />
      </fieldset>
      {!editable && <p className="field-hint span-2">You have view-only access to this task.</p>}
      {errors.form && (
        <div className="inline-alert alert-error span-2" role="alert">
          {errors.form}
        </div>
      )}
      <div className="form-actions span-2">
        {task && can('tracker:delete') && (
          <Button
            variant="ghost"
            icon={Trash2}
            className="push-left danger-text"
            onClick={() => setConfirming(true)}
          >
            Delete
          </Button>
        )}
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          {editable ? 'Close' : 'Done'}
        </Button>
        {editable && (
          <Button type="submit" loading={submitting}>
            {task ? 'Save changes' : 'Add task'}
          </Button>
        )}
      </div>
      <ConfirmDialog
        open={confirming}
        title="Delete task?"
        message={`${task?.id} and its progress log will be permanently removed.`}
        confirmLabel="Delete task"
        onConfirm={remove}
        onClose={() => setConfirming(false)}
      />
    </form>
  )
}
