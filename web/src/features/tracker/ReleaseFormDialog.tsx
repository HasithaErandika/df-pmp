import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { SelectField, TextAreaField, TextField, toOptions } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useConfig } from '../../context/ConfigContext'
import { useSession } from '../../context/SessionContext'
import { useToast } from '../../context/ToastContext'
import { required, useForm } from '../../hooks/useForm'
import { invalidate } from '../../hooks/useQuery'
import { today } from '../../lib/dates'
import { trackerApi } from '../../lib/trackerApi'
import type { Release, ReleaseInput } from '../../types'

type Props = { open: boolean; release?: Release; onClose: () => void }

const sanityOptions = [
  { value: '', label: 'Not decided' },
  { value: 'Applicable', label: 'Applicable' },
  { value: 'Not applicable', label: 'Not applicable' },
]

/** Schedule, edit or delete a release. */
export function ReleaseFormDialog(props: Props) {
  return (
    <Modal
      open={props.open}
      title={props.release ? `Edit ${props.release.id}` : 'New release'}
      onClose={props.onClose}
      size="lg"
    >
      <ReleaseForm {...props} />
    </Modal>
  )
}

function ReleaseForm({ release, onClose }: Props) {
  const { workflow } = useConfig()
  const { can } = useSession()
  const notify = useToast()
  const [confirming, setConfirming] = useState(false)
  const editable = release ? can('tracker:update') : can('tracker:create')
  const blank: ReleaseInput = {
    releaseDate: today(),
    title: '',
    type: workflow.releaseTypes[0],
    systems: '',
    layer: '',
    techOwner: '',
    buSpoc: '',
    sanityTest: '',
    qaSpoc: '',
    status: workflow.releaseStatuses[0],
    notes: '',
  }
  const existing: ReleaseInput = release
    ? (Object.fromEntries(
        Object.keys(blank).map((key) => [key, release[key as keyof ReleaseInput]]),
      ) as ReleaseInput)
    : blank

  const { values, errors, set, submitting, handleSubmit } = useForm<ReleaseInput>({
    initial: existing,
    validate: (v) => ({
      title: required(v.title, 'Name the release.'),
      releaseDate: required(v.releaseDate, 'Choose a date.'),
    }),
    onSubmit: async (v) => {
      const saved = release
        ? await trackerApi.releases.update(release.id, v)
        : await trackerApi.releases.create(v)
      invalidate('tracker-releases')
      notify(release ? `${saved.id} updated.` : `${saved.id} scheduled.`)
      onClose()
    },
  })

  const remove = async () => {
    if (!release) return
    await trackerApi.releases.remove(release.id)
    invalidate('tracker-releases')
    notify(`${release.id} deleted.`)
    onClose()
  }

  const text = (field: keyof ReleaseInput, label: string, extra: object = {}) => (
    <TextField
      label={label}
      value={values[field]}
      error={errors[field]}
      onChange={(e) => set(field, e.target.value as never)}
      {...extra}
    />
  )

  return (
    <form className="form-grid" onSubmit={handleSubmit} noValidate>
      <fieldset disabled={!editable} className="form-grid span-2">
        {text('title', 'Release', { required: true, maxLength: 300, className: 'span-2' })}
        {text('releaseDate', 'Release date', { required: true, type: 'date' })}
        <SelectField
          label="Status"
          options={toOptions(workflow.releaseStatuses)}
          value={values.status}
          error={errors.status}
          onChange={(e) => set('status', e.target.value)}
        />
        <SelectField
          label="Type"
          options={toOptions(workflow.releaseTypes)}
          value={values.type}
          error={errors.type}
          onChange={(e) => set('type', e.target.value)}
        />
        {text('layer', 'Layer', { maxLength: 80, placeholder: 'BE, Web, App…' })}
        {text('systems', 'Systems', {
          maxLength: 300,
          className: 'span-2',
          placeholder: 'DL, Lesipay, Finacle…',
        })}
        {text('techOwner', 'Tech owner', { maxLength: 120 })}
        {text('buSpoc', 'PO/BU SPOC', { maxLength: 120 })}
        {text('qaSpoc', 'Dev/QA SPOC', { maxLength: 120 })}
        <SelectField
          label="Sanity test"
          options={sanityOptions}
          value={values.sanityTest}
          error={errors.sanityTest}
          onChange={(e) => set('sanityTest', e.target.value as ReleaseInput['sanityTest'])}
        />
        <TextAreaField
          label="Notes"
          maxLength={2000}
          value={values.notes}
          error={errors.notes}
          onChange={(e) => set('notes', e.target.value)}
          className="span-2"
        />
      </fieldset>
      {errors.form && (
        <div className="inline-alert alert-error span-2" role="alert">
          {errors.form}
        </div>
      )}
      <div className="form-actions span-2">
        {release && can('tracker:delete') && (
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
            {release ? 'Save changes' : 'Schedule release'}
          </Button>
        )}
      </div>
      <ConfirmDialog
        open={confirming}
        title="Delete release?"
        message={`${release?.id} “${release?.title}” will be permanently removed.`}
        confirmLabel="Delete release"
        onConfirm={remove}
        onClose={() => setConfirming(false)}
      />
    </form>
  )
}
