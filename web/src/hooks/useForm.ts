import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../lib/api'

type Errors<T> = Partial<Record<keyof T | 'form', string>>

/**
 * Controlled form state with client validation and server field-error mapping.
 * `validate` returns field messages; `onSubmit` persists the values.
 */
export function useForm<T extends Record<string, unknown>>(options: {
  initial: T
  validate?: (values: T) => Errors<T>
  onSubmit: (values: T) => Promise<void>
}) {
  const [values, setValues] = useState(options.initial)
  const [errors, setErrors] = useState<Errors<T>>({})
  const [submitting, setSubmitting] = useState(false)

  const set = <K extends keyof T>(field: K, value: T[K]) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const clientErrors = options.validate?.(values) ?? {}
    if (Object.values(clientErrors).some(Boolean)) {
      setErrors(clientErrors)
      focusFirstInvalid(event.currentTarget)
      return
    }
    setSubmitting(true)
    setErrors({})
    try {
      await options.onSubmit(values)
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
        setErrors({ ...(error.fields as Errors<T>), form: error.message })
      } else {
        setErrors({
          form: error instanceof Error ? error.message : 'Unable to save changes.',
        } as Errors<T>)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return { values, errors, set, submitting, handleSubmit }
}

function focusFirstInvalid(form: HTMLFormElement) {
  requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
}

/** Returns a message when value is blank. */
export const required = (value: unknown, message: string) =>
  value === null || value === undefined || String(value).trim() === '' ? message : undefined
