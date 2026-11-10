import { api } from '../lib/api'
import { useQuery } from './useQuery'

/** Shared lookups used by forms and filters. Cached per key by useQuery. */
export const useUsers = () => useQuery('users', api.users)
export const useProjects = () => useQuery('projects', api.projects.list)
export const useMeetingTypes = () => useQuery('meeting-types', api.meetings.types)
