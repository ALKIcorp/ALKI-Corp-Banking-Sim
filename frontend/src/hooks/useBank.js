import { useQuery } from '@tanstack/react-query'
import { API_BASE, POLL_INTERVAL_MS } from '../constants.js'
import { apiFetch } from '../api.js'
import { useAuth } from '../providers/AuthProvider.jsx'

export function useBank(slotId, shouldPoll = true) {
  const { token } = useAuth()
  return useQuery({
    queryKey: ['bank', slotId],
    queryFn: () => apiFetch(`${API_BASE}/${slotId}/bank`),
    enabled: Boolean(token && slotId),
    refetchInterval: shouldPoll ? POLL_INTERVAL_MS : false,
  })
}
