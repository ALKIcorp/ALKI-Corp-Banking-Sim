import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Panel from '../../components/Panel.jsx'
import { API_BASE, REAL_MS_PER_GAME_DAY, POLL_INTERVAL_MS } from '../../constants.js'
import { apiFetch } from '../../api.js'
import { useSlot } from '../../providers/SlotProvider.jsx'
import { useAuth } from '../../providers/AuthProvider.jsx'
import { useBank } from '../../hooks/useBank.js'
import { useClients } from '../../hooks/useClients.js'
import { useProducts } from '../../hooks/useProducts.js'
import { formatCurrency, getGameDateString } from '../../utils.js'
import { ActivityChart, ClientMoneyChart } from '../../components/Charts.jsx'

const ACTIVITY_RANGE_OPTIONS = [
  { id: 'all', label: 'All', months: null },
  { id: '10y', label: '10yrs', months: 120 },
  { id: '5y', label: '5yrs', months: 60 },
  { id: '2y', label: '2yrs', months: 24 },
  { id: '1y', label: '1yr', months: 12 },
  { id: '6m', label: '6 months', months: 6 },
  { id: '3m', label: '3 months', months: 3 },
]

function formatActivityLabel(dayNumber, index, rangeMonths) {
  if (!rangeMonths || rangeMonths >= 12) {
    return getGameDateString(dayNumber)
  }
  if (rangeMonths >= 6) {
    return `M${(dayNumber % 12) + 1}`
  }
  return `D${index + 1}`
}

export default function BankDashboard() {
  const navigate = useNavigate()
  const { currentSlot, setSelectedClientId } = useSlot()
  const { adminStatus } = useAuth()
  const bankQuery = useBank(currentSlot, true)
  const clientsQuery = useClients(currentSlot, true)
  const productsQuery = useProducts(currentSlot, true)
  const [activityRange, setActivityRange] = useState('all')
  const [isActivityMenuOpen, setIsActivityMenuOpen] = useState(false)
  const activityMenuRef = useRef(null)

  const chartsClientsQuery = useQuery({
    queryKey: ['charts', currentSlot, 'clients'],
    queryFn: () => apiFetch(`${API_BASE}/${currentSlot}/charts/clients`),
    enabled: Boolean(currentSlot),
    refetchInterval: POLL_INTERVAL_MS,
  })

  const activityChartQuery = useQuery({
    queryKey: ['charts', currentSlot, 'activity'],
    queryFn: () => apiFetch(`${API_BASE}/${currentSlot}/charts/activity`),
    enabled: Boolean(currentSlot),
    refetchInterval: POLL_INTERVAL_MS,
  })

  const bankState = bankQuery.data
  const clients = clientsQuery.data || []
  const clientDistribution = chartsClientsQuery.data?.clients || []
  const activityData = activityChartQuery.data
  const availableProducts = productsQuery.data || []

  const chartLabels = clientDistribution.map((client) => client.name.substring(0, 15))
  const chartBalances = clientDistribution.map((client) => client.balance)
  const activityRangeOption = useMemo(
    () => ACTIVITY_RANGE_OPTIONS.find((option) => option.id === activityRange) || ACTIVITY_RANGE_OPTIONS[0],
    [activityRange],
  )

  const activitySeries = useMemo(() => {
    const days = activityData?.days || []
    const deposits = activityData?.cumulativeDeposits || []
    const withdrawals = activityData?.cumulativeWithdrawals || []
    if (!days.length) {
      return { labels: [], deposits: [], withdrawals: [] }
    }
    const windowSize = activityRangeOption.months
      ? Math.min(activityRangeOption.months, days.length)
      : days.length
    const startIndex = Math.max(0, days.length - windowSize)
    const sliceDays = days.slice(startIndex)
    return {
      labels: sliceDays.map((dayNumber, index) =>
        formatActivityLabel(dayNumber, index, activityRangeOption.months),
      ),
      deposits: deposits.slice(startIndex),
      withdrawals: withdrawals.slice(startIndex),
    }
  }, [activityData, activityRangeOption])

  const handleActivityRangeSelect = (optionId) => {
    setActivityRange(optionId)
    setIsActivityMenuOpen(false)
  }

  const totalClientFunds = useMemo(() => {
    return clients.reduce((sum, client) => sum + Number(client?.checkingBalance || 0), 0)
  }, [clients])

  const availablePropertyValue = useMemo(() => {
    return availableProducts.reduce((sum, property) => sum + Number(property?.price || 0), 0)
  }, [availableProducts])

  const investedSp500Value = Number(bankState?.investedSp500 ?? 0)
  const combinedLiquidCash = Number(bankState?.liquidCash || 0) + totalClientFunds
  const dashboardTotalAssets = availablePropertyValue + investedSp500Value

  // Keep a live "now" ticker so the game clock and countdown update without waiting for polls.
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 500)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!isActivityMenuOpen) return
      if (activityMenuRef.current && !activityMenuRef.current.contains(event.target)) {
        setIsActivityMenuOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsActivityMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isActivityMenuOpen])

  const gameDayNow = useMemo(() => {
    if (!bankState || !bankQuery.dataUpdatedAt) return null
    const baseGameDay = Number(bankState.gameDay || 0)
    const elapsedMs = Math.max(0, nowMs - bankQuery.dataUpdatedAt)
    return baseGameDay + elapsedMs / REAL_MS_PER_GAME_DAY
  }, [bankState, bankQuery.dataUpdatedAt, nowMs])

  const secondsUntilNextMonth = useMemo(() => {
    if (gameDayNow === null) return null
    const fractionalDay = gameDayNow - Math.floor(gameDayNow)
    const remainingMs = Math.max(0, (1 - fractionalDay) * REAL_MS_PER_GAME_DAY)
    return Math.ceil(remainingMs / 1000)
  }, [gameDayNow])

  const displayGameDay = gameDayNow ?? bankState?.gameDay ?? null

  return (
    <div id="bank-view-screen" className="screen active">
      <Panel>
        <div className="bank-content">
          <h2 className="bw-header">ALKI corp.</h2>
          <div className="bank-hero mb-4">
            <div className="bank-stats">
              <div className="bank-stat">
                <span className="bank-stat-label">Liquid Cash:</span>
                <span className="bank-stat-value" id="bank-liquid-cash">
                  ${formatCurrency(combinedLiquidCash)}
                </span>
              </div>
              <div className="bank-stat">
                <span className="bank-stat-label">Total Funds in Client Accounts:</span>
                <span className="bank-stat-value" id="bank-client-funds">
                  ${formatCurrency(totalClientFunds)}
                </span>
              </div>
              <div className="bank-stat">
                <span className="bank-stat-label">Invested:</span>
                <span className="bank-stat-value" id="bank-invested-amount">
                  ${formatCurrency(bankState?.investedSp500 || 0)}
                </span>
              </div>
              <div className="bank-stat bank-stat-total">
                <span className="bank-stat-label">Total Assets:</span>
                <span className="bank-stat-value" id="bank-total-assets">
                  ${formatCurrency(dashboardTotalAssets)}
                </span>
              </div>
              <div className="bank-stat bank-date-row">
                <span className="bank-stat-label">Date:</span>
                <span className="bank-date-value">
                  {displayGameDay !== null ? getGameDateString(displayGameDay) : '---'} • Next month in {secondsUntilNextMonth ?? '--'}s
                </span>
              </div>
            </div>
          </div>

          <div className="clients-header">
            <h3 className="text-sm font-semibold mb-2 border-t pt-2 uppercase flex items-center gap-2">
              <span className="header-icon">👥</span> Clients
            </h3>
            <Link className="bw-button" to="/clients/new">
              <span className="btn-icon">👤</span> Add New Client
            </Link>
          </div>
          <div id="client-list" className="mb-4 max-h-32 overflow-y-auto border p-2 rounded bg-gray-100">
            {!clients.length && <p className="text-xs text-gray-500">No clients yet.</p>}
            {[...clients]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((client) => (
                <div
                  key={client.id}
                  className="flex justify-between items-center text-xs p-2 hover:bg-gray-200 cursor-pointer rounded border border-transparent hover:border-gray-500"
                  onClick={() => {
                    setSelectedClientId(client.id)
                    navigate(`/clients/${client.id}`)
                  }}
                >
                  <span>{client.name}</span>
                  <span>Bal: ${formatCurrency(client.checkingBalance)}</span>
                </div>
              ))}
          </div>

          <h3 className="text-sm font-semibold mb-2 border-t pt-2 uppercase flex items-center gap-2">
            <span className="header-icon">📈</span> Analytics
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="chart-container">
                <ClientMoneyChart labels={chartLabels} values={chartBalances} />
              </div>
              <p className="chart-title">Client Deposits</p>
            </div>
            <div>
              <div className="chart-controls">
                <div className="hud-menu chart-range-menu" ref={activityMenuRef}>
                  <button
                    className="bw-button chart-range-toggle"
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={isActivityMenuOpen}
                    onClick={() => setIsActivityMenuOpen((open) => !open)}
                  >
                    <span>{activityRangeOption.label}</span>
                    <span className="dropdown-arrow">{isActivityMenuOpen ? '▲' : '▼'}</span>
                  </button>
                  <div
                    className={`hud-menu-panel chart-range-panel ${isActivityMenuOpen ? 'open' : ''}`}
                    role="listbox"
                    aria-label="Activity range"
                  >
                    {ACTIVITY_RANGE_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={`bw-button hud-menu-item chart-range-item${option.id === activityRange ? ' active' : ''}`}
                        role="option"
                        aria-selected={option.id === activityRange}
                        onClick={() => handleActivityRangeSelect(option.id)}
                      >
                        <span className="chart-range-label">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="chart-container">
                <ActivityChart
                  labels={activitySeries.labels}
                  deposits={activitySeries.deposits}
                  withdrawals={activitySeries.withdrawals}
                />
              </div>
              <p className="chart-title">Activity Over Time</p>
            </div>
          </div>
        </div>

        <div className="bank-action-bar" aria-label="Primary bank actions">
          <Link className="bw-button bank-action" to="/investment">
            <span className="btn-icon">⚙️</span> Manage Investments
          </Link>
          <Link className="bw-button bank-action" to="/applications">
            <span className="btn-icon">🧰</span> Applications
          </Link>
          {adminStatus && (
            <Link className="bw-button bank-action" to="/admin/products">
              <span className="btn-icon">🛠</span> Add/Edit Products
            </Link>
          )}
        </div>
      </Panel>
    </div>
  )
}
