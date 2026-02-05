import { useQuery } from '@tanstack/react-query'
import { API_BASE } from '../constants.js'
import { apiFetch } from '../api.js'
import { useAuth } from '../providers/AuthProvider.jsx'

export function useRentals(slotId) {
  const { token } = useAuth()
  return useQuery({
    queryKey: ['rentals', slotId],
    queryFn: () => apiFetch(`${API_BASE}/${slotId}/rentals`),
    enabled: Boolean(token && slotId),
  })
}
