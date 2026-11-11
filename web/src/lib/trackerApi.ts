import type {
  Release,
  ReleaseInput,
  TrackerBoard,
  TrackerTask,
  TrackerTaskInput,
  TrackerUpdate,
} from '../types'
import { request } from './http'

const enc = encodeURIComponent
const base = '/api/v1/tracker'

/** Task tracker boards, tasks with their progress log, and the release calendar. */
export const trackerApi = {
  boards: (signal?: AbortSignal) => request<TrackerBoard[]>(`${base}/boards`, { signal }),
  tasks: (board: string, signal?: AbortSignal) =>
    request<TrackerTask[]>(`${base}/boards/${enc(board)}/tasks`, { signal }),
  create: (body: TrackerTaskInput) =>
    request<TrackerTask>(`${base}/tasks`, { method: 'POST', body }),
  update: (id: string, body: TrackerTaskInput) =>
    request<TrackerTask>(`${base}/tasks/${enc(id)}`, { method: 'PUT', body }),
  remove: (id: string) => request<void>(`${base}/tasks/${enc(id)}`, { method: 'DELETE' }),
  updates: (id: string, signal?: AbortSignal) =>
    request<TrackerUpdate[]>(`${base}/tasks/${enc(id)}/updates`, { signal }),
  addNote: (id: string, body: string) =>
    request<TrackerUpdate[]>(`${base}/tasks/${enc(id)}/updates`, {
      method: 'POST',
      body: { body },
    }),

  releases: {
    list: (signal?: AbortSignal) => request<Release[]>(`${base}/releases`, { signal }),
    create: (body: ReleaseInput) => request<Release>(`${base}/releases`, { method: 'POST', body }),
    update: (id: string, body: ReleaseInput) =>
      request<Release>(`${base}/releases/${enc(id)}`, { method: 'PUT', body }),
    remove: (id: string) => request<void>(`${base}/releases/${enc(id)}`, { method: 'DELETE' }),
  },
}
