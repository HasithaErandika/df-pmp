import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useConfig } from '../../context/ConfigContext'
import { useSession } from '../../context/SessionContext'
import { useToast } from '../../context/ToastContext'
import { useForm } from '../../hooks/useForm'
import { invalidate } from '../../hooks/useQuery'
import { useMeetingTypes, useProjects } from '../../hooks/useReferenceData'
import { api } from '../../lib/api'
import type { Meeting } from '../../types'
import { toFormValues, toMeetingInput, validateMeeting } from './meetingForm'
import { ParticipantPicker } from './ParticipantPicker'

type Props = { open: boolean; meeting?: Meeting; date?: string; onClose: () => void }

const refresh = () => invalidate('meetings', 'dashboard', 'activity:')

/** Schedule, edit or cancel a meeting. Times are entered in the company time zone. */
export function MeetingFormDialog(props: Props) {
  const title = props.meeting ? 'Edit meeting' : 'Schedule meeting'
  return (
    <Modal open={props.open} title={title} onClose={props.onClose} size="lg">
      <MeetingForm {...props} />
    </Modal>
  )
}

function MeetingForm({ meeting, date, onClose }: Props) {
  const { timezone } = useConfig()
  const { session, can } = useSession()
  const notify = useToast()
  const types = useMeetingTypes()
  const projects = useProjects()
  const [confirming, setConfirming] = useState(false)
  const editable = meeting ? can('meeting:update') : can('meeting:create')
  const { values, errors, set, submitting, handleSubmit } = useForm({
    initial: toFormValues(meeting, timezone, { date, userId: session?.id }),
    validate: validateMeeting,
    onSubmit: async (v) => {
      const body = toMeetingInput(v, timezone)
      await (meeting ? api.meetings.update(meeting.id, body) : api.meetings.create(body))
      refresh()
      notify(meeting ? 'Meeting updated.' : 'Meeting scheduled.')
      onClose()
    },
  })

  // The API validates startsAt/endsAt, which the form edits as separate date and time fields.
  const apiErrors = errors as Record<string, string | undefined>

  const cancelMeeting = async () => {
    if (!meeting) return
    await api.meetings.remove(meeting.id)
    refresh()
    notify('Meeting cancelled.')
    onClose()
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit} noValidate>
      <fieldset disabled={!editable} className="form-grid span-2">
        <TextField
          label="Title"
          required
          autoFocus
          maxLength={160}
          value={values.title}
          error={errors.title}
          onChange={(e) => set('title', e.target.value)}
          className="span-2"
        />
        <SelectField
          label="Meeting type"
          required
          placeholder="Choose a type"
          options={(types.data ?? []).map((t) => ({ value: t.id, label: t.name }))}
          value={values.typeId}
          error={errors.typeId}
          onChange={(e) => set('typeId', e.target.value)}
        />
        <SelectField
          label="Related project"
          placeholder="None"
          options={(projects.data ?? []).map((p) => ({ value: p.id, label: p.name }))}
          value={values.projectId}
          error={errors.projectId}
          onChange={(e) => set('projectId', e.target.value)}
        />
        <TextField
          label="Date"
          type="date"
          required
          value={values.date}
          error={errors.date ?? apiErrors.startsAt}
          onChange={(e) => set('date', e.target.value)}
        />
        <div className="field-pair">
          <TextField
            label="Starts"
            type="time"
            required
            value={values.startTime}
            onChange={(e) => set('startTime', e.target.value)}
          />
          <TextField
            label="Ends"
            type="time"
            required
            value={values.endTime}
            error={errors.endTime ?? apiErrors.endsAt}
            onChange={(e) => set('endTime', e.target.value)}
          />
        </div>
        <TextField
          label="Location"
          maxLength={160}
          placeholder="Room or Microsoft Teams"
          value={values.location}
          error={errors.location}
          onChange={(e) => set('location', e.target.value)}
          className="span-2"
        />
        <TextAreaField
          label="Agenda"
          maxLength={4000}
          value={values.agenda}
          error={errors.agenda}
          onChange={(e) => set('agenda', e.target.value)}
          className="span-2"
        />
        <ParticipantPicker
          value={values.participantIds}
          onChange={(ids) => set('participantIds', ids)}
          error={errors.participantIds}
        />
      </fieldset>
      <p className="field-hint span-2">Times are in {timezone}.</p>
      {errors.form && (
        <div className="inline-alert alert-error span-2" role="alert">
          {errors.form}
        </div>
      )}
      <div className="form-actions span-2">
        {meeting && can('meeting:delete') && (
          <Button
            variant="ghost"
            icon={Trash2}
            className="push-left danger-text"
            onClick={() => setConfirming(true)}
          >
            Cancel meeting
          </Button>
        )}
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          {editable ? 'Discard' : 'Close'}
        </Button>
        {editable && (
          <Button type="submit" loading={submitting}>
            {meeting ? 'Save changes' : 'Schedule'}
          </Button>
        )}
      </div>
      <ConfirmDialog
        open={confirming}
        title="Cancel this meeting?"
        message={`“${meeting?.title}” will be removed from the calendar for all participants.`}
        confirmLabel="Cancel meeting"
        onConfirm={cancelMeeting}
        onClose={() => setConfirming(false)}
      />
    </form>
  )
}
