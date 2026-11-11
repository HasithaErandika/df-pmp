export type Tone = 'blue' | 'red' | 'gold' | 'green' | 'turquoise' | 'purple' | 'grey' | 'neutral'

export type Workflow = {
  projectStatuses: string[]
  workItemStatuses: string[]
  workItemTypes: string[]
  priorities: string[]
  tones: Tone[]
  trackerStatuses: string[]
  releaseTypes: string[]
  releaseStatuses: string[]
}

export type AppConfig = {
  applicationName: string
  companyName: string
  productDescription: string
  logoPath: string
  timezone: string
  theme: Record<string, string>
  statusTones: Record<string, Tone>
  workflow: Workflow
}

export type Session = {
  id: number
  displayName: string
  email: string
  roles: string[]
  permissions: string[]
  microsoft: 'connected' | 'not_connected'
}

export type User = { id: number; displayName: string; email: string }

export type Project = {
  id: string
  name: string
  description: string
  ownerId: number
  ownerName: string
  status: string
  tone: Tone
  progress: number
  startDate: string
  endDate: string
  openItems: number
  updatedAt: string
}
export type ProjectInput = Omit<Project, 'id' | 'ownerName' | 'openItems' | 'updatedAt'>

export type WorkItem = {
  id: string
  projectId: string
  projectName: string
  subject: string
  type: string
  status: string
  priority: string
  assigneeId: number | null
  assigneeName: string
  dueDate: string
  updatedAt: string
}
export type WorkItemInput = Omit<WorkItem, 'id' | 'projectName' | 'assigneeName' | 'updatedAt'>

export type MeetingType = { id: string; name: string; tone: Tone }

export type Meeting = {
  id: string
  title: string
  typeId: string
  typeName: string
  tone: Tone
  projectId: string | null
  projectName: string
  startsAt: string
  endsAt: string
  location: string
  agenda: string
  participantIds: number[]
  outlook: boolean
  teamsMeeting: boolean
  organizerId: number | null
  outlookWebLink: string
  onlineMeetingUrl: string
  syncStatus: 'not_synced' | 'synced' | 'failed'
  syncError: string
}
export type MeetingInput = Pick<
  Meeting,
  | 'title'
  | 'typeId'
  | 'projectId'
  | 'startsAt'
  | 'endsAt'
  | 'location'
  | 'agenda'
  | 'participantIds'
  | 'outlook'
  | 'teamsMeeting'
>

export type Summary = {
  activeProjects: number
  openWorkItems: number
  assignedToMe: number
  dueThisWeek: number
  overdue: number
  completedThisMonth: number
  upcomingMeetings: number
}

export type ActivityEvent = {
  id: number
  occurredAt: string
  actor: string
  action: string
  objectType: string
  objectId: string
  summary: string
}

export * from './integrations'
export * from './tracker'
