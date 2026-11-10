import { KeyRound } from 'lucide-react'
import { Panel } from '../../components/ui/Panel'
import { QueryView, Skeleton } from '../../components/ui/States'
import { useQuery } from '../../hooks/useQuery'
import { api } from '../../lib/api'

/** Read-only overview of roles and their effective permissions. */
export function RolesTab() {
  const roles = useQuery('admin:roles', api.admin.roles)
  return (
    <QueryView query={roles} skeleton={<Skeleton rows={3} height={120} />}>
      {(list) => (
        <div className="roles-grid">
          {list.map((role) => (
            <Panel
              key={role.key}
              title={role.name}
              icon={KeyRound}
              tone={role.key === 'administrator' ? 'red' : 'blue'}
              count={role.members}
              description={
                role.key === 'administrator'
                  ? 'Always holds every permission, including new ones.'
                  : role.description
              }
            >
              <ul className="permission-list">
                {role.permissions.map((permission) => {
                  const [resource, action] = permission.split(':')
                  return (
                    <li key={permission}>
                      <span className="mono-label">{resource}</span>
                      <b>{action}</b>
                    </li>
                  )
                })}
              </ul>
            </Panel>
          ))}
        </div>
      )}
    </QueryView>
  )
}
