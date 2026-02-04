import { useQuery } from '@tanstack/react-query'
import { API_BASE, POLL_INTERVAL_MS } from '../constants.js'
import { apiFetch } from '../api.js'
import { useAuth } from '../providers/AuthProvider.jsx'

export function useTransactions(slotId, clientId, active) {
  const { token } = useAuth()
  return useQuery({
    queryKey: ['transactions', slotId, clientId],
    queryFn: () => apiFetch(`${API_BASE}/${slotId}/clients/${clientId}/transactions`),
    enabled: Boolean(token && slotId && clientId && active),
    refetchInterval: active ? POLL_INTERVAL_MS : false,
  })
}
