import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { SelectField, TextField, toOptions } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useConfig } from '../../context/ConfigContext'
import { useSession } from '../../context/SessionContext'
import { useToast } from '../../context/ToastContext'
import { required, useForm } from '../../hooks/useForm'
import { invalidate } from '../../hooks/useQuery'
import { useProjects, useUsers } from '../../hooks/useReferenceData'
import { api } from '../../lib/api'
import { addDays, today } from '../../lib/dates'
import type { WorkItem, WorkItemInput } from '../../types'

type Props = { open: boolean; item?: WorkItem; projectId?: string; onClose: () => void }

const refresh = () => invalidate('work-items', 'projects', 'project:', 'dashboard', 'activity:')

/** Create, edit or delete a work item. */
export function WorkItemFormDialog(props: Props) {
  return (
    <Modal
      open={props.open}
      title={props.item ? `Edit ${props.item.id}` : 'New work item'}
      onClose={props.onClose}
      size="lg"
    >
      <WorkItemForm {...props} />
    </Modal>
  )
}

function WorkItemForm({ item, projectId, onClose }: Props) {
  const { workflow } = useConfig()
  const { session, can } = useSession()
  const notify = useToast()
  const users = useUsers()
  const projects = useProjects()
  const [confirming, setConfirming] = useState(false)
  const editable = item ? can('work:update') : can('work:create')

  const { values, errors, set, submitting, handleSubmit } = useForm<WorkItemInput>({
    initial: item
      ? {
          projectId: item.projectId,
          subject: item.subject,
          type: item.type,
          status: item.status,
          priority: item.priority,
          assigneeId: item.assigneeId,
          dueDate: item.dueDate,
        }
      : {
          projectId: projectId ?? '',
          subject: '',
          type: workflow.workItemTypes[0],
          status: workflow.workItemStatuses[0],
          priority: workflow.priorities[1] ?? workflow.priorities[0],
          assigneeId: session?.id ?? null,
          dueDate: addDays(today(), 7),
        },
    validate: (v) => ({
      projectId: required(v.projectId, 'Choose a project.'),
      subject: required(v.subject, 'Describe the work.'),
      dueDate: required(v.dueDate, 'Choose a due date.'),
    }),
    onSubmit: async (v) => {
      const saved = item ? await api.workItems.update(item.id, v) : await api.workItems.create(v)
      refresh()
      notify(item ? `${saved.id} updated.` : `${saved.id} created.`)
      onClose()
    },
  })

  const remove = async () => {
    if (!item) return
    await api.workItems.remove(item.id)
    refresh()
    notify(`${item.id} deleted.`)
    onClose()
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit} noValidate>
      <fieldset disabled={!editable} className="form-grid span-2">
        <TextField
          label="Subject"
          required
          autoFocus
          maxLength={200}
          value={values.subject}
          error={errors.subject}
          onChange={(e) => set('subject', e.target.value)}
          className="span-2"
        />
        <SelectField
          label="Project"
          required
          placeholder="Choose a project"
          options={(projects.data ?? []).map((p) => ({ value: p.id, label: p.name }))}
          value={values.projectId}
          error={errors.projectId}
          onChange={(e) => set('projectId', e.target.value)}
        />
        <SelectField
          label="Assignee"
          placeholder="Unassigned"
          options={(users.data ?? []).map((u) => ({ value: u.id, label: u.displayName }))}
          value={values.assigneeId ?? ''}
          error={errors.assigneeId}
          onChange={(e) => set('assigneeId', e.target.value ? Number(e.target.value) : null)}
        />
        <SelectField
          label="Type"
          options={toOptions(workflow.workItemTypes)}
          value={values.type}
          error={errors.type}
          onChange={(e) => set('type', e.target.value)}
        />
        <SelectField
          label="Status"
          options={toOptions(workflow.workItemStatuses)}
          value={values.status}
          error={errors.status}
          onChange={(e) => set('status', e.target.value)}
        />
        <SelectField
          label="Priority"
          options={toOptions(workflow.priorities)}
          value={values.priority}
          error={errors.priority}
          onChange={(e) => set('priority', e.target.value)}
        />
        <TextField
          label="Due date"
          type="date"
          required
          value={values.dueDate}
          error={errors.dueDate}
          onChange={(e) => set('dueDate', e.target.value)}
        />
      </fieldset>
      {!editable && (
        <p className="field-hint span-2">You have view-only access to this work item.</p>
      )}
      {errors.form && (
        <div className="inline-alert alert-error span-2" role="alert">
          {errors.form}
        </div>
      )}
      <div className="form-actions span-2">
        {item && can('work:delete') && (
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
          {editable ? 'Cancel' : 'Close'}
        </Button>
        {editable && (
          <Button type="submit" loading={submitting}>
            {item ? 'Save changes' : 'Create work item'}
          </Button>
        )}
      </div>
      <ConfirmDialog
        open={confirming}
        title="Delete work item?"
        message={`${item?.id} “${item?.subject}” will be permanently removed.`}
        confirmLabel="Delete work item"
        onConfirm={remove}
        onClose={() => setConfirming(false)}
      />
    </form>
  )
}
