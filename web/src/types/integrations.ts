/** Types for sign-in, Microsoft 365 integration and administration. */

export type AuthMode = 'preview' | 'entra' | 'disabled'

export type AuthStatus = {
  mode: AuthMode | string
  features: { outlook: boolean; directory: boolean; sharepoint: boolean }
}

export type Person = {
  localId: number | null
  entraId: string
  displayName: string
  email: string
  source: 'local' | 'entra'
}
export type PeopleResults = { directory: boolean; people: Person[] }

export type OutlookEvent = {
  id: string
  subject: string
  startsAt: string
  endsAt: string
  location: string
  webLink: string
  joinUrl: string
  showAs: string
}
export type OutlookCalendar = { connected: boolean; events: OutlookEvent[] }

export type DriveItem = {
  id: string
  name: string
  webUrl: string
  size: number
  lastModifiedDateTime: string
  folder?: { childCount: number }
  file?: { mimeType: string }
  lastModifiedBy: { user: { displayName: string } }
}
export type DocumentFolder = { enabled: boolean; webUrl: string; items: DriveItem[] }

export type AdminUser = {
  id: number
  displayName: string
  email: string
  active: boolean
  entra: boolean
  roles: string[]
}

export type Role = {
  key: string
  name: string
  description: string
  permissions: string[]
  members: number
}

export type IntegrationReport = {
  authMode: string
  features: Record<string, boolean>
  tenantId: string
  clientId: string
  secretSet: boolean
  redirectUrl: string
  sharePointSite: string
  sharePointLib: string
  delegatedScopes: string[]
  bootstrapAdmins: number
  defaultRole: string
}
