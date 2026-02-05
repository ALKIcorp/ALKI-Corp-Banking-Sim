import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Panel from '../../components/Panel.jsx'
import Modal from '../../components/Modal.jsx'
import { useSlot } from '../../providers/SlotProvider.jsx'
import { useClients } from '../../hooks/useClients.js'
import { useTransactions } from '../../hooks/useTransactions.js'
import { useMonthlyCashflow } from '../../hooks/useMonthlyCashflow.js'
import { useClientProperties, useMortgages } from '../../hooks/useMortgages.js'
import { useJobs } from '../../hooks/useJobs.js'
import { useRentals } from '../../hooks/useRentals.js'
import { useLiving } from '../../hooks/useLiving.js'
import { apiFetch } from '../../api.js'
import { API_BASE, DAILY_WITHDRAWAL_LIMIT, DAYS_PER_YEAR } from '../../constants.js'
import { formatCurrency, formatIsoDateTime, getGameDateString } from '../../utils.js'
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
  const [transactionTypeFilter, setTransactionTypeFilter] = useState('ALL')
  const [transactionDateOrder, setTransactionDateOrder] = useState('DESC')
  const [selectedYear, setSelectedYear] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [selectedProperty, setSelectedProperty] = useState(null)

  const depositTypes = useMemo(
    () =>
      new Set([
        'DEPOSIT',
        'PAYROLL_DEPOSIT',
        'SAVINGS_DEPOSIT',
        'LOAN_DISBURSEMENT',
        'MORTGAGE_DOWN_PAYMENT_FUNDING',
        'PROPERTY_SALE',
      ]),
    []
  )

  const getTypeLabel = (type) => {
    if (type === 'LOAN_DISBURSEMENT') return 'Loan Disbursement'
    if (type === 'MORTGAGE_DOWN_PAYMENT') return 'Mortgage Down Deposit'
    if (type === 'MORTGAGE_DOWN_PAYMENT_FUNDING') return 'Mortgage Down Deposit Funding'
    if (type === 'MORTGAGE_PAYMENT') return 'Mortgage Payment'
    if (type === 'RENT_PAYMENT') return 'Rental Payment'
    if (type === 'PROPERTY_SALE') return 'Property Sale'
    if (type === 'PAYROLL_DEPOSIT') return 'Payroll Deposit'
    if (type === 'SAVINGS_DEPOSIT') return 'Savings Deposit'
    return type.charAt(0) + type.slice(1).toLowerCase()
  }

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
  const mortgagesQuery = useMortgages(currentSlot, true)
  const jobsQuery = useJobs(currentSlot)
  const rentalsQuery = useRentals(currentSlot)
  const livingQuery = useLiving(currentSlot, clientId)
  const mandatorySpend = selectedClient?.monthlyMandatory ?? livingQuery.data?.monthlyRent ?? 0

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

  const clearLivingMutation = useMutation({
    mutationFn: ({ slotId, clientId: cid }) => apiFetch(`${API_BASE}/${slotId}/clients/${cid}/living/none`, { method: 'POST' }),
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
      queryClient.invalidateQueries({ queryKey: ['products', 'available-all'] })
      queryClient.invalidateQueries({ queryKey: ['living', currentSlot, clientId] })
      queryClient.invalidateQueries({ queryKey: ['charts', currentSlot] })
    },
    onError: (err) => setError(err.message),
  })

  const transactions = transactionsQuery.data || []
  const ownedProperties = ownedPropertiesQuery.data || []
  const mortgages = mortgagesQuery.data || []
  const jobs = jobsQuery.data || []
  const rentals = rentalsQuery.data || []
  const living = livingQuery.data || null

  const mortgageByPropertyId = useMemo(() => {
    const map = new Map()
    mortgages
      .filter((mortgage) => String(mortgage.clientId) === String(clientId) && mortgage.status === 'ACCEPTED')
      .forEach((mortgage) => {
        if (mortgage.productId != null) {
          map.set(String(mortgage.productId), mortgage)
        }
      })
    return map
  }, [clientId, mortgages])

  const canSellProperty = (property) => {
    const mortgage = mortgageByPropertyId.get(String(property.id))
    if (!mortgage) return true
    const totalMonths = Math.max(0, Number(mortgage.termYears || 0) * 12)
    const paymentsMade = Math.max(0, Number(mortgage.paymentsMade || 0))
    const propertyPrice = Number(mortgage.propertyPrice ?? property.price ?? 0)
    const totalPaid = Number(mortgage.totalPaid || 0)
    return (
      (totalMonths > 0 && paymentsMade >= totalMonths) ||
      (propertyPrice > 0 && totalPaid >= propertyPrice)
    )
  }

  const availableMonthsByYear = useMemo(() => {
    const monthMap = new Map()
    transactions.forEach((tx) => {
      const gameMonth = Number(tx.gameDay)
      if (!Number.isFinite(gameMonth)) return
      const totalMonths = Math.floor(gameMonth)
      const year = Math.floor(totalMonths / DAYS_PER_YEAR) + 1
      const month = (totalMonths % DAYS_PER_YEAR) + 1
      if (!monthMap.has(year)) {
        monthMap.set(year, new Set())
      }
      monthMap.get(year).add(month)
    })
    return monthMap
  }, [transactions])

  const availableYears = useMemo(
    () => Array.from(availableMonthsByYear.keys()).sort((a, b) => a - b),
    [availableMonthsByYear]
  )

  const availableMonths = useMemo(() => {
    const months = availableMonthsByYear.get(selectedYear)
    return months ? Array.from(months).sort((a, b) => a - b) : []
  }, [availableMonthsByYear, selectedYear])

  const lastGameMonth = useMemo(() => {
    const transactionMonths = transactions
      .map((tx) => Number(tx.gameDay))
      .filter((month) => Number.isFinite(month))
    return transactionMonths.length ? Math.max(...transactionMonths) : selectedClient?.gameDay
  }, [selectedClient?.gameDay, transactions])

  const defaultYearMonth = useMemo(() => {
    if (lastGameMonth === null || lastGameMonth === undefined) return null
    const totalMonths = Math.floor(Number(lastGameMonth))
    const year = Math.floor(totalMonths / DAYS_PER_YEAR) + 1
    const month = (totalMonths % DAYS_PER_YEAR) + 1
    return { year, month }
  }, [lastGameMonth])

  useEffect(() => {
    if ((selectedYear === null || selectedMonth === null) && defaultYearMonth) {
      setSelectedYear(defaultYearMonth.year)
      setSelectedMonth(defaultYearMonth.month)
      return
    }
    if (availableYears.length && selectedYear !== null && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[availableYears.length - 1])
      return
    }
    if (availableMonths.length && selectedMonth !== null && !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[availableMonths.length - 1])
    }
  }, [availableMonths, availableYears, defaultYearMonth, selectedMonth, selectedYear])

  const monthlyCashflowQuery = useMonthlyCashflow(currentSlot, clientId, selectedYear, selectedMonth, true)
  const selectedGameMonth =
    Number.isFinite(selectedYear) && Number.isFinite(selectedMonth)
      ? (selectedYear - 1) * DAYS_PER_YEAR + (selectedMonth - 1)
      : null
  const monthlyCashflow = monthlyCashflowQuery.data || {
    income: 0,
    spending: 0,
    net: 0,
    spendingVsIncomePct: 0,
    gameMonth: selectedGameMonth,
  }
  const yearOptions = availableYears.length ? availableYears : defaultYearMonth ? [defaultYearMonth.year] : []
  const monthOptions = availableMonths.length ? availableMonths : defaultYearMonth ? [defaultYearMonth.month] : []

  const transactionTypeOptions = useMemo(() => {
    const uniqueTypes = new Set(transactions.map((tx) => tx.type))
    return ['ALL', ...Array.from(uniqueTypes).sort()]
  }, [transactions])

  const filteredTransactions = useMemo(() => {
    const filtered =
      transactionTypeFilter === 'ALL'
        ? transactions
        : transactions.filter((tx) => tx.type === transactionTypeFilter)

    const sorter = (a, b) => {
      const aDate = new Date(a.createdAt)
      const bDate = new Date(b.createdAt)
      return transactionDateOrder === 'DESC' ? bDate - aDate : aDate - bDate
    }

    return [...filtered].sort(sorter)
  }, [transactionDateOrder, transactionTypeFilter, transactions])

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
            <p className="text-xs">Mandatory spend: ${formatCurrency(mandatorySpend)}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-1 uppercase">Employment</h3>
            <p className="text-xs mb-1">Status: {selectedClient?.employmentStatus}</p>
            {selectedClient?.employmentStatus === 'ACTIVE' ? (
              selectedClient?.primaryJobTitle ? (
                <p className="text-xs mb-2">
                  Job: {selectedClient.primaryJobTitle} @ {selectedClient.primaryJobEmployer} ($
                  {formatCurrency(selectedClient.primaryJobAnnualSalary || 0)}/yr)
                </p>
              ) : (
                <p className="text-xs text-gray-500 mb-2">No job assigned yet.</p>
              )
            ) : (
              <p className="text-xs text-gray-500 mb-2">Not currently employed.</p>
            )}
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
          <Link
            className="dual-action-option dual-action-option-properties"
            to="/properties"
            state={{ clientId: Number(clientId), slotId: currentSlot }}
          >
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
            Current: {living ? (living.livingType === 'NONE' ? 'None' : living.livingType) : 'Not set'}{' '}
            {living?.rentalId && `(Rental #${living.rentalId})`} {living?.propertyId && `(Property #${living.propertyId})`}{' '}
            {living?.monthlyRent ? `• Rent $${formatCurrency(living.monthlyRent)}` : ''}
          </p>
          <div className="flex gap-2 mb-2">
            <select className="bw-input flex-1" value={selectedRentalId} onChange={(e) => setSelectedRentalId(e.target.value)}>
              <option value="" disabled hidden>
                Choose rental
              </option>
              <option value="NONE">None (no rental)</option>
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
                (selectedRentalId === 'NONE'
                  ? clearLivingMutation.mutate({ slotId: currentSlot, clientId })
                  : assignRentalMutation.mutate({ slotId: currentSlot, clientId, rentalId: selectedRentalId }))
              }
              disabled={assignRentalMutation.isPending || clearLivingMutation.isPending}
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
                  <button className="bw-button w-full mt-2" type="button" onClick={() => setSelectedProperty(property)}>
                    View Details
                  </button>
                  {(() => {
                    const canSell = canSellProperty(property)
                    const tooltip = canSell
                      ? ''
                      : 'You can only sell property once the mortgage is paid off.'
                    return (
                      <span className="tooltip-wrap" data-tooltip={tooltip}>
                        <button
                          className="bw-button w-full mt-2"
                          onClick={() =>
                            sellPropertyMutation.mutate({
                              slotId: currentSlot,
                              clientId,
                              productId: property.id,
                            })
                          }
                          disabled={sellPropertyMutation.isPending || !canSell}
                        >
                          Sell for ${formatCurrency(property.price)}
                        </button>
                      </span>
                    )
                  })()}
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
          <div className="flex flex-wrap gap-2 mb-2 items-center">
            <select
              className="bw-select-small"
              value={transactionTypeFilter}
              onChange={(e) => setTransactionTypeFilter(e.target.value)}
            >
              {transactionTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type === 'ALL' ? 'All types' : getTypeLabel(type)}
                </option>
              ))}
            </select>
            <select
              className="bw-select-small"
              value={transactionDateOrder}
              onChange={(e) => setTransactionDateOrder(e.target.value)}
            >
              <option value="DESC">Newest first</option>
              <option value="ASC">Oldest first</option>
            </select>
          </div>
          <div id="client-log-area" className="log-area">
            {!transactions.length && <p className="text-xs text-gray-500">No transactions yet.</p>}
            {transactions.length > 0 && !filteredTransactions.length && (
              <p className="text-xs text-gray-500">No transactions match the selected filters.</p>
            )}
            {filteredTransactions.map((tx) => {
              const isDeposit = depositTypes.has(tx.type)
              const typeClass = isDeposit ? 'log-type-deposit' : 'log-type-withdrawal'
              const typeSymbol = isDeposit ? '➕' : '➖'
              const typeLabel = getTypeLabel(tx.type)
              return (
                <div className="log-entry" key={tx.id}>
                  <span className="text-gray-500">
                    {formatIsoDateTime(tx.createdAt)} • {getGameDateString(tx.gameDay)}:
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

        <div className="monthly-spending-card mt-4 rounded-lg border bg-white shadow-sm p-6">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span className="font-semibold text-gray-700">Monthly spending</span>
            <div className="flex items-center gap-2">
              <select
                className="bw-select-small"
                value={selectedYear ?? ''}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {yearOptions.length === 0 && (
                  <option value="" disabled>
                    Year
                  </option>
                )}
                {yearOptions.map((year) => (
                  <option key={`year-${year}`} value={year}>
                    Y{year}
                  </option>
                ))}
              </select>
              <select
                className="bw-select-small"
                value={selectedMonth ?? ''}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
              >
                {monthOptions.length === 0 && (
                  <option value="" disabled>
                    Month
                  </option>
                )}
                {monthOptions.map((month) => (
                  <option key={`month-${month}`} value={month}>
                    M{month}
                  </option>
                ))}
              </select>
              <span>{getGameDateString(monthlyCashflow.gameMonth)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 text-left text-sm">
            <div className="flex items-center justify-between">
              <span className="uppercase text-gray-500">Income</span>
              <span className="font-semibold text-green-700">${formatCurrency(monthlyCashflow.income)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="uppercase text-gray-500">Spending</span>
              <span className="font-semibold text-red-700">${formatCurrency(monthlyCashflow.spending)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="uppercase text-gray-500">Net</span>
              <span className={`font-semibold ${monthlyCashflow.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                ${formatCurrency(monthlyCashflow.net)}
              </span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
              <span>Spending vs income</span>
              <span>{monthlyCashflow.spendingVsIncomePct.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
              <div
                className={`h-2 ${monthlyCashflow.spendingVsIncomePct <= 100 ? 'bg-green-500' : 'bg-orange-500'}`}
                style={{ width: `${Math.min(monthlyCashflow.spendingVsIncomePct, 160)}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Month: {getGameDateString(monthlyCashflow.gameMonth)} (resets each in‑game month)
            </p>
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

      {selectedProperty && (
        <Modal
          title={
            <span className="flex items-center gap-2">
              <span className="header-icon">🏠</span> {selectedProperty.name}
            </span>
          }
          onClose={() => setSelectedProperty(null)}
        >
          <PropertyImage src={selectedProperty.imageUrl} alt={`${selectedProperty.name} photo`} variant="modal" />
          <div className="property-body">
            <div className="property-title mt-2">{selectedProperty.name}</div>
            <div className="property-meta">
              {selectedProperty.rooms} rooms • {selectedProperty.sqft2} sqft
            </div>
            <div className="property-price">${formatCurrency(selectedProperty.price)}</div>
          </div>
          {(() => {
            const mortgage = mortgageByPropertyId.get(String(selectedProperty.id))
            if (!mortgage) {
              return <p className="text-xs text-gray-500 mt-2">No mortgage details found for this property.</p>
            }
            const totalMonths = Math.max(0, Number(mortgage.termYears || 0) * 12)
            const paymentsMade = Math.max(0, Number(mortgage.paymentsMade || 0))
            const remainingMonths = Math.max(0, totalMonths - paymentsMade)
            const remainingYears = Math.floor(remainingMonths / 12)
            const remainingMonthRemainder = remainingMonths % 12
            const propertyPrice = Number(mortgage.propertyPrice ?? selectedProperty.price ?? 0)
            const totalPaid = Number(mortgage.totalPaid || 0)
            const equityPct = propertyPrice > 0 ? Math.min(100, (totalPaid / propertyPrice) * 100) : 0
            return (
              <div className="mt-3 text-xs text-gray-700">
                <div className="flex items-center justify-between">
                  <span className="uppercase text-gray-500">Paid So Far</span>
                  <span className="font-semibold">${formatCurrency(mortgage.totalPaid || 0)}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="uppercase text-gray-500">Equity</span>
                  <span className="font-semibold">
                    ${formatCurrency(totalPaid)} ({equityPct.toFixed(1)}%)
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="uppercase text-gray-500">Monthly Payment</span>
                  <span className="font-semibold">${formatCurrency(mortgage.monthlyPayment || 0)}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="uppercase text-gray-500">Payments Made</span>
                  <span className="font-semibold">{paymentsMade}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="uppercase text-gray-500">Time Left</span>
                  <span className="font-semibold">
                    Y{remainingYears} M{remainingMonthRemainder}
                  </span>
                </div>
                {Number.isFinite(mortgage.nextPaymentDay) && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="uppercase text-gray-500">Next Payment</span>
                    <span className="font-semibold">{getGameDateString(mortgage.nextPaymentDay)}</span>
                  </div>
                )}
              </div>
            )
          })()}
        </Modal>
      )}

      {showTransactions && (
        <Modal title="Transaction History" onClose={() => setShowTransactions(false)}>
          <div className="flex flex-wrap gap-2 mb-2 items-center">
            <select
              className="bw-input flex-1 min-w-[160px]"
              value={transactionTypeFilter}
              onChange={(e) => setTransactionTypeFilter(e.target.value)}
            >
              {transactionTypeOptions.map((type) => (
                <option key={`modal-${type}`} value={type}>
                  {type === 'ALL' ? 'All types' : getTypeLabel(type)}
                </option>
              ))}
            </select>
            <select
              className="bw-input flex-1 min-w-[160px]"
              value={transactionDateOrder}
              onChange={(e) => setTransactionDateOrder(e.target.value)}
            >
              <option value="DESC">Newest first</option>
              <option value="ASC">Oldest first</option>
            </select>
          </div>
          <div className="modal-client-list border p-2 rounded bg-gray-100">
            {!transactions.length && <p className="text-xs text-gray-500">No transactions yet.</p>}
            {transactions.length > 0 && !filteredTransactions.length && (
              <p className="text-xs text-gray-500">No transactions match the selected filters.</p>
            )}
            {filteredTransactions.map((tx) => {
              const isDeposit = depositTypes.has(tx.type)
              const typeClass = isDeposit ? 'log-type-deposit' : 'log-type-withdrawal'
              const typeSymbol = isDeposit ? '➕' : '➖'
              const typeLabel = getTypeLabel(tx.type)
              return (
                <div className="log-entry" key={`modal-${tx.id}`}>
                  <span className="text-gray-500">
                    {formatIsoDateTime(tx.createdAt)} • {getGameDateString(tx.gameDay)}:
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
