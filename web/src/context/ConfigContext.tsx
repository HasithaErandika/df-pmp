import { createContext, use, useEffect } from 'react'
import type { ReactNode } from 'react'
import { FullPageState } from '../components/ui/FullPageState'
import { useQuery } from '../hooks/useQuery'
import { api } from '../lib/api'
import type { AppConfig, Tone } from '../types'

const ConfigContext = createContext<AppConfig | null>(null)

const themeAliases: Record<string, string> = {
  primary: 'blue',
  primaryStrong: 'blue-strong',
  accent: 'red',
}

/** Writes configured brand colours to CSS custom properties so styles stay data-driven. */
function applyTheme(config: AppConfig) {
  document.title = `${config.applicationName} | ${config.companyName}`
  const root = document.documentElement.style
  Object.entries(config.theme).forEach(([key, value]) => {
    const token = themeAliases[key] ?? key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
    root.setProperty(`--brand-${token}`, value)
  })
}

/** Loads public application configuration before rendering the app. */
export function ConfigProvider({ children }: { children: ReactNode }) {
  const { data, error, reload } = useQuery('config', api.config)

  useEffect(() => {
    if (data) applyTheme(data)
  }, [data])

  if (error) {
    return (
      <FullPageState
        title="We couldn't load the workspace"
        message={error.message}
        action={{ label: 'Try again', onClick: reload }}
      />
    )
  }
  if (!data) return <FullPageState title="df-pmp" message="Loading your workspace…" busy />
  return <ConfigContext value={data}>{children}</ConfigContext>
}

export function useConfig() {
  const config = use(ConfigContext)
  if (!config) throw new Error('useConfig must be used within ConfigProvider')
  return config
}

/** Resolves the configured tone for a status label. */
export function useStatusTone() {
  const { statusTones } = useConfig()
  return (status: string): Tone => statusTones[status] ?? 'neutral'
}
