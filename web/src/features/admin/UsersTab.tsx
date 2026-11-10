import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Building2, ShieldCheck, Users } from 'lucide-react'
import { PersonSearch } from '../../components/people/PersonSearch'
import { Avatar } from '../../components/ui/Badges'
import { matches } from '../../components/ui/Filters'
import { Pagination, usePagination } from '../../components/ui/Pagination'
import { Panel } from '../../components/ui/Panel'
import { EmptyState, QueryView, Skeleton } from '../../components/ui/States'
import { useSession } from '../../context/SessionContext'
import { invalidate, useQuery } from '../../hooks/useQuery'
import { api } from '../../lib/api'
import type { AdminUser } from '../../types'
import { EditAccessDialog } from './EditAccessDialog'

export function UsersTab() {
  const { can, hasMicrosoft } = useSession()
  const [params] = useSearchParams()
  const search = params.get('q') ?? ''
  const users = useQuery('admin:users', api.admin.users)
  const roles = useQuery('admin:roles', api.admin.roles)
  const [editing, setEditing] = useState<AdminUser | null>(null)

  return (
    <>
      {can('directory:search') && (
        <Panel
          title="Add people"
          icon={Building2}
          tone="turquoise"
          description={
            hasMicrosoft('directory')
              ? 'Search your Microsoft Entra directory. People you add receive the default role.'
              : 'Sign in with Microsoft to search the organization directory.'
          }
        >
          <div className="panel-body">
            <PersonSearch
              label="Search the organization"
              placeholder="Search by name or email"
              onSelect={() => invalidate('admin:', 'users')}
            />
          </div>
        </Panel>
      )}
      <Panel title="Users" icon={Users} count={users.data?.length}>
        <QueryView query={users} skeleton={<Skeleton rows={6} />}>
          {(list) => (
            <UserTable
              users={list.filter((u) => matches(search, u.displayName, u.email, ...u.roles))}
              roleNames={Object.fromEntries((roles.data ?? []).map((r) => [r.key, r.name]))}
              onEdit={setEditing}
            />
          )}
        </QueryView>
      </Panel>
      {editing && roles.data && (
        <EditAccessDialog user={editing} roles={roles.data} onClose={() => setEditing(null)} />
      )}
    </>
  )
}

type TableProps = {
  users: AdminUser[]
  roleNames: Record<string, string>
  onEdit: (u: AdminUser) => void
}

function UserTable({ users, roleNames, onEdit }: TableProps) {
  const { rows, meta, setPage, setPageSize } = usePagination(users, 20)
  if (users.length === 0) return <EmptyState title="No users match" />
  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">User</th>
              <th scope="col">Roles</th>
              <th scope="col">Sign-in</th>
              <th scope="col">Status</th>
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((user) => (
              <tr key={user.id} className={user.active ? '' : 'row-inactive'}>
                <td>
                  <div className="work-title">
                    <Avatar name={user.displayName} />
                    <div>
                      <b>{user.displayName}</b>
                      <small>{user.email}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="role-chips">
                    {user.roles.map((role) => (
                      <span
                        key={role}
                        className={`role-chip ${role === 'administrator' ? 'admin' : ''}`}
                      >
                        {role === 'administrator' && <ShieldCheck size={12} aria-hidden />}
                        {roleNames[role] ?? role}
                      </span>
                    ))}
                    {user.roles.length === 0 && <span className="muted">No role</span>}
                  </div>
                </td>
                <td>
                  {user.entra ? 'Microsoft Entra ID' : <span className="muted">Not linked</span>}
                </td>
                <td>
                  <span className={`status-pill ${user.active ? 'tone-green' : 'tone-grey'}`}>
                    <i aria-hidden="true" />
                    {user.active ? 'Active' : 'Deactivated'}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className="link-button text-link"
                    onClick={() => onEdit(user)}
                  >
                    Edit access
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination meta={meta} onPage={setPage} onPageSize={setPageSize} />
    </>
  )
}
