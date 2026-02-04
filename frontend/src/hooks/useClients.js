import { useQuery } from '@tanstack/react-query'
import { API_BASE, POLL_INTERVAL_MS } from '../constants.js'
import { apiFetch } from '../api.js'
import { useAuth } from '../providers/AuthProvider.jsx'

export function useClients(slotId, enabledScreens = true) {
  const { token } = useAuth()
  return useQuery({
    queryKey: ['clients', slotId],
    queryFn: () => apiFetch(`${API_BASE}/${slotId}/clients`),
    enabled: Boolean(token && slotId && enabledScreens),
    refetchInterval: enabledScreens ? POLL_INTERVAL_MS : false,
  })
}
