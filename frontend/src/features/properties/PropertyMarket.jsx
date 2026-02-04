import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Panel from '../../components/Panel.jsx'
import Modal from '../../components/Modal.jsx'
import { useSlot } from '../../providers/SlotProvider.jsx'
import { useProducts } from '../../hooks/useProducts.js'
import { useMortgages } from '../../hooks/useMortgages.js'
import { apiFetch } from '../../api.js'
import { API_BASE } from '../../constants.js'
import { formatCurrency } from '../../utils.js'

export default function PropertyMarket() {
  const { currentSlot, selectedClientId } = useSlot()
  const queryClient = useQueryClient()
  const productsQuery = useProducts(currentSlot, true)
  const mortgagesQuery = useMortgages(currentSlot, true)
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [mortgageTermYears, setMortgageTermYears] = useState(30)
  const [mortgageDownPayment, setMortgageDownPayment] = useState('')
  const [error, setError] = useState('')

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
    onSuccess: () => {
      setMortgageDownPayment('')
      setSelectedProperty(null)
      setError('')
      queryClient.invalidateQueries({ queryKey: ['mortgages', currentSlot] })
      queryClient.invalidateQueries({ queryKey: ['products', currentSlot] })
    },
    onError: (err) => setError(err.message),
  })

  const handleApply = () => {
    if (!currentSlot || !selectedClientId || !selectedProperty) return
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
      slotId: currentSlot,
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
              {property.imageUrl ? (
                <div className="property-image" style={{ backgroundImage: `url(${property.imageUrl})` }} />
              ) : (
                <div className="property-image property-image-placeholder">No Image</div>
              )}
              <div className="property-body">
                <div className="property-title">{property.name}</div>
                <div className="property-description">{property.description}</div>
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
          {selectedProperty.imageUrl ? (
            <div className="property-modal-image" style={{ backgroundImage: `url(${selectedProperty.imageUrl})` }} />
          ) : (
            <div className="property-modal-image property-image-placeholder">No Image</div>
          )}
          <p className="text-sm font-semibold mt-2">${formatCurrency(selectedProperty.price)}</p>
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
                disabled={createMortgageMutation.isPending || appliedPropertyIds.has(String(selectedProperty.id))}
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
