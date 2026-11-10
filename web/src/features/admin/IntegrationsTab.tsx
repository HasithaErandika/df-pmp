import { CalendarDays, CheckCircle2, CircleDashed, FolderOpen, KeyRound, Users } from 'lucide-react'
import { Panel } from '../../components/ui/Panel'
import { QueryView, Skeleton } from '../../components/ui/States'
import { useQuery } from '../../hooks/useQuery'
import { api } from '../../lib/api'

function State({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={`integration-state ${on ? 'on' : 'off'}`}>
      {on ? <CheckCircle2 size={14} aria-hidden /> : <CircleDashed size={14} aria-hidden />}
      {on ? 'Connected' : label}
    </span>
  )
}

/** Microsoft 365 configuration status. Secrets are never sent to the browser. */
export function IntegrationsTab() {
  const report = useQuery('admin:integrations', api.admin.integrations)
  return (
    <QueryView query={report} skeleton={<Skeleton rows={3} height={90} />}>
      {(r) => {
        const entra = r.authMode === 'entra'
        const rows = [
          {
            icon: KeyRound,
            name: 'Microsoft Entra ID sign-in',
            on: entra,
            hint: 'Set AUTH_MODE=entra with the app registration values.',
          },
          {
            icon: Users,
            name: 'Organization directory search',
            on: r.features.directory,
            hint: 'Requires Entra sign-in and User.ReadBasic.All (delegated).',
          },
          {
            icon: CalendarDays,
            name: 'Outlook calendar and Teams',
            on: r.features.outlook,
            hint: 'Requires Entra sign-in and Calendars.ReadWrite (delegated).',
          },
          {
            icon: FolderOpen,
            name: 'SharePoint project documents',
            on: r.features.sharepoint,
            hint: 'Set SHAREPOINT_SITE_URL and grant Sites.Selected to the app.',
          },
        ]
        return (
          <div className="integrations">
            <Panel title="Services" description="What df-pmp can use in your Microsoft 365 tenant.">
              <ul className="integration-list">
                {rows.map(({ icon: Icon, name, on, hint }) => (
                  <li key={name}>
                    <span className="heading-icon tone-blue" aria-hidden="true">
                      <Icon size={16} />
                    </span>
                    <span>
                      <b>{name}</b>
                      {!on && <small>{hint}</small>}
                    </span>
                    <State on={on} label="Not configured" />
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel
              title="App registration"
              description="Values from the API environment (secrets hidden)."
            >
              <dl className="config-list">
                <dt>Sign-in mode</dt>
                <dd>{r.authMode}</dd>
                <dt>Tenant ID</dt>
                <dd className="mono-label">{r.tenantId || '—'}</dd>
                <dt>Client ID</dt>
                <dd className="mono-label">{r.clientId || '—'}</dd>
                <dt>Client secret</dt>
                <dd>{r.secretSet ? 'Set' : 'Not set'}</dd>
                <dt>Redirect URI</dt>
                <dd className="mono-label">{r.redirectUrl}</dd>
                <dt>SharePoint site</dt>
                <dd className="mono-label">{r.sharePointSite || '—'}</dd>
                <dt>Library</dt>
                <dd>{r.sharePointLib || 'Default library'}</dd>
                <dt>Delegated scopes</dt>
                <dd className="mono-label">{r.delegatedScopes.join(' ')}</dd>
                <dt>Default role</dt>
                <dd>{r.defaultRole}</dd>
                <dt>Bootstrap admins</dt>
                <dd>{r.bootstrapAdmins}</dd>
              </dl>
            </Panel>
          </div>
        )
      }}
    </QueryView>
  )
}
