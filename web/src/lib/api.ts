import type {
  ActivityEvent,
  AdminUser,
  AuthStatus,
  DevRole,
  DocumentFolder,
  DriveItem,
  IntegrationReport,
  OutlookCalendar,
  PeopleResults,
  Person,
  Role,
  AppConfig,
  Meeting,
  MeetingInput,
  MeetingType,
  Project,
  ProjectInput,
  Session,
  Summary,
  User,
  WorkItem,
  WorkItemInput,
} from '../types'

import { request, upload, withQuery } from './http'

export { ApiError, apiBase } from './http'

const enc = encodeURIComponent

export const api = {
  config: (signal?: AbortSignal) => request<AppConfig>('/api/v1/config', { signal }),
  me: (signal?: AbortSignal) => request<Session>('/api/v1/me', { signal }),
  authStatus: (signal?: AbortSignal) => request<AuthStatus>('/api/v1/auth/status', { signal }),
  logout: () => request<void>('/api/v1/auth/logout', { method: 'POST' }),
  devRoles: (signal?: AbortSignal) => request<DevRole[]>('/api/v1/auth/dev-roles', { signal }),
  devLogin: (role: string) =>
    request<Session>('/api/v1/auth/dev-login', { method: 'POST', body: { role } }),
  people: (q: string, signal?: AbortSignal) =>
    request<PeopleResults>(withQuery('/api/v1/directory/people', { q }), { signal }),
  addPerson: (entraId: string) =>
    request<Person>('/api/v1/directory/people', { method: 'POST', body: { entraId } }),
  users: (signal?: AbortSignal) => request<User[]>('/api/v1/users', { signal }),
  dashboard: (signal?: AbortSignal) => request<Summary>('/api/v1/dashboard', { signal }),
  activity: (type: string, id: string, signal?: AbortSignal) =>
    request<ActivityEvent[]>(`/api/v1/activity/${type}/${encodeURIComponent(id)}`, { signal }),

  projects: {
    list: (signal?: AbortSignal) => request<Project[]>('/api/v1/projects', { signal }),
    get: (id: string, signal?: AbortSignal) =>
      request<Project>(`/api/v1/projects/${encodeURIComponent(id)}`, { signal }),
    create: (body: ProjectInput) => request<Project>('/api/v1/projects', { method: 'POST', body }),
    update: (id: string, body: ProjectInput) =>
      request<Project>(`/api/v1/projects/${encodeURIComponent(id)}`, { method: 'PUT', body }),
    remove: (id: string) =>
      request<void>(`/api/v1/projects/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },

  workItems: {
    list: (filter: { projectId?: string; assignee?: string }, signal?: AbortSignal) =>
      request<WorkItem[]>(withQuery('/api/v1/work-items', filter), { signal }),
    create: (body: WorkItemInput) =>
      request<WorkItem>('/api/v1/work-items', { method: 'POST', body }),
    update: (id: string, body: WorkItemInput) =>
      request<WorkItem>(`/api/v1/work-items/${encodeURIComponent(id)}`, { method: 'PUT', body }),
    remove: (id: string) =>
      request<void>(`/api/v1/work-items/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },

  meetings: {
    types: (signal?: AbortSignal) => request<MeetingType[]>('/api/v1/meeting-types', { signal }),
    list: (range: { from: string; to: string }, signal?: AbortSignal) =>
      request<Meeting[]>(withQuery('/api/v1/meetings', range), { signal }),
    create: (body: MeetingInput) => request<Meeting>('/api/v1/meetings', { method: 'POST', body }),
    update: (id: string, body: MeetingInput) =>
      request<Meeting>(`/api/v1/meetings/${encodeURIComponent(id)}`, { method: 'PUT', body }),
    remove: (id: string) =>
      request<void>(`/api/v1/meetings/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    syncOutlook: (id: string) =>
      request<Meeting>(`/api/v1/meetings/${enc(id)}/outlook-sync`, { method: 'POST' }),
    outlookEvents: (range: { from: string; to: string }, signal?: AbortSignal) =>
      request<OutlookCalendar>(withQuery('/api/v1/outlook/events', range), { signal }),
  },

  documents: {
    list: (projectId: string, signal?: AbortSignal) =>
      request<DocumentFolder>(`/api/v1/projects/${enc(projectId)}/documents`, { signal }),
    upload: (projectId: string, file: File, onProgress?: (percent: number) => void) =>
      upload<DriveItem>(`/api/v1/projects/${enc(projectId)}/documents`, file, onProgress),
  },

  admin: {
    users: (signal?: AbortSignal) => request<AdminUser[]>('/api/v1/admin/users', { signal }),
    roles: (signal?: AbortSignal) => request<Role[]>('/api/v1/admin/roles', { signal }),
    integrations: (signal?: AbortSignal) =>
      request<IntegrationReport>('/api/v1/admin/integrations', { signal }),
    updateUser: (id: number, body: { roles: string[]; active: boolean }) =>
      request<void>(`/api/v1/admin/users/${id}`, { method: 'PUT', body }),
  },
}
