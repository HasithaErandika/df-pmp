import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { useSession } from '../../context/SessionContext'
import { useToast } from '../../context/ToastContext'
import { invalidate } from '../../hooks/useQuery'
import { api } from '../../lib/api'
import type { AdminUser, Role } from '../../types'

type Props = { user: AdminUser; roles: Role[]; onClose: () => void }

/** Assign roles and activate/deactivate a user. The API enforces the last-administrator rule. */
export function EditAccessDialog({ user, roles, onClose }: Props) {
  const { session } = useSession()
  const notify = useToast()
  const [selected, setSelected] = useState(new Set(user.roles))
  const [active, setActive] = useState(user.active)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const self = session?.id === user.id

  const toggle = (key: string) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      await api.admin.updateUser(user.id, { roles: [...selected], active })
      invalidate('admin:', 'session')
      notify(`Access updated for ${user.displayName}.`)
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update access.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      title={`Access for ${user.displayName}`}
      description={user.email}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            Save access
          </Button>
        </>
      }
    >
      <fieldset className="role-options">
        <legend>Roles</legend>
        {roles.map((role) => (
          <label key={role.key} className="toggle">
            <input
              type="checkbox"
              checked={selected.has(role.key)}
              disabled={self && role.key === 'administrator'}
              onChange={() => toggle(role.key)}
            />
            <span>
              <b>{role.name}</b>
              <small>
                {role.key === 'administrator'
                  ? 'Every feature, including administration.'
                  : role.description}{' '}
                · {role.permissions.length} permissions
              </small>
            </span>
          </label>
        ))}
      </fieldset>
      <label className="toggle account-toggle">
        <input
          type="checkbox"
          checked={active}
          disabled={self}
          onChange={(e) => setActive(e.target.checked)}
        />
        <span>
          <b>Account active</b>
          <small>Deactivating signs the user out immediately and blocks sign-in.</small>
        </span>
      </label>
      {self && (
        <p className="field-hint">
          You cannot remove your own administrator role or deactivate yourself.
        </p>
      )}
      {error && (
        <div className="inline-alert alert-error" role="alert">
          {error}
        </div>
      )}
    </Modal>
  )
}
