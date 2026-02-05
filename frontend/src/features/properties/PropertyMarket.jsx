import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import Panel from '../../components/Panel.jsx'
import Modal from '../../components/Modal.jsx'
import { useSlot } from '../../providers/SlotProvider.jsx'
import { useAllAvailableProducts } from '../../hooks/useProducts.js'
import { useMortgages } from '../../hooks/useMortgages.js'
import { apiFetch } from '../../api.js'
import { API_BASE } from '../../constants.js'
import { formatCurrency } from '../../utils.js'
import PropertyImage from '../../components/PropertyImage.jsx'

export default function PropertyMarket() {
  const { currentSlot, selectedClientId, setCurrentSlot, setSelectedClientId } = useSlot()
  const location = useLocation()
  const queryClient = useQueryClient()
  const productsQuery = useAllAvailableProducts(true)
  const mortgagesQuery = useMortgages(currentSlot, true)
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [mortgageTermYears, setMortgageTermYears] = useState(30)
  const [mortgageDownPayment, setMortgageDownPayment] = useState('')
  const [error, setError] = useState('')

  // If we navigated here from a specific client page, carry that selection into context.
  useEffect(() => {
    const navClientId = location.state?.clientId != null ? Number(location.state.clientId) : null
    const navSlotId = location.state?.slotId != null ? Number(location.state.slotId) : null
    if (navSlotId && navSlotId !== currentSlot) {
      setCurrentSlot(navSlotId)
    }
    if (navClientId && navClientId !== selectedClientId) {
      setSelectedClientId(navClientId)
    }
  }, [location.state, currentSlot, selectedClientId, setCurrentSlot, setSelectedClientId])

  const mortgages = mortgagesQuery.data || []
  const properties = productsQuery.data || []

  const appliedPropertyIds = useMemo(() => {
    if (!selectedClientId) return new Set()
    const ids = mortgages
      .filter((mortgage) => String(mortgage.clientId) === String(selectedClientId) && mortgage.status !== 'REJECTED')
      .map((mortgage) => String(mortgage.productId))
    return new Set(ids)
  }, [mortgages, selectedClientId])

  const createMortgageMutation = useMutation({
    mutationFn: ({ slotId, clientId, productId, termYears, downPayment }) =>
      apiFetch(`${API_BASE}/${slotId}/clients/${clientId}/mortgages`, {
        method: 'POST',
        body: JSON.stringify({ productId, termYears, downPayment }),
      }),
    onSuccess: (_data, variables) => {
      const targetSlot = variables?.slotId ?? currentSlot
      setMortgageDownPayment('')
      setSelectedProperty(null)
      setError('')
      if (targetSlot) {
        queryClient.invalidateQueries({ queryKey: ['mortgages', targetSlot] })
        queryClient.invalidateQueries({ queryKey: ['products', targetSlot] })
      }
      queryClient.invalidateQueries({ queryKey: ['products', 'available-all'] })
    },
    onError: (err) => setError(err.message),
  })

  const handleApply = () => {
    if (!selectedProperty) return
    if (!selectedClientId) {
      setError('Select a client to apply for a mortgage.')
      return
    }
    const targetSlotId = Number(selectedProperty.slotId ?? currentSlot)
    if (!targetSlotId) {
      setError('Unable to determine the slot for this property.')
      return
    }
    // If the user is on a different slot, switch them and ask for a slot-matching client to avoid API 404s.
    if (currentSlot && targetSlotId !== currentSlot) {
      setCurrentSlot(targetSlotId)
      setSelectedClientId(null)
      setError(`Switched to slot ${targetSlotId}. Select a client in this slot to apply.`)
      return
    }
    const downPayment = Number(mortgageDownPayment || 0)
    if (downPayment < 0) {
      setError('Down payment cannot be negative.')
      return
    }
    if (!mortgageTermYears || mortgageTermYears < 5 || mortgageTermYears > 30) {
      setError('Term must be between 5 and 30 years.')
      return
    }
    createMortgageMutation.mutate({
      slotId: targetSlotId,
      clientId: selectedClientId,
      productId: selectedProperty.id,
      termYears: mortgageTermYears,
      downPayment,
    })
  }

  return (
    <div id="property-market-screen" className="screen active">
      <Panel>
        <h2 className="bw-header">Property Market</h2>
        <div className="property-grid property-grid-scroll">
          {!properties.length && <p className="text-xs text-gray-500">No properties available right now.</p>}
          {properties.map((property) => (
            <div key={property.id} className="property-card">
              {selectedClientId && appliedPropertyIds.has(String(property.id)) && (
                <span className="property-ribbon">Application Sent</span>
              )}
              <PropertyImage src={property.imageUrl} alt={`${property.name} photo`} />
              <div className="property-body">
                <div className="property-title">{property.name}</div>
                <div className="property-description">{property.description}</div>
                <div className="property-meta">Slot {property.slotId}</div>
                <div className="property-price">${formatCurrency(property.price)}</div>
                <button
                  className="bw-button w-full mt-2"
                  type="button"
                  onClick={() => setSelectedProperty(property)}
                >
                  View Property
                </button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {selectedProperty && (
        <Modal
          title={
            <span className="flex items-center gap-2">
              <span className="header-icon">🏡</span> {selectedProperty.name}
            </span>
          }
          onClose={() => {
            setSelectedProperty(null)
            setError('')
          }}
        >
          <PropertyImage src={selectedProperty.imageUrl} alt={`${selectedProperty.name} photo`} variant="modal" />
          <p className="text-sm font-semibold mt-2">${formatCurrency(selectedProperty.price)}</p>
          <p className="text-xs text-gray-500">Slot {selectedProperty.slotId}</p>
          <p className="text-xs text-gray-600">
            {selectedProperty.rooms} rooms • {selectedProperty.sqft2} sqft
          </p>
          <p className="text-xs mt-2">{selectedProperty.description}</p>
          {selectedClientId ? (
            <>
              <label htmlFor="mortgage-term" className="bw-label mt-2">
                Term Years
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  id="mortgage-term"
                  className="bw-range term-slider"
                  min="5"
                  max="30"
                  value={mortgageTermYears}
                  onChange={(event) => setMortgageTermYears(Number(event.target.value))}
                />
                <input
                  type="number"
                  className="bw-input term-input"
                  min="5"
                  max="30"
                  value={mortgageTermYears}
                  onChange={(event) => setMortgageTermYears(Number(event.target.value))}
                />
              </div>
              <label htmlFor="mortgage-down-payment" className="bw-label mt-2">
                Down Payment
              </label>
              <input
                type="number"
                id="mortgage-down-payment"
                className="bw-input"
                min="0"
                step="0.01"
                value={mortgageDownPayment}
                onChange={(event) => setMortgageDownPayment(event.target.value)}
              />
              <p className="text-red-600 text-xs mt-2 text-center">{error}</p>
              <button
                className="bw-button w-full mt-2"
                type="button"
                disabled={
                  createMortgageMutation.isPending || appliedPropertyIds.has(String(selectedProperty.id))
                }
                onClick={handleApply}
              >
                {appliedPropertyIds.has(String(selectedProperty.id)) ? 'Already Applied' : 'Apply for Mortgage'}
              </button>
            </>
          ) : (
            <p className="text-xs text-red-600 mt-2">Select a client first to apply for a mortgage.</p>
          )}
        </Modal>
      )}
    </div>
  )
}
