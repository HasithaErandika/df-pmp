import { useState } from 'react'
import { PageHeading } from '../../components/ui/PageHeading'
import { FilterTabs } from '../../components/ui/Filters'
import { IntegrationsTab } from './IntegrationsTab'
import { RolesTab } from './RolesTab'
import { UsersTab } from './UsersTab'

const tabs = [
  { value: 'users', label: 'Users' },
  { value: 'roles', label: 'Roles & permissions' },
  { value: 'integrations', label: 'Microsoft 365' },
]

/** Administration: user access, roles and integration status. Requires user:manage. */
export default function AdminPage() {
  const [tab, setTab] = useState('users')
  return (
    <>
      <PageHeading
        kicker="ADMINISTRATION"
        title="Administration"
        description="Manage who can use df-pmp, what they can do, and the Microsoft 365 connection."
      />
      <div className="toolbar-row">
        <FilterTabs label="Administration section" options={tabs} value={tab} onChange={setTab} />
      </div>
      {tab === 'users' && <UsersTab />}
      {tab === 'roles' && <RolesTab />}
      {tab === 'integrations' && <IntegrationsTab />}
    </>
  )
}
