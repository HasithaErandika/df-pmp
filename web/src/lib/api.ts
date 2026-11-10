import type {
  ActivityEvent,
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

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

/** Error raised for non-2xx responses; carries per-field validation messages when present. */
export class ApiError extends Error {
  readonly status: number
  readonly fields: Record<string, string>

  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

async function request<T>(path: string, { method = 'GET', body, signal }: RequestOptions = {}) {
  let response: Response
  try {
    response = await fetch(`${apiBase}${path}`, {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'The server could not be reached. Check your connection and try again.')
  }
  if (response.status === 204) return undefined as T
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload.error ?? `Request failed (${response.status})`,
      payload.fields,
    )
  }
  return payload as T
}

const withQuery = (path: string, params: Record<string, string | undefined>) => {
  const query = new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ).toString()
  return query ? `${path}?${query}` : path
}

export const api = {
  config: (signal?: AbortSignal) => request<AppConfig>('/api/v1/config', { signal }),
  me: (signal?: AbortSignal) => request<Session>('/api/v1/me', { signal }),
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
  },
}
