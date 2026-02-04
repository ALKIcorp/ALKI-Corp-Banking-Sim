import { useQuery } from '@tanstack/react-query'
import { API_BASE, POLL_INTERVAL_MS } from '../constants.js'
import { apiFetch } from '../api.js'
import { useAuth } from '../providers/AuthProvider.jsx'

export function useMortgages(slotId, active) {
  const { token } = useAuth()
  return useQuery({
    queryKey: ['mortgages', slotId],
    queryFn: () => apiFetch(`${API_BASE}/${slotId}/mortgages`),
    enabled: Boolean(token && slotId && active),
    refetchInterval: active ? POLL_INTERVAL_MS : false,
  })
}

export function useClientProperties(slotId, clientId, active) {
  const { token } = useAuth()
  return useQuery({
    queryKey: ['client-properties', slotId, clientId],
    queryFn: () => apiFetch(`${API_BASE}/${slotId}/clients/${clientId}/properties`),
    enabled: Boolean(token && slotId && clientId && active),
  })
}
