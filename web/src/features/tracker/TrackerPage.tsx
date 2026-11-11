import { useSearchParams } from 'react-router-dom'
import { FilterTabs } from '../../components/ui/Filters'
import { PageHeading } from '../../components/ui/PageHeading'
import { useQuery } from '../../hooks/useQuery'
import { trackerApi } from '../../lib/trackerApi'
import { ReleasesView } from './ReleasesView'
import { TaskBoardView } from './TaskBoardView'

const RELEASES = 'releases'

/** Task tracker: one tab per board (Fintech, Infra…) plus the release calendar. */
export default function TrackerPage() {
  const boards = useQuery('tracker-boards', trackerApi.boards)
  const [params, setParams] = useSearchParams()
  const list = boards.data ?? []
  const tab = params.get('tab') ?? list[0]?.key ?? ''
  const active = list.find((b) => b.key === tab)
  const tabs = [
    ...list.map((b) => ({ value: b.key, label: b.name, count: b.open })),
    { value: RELEASES, label: 'Releases' },
  ]

  return (
    <>
      <PageHeading
        kicker="DELIVERY TRACKERS"
        title="Task tracker"
        description={
          tab === RELEASES
            ? 'Weekly production releases with owners, SPOCs and sanity testing.'
            : (active?.description ??
              'Track owners, status, target dates and slippage across delivery boards.')
        }
      />
      <div className="tracker-tabs">
        <FilterTabs
          label="Tracker"
          options={tabs}
          value={tab}
          onChange={(value) => setParams({ tab: value }, { replace: true })}
        />
        {active && (
          <span className="tracker-tabs-note">
            {active.open} open of {active.total} tasks
          </span>
        )}
      </div>
      {tab === RELEASES ? <ReleasesView /> : tab && <TaskBoardView key={tab} board={tab} />}
    </>
  )
}
