export type TrackerBoard = {
  key: string
  name: string
  description: string
  tone: string
  total: number
  open: number
}

/** Tracked delivery task. `targetHistory` lists earlier targets (oldest first); null target = TBD. */
export type TrackerTask = {
  id: string
  board: string
  refNo: number | null
  title: string
  owners: string[]
  buOwner: string
  status: string
  targetDate: string | null
  targetHistory: string[]
  remarks: string
  updatedAt: string
  completedAt: string | null
}

export type TrackerTaskInput = Pick<
  TrackerTask,
  'board' | 'title' | 'owners' | 'buOwner' | 'status' | 'remarks'
> & {
  targetDate: string
}

export type TrackerUpdate = {
  id: number
  kind: 'created' | 'note' | 'status' | 'target'
  body: string
  author: string
  createdAt: string
}

export type Release = {
  id: string
  releaseDate: string
  title: string
  type: string
  systems: string
  layer: string
  techOwner: string
  buSpoc: string
  sanityTest: '' | 'Applicable' | 'Not applicable'
  qaSpoc: string
  status: string
  notes: string
  updatedAt: string
}
export type ReleaseInput = Omit<Release, 'id' | 'updatedAt'>

export type DevRole = {
  key: string
  name: string
  description: string
  user: string
  email: string
}
