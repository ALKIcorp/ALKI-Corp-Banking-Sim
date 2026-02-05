import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Panel from '../../components/Panel.jsx'
import Modal from '../../components/Modal.jsx'
import { useSlot } from '../../providers/SlotProvider.jsx'
import { useClients } from '../../hooks/useClients.js'
import { useTransactions } from '../../hooks/useTransactions.js'
import { useClientProperties } from '../../hooks/useMortgages.js'
import { useJobs } from '../../hooks/useJobs.js'
import { useRentals } from '../../hooks/useRentals.js'
import { useLiving } from '../../hooks/useLiving.js'
import { apiFetch } from '../../api.js'
import { API_BASE, DAILY_WITHDRAWAL_LIMIT } from '../../constants.js'
import { formatCurrency, formatIsoDate, getGameDateString } from '../../utils.js'
import PropertyImage from '../../components/PropertyImage.jsx'

export default function ClientScreen() {
  const { clientId } = useParams()
  const { currentSlot, setSelectedClientId } = useSlot()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [savingsDeposit, setSavingsDeposit] = useState('')
  const [savingsWithdraw, setSavingsWithdraw] = useState('')
  const [selectedJobId, setSelectedJobId] = useState('')
  const [selectedRentalId, setSelectedRentalId] = useState('')
  const [error, setError] = useState('')
  const [showTransactions, setShowTransactions] = useState(false)

  const clientsQuery = useClients(currentSlot, true)
  const clients = clientsQuery.data || []
  const selectedClient = clients.find((c) => String(c.id) === String(clientId))

  // ensure context tracks current client
  useEffect(() => {
    if (clientId) {
      setSelectedClientId(Number(clientId))
    }
  }, [clientId, setSelectedClientId])

  const transactionsQuery = useTransactions(currentSlot, clientId, true)
  const ownedPropertiesQuery = useClientProperties(currentSlot, clientId, true)
  const jobsQuery = useJobs(currentSlot)
  const rentalsQuery = useRentals(currentSlot)
  const livingQuery = useLiving(currentSlot, clientId)

  const depositMutation = useMutation({
    mutationFn: ({ slotId, clientId: cid, amount }) =>
      apiFetch(`${API_BASE}/${slotId}/clients/${cid}/deposit`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }),
    onSuccess: () => {
      setDepositAmount('')
      setError('')
      queryClient.invalidateQueries({ queryKey: ['clients', currentSlot] })
      queryClient.invalidateQueries({ queryKey: ['transactions', currentSlot, clientId] })
      queryClient.invalidateQueries({ queryKey: ['bank', currentSlot] })
      queryClient.invalidateQueries({ queryKey: ['charts', currentSlot] })
    },
    onError: (err) => setError(err.message),
  })

  const withdrawMutation = useMutation({
    mutationFn: ({ slotId, clientId: cid, amount }) =>
      apiFetch(`${API_BASE}/${slotId}/clients/${cid}/withdraw`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }),
    onSuccess: () => {
      setWithdrawAmount('')
      setError('')
      queryClient.invalidateQueries({ queryKey: ['clients', currentSlot] })
      queryClient.invalidateQueries({ queryKey: ['transactions', currentSlot, clientId] })
      queryClient.invalidateQueries({ queryKey: ['bank', currentSlot] })
      queryClient.invalidateQueries({ queryKey: ['charts', currentSlot] })
    },
    onError: (err) => setError(err.message),
  })

  const savingsDepositMutation = useMutation({
    mutationFn: ({ slotId, clientId: cid, amount }) =>
      apiFetch(`${API_BASE}/${slotId}/clients/${cid}/savings/deposit`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }),
    onSuccess: () => {
      setSavingsDeposit('')
      setError('')
      queryClient.invalidateQueries({ queryKey: ['clients', currentSlot] })
      queryClient.invalidateQueries({ queryKey: ['transactions', currentSlot, clientId] })
    },
    onError: (err) => setError(err.message),
  })

  const savingsWithdrawMutation = useMutation({
    mutationFn: ({ slotId, clientId: cid, amount }) =>
      apiFetch(`${API_BASE}/${slotId}/clients/${cid}/savings/withdraw`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }),
    onSuccess: () => {
      setSavingsWithdraw('')
      setError('')
      queryClient.invalidateQueries({ queryKey: ['clients', currentSlot] })
      queryClient.invalidateQueries({ queryKey: ['transactions', currentSlot, clientId] })
    },
    onError: (err) => setError(err.message),
  })

  const assignJobMutation = useMutation({
    mutationFn: ({ slotId, clientId: cid, jobId }) =>
      apiFetch(`${API_BASE}/${slotId}/jobs/clients/${cid}/assign/${jobId}`, { method: 'POST' }),
    onSuccess: () => {
      setSelectedJobId('')
      queryClient.invalidateQueries({ queryKey: ['clients', currentSlot] })
      queryClient.invalidateQueries({ queryKey: ['jobs', currentSlot] })
    },
    onError: (err) => setError(err.message),
  })

  const assignRentalMutation = useMutation({
    mutationFn: ({ slotId, clientId: cid, rentalId }) =>
      apiFetch(`${API_BASE}/${slotId}/clients/${cid}/living/rental/${rentalId}`, { method: 'POST' }),
    onSuccess: () => {
      setSelectedRentalId('')
      queryClient.invalidateQueries({ queryKey: ['living', currentSlot, clientId] })
    },
    onError: (err) => setError(err.message),
  })

  const assignOwnedMutation = useMutation({
    mutationFn: ({ slotId, clientId: cid, propertyId }) =>
      apiFetch(`${API_BASE}/${slotId}/clients/${cid}/living/owned/${propertyId}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['living', currentSlot, clientId] })
    },
    onError: (err) => setError(err.message),
  })

  const sellPropertyMutation = useMutation({
    mutationFn: ({ slotId, clientId: cid, productId }) =>
      apiFetch(`${API_BASE}/${slotId}/clients/${cid}/properties/${productId}/sell`, { method: 'POST' }),
    onSuccess: () => {
      setError('')
      queryClient.invalidateQueries({ queryKey: ['client-properties', currentSlot, clientId] })
      queryClient.invalidateQueries({ queryKey: ['clients', currentSlot] })
      queryClient.invalidateQueries({ queryKey: ['bank', currentSlot] })
      queryClient.invalidateQueries({ queryKey: ['transactions', currentSlot, clientId] })
      queryClient.invalidateQueries({ queryKey: ['products', currentSlot] })
      queryClient.invalidateQueries({ queryKey: ['living', currentSlot, clientId] })
      queryClient.invalidateQueries({ queryKey: ['charts', currentSlot] })
    },
    onError: (err) => setError(err.message),
  })

  const transactions = transactionsQuery.data || []
  const ownedProperties = ownedPropertiesQuery.data || []
  const jobs = jobsQuery.data || []
  const rentals = rentalsQuery.data || []
  const living = livingQuery.data || null

  const totalWithdrawnToday = useMemo(() => {
    const today = transactions.filter((tx) => tx.type === 'WITHDRAWAL' && tx.gameDay === selectedClient?.gameDay)
    return today.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
  }, [transactions, selectedClient])

  const handleDeposit = () => {
    if (!currentSlot || !clientId) return
    const amount = Number(depositAmount)
    if (!amount || amount <= 0) {
      setError('Invalid deposit amount.')
      return
    }
    depositMutation.mutate({ slotId: currentSlot, clientId, amount })
  }

  const handleWithdraw = () => {
    if (!currentSlot || !clientId) return
    const amount = Number(withdrawAmount)
    if (!amount || amount <= 0) {
      setError('Invalid withdrawal amount.')
      return
    }
    if (amount > DAILY_WITHDRAWAL_LIMIT) {
      setError(`Daily withdrawal limit is $${formatCurrency(DAILY_WITHDRAWAL_LIMIT)}.`)
      return
    }
    withdrawMutation.mutate({ slotId: currentSlot, clientId, amount })
  }

  if (!selectedClient) {
    return (
      <Panel>
        <p className="text-sm">Client not found.</p>
        <button className="bw-button mt-2" onClick={() => navigate('/bank')}>
          Back
        </button>
      </Panel>
    )
  }

  return (
    <div id="client-view-screen" className="screen active">
      <Panel>
        <h2 className="bw-header">
          Client: <span id="client-view-name">{selectedClient?.name}</span>
          {selectedClient?.bankrupt && (
            <span className="ml-2 px-2 py-1 rounded bg-red-100 text-red-700 text-xs">BANKRUPT</span>
          )}
        </h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <h3 className="text-sm font-semibold mb-1 uppercase">Checking Account</h3>
            <p>
              Balance: $<span id="client-view-balance">{formatCurrency(selectedClient?.checkingBalance || 0)}</span>
            </p>
            <p className="text-xs text-gray-500">
              Savings: ${formatCurrency(selectedClient?.savingsBalance || 0)}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-1 uppercase">Debit Card</h3>
            <p className="text-xs">Number: {selectedClient?.cardNumber}</p>
            <p className="text-xs">Expires: {selectedClient?.cardExpiry}</p>
            <p className="text-xs">CVV: {selectedClient?.cardCvv}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <h3 className="text-sm font-semibold mb-1 uppercase">Income & Obligations</h3>
            <p className="text-xs">Monthly income: ${formatCurrency(selectedClient?.monthlyIncome || 0)}</p>
            <p className="text-xs">Mandatory spend: ${formatCurrency(selectedClient?.monthlyMandatory || 0)}</p>
            <p className="text-xs">Discretionary target: ${formatCurrency(selectedClient?.monthlyDiscretionary || 0)}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-1 uppercase">Employment</h3>
            <p className="text-xs mb-1">Status: {selectedClient?.employmentStatus}</p>
            <label className="bw-label mt-2 block">Assign Job</label>
            <div className="flex gap-2">
              <select className="bw-input flex-1" value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)}>
                <option value="">Choose job</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} @ {job.employer} (${formatCurrency(job.annualSalary)})
                  </option>
                ))}
              </select>
              <button
                className="bw-button"
                onClick={() =>
                  selectedJobId && assignJobMutation.mutate({ slotId: currentSlot, clientId, jobId: selectedJobId })
                }
                disabled={assignJobMutation.isPending}
              >
                Save
              </button>
            </div>
          </div>
        </div>
        <div className="dual-action-card dual-action-card-left mb-4">
          <Link className="dual-action-option dual-action-option-loan" to="/applications">
            <div className="dual-action-title">Apply For Loan</div>
            <div className="dual-action-subtitle">Start a new loan request</div>
          </Link>
          <div className="dual-action-divider" aria-hidden="true" />
          <Link className="dual-action-option dual-action-option-properties" to="/properties">
            <div className="dual-action-title">View Properties For Sale</div>
            <div className="dual-action-subtitle">Browse listings and apply for mortgages</div>
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 analytics-grid client-action-grid">
          <div>
            <label htmlFor="deposit-amount" className="bw-label">
              Deposit:
            </label>
            <input
              type="number"
              id="deposit-amount"
              className="bw-input"
              placeholder="Amount"
              min="0"
              step="0.01"
              value={depositAmount}
              onChange={(event) => setDepositAmount(event.target.value)}
            />
            <button className="bw-button w-full" onClick={handleDeposit} disabled={depositMutation.isPending}>
              <span className="btn-icon">➕</span> Deposit
            </button>
          </div>
          <div>
            <label htmlFor="withdraw-amount" className="bw-label">
              Withdraw:
            </label>
            <input
              type="number"
              id="withdraw-amount"
              className="bw-input"
              placeholder="Amount"
              min="0"
              step="0.01"
              value={withdrawAmount}
              onChange={(event) => setWithdrawAmount(event.target.value)}
            />
            <button className="bw-button w-full" onClick={handleWithdraw} disabled={withdrawMutation.isPending}>
              <span className="btn-icon">➖</span> Withdraw
            </button>
            <p className="text-xs text-gray-500 mt-1">
              Daily limit: ${formatCurrency(DAILY_WITHDRAWAL_LIMIT)} • Used today: $
              {formatCurrency(totalWithdrawnToday)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 analytics-grid client-action-grid mt-4">
          <div>
            <label className="bw-label">Move to Savings</label>
            <input
              type="number"
              className="bw-input"
              placeholder="Amount"
              value={savingsDeposit}
              onChange={(e) => setSavingsDeposit(e.target.value)}
            />
            <button
              className="bw-button w-full"
              onClick={() =>
                savingsDeposit &&
                savingsDepositMutation.mutate({ slotId: currentSlot, clientId, amount: Number(savingsDeposit) })
              }
              disabled={savingsDepositMutation.isPending}
            >
              Transfer ➜ Savings
            </button>
          </div>
          <div>
            <label className="bw-label">Move to Checking</label>
            <input
              type="number"
              className="bw-input"
              placeholder="Amount"
              value={savingsWithdraw}
              onChange={(e) => setSavingsWithdraw(e.target.value)}
            />
            <button
              className="bw-button w-full"
              onClick={() =>
                savingsWithdraw &&
                savingsWithdrawMutation.mutate({ slotId: currentSlot, clientId, amount: Number(savingsWithdraw) })
              }
              disabled={savingsWithdrawMutation.isPending}
            >
              Transfer ➜ Checking
            </button>
          </div>
        </div>
        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-1 uppercase">Living</h3>
          <p className="text-xs mb-2">
            Current: {living ? living.livingType : 'Not set'}{' '}
            {living?.rentalId && `(Rental #${living.rentalId})`} {living?.propertyId && `(Property #${living.propertyId})`}{' '}
            {living?.monthlyRent ? `• Rent $${formatCurrency(living.monthlyRent)}` : ''}
          </p>
          <div className="flex gap-2 mb-2">
            <select className="bw-input flex-1" value={selectedRentalId} onChange={(e) => setSelectedRentalId(e.target.value)}>
              <option value="">Choose rental</option>
              {rentals.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ${formatCurrency(r.monthlyRent)}
                </option>
              ))}
            </select>
            <button
              className="bw-button"
              onClick={() =>
                selectedRentalId &&
                assignRentalMutation.mutate({ slotId: currentSlot, clientId, rentalId: selectedRentalId })
              }
              disabled={assignRentalMutation.isPending}
            >
              Set Rental
            </button>
          </div>
          <div className="flex gap-2 mb-2">
            <select
              className="bw-input flex-1"
              value=""
              onChange={(e) =>
                e.target.value &&
                assignOwnedMutation.mutate({ slotId: currentSlot, clientId, propertyId: e.target.value })
              }
            >
              <option value="">Use owned property</option>
              {ownedProperties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p id="client-error-message" className="text-red-600 text-xs mt-2 text-center">
          {error}
        </p>

        <div className="transaction-log">
          <h4>
            <span className="header-icon">🏠</span> Assets
          </h4>
          <div className="property-grid">
            {!ownedProperties.length && <p className="text-xs text-gray-500">No properties owned yet.</p>}
            {ownedProperties.map((property) => (
              <div key={property.id} className="property-card">
                <PropertyImage src={property.imageUrl} alt={`${property.name} photo`} />
              <div className="property-body">
                <div className="property-title">{property.name}</div>
                <div className="property-meta">
                  {property.rooms} rooms • {property.sqft2} sqft
                </div>
                <div className="property-price">${formatCurrency(property.price)}</div>
                <button
                  className="bw-button w-full mt-2"
                  onClick={() =>
                    sellPropertyMutation.mutate({
                      slotId: currentSlot,
                      clientId,
                      productId: property.id,
                    })
                  }
                  disabled={sellPropertyMutation.isPending}
                >
                  Sell for ${formatCurrency(property.price)}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

        <div className="transaction-log">
          <h4 className="flex items-center justify-between">
            <span>
              <span className="header-icon">📜</span> Transaction History
            </span>
            <button className="bw-button" type="button" onClick={() => setShowTransactions(true)}>
              View All
            </button>
          </h4>
          <div id="client-log-area" className="log-area">
            {!transactions.length && <p className="text-xs text-gray-500">No transactions yet.</p>}
            {transactions.map((tx) => {
              const isDeposit =
                tx.type === 'DEPOSIT' ||
                tx.type === 'LOAN_DISBURSEMENT' ||
                tx.type === 'MORTGAGE_DOWN_PAYMENT_FUNDING' ||
                tx.type === 'PROPERTY_SALE'
              const typeClass = isDeposit ? 'log-type-deposit' : 'log-type-withdrawal'
              const typeSymbol = isDeposit ? '➕' : '➖'
              const typeLabel = (() => {
                if (tx.type === 'LOAN_DISBURSEMENT') return 'Loan Disbursement'
                if (tx.type === 'MORTGAGE_DOWN_PAYMENT') return 'Mortgage Down Deposit'
                if (tx.type === 'MORTGAGE_DOWN_PAYMENT_FUNDING') return 'Mortgage Down Deposit Funding'
                if (tx.type === 'PROPERTY_SALE') return 'Property Sale'
                return tx.type.charAt(0) + tx.type.slice(1).toLowerCase()
              })()
              return (
                <div className="log-entry" key={tx.id}>
                  <span className="text-gray-500">
                    {formatIsoDate(tx.createdAt)} • {getGameDateString(tx.gameDay)}:
                  </span>{' '}
                  <span className={typeClass}>
                    {typeSymbol} {typeLabel}
                  </span>{' '}
                  <span>${formatCurrency(tx.amount)}</span>
                </div>
              )
            })}
          </div>
        </div>
        <button
          className="bw-button mt-2 self-center"
          onClick={() => {
            setSelectedClientId(null)
            navigate('/bank')
          }}
        >
          <span className="btn-icon">🏦</span> Back to Bank View
        </button>
      </Panel>

      {showTransactions && (
        <Modal title="Transaction History" onClose={() => setShowTransactions(false)}>
          <div className="modal-client-list border p-2 rounded bg-gray-100">
            {!transactions.length && <p className="text-xs text-gray-500">No transactions yet.</p>}
            {transactions.map((tx) => {
              const isDeposit =
                tx.type === 'DEPOSIT' ||
                tx.type === 'LOAN_DISBURSEMENT' ||
                tx.type === 'MORTGAGE_DOWN_PAYMENT_FUNDING' ||
                tx.type === 'PROPERTY_SALE'
              const typeClass = isDeposit ? 'log-type-deposit' : 'log-type-withdrawal'
              const typeSymbol = isDeposit ? '➕' : '➖'
              const typeLabel = (() => {
                if (tx.type === 'LOAN_DISBURSEMENT') return 'Loan Disbursement'
                if (tx.type === 'MORTGAGE_DOWN_PAYMENT') return 'Mortgage Down Deposit'
                if (tx.type === 'MORTGAGE_DOWN_PAYMENT_FUNDING') return 'Mortgage Down Deposit Funding'
                if (tx.type === 'PROPERTY_SALE') return 'Property Sale'
                return tx.type.charAt(0) + tx.type.slice(1).toLowerCase()
              })()
              return (
                <div className="log-entry" key={`modal-${tx.id}`}>
                  <span className="text-gray-500">
                    {formatIsoDate(tx.createdAt)} • {getGameDateString(tx.gameDay)}:
                  </span>{' '}
                  <span className={typeClass}>
                    {typeSymbol} {typeLabel}
                  </span>{' '}
                  <span>${formatCurrency(tx.amount)}</span>
                </div>
              )
            })}
          </div>
        </Modal>
      )}
    </div>
  )
}
