import { useQuery } from '@tanstack/react-query'
import { API_BASE } from '../constants.js'
import { apiFetch } from '../api.js'
import { useAuth } from '../providers/AuthProvider.jsx'

export function useSlots() {
  const { token } = useAuth()
  return useQuery({
    queryKey: ['slots'],
    queryFn: () => apiFetch(API_BASE),
    enabled: Boolean(token),
  })
}
