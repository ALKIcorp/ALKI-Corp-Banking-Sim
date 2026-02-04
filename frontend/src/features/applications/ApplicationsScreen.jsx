import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Panel from '../../components/Panel.jsx'
import { useSlot } from '../../providers/SlotProvider.jsx'
import { useAuth } from '../../providers/AuthProvider.jsx'
import { useLoans } from '../../hooks/useLoans.js'
import { useMortgages } from '../../hooks/useMortgages.js'
import { useClients } from '../../hooks/useClients.js'
import { useProducts, useAdminProducts } from '../../hooks/useProducts.js'
import { apiFetch } from '../../api.js'
import { API_BASE } from '../../constants.js'
import { formatCurrency, formatIsoDate } from '../../utils.js'

function calculateMonthlyPayment({ principal, termYears, interestRate }) {
  const principalValue = Number(principal || 0)
  const years = Number(termYears || 0)
  const rate = Number(interestRate || 0)
  if (!principalValue || !years) return null
  const months = years * 12
  const monthlyRate = rate / 12
  if (!monthlyRate) return principalValue / months
  const factor = Math.pow(1 + monthlyRate, months)
  return (principalValue * monthlyRate * factor) / (factor - 1)
}

export default function ApplicationsScreen() {
  const { currentSlot } = useSlot()
  const { adminStatus } = useAuth()
  const queryClient = useQueryClient()

  const loansQuery = useLoans(currentSlot, true)
  const mortgagesQuery = useMortgages(currentSlot, true)
  const clientsQuery = useClients(currentSlot, false)
  const productsQuery = useProducts(currentSlot, false)
  const adminProductsQuery = useAdminProducts(currentSlot, adminStatus)

  const loans = loansQuery.data || []
  const mortgages = mortgagesQuery.data || []
  const clients = clientsQuery.data || []
  const products = [...(productsQuery.data || []), ...(adminProductsQuery.data || [])]

  const clientNameById = useMemo(() => {
    const map = new Map()
    clients.forEach((client) => {
      map.set(String(client.id), client.name)
    })
    return map
  }, [clients])

  const productById = useMemo(() => {
    const map = new Map()
    products.forEach((product) => map.set(String(product.id), product))
    return map
  }, [products])

  const approveLoanMutation = useMutation({
    mutationFn: ({ slotId, loanId }) =>
      apiFetch(`${API_BASE}/${slotId}/loans/${loanId}/approve`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans', currentSlot] })
    },
  })

  const rejectLoanMutation = useMutation({
    mutationFn: ({ slotId, loanId }) =>
      apiFetch(`${API_BASE}/${slotId}/loans/${loanId}/reject`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans', currentSlot] })
    },
  })

  const approveMortgageMutation = useMutation({
    mutationFn: ({ slotId, mortgageId }) =>
      apiFetch(`${API_BASE}/${slotId}/mortgages/${mortgageId}/approve`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mortgages', currentSlot] })
      queryClient.invalidateQueries({ queryKey: ['products', currentSlot] })
    },
  })

  const rejectMortgageMutation = useMutation({
    mutationFn: ({ slotId, mortgageId }) =>
      apiFetch(`${API_BASE}/${slotId}/mortgages/${mortgageId}/reject`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mortgages', currentSlot] })
    },
  })

  return (
    <div id="products-view-screen" className="screen active">
      <Panel>
        <h2 className="bw-header">Applications</h2>
        <div className="product-admin-section">
          <h3 className="text-sm font-semibold mb-2 uppercase flex items-center gap-2">
            <span className="header-icon">📄</span> Loan Applications
          </h3>
          {!loans.length && <p className="text-xs text-gray-500">No loan applications yet.</p>}
          {loans.length > 0 && (
            <div className="table-scroll">
              <table className="bw-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Client</th>
                    <th>Amount</th>
                    <th>Term</th>
                    <th>Status</th>
                    {adminStatus && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {[...loans]
                    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                    .map((loan) => (
                      <tr key={loan.id}>
                        <td>{formatIsoDate(loan.createdAt)}</td>
                        <td>{clientNameById.get(String(loan.clientId)) || loan.clientId}</td>
                        <td>${formatCurrency(loan.amount)}</td>
                        <td>{loan.termYears} yrs</td>
                        <td>{loan.status}</td>
                        {adminStatus && (
                          <td>
                            {loan.status === 'PENDING' ? (
                              <div className="flex gap-2">
                                <button
                                  className="bw-button"
                                  onClick={() => approveLoanMutation.mutate({ slotId: currentSlot, loanId: loan.id })}
                                >
                                  Approve
                                </button>
                                <button
                                  className="bw-button bw-button-danger"
                                  onClick={() => rejectLoanMutation.mutate({ slotId: currentSlot, loanId: loan.id })}
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className={`text-xs ${loan.status === 'APPROVED' ? 'text-green-600' : 'text-red-600'}`}>
                                Processed
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="product-admin-section">
          <h3 className="text-sm font-semibold mb-2 uppercase flex items-center gap-2">
            <span className="header-icon">🏡</span> Mortgage Applications
          </h3>
          {!mortgages.length && <p className="text-xs text-gray-500">No mortgage applications yet.</p>}
          {mortgages.length > 0 && (
            <div className="table-scroll">
              <table className="bw-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Client</th>
                    <th>Property</th>
                    <th>Loan</th>
                    <th>Down %</th>
                    <th>Monthly</th>
                    <th>Term</th>
                    <th>Status</th>
                    {adminStatus && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {[...mortgages]
                    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                    .map((mortgage) => {
                      const property = productById.get(String(mortgage.productId))
                      const monthlyPayment = calculateMonthlyPayment({
                        principal: mortgage.loanAmount,
                        termYears: mortgage.termYears,
                        interestRate: mortgage.interestRate,
                      })
                      return (
                        <tr key={mortgage.id}>
                          <td>{formatIsoDate(mortgage.createdAt)}</td>
                          <td>{clientNameById.get(String(mortgage.clientId)) || mortgage.clientId}</td>
                          <td>{property ? property.name : mortgage.productId}</td>
                          <td>${formatCurrency(mortgage.loanAmount)}</td>
                          <td>
                            {mortgage.propertyPrice
                              ? `${((Number(mortgage.downPayment || 0) / Number(mortgage.propertyPrice)) * 100).toFixed(2)}%`
                              : '--'}
                          </td>
                          <td>{monthlyPayment ? `$${formatCurrency(monthlyPayment)}` : '--'}</td>
                          <td>{mortgage.termYears} yrs</td>
                          <td>{mortgage.status}</td>
                          {adminStatus && (
                            <td>
                              {mortgage.status === 'PENDING' ? (
                                <div className="flex gap-2">
                                  <button
                                    className="bw-button"
                                    onClick={() =>
                                      approveMortgageMutation.mutate({
                                        slotId: currentSlot,
                                        mortgageId: mortgage.id,
                                      })
                                    }
                                  >
                                    Approve
                                  </button>
                                  <button
                                    className="bw-button bw-button-danger"
                                    onClick={() =>
                                      rejectMortgageMutation.mutate({
                                        slotId: currentSlot,
                                        mortgageId: mortgage.id,
                                      })
                                    }
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span
                                  className={`text-xs ${
                                    mortgage.status === 'ACCEPTED' ? 'text-green-600' : 'text-red-600'
                                  }`}
                                >
                                  Processed
                                </span>
                              )}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Panel>
    </div>
  )
}
