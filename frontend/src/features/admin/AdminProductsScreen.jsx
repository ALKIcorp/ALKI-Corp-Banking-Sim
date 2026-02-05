import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Panel from '../../components/Panel.jsx'
import { useSlot } from '../../providers/SlotProvider.jsx'
import { useAuth } from '../../providers/AuthProvider.jsx'
import { useBank } from '../../hooks/useBank.js'
import { useAdminProducts } from '../../hooks/useProducts.js'
import { apiFetch } from '../../api.js'
import { API_BASE } from '../../constants.js'
import { formatCurrency } from '../../utils.js'
import PropertyImage from '../../components/PropertyImage.jsx'

function normalizeMortgageRate(rate) {
  const value = Number(rate)
  if (!Number.isFinite(value)) return 0
  return value > 1 ? value / 100 : value
}

export default function AdminProductsScreen() {
  const { currentSlot } = useSlot()
  const { adminStatus } = useAuth()
  const queryClient = useQueryClient()
  const bankQuery = useBank(currentSlot, false)
  const adminProductsQuery = useAdminProducts(currentSlot, adminStatus)
  const adminProducts = adminProductsQuery.data || []
  const mortgageRate = normalizeMortgageRate(bankQuery.data?.mortgageRate)

  const [mortgageRateInput, setMortgageRateInput] = useState('')
  const [editingProductId, setEditingProductId] = useState(null)
  const [productName, setProductName] = useState('')
  const [productPrice, setProductPrice] = useState('')
  const [productDescription, setProductDescription] = useState('')
  const [productRooms, setProductRooms] = useState('')
  const [productSqft, setProductSqft] = useState('')
  const [productImageUrl, setProductImageUrl] = useState('')
  const [productError, setProductError] = useState('')
  const [adminProductsError, setAdminProductsError] = useState('')

  useEffect(() => {
    if (bankQuery.data?.mortgageRate !== undefined) {
      setMortgageRateInput(String(normalizeMortgageRate(bankQuery.data.mortgageRate)))
    }
  }, [bankQuery.data?.mortgageRate])

  const updateMortgageRateMutation = useMutation({
    mutationFn: ({ slotId, mortgageRate: rate }) =>
      apiFetch(`${API_BASE}/${slotId}/mortgage-rate`, {
        method: 'PUT',
        body: JSON.stringify({ mortgageRate: rate }),
      }),
    onSuccess: () => {
      setAdminProductsError('')
      queryClient.invalidateQueries({ queryKey: ['bank', currentSlot] })
    },
    onError: (err) => setAdminProductsError(err.message),
  })

  const createProductMutation = useMutation({
    mutationFn: ({ slotId, payload }) =>
      apiFetch(`${API_BASE}/${slotId}/products`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      resetProductForm()
      queryClient.invalidateQueries({ queryKey: ['products', currentSlot, 'admin'] })
      queryClient.invalidateQueries({ queryKey: ['products', currentSlot] })
    },
    onError: (err) => setProductError(err.message),
  })

  const updateProductMutation = useMutation({
    mutationFn: ({ slotId, productId, payload }) =>
      apiFetch(`${API_BASE}/${slotId}/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      resetProductForm()
      queryClient.invalidateQueries({ queryKey: ['products', currentSlot, 'admin'] })
      queryClient.invalidateQueries({ queryKey: ['products', currentSlot] })
    },
    onError: (err) => setProductError(err.message),
  })

  const deleteProductMutation = useMutation({
    mutationFn: ({ slotId, productId }) =>
      apiFetch(`${API_BASE}/${slotId}/products/${productId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', currentSlot, 'admin'] })
      queryClient.invalidateQueries({ queryKey: ['products', currentSlot] })
    },
    onError: (err) => setProductError(err.message),
  })

  const resetProductForm = () => {
    setEditingProductId(null)
    setProductName('')
    setProductPrice('')
    setProductDescription('')
    setProductRooms('')
    setProductSqft('')
    setProductImageUrl('')
    setProductError('')
  }

  const handleUpdateMortgageRate = () => {
    if (!currentSlot) return
    const rate = Number(mortgageRateInput)
    if (Number.isNaN(rate) || rate < 0) {
      setAdminProductsError('Mortgage rate must be a non-negative number.')
      return
    }
    updateMortgageRateMutation.mutate({ slotId: currentSlot, mortgageRate: rate })
  }

  const handleSubmitProduct = () => {
    if (!currentSlot) return
    const price = Number(productPrice)
    const rooms = Number(productRooms)
    const sqft2 = Number(productSqft)
    if (!productName.trim()) {
      setProductError('Property name is required.')
      return
    }
    if (!price || price <= 0) {
      setProductError('Price must be greater than zero.')
      return
    }
    if (!productDescription.trim()) {
      setProductError('Description is required.')
      return
    }
    if (!rooms || rooms <= 0) {
      setProductError('Rooms must be greater than zero.')
      return
    }
    if (!sqft2 || sqft2 <= 0) {
      setProductError('Square footage must be greater than zero.')
      return
    }
    const payload = {
      name: productName.trim(),
      price,
      description: productDescription.trim(),
      rooms,
      sqft2,
      imageUrl: productImageUrl.trim() || null,
    }
    if (editingProductId) {
      updateProductMutation.mutate({ slotId: currentSlot, productId: editingProductId, payload })
    } else {
      createProductMutation.mutate({ slotId: currentSlot, payload })
    }
  }

  const handleEditProduct = (property) => {
    setEditingProductId(property.id)
    setProductName(property.name)
    setProductPrice(String(property.price))
    setProductDescription(property.description)
    setProductRooms(String(property.rooms))
    setProductSqft(String(property.sqft2))
    setProductImageUrl(property.imageUrl || '')
    setProductError('')
  }

  if (!adminStatus) {
    return (
      <Panel>
        <p className="text-sm">Admin access required.</p>
      </Panel>
    )
  }

  return (
    <div id="admin-products-view-screen" className="screen active">
      <Panel>
        <h2 className="bw-header">
          <span className="header-icon">🛠</span> Add/Edit Products
        </h2>
        <div className="product-admin-section">
          <h3 className="text-sm font-semibold mb-2 uppercase flex items-center gap-2">
            <span className="header-icon">📈</span> Mortgage Rate
            <span className="text-green-600">
              {bankQuery.data?.mortgageRate !== undefined ? `(${(mortgageRate * 100).toFixed(2)}%)` : '(---)'}
            </span>
          </h3>
          <div className="flex gap-2 items-end">
            <div className="flex-grow">
              <label htmlFor="mortgage-rate-input" className="bw-label">
                Fixed Mortgage Rate
              </label>
              <input
                id="mortgage-rate-input"
                className="bw-input bw-range"
                type="range"
                min="0.05"
                max="0.15"
                step="0.0005"
                value={mortgageRateInput}
                onChange={(event) => setMortgageRateInput(event.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Selected rate: {(Number(mortgageRateInput || 0) * 100).toFixed(2)}%
              </p>
            </div>
            <button
              className="bw-button bw-button-compact"
              type="button"
              onClick={handleUpdateMortgageRate}
              disabled={updateMortgageRateMutation.isPending}
            >
              Save Rate
            </button>
          </div>
          <p className="text-red-600 text-xs mt-1">{adminProductsError}</p>
        </div>

        <div className="product-admin-section">
          <h3 className="text-sm font-semibold mb-2 uppercase flex items-center gap-2">
            <span className="header-icon">🏠</span> Property Listing
          </h3>
          <label htmlFor="product-name" className="bw-label">
            Property Name
          </label>
          <input
            id="product-name"
            className="bw-input"
            type="text"
            value={productName}
            onChange={(event) => setProductName(event.target.value)}
          />
          <label htmlFor="product-price" className="bw-label mt-2">
            Price
          </label>
          <input
            id="product-price"
            className="bw-input"
            type="number"
            min="0"
            step="0.01"
            value={productPrice}
            onChange={(event) => setProductPrice(event.target.value)}
          />
          <label htmlFor="product-description" className="bw-label mt-2">
            Description
          </label>
          <textarea
            id="product-description"
            className="bw-input"
            rows="3"
            value={productDescription}
            onChange={(event) => setProductDescription(event.target.value)}
          />
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <label htmlFor="product-rooms" className="bw-label">
                Rooms
              </label>
              <input
                id="product-rooms"
                className="bw-input"
                type="number"
                min="1"
                value={productRooms}
                onChange={(event) => setProductRooms(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="product-sqft" className="bw-label">
                Sqft
              </label>
              <input
                id="product-sqft"
                className="bw-input"
                type="number"
                min="1"
                value={productSqft}
                onChange={(event) => setProductSqft(event.target.value)}
              />
            </div>
          </div>
          <label htmlFor="product-image" className="bw-label mt-2">
            Image URL
          </label>
          <input
            id="product-image"
            className="bw-input"
            type="text"
            value={productImageUrl}
            onChange={(event) => setProductImageUrl(event.target.value)}
          />
          <p className="text-red-600 text-xs mt-2 text-center">{productError}</p>
          <div className="flex gap-2 justify-end mt-2">
            {editingProductId && (
              <button className="bw-button" type="button" onClick={resetProductForm}>
                Cancel
              </button>
            )}
            <button
              className="bw-button"
              type="button"
              onClick={handleSubmitProduct}
              disabled={createProductMutation.isPending || updateProductMutation.isPending}
            >
              {editingProductId ? 'Update Property' : 'Create Property'}
            </button>
          </div>
        </div>

        <div className="product-admin-section">
          <h3 className="text-sm font-semibold mb-2 uppercase flex items-center gap-2">
            <span className="header-icon">📋</span> Existing Properties
          </h3>
          <div className="property-grid property-grid-scroll">
            {!adminProducts.length && <p className="text-xs text-gray-500">No properties added yet.</p>}
            {adminProducts.map((property) => (
              <div key={property.id} className="property-card">
                <PropertyImage src={property.imageUrl} alt={`${property.name} photo`} />
                <div className="property-body">
                  <div className="property-title">{property.name}</div>
                  <div className="property-description">{property.description}</div>
                  <div className="property-price">${formatCurrency(property.price)}</div>
                  <div className="property-meta">Status: {property.status}</div>
                  <div className="flex gap-2 mt-2">
                    <button className="bw-button" type="button" onClick={() => handleEditProduct(property)}>
                      Edit
                    </button>
                    <button
                      className="bw-button"
                      type="button"
                      onClick={() => deleteProductMutation.mutate({ slotId: currentSlot, productId: property.id })}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  )
}
