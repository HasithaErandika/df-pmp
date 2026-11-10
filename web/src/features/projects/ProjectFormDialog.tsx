import { Button } from '../../components/ui/Button'
import { SelectField, TextAreaField, TextField, toOptions } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useConfig } from '../../context/ConfigContext'
import { useToast } from '../../context/ToastContext'
import { required, useForm } from '../../hooks/useForm'
import { invalidate } from '../../hooks/useQuery'
import { useUsers } from '../../hooks/useReferenceData'
import { api } from '../../lib/api'
import { addDays, today } from '../../lib/dates'
import type { Project, ProjectInput } from '../../types'

type Props = {
  open: boolean
  project?: Project
  onClose: () => void
  onSaved?: (project: Project) => void
}

/** Create or edit a project. Mounted content resets each time the dialog opens. */
export function ProjectFormDialog(props: Props) {
  const title = props.project ? 'Edit project' : 'New project'
  return (
    <Modal
      open={props.open}
      title={title}
      description="Projects group work items and meetings."
      onClose={props.onClose}
      size="lg"
    >
      <ProjectForm {...props} />
    </Modal>
  )
}

function ProjectForm({ project, onClose, onSaved }: Props) {
  const { workflow } = useConfig()
  const users = useUsers()
  const notify = useToast()
  const start = today()
  const { values, errors, set, submitting, handleSubmit } = useForm<ProjectInput>({
    initial: project
      ? {
          name: project.name,
          description: project.description,
          ownerId: project.ownerId,
          status: project.status,
          tone: project.tone,
          progress: project.progress,
          startDate: project.startDate,
          endDate: project.endDate,
        }
      : {
          name: '',
          description: '',
          ownerId: 0,
          status: workflow.projectStatuses[0],
          tone: workflow.tones[0],
          progress: 0,
          startDate: start,
          endDate: addDays(start, 90),
        },
    validate: (v) => ({
      name: required(v.name, 'Enter a project name.'),
      ownerId: v.ownerId ? undefined : 'Choose a project owner.',
      endDate:
        v.endDate < v.startDate ? 'Finish date must be on or after the start date.' : undefined,
    }),
    onSubmit: async (v) => {
      const saved = project
        ? await api.projects.update(project.id, v)
        : await api.projects.create(v)
      invalidate('projects', 'project:', 'dashboard', 'work-items', 'activity:')
      notify(project ? 'Project updated.' : `Project ${saved.id} created.`)
      onSaved?.(saved)
      onClose()
    },
  })
  const userOptions = (users.data ?? []).map((user) => ({
    value: user.id,
    label: user.displayName,
  }))

  return (
    <form className="form-grid" onSubmit={handleSubmit} noValidate>
      <TextField
        label="Project name"
        required
        autoFocus
        maxLength={120}
        value={values.name}
        error={errors.name}
        onChange={(event) => set('name', event.target.value)}
        className="span-2"
      />
      <TextAreaField
        label="Description"
        maxLength={2000}
        value={values.description}
        error={errors.description}
        onChange={(event) => set('description', event.target.value)}
        className="span-2"
      />
      <SelectField
        label="Owner"
        required
        placeholder={users.loading ? 'Loading people…' : 'Choose an owner'}
        options={userOptions}
        value={values.ownerId || ''}
        error={errors.ownerId}
        onChange={(event) => set('ownerId', Number(event.target.value))}
      />
      <SelectField
        label="Status"
        options={toOptions(workflow.projectStatuses)}
        value={values.status}
        error={errors.status}
        onChange={(event) => set('status', event.target.value)}
      />
      <TextField
        label="Start date"
        type="date"
        required
        value={values.startDate}
        error={errors.startDate}
        onChange={(event) => set('startDate', event.target.value)}
      />
      <TextField
        label="Planned finish"
        type="date"
        required
        min={values.startDate}
        value={values.endDate}
        error={errors.endDate}
        onChange={(event) => set('endDate', event.target.value)}
      />
      <TextField
        label={`Progress (${values.progress}%)`}
        type="range"
        min={0}
        max={100}
        step={5}
        value={values.progress}
        error={errors.progress}
        onChange={(event) => set('progress', Number(event.target.value))}
      />
      <SelectField
        label="Colour"
        options={workflow.tones.map((tone) => ({
          value: tone,
          label: tone[0].toUpperCase() + tone.slice(1),
        }))}
        value={values.tone}
        error={errors.tone}
        onChange={(event) => set('tone', event.target.value as ProjectInput['tone'])}
      />
      {errors.form && (
        <div className="inline-alert alert-error span-2" role="alert">
          {errors.form}
        </div>
      )}
      <div className="form-actions span-2">
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {project ? 'Save changes' : 'Create project'}
        </Button>
      </div>
    </form>
  )
}
