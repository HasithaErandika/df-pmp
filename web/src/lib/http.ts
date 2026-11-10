export const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

/** Error raised for non-2xx responses; carries per-field validation messages when present. */
export class ApiError extends Error {
  readonly status: number
  readonly fields: Record<string, string>

  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(fields.body ?? message)
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

const unreachable = 'The server could not be reached. Check your connection and try again.'

/** JSON request. Cookies are included so Microsoft sign-in sessions work across the web and API ports. */
export async function request<T>(
  path: string,
  { method = 'GET', body, signal }: RequestOptions = {},
) {
  let response: Response
  try {
    response = await fetch(`${apiBase}${path}`, {
      method,
      signal,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, unreachable)
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

/** Multipart upload with progress (fetch cannot report upload progress). Sends `size` before `file`. */
export function upload<T>(path: string, file: File, onProgress?: (percent: number) => void) {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${apiBase}${path}`)
    xhr.withCredentials = true
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100))
    }
    xhr.onerror = () => reject(new ApiError(0, unreachable))
    xhr.onload = () => {
      let payload: { error?: string; fields?: Record<string, string> } = {}
      try {
        payload = JSON.parse(xhr.responseText)
      } catch {
        // non-JSON error body
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(payload as T)
      else
        reject(
          new ApiError(
            xhr.status,
            payload.fields?.file ?? payload.error ?? 'Upload failed',
            payload.fields,
          ),
        )
    }
    const form = new FormData()
    form.append('size', String(file.size))
    form.append('file', file)
    xhr.send(form)
  })
}

export const withQuery = (path: string, params: Record<string, string | undefined>) => {
  const query = new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ).toString()
  return query ? `${path}?${query}` : path
}
