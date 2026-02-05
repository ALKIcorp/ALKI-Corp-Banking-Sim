import { useQuery } from '@tanstack/react-query'
import { API_BASE } from '../constants.js'
import { apiFetch } from '../api.js'
import { useAuth } from '../providers/AuthProvider.jsx'

export function useJobs(slotId) {
  const { token } = useAuth()
  return useQuery({
    queryKey: ['jobs', slotId],
    queryFn: () => apiFetch(`${API_BASE}/${slotId}/jobs`),
    enabled: Boolean(token && slotId),
  })
}
