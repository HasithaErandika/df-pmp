import { useRef, useState } from 'react'
import { ExternalLink, FileText, Folder, FolderOpen, Upload } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Panel } from '../../components/ui/Panel'
import { EmptyState, QueryView } from '../../components/ui/States'
import { useSession } from '../../context/SessionContext'
import { useToast } from '../../context/ToastContext'
import { invalidate, useQuery } from '../../hooks/useQuery'
import { api } from '../../lib/api'
import { relativeTime } from '../../lib/dates'

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`
}

/** Project documents stored in the project's SharePoint folder. */
export function DocumentsPanel({ projectId }: { projectId: string }) {
  const { can, status } = useSession()
  const notify = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const key = `documents:${projectId}`
  const docs = useQuery(key, (signal) => api.documents.list(projectId, signal))

  if (!status?.features.sharepoint) {
    return (
      <Panel title="Documents" icon={FolderOpen} tone="gold" description="Stored in SharePoint.">
        <EmptyState
          title="SharePoint is not connected"
          message="An administrator can connect a SharePoint site in Administration → Integrations."
        />
      </Panel>
    )
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setProgress(0)
    try {
      await api.documents.upload(projectId, file, setProgress)
      notify(`${file.name} uploaded to SharePoint.`)
      invalidate(key, 'activity:')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Upload failed.', 'error')
    } finally {
      setProgress(null)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <Panel
      title="Documents"
      icon={FolderOpen}
      tone="gold"
      description="Stored in SharePoint with its permissions and version history."
      count={docs.data?.items.length}
      actions={
        <>
          {docs.data?.webUrl && (
            <a className="text-link" href={docs.data.webUrl} target="_blank" rel="noreferrer">
              Open folder <ExternalLink size={12} aria-hidden />
            </a>
          )}
          {can('document:upload') && (
            <Button
              size="sm"
              icon={Upload}
              loading={progress !== null}
              onClick={() => input.current?.click()}
            >
              {progress !== null ? `${progress}%` : 'Upload'}
            </Button>
          )}
          <input
            ref={input}
            type="file"
            hidden
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </>
      }
    >
      {progress !== null && (
        <div
          className="upload-progress"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Upload progress"
        >
          <span style={{ width: `${progress}%` }} />
        </div>
      )}
      <QueryView query={docs}>
        {(folder) =>
          folder.items.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents yet"
              message="Upload plans, minutes and approvals to keep them with the project."
            />
          ) : (
            <ul className="document-list">
              {folder.items.map((item) => {
                const Icon = item.folder ? Folder : FileText
                return (
                  <li key={item.id}>
                    <span className="document-icon" aria-hidden="true">
                      <Icon size={16} />
                    </span>
                    <a
                      href={item.webUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="document-name"
                    >
                      {item.name}
                    </a>
                    <small>
                      {item.folder ? `${item.folder.childCount} items` : formatSize(item.size)} ·{' '}
                      {relativeTime(item.lastModifiedDateTime)}
                      {item.lastModifiedBy?.user?.displayName &&
                        ` · ${item.lastModifiedBy.user.displayName}`}
                    </small>
                  </li>
                )
              })}
            </ul>
          )
        }
      </QueryView>
    </Panel>
  )
}
