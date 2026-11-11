import { useState } from 'react'
import type { FormEvent } from 'react'
import { CalendarClock, CircleDot, MessageSquare, Send, Sparkles } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { QueryView, Skeleton } from '../../components/ui/States'
import { useSession } from '../../context/SessionContext'
import { useToast } from '../../context/ToastContext'
import { invalidate, useQuery } from '../../hooks/useQuery'
import { formatDate, relativeTime } from '../../lib/dates'
import { trackerApi } from '../../lib/trackerApi'
import type { TrackerTask, TrackerUpdate } from '../../types'
import { refreshTracker } from './tracker'

const kindIcons: Record<TrackerUpdate['kind'], typeof CircleDot> = {
  created: Sparkles,
  note: MessageSquare,
  status: CircleDot,
  target: CalendarClock,
}

/** Target history and the task's progress log, with a composer for weekly updates. */
export function TaskUpdates({ task }: { task: TrackerTask }) {
  const { can } = useSession()
  const notify = useToast()
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const updates = useQuery(`tracker-updates:${task.id}`, (signal) =>
    trackerApi.updates(task.id, signal),
  )
  const targets = [...task.targetHistory, task.targetDate]

  const post = async (event: FormEvent) => {
    event.preventDefault()
    if (!draft.trim()) return
    setPosting(true)
    try {
      await trackerApi.addNote(task.id, draft.trim())
      setDraft('')
      invalidate(...refreshTracker())
      notify('Update posted.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to post the update.', 'error')
    } finally {
      setPosting(false)
    }
  }

  return (
    <aside className="task-progress" aria-label="Progress">
      <h3>Target history</h3>
      <ol className="target-trail">
        {targets.map((date, index) => {
          const current = index === targets.length - 1
          return (
            <li key={`${date}-${index}`} className={current ? 'current' : ''}>
              {date ? formatDate(date, { year: 'numeric' }) : 'TBD'}
              <small>{current ? 'Current' : index === 0 ? 'Initial' : `Revision ${index}`}</small>
            </li>
          )
        })}
      </ol>

      <h3>Progress log</h3>
      {can('tracker:update') && (
        <form className="note-composer" onSubmit={post}>
          <textarea
            aria-label="Post a progress update"
            rows={2}
            maxLength={2000}
            placeholder="Weekly update, blocker or delay reason…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button type="submit" size="sm" icon={Send} loading={posting} disabled={!draft.trim()}>
            Post
          </Button>
        </form>
      )}
      <QueryView query={updates} skeleton={<Skeleton rows={3} height={40} />}>
        {(items) => (
          <ul className="update-log">
            {items.map((u) => {
              const Icon = kindIcons[u.kind] ?? CircleDot
              return (
                <li key={u.id} className={`update-${u.kind}`}>
                  <span className="update-icon" aria-hidden="true">
                    <Icon size={13} />
                  </span>
                  <div>
                    <p>{u.body}</p>
                    <small>
                      {u.author} · <time dateTime={u.createdAt}>{relativeTime(u.createdAt)}</time>
                    </small>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </QueryView>
    </aside>
  )
}
