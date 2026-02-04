import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Panel from '../../components/Panel.jsx'
import Modal from '../../components/Modal.jsx'
import { useSlot } from '../../providers/SlotProvider.jsx'
import { useClients } from '../../hooks/useClients.js'
import { useTransactions } from '../../hooks/useTransactions.js'
import { useClientProperties } from '../../hooks/useMortgages.js'
import { apiFetch } from '../../api.js'
import { API_BASE, DAILY_WITHDRAWAL_LIMIT } from '../../constants.js'
import { formatCurrency, formatIsoDate, getGameDateString } from '../../utils.js'

export default function ClientScreen() {
  const { clientId } = useParams()
  const { currentSlot, setSelectedClientId } = useSlot()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
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

  const transactions = transactionsQuery.data || []
  const ownedProperties = ownedPropertiesQuery.data || []

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
        </h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <h3 className="text-sm font-semibold mb-1 uppercase">Checking Account</h3>
            <p>
              Balance: $<span id="client-view-balance">{formatCurrency(selectedClient?.checkingBalance || 0)}</span>
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-1 uppercase">Debit Card</h3>
            <p className="text-xs">Number: {selectedClient?.cardNumber}</p>
            <p className="text-xs">Expires: {selectedClient?.cardExpiry}</p>
            <p className="text-xs">CVV: {selectedClient?.cardCvv}</p>
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
                {property.imageUrl ? (
                  <div className="property-image" style={{ backgroundImage: `url(${property.imageUrl})` }} />
                ) : (
                  <div className="property-image property-image-placeholder">No Image</div>
                )}
                <div className="property-body">
                  <div className="property-title">{property.name}</div>
                  <div className="property-meta">
                    {property.rooms} rooms • {property.sqft2} sqft
                  </div>
                  <div className="property-price">${formatCurrency(property.price)}</div>
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
                tx.type === 'DEPOSIT' || tx.type === 'LOAN_DISBURSEMENT' || tx.type === 'MORTGAGE_DOWN_PAYMENT_FUNDING'
              const typeClass = isDeposit ? 'log-type-deposit' : 'log-type-withdrawal'
              const typeSymbol = isDeposit ? '➕' : '➖'
              const typeLabel = (() => {
                if (tx.type === 'LOAN_DISBURSEMENT') return 'Loan Disbursement'
                if (tx.type === 'MORTGAGE_DOWN_PAYMENT') return 'Mortgage Down Deposit'
                if (tx.type === 'MORTGAGE_DOWN_PAYMENT_FUNDING') return 'Mortgage Down Deposit Funding'
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
                tx.type === 'DEPOSIT' || tx.type === 'LOAN_DISBURSEMENT' || tx.type === 'MORTGAGE_DOWN_PAYMENT_FUNDING'
              const typeClass = isDeposit ? 'log-type-deposit' : 'log-type-withdrawal'
              const typeSymbol = isDeposit ? '➕' : '➖'
              const typeLabel = (() => {
                if (tx.type === 'LOAN_DISBURSEMENT') return 'Loan Disbursement'
                if (tx.type === 'MORTGAGE_DOWN_PAYMENT') return 'Mortgage Down Deposit'
                if (tx.type === 'MORTGAGE_DOWN_PAYMENT_FUNDING') return 'Mortgage Down Deposit Funding'
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
