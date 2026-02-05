import { useQuery } from '@tanstack/react-query'
import { API_BASE, POLL_INTERVAL_MS } from '../constants.js'
import { apiFetch } from '../api.js'
import { useAuth } from '../providers/AuthProvider.jsx'

export function useMonthlyCashflow(slotId, clientId, year, month, active) {
  const { token } = useAuth()
  return useQuery({
    queryKey: ['monthly-cashflow', slotId, clientId, year, month],
    queryFn: () =>
      apiFetch(`${API_BASE}/${slotId}/clients/${clientId}/monthly-cashflow?year=${year}&month=${month}`),
    enabled: Boolean(token && slotId && clientId && year && month && active),
    refetchInterval: active ? POLL_INTERVAL_MS : false,
  })
}
