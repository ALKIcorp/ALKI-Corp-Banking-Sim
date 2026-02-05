import { useQuery } from '@tanstack/react-query'
import { API_BASE } from '../constants.js'
import { apiFetch } from '../api.js'
import { useAuth } from '../providers/AuthProvider.jsx'

export function useLiving(slotId, clientId) {
  const { token } = useAuth()
  return useQuery({
    queryKey: ['living', slotId, clientId],
    queryFn: () => apiFetch(`${API_BASE}/${slotId}/clients/${clientId}/living`),
    enabled: Boolean(token && slotId && clientId),
  })
}
