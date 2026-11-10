import { History } from 'lucide-react'
import { Panel } from '../../components/ui/Panel'
import { EmptyState, QueryView } from '../../components/ui/States'
import { useQuery } from '../../hooks/useQuery'
import { api } from '../../lib/api'
import { relativeTime } from '../../lib/dates'

const actionLabels: Record<string, string> = {
  created: 'created this record',
  updated: 'updated this record',
  deleted: 'deleted this record',
}

/** Audit trail for one record, newest first. */
export function ActivityList({ type, id }: { type: string; id: string }) {
  const activity = useQuery(`activity:${type}:${id}`, (signal) => api.activity(type, id, signal))
  return (
    <Panel
      title="Activity"
      description="Recorded changes to this project."
      icon={History}
      tone="purple"
    >
      <QueryView query={activity}>
        {(events) =>
          events.length === 0 ? (
            <EmptyState
              title="No recorded activity"
              message="Changes made in df-pmp will appear here."
            />
          ) : (
            <ol className="activity-list">
              {events.map((event) => (
                <li key={event.id}>
                  <span className="activity-dot" aria-hidden="true" />
                  <div>
                    <b>{event.actor}</b>{' '}
                    {actionLabels[event.action.split('.').pop() ?? ''] ?? event.action}
                    {event.summary && <span className="activity-summary"> — {event.summary}</span>}
                    <time
                      dateTime={event.occurredAt}
                      title={new Date(event.occurredAt).toLocaleString()}
                    >
                      {relativeTime(event.occurredAt)}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          )
        }
      </QueryView>
    </Panel>
  )
}
