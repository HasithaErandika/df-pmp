import { required } from '../../hooks/useForm'
import { today, zonedParts, zonedToISO } from '../../lib/dates'
import type { Meeting, MeetingInput } from '../../types'

/** Form shape: the date and times are edited separately, then combined in the company time zone. */
export type MeetingFormValues = {
  title: string
  typeId: string
  projectId: string
  date: string
  startTime: string
  endTime: string
  location: string
  agenda: string
  participantIds: number[]
}

export function toFormValues(
  meeting: Meeting | undefined,
  timeZone: string,
  defaults: { date?: string; userId?: number },
): MeetingFormValues {
  const start = meeting
    ? zonedParts(meeting.startsAt, timeZone)
    : { date: defaults.date ?? today(), time: '10:00' }
  const end = meeting ? zonedParts(meeting.endsAt, timeZone) : { time: '11:00' }
  return {
    title: meeting?.title ?? '',
    typeId: meeting?.typeId ?? '',
    projectId: meeting?.projectId ?? '',
    date: start.date,
    startTime: start.time,
    endTime: end.time,
    location: meeting?.location ?? '',
    agenda: meeting?.agenda ?? '',
    participantIds: meeting?.participantIds ?? (defaults.userId ? [defaults.userId] : []),
  }
}

export function toMeetingInput(v: MeetingFormValues, timeZone: string): MeetingInput {
  return {
    title: v.title,
    typeId: v.typeId,
    projectId: v.projectId || null,
    startsAt: zonedToISO(v.date, v.startTime, timeZone),
    endsAt: zonedToISO(v.date, v.endTime, timeZone),
    location: v.location,
    agenda: v.agenda,
    participantIds: v.participantIds,
  }
}

export const validateMeeting = (v: MeetingFormValues) => ({
  title: required(v.title, 'Enter a meeting title.'),
  typeId: required(v.typeId, 'Choose a meeting type.'),
  date: required(v.date, 'Choose a date.'),
  endTime: v.endTime <= v.startTime ? 'End time must be after the start time.' : undefined,
})
