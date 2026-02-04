import { useQuery } from '@tanstack/react-query'
import { API_BASE, POLL_INTERVAL_MS } from '../constants.js'
import { apiFetch } from '../api.js'
import { useAuth } from '../providers/AuthProvider.jsx'

export function useInvestments(slotId, active) {
  const { token } = useAuth()
  return useQuery({
    queryKey: ['investment', slotId],
    queryFn: () => apiFetch(`${API_BASE}/${slotId}/investments/sp500`),
    enabled: Boolean(token && slotId && active),
    refetchInterval: active ? POLL_INTERVAL_MS : false,
  })
}
