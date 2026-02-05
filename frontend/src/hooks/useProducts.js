import { useQuery } from '@tanstack/react-query'
import { API_BASE, POLL_INTERVAL_MS, PUBLIC_PRODUCTS_API } from '../constants.js'
import { apiFetch } from '../api.js'
import { useAuth } from '../providers/AuthProvider.jsx'

export function useProducts(slotId, poll = false) {
  const { token } = useAuth()
  return useQuery({
    queryKey: ['products', slotId],
    queryFn: () => apiFetch(`${API_BASE}/${slotId}/products`),
    enabled: Boolean(token && slotId),
    refetchInterval: poll ? POLL_INTERVAL_MS : false,
  })
}

export function useAdminProducts(slotId, isAdmin) {
  const { token } = useAuth()
  return useQuery({
    queryKey: ['products', slotId, 'admin'],
    queryFn: () => apiFetch(`${API_BASE}/${slotId}/products/all`),
    enabled: Boolean(token && slotId && isAdmin),
  })
}

export function useAllAvailableProducts(poll = false) {
  const { token } = useAuth()
  return useQuery({
    queryKey: ['products', 'available-all'],
    queryFn: () => apiFetch(`${PUBLIC_PRODUCTS_API}/available`),
    enabled: Boolean(token),
    refetchInterval: poll ? POLL_INTERVAL_MS : false,
  })
}
