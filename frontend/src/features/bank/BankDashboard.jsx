import { useMemo, useState } from 'react'
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

  const totalClientFunds = useMemo(() => {
    return clients.reduce((sum, client) => sum + Number(client?.checkingBalance || 0), 0)
  }, [clients])

  const availablePropertyValue = useMemo(() => {
    return availableProducts.reduce((sum, property) => sum + Number(property?.price || 0), 0)
  }, [availableProducts])

  const investedSp500Value = Number(bankState?.investedSp500 ?? 0)
  const combinedLiquidCash = Number(bankState?.liquidCash || 0) + totalClientFunds
  const dashboardTotalAssets = availablePropertyValue + investedSp500Value

  const gameDayNow = useMemo(() => {
    if (!bankState || !bankQuery.dataUpdatedAt) return null
    const baseGameDay = Number(bankState.gameDay || 0)
    const elapsedMs = Math.max(0, Date.now() - bankQuery.dataUpdatedAt)
    return baseGameDay + elapsedMs / REAL_MS_PER_GAME_DAY
  }, [bankState, bankQuery.dataUpdatedAt])

  const secondsUntilNextMonth = useMemo(() => {
    if (gameDayNow === null) return null
    const fractionalDay = gameDayNow - Math.floor(gameDayNow)
    const remainingMs = Math.max(0, (1 - fractionalDay) * REAL_MS_PER_GAME_DAY)
    return Math.ceil(remainingMs / 1000)
  }, [gameDayNow])

  return (
    <div id="bank-view-screen" className="screen active">
      <Panel>
        <h2 className="bw-header">ALKI corp.</h2>
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm">
            <p>
              Liquid Cash: $<span id="bank-liquid-cash">{formatCurrency(combinedLiquidCash)}</span>
            </p>
            <p>
              Total Funds in Client Accounts: $<span id="bank-client-funds">{formatCurrency(totalClientFunds)}</span>
            </p>
            <p>
              Invested: $<span id="bank-invested-amount">{formatCurrency(bankState?.investedSp500 || 0)}</span>
            </p>
            <p className="font-semibold">
              Total Assets: $<span id="bank-total-assets">{formatCurrency(dashboardTotalAssets)}</span>
            </p>
            <p className="text-xs text-gray-600">
              Date: {bankState ? getGameDateString(bankState.gameDay) : '---'} • Next month in {secondsUntilNextMonth ?? '--'}s
            </p>
          </div>
          <div className="flex gap-2">
            <Link className="bw-button" to="/clients/new">
              <span className="btn-icon">👤</span> Add New Client
            </Link>
            <Link className="bw-button" to="/investment">
              <span className="btn-icon">⚙️</span> Manage Investments
            </Link>
            <Link className="bw-button" to="/applications">
              <span className="btn-icon">🧰</span> Applications
            </Link>
            {adminStatus && (
              <Link className="bw-button" to="/admin/products">
                <span className="btn-icon">🛠</span> Add/Edit Products
              </Link>
            )}
          </div>
        </div>

        <h3 className="text-sm font-semibold mb-2 border-t pt-2 uppercase flex items-center gap-2">
          <span className="header-icon">👥</span> Clients
        </h3>
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
              <div className="hud-menu chart-range-menu">
                <button
                  className="bw-button chart-range-toggle"
                  type="button"
                  onClick={() => {
                    const next = ACTIVITY_RANGE_OPTIONS[(ACTIVITY_RANGE_OPTIONS.findIndex((o) => o.id === activityRange) + 1) % ACTIVITY_RANGE_OPTIONS.length]
                    setActivityRange(next.id)
                  }}
                >
                  {activityRangeOption.label}
                </button>
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
      </Panel>
    </div>
  )
}
