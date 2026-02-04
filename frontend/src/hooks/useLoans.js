import { useQuery } from '@tanstack/react-query'
import { API_BASE } from '../constants.js'
import { apiFetch } from '../api.js'
import { useAuth } from '../providers/AuthProvider.jsx'

export function useLoans(slotId, active) {
  const { token } = useAuth()
  return useQuery({
    queryKey: ['loans', slotId],
    queryFn: () => apiFetch(`${API_BASE}/${slotId}/loans`),
    enabled: Boolean(token && slotId && active),
  })
}
