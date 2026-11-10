import { useState } from 'react'
import { AlertTriangle, CheckCircle2, ExternalLink, Video } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { useSession } from '../../context/SessionContext'
import { useToast } from '../../context/ToastContext'
import { invalidate } from '../../hooks/useQuery'
import { api } from '../../lib/api'
import type { Meeting } from '../../types'

type Props = {
  meeting?: Meeting
  outlook: boolean
  teams: boolean
  onOutlook: (value: boolean) => void
  onTeams: (value: boolean) => void
  disabled?: boolean
}

/** Outlook invitation and Teams options, with the current sync state and a retry action. */
export function OutlookOptions({ meeting, outlook, teams, onOutlook, onTeams, disabled }: Props) {
  const { hasMicrosoft, status } = useSession()
  const notify = useToast()
  const [retrying, setRetrying] = useState(false)
  const connected = hasMicrosoft('outlook')
  const teamsLocked = Boolean(meeting?.teamsMeeting && meeting.syncStatus === 'synced')

  const retry = async () => {
    if (!meeting) return
    setRetrying(true)
    try {
      const updated = await api.meetings.syncOutlook(meeting.id)
      invalidate('meetings')
      notify(
        updated.syncStatus === 'synced' ? 'Outlook invitation updated.' : updated.syncError,
        updated.syncStatus === 'synced' ? 'success' : 'error',
      )
    } finally {
      setRetrying(false)
    }
  }

  if (!connected && !meeting?.outlook) {
    return (
      <p className="outlook-note span-2">
        {status?.mode === 'entra'
          ? 'Sign out and sign in again with Microsoft to send Outlook invitations.'
          : 'Outlook invitations are available when users sign in with Microsoft.'}
      </p>
    )
  }

  return (
    <div className="outlook-options span-2">
      <label className="toggle">
        <input
          type="checkbox"
          checked={outlook}
          disabled={disabled || !connected}
          onChange={(e) => onOutlook(e.target.checked)}
        />
        <span>
          <b>Send Outlook invitation</b>
          <small>
            Participants receive it in Outlook; changes and cancellations are sent automatically.
          </small>
        </span>
      </label>
      <label className="toggle">
        <input
          type="checkbox"
          checked={outlook && teams}
          disabled={disabled || !outlook || !connected || teamsLocked}
          onChange={(e) => onTeams(e.target.checked)}
        />
        <span>
          <b>Add Microsoft Teams meeting</b>
          <small>
            {teamsLocked
              ? 'Teams link already created; it stays with the invitation.'
              : 'Adds a Teams join link to the invitation.'}
          </small>
        </span>
      </label>
      {meeting?.syncStatus === 'synced' && (
        <div className="sync-state ok">
          <CheckCircle2 size={14} aria-hidden /> Invitation sent from Outlook
          {meeting.outlookWebLink && (
            <a href={meeting.outlookWebLink} target="_blank" rel="noreferrer">
              Open in Outlook <ExternalLink size={12} aria-hidden />
            </a>
          )}
          {meeting.onlineMeetingUrl && (
            <a href={meeting.onlineMeetingUrl} target="_blank" rel="noreferrer">
              <Video size={13} aria-hidden /> Join Teams
            </a>
          )}
        </div>
      )}
      {meeting?.syncStatus === 'failed' && (
        <div className="sync-state failed" role="alert">
          <AlertTriangle size={14} aria-hidden />{' '}
          <span>{meeting.syncError || 'Outlook was not updated.'}</span>
          <Button
            size="sm"
            variant="secondary"
            loading={retrying}
            onClick={retry}
            disabled={!connected}
          >
            Retry
          </Button>
        </div>
      )}
    </div>
  )
}
