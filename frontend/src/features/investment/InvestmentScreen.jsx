import { useState, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import Panel from '../../components/Panel.jsx'
import { useSlot } from '../../providers/SlotProvider.jsx'
import { useInvestments } from '../../hooks/useInvestments.js'
import { useBank } from '../../hooks/useBank.js'
import { useClients } from '../../hooks/useClients.js'
import { apiFetch } from '../../api.js'
import { API_BASE } from '../../constants.js'
import { formatCurrency, getGameDateString } from '../../utils.js'

export default function InvestmentScreen() {
  const { currentSlot } = useSlot()
  const queryClient = useQueryClient()
  const investmentQuery = useInvestments(currentSlot, true)
  const bankQuery = useBank(currentSlot, false)
  const clientsQuery = useClients(currentSlot, false)
  const [investAmount, setInvestAmount] = useState('')
  const [divestAmount, setDivestAmount] = useState('')
  const [error, setError] = useState('')

  const investMutation = useMutation({
    mutationFn: ({ slotId, amount }) =>
      apiFetch(`${API_BASE}/${slotId}/investments/sp500/invest`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }),
    onSuccess: () => {
      setInvestAmount('')
      setError('')
      queryClient.invalidateQueries({ queryKey: ['investment', currentSlot] })
      queryClient.invalidateQueries({ queryKey: ['bank', currentSlot] })
    },
    onError: (err) => setError(err.message),
  })

  const divestMutation = useMutation({
    mutationFn: ({ slotId, amount }) =>
      apiFetch(`${API_BASE}/${slotId}/investments/sp500/divest`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }),
    onSuccess: () => {
      setDivestAmount('')
      setError('')
      queryClient.invalidateQueries({ queryKey: ['investment', currentSlot] })
      queryClient.invalidateQueries({ queryKey: ['bank', currentSlot] })
    },
    onError: (err) => setError(err.message),
  })

  const clients = clientsQuery.data || []
  const totalClientFunds = useMemo(
    () => clients.reduce((sum, client) => sum + Number(client?.checkingBalance || 0), 0),
    [clients],
  )
  const bankState = bankQuery.data
  const combinedLiquidCash = Number(bankState?.liquidCash || 0) + totalClientFunds
  const investmentState = investmentQuery.data

  return (
    <div id="investment-view-screen" className="screen active">
      <Panel>
        <h2 className="bw-header">Investment Portfolio</h2>
        <p className="text-sm mb-2 text-center">
          Bank Liquid Cash: $<span id="invest-view-liquid-cash">{formatCurrency(combinedLiquidCash)}</span>
        </p>
        <div className="border p-3 rounded bg-gray-100 mb-4">
          <h3 className="font-semibold text-center mb-2">S&amp;P 500 Index Fund</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
            <span>
              Value: $<span id="sp500-current-value">{formatCurrency(investmentState?.sp500Price || 0)}</span>
            </span>
            <span>
              Holdings: $<span id="sp500-holdings">{formatCurrency(investmentState?.investedSp500 || 0)}</span>
            </span>
            <span>Growth (Ann.): 10%</span>
            <span>Dividend (Ann.): 3%</span>
            <span>
              Next Dividend: <span id="sp500-next-dividend">{getGameDateString(investmentState?.nextDividendDay)}</span>
            </span>
            <span>
              Next Growth: <span id="sp500-next-growth">{getGameDateString(investmentState?.nextGrowthDay)}</span>
            </span>
          </div>

          <div className="flex gap-2 mt-3 items-end">
            <div className="flex-grow">
              <label htmlFor="invest-amount" className="bw-label">
                Invest:
              </label>
              <input
                type="number"
                id="invest-amount"
                className="bw-input"
                placeholder="Amount"
                min="0"
                step="0.01"
                value={investAmount}
                onChange={(event) => setInvestAmount(event.target.value)}
              />
            </div>
            <button
              className="bw-button"
              onClick={() => {
                if (!investAmount || Number(investAmount) <= 0) {
                  setError('Please enter a valid investment amount.');
                  return;
                }
                investMutation.mutate({ slotId: currentSlot, amount: Number(investAmount) });
              }}
              disabled={investMutation.isPending || !investAmount || Number(investAmount) <= 0}
            >
              <span className="btn-icon">{investMutation.isPending ? '⏳' : '📈'}</span> {investMutation.isPending ? 'Investing...' : 'Invest'}
            </button>
          </div>
          <div className="flex gap-2 mt-1 items-end">
            <div className="flex-grow">
              <label htmlFor="divest-amount" className="bw-label">
                Divest:
              </label>
              <input
                type="number"
                id="divest-amount"
                className="bw-input"
                placeholder="Amount"
                min="0"
                step="0.01"
                value={divestAmount}
                onChange={(event) => setDivestAmount(event.target.value)}
              />
            </div>
            <button
              className="bw-button"
              onClick={() => {
                if (!divestAmount || Number(divestAmount) <= 0) {
                  setError('Please enter a valid divestment amount.');
                  return;
                }
                divestMutation.mutate({ slotId: currentSlot, amount: Number(divestAmount) });
              }}
              disabled={divestMutation.isPending || !divestAmount || Number(divestAmount) <= 0}
            >
              <span className="btn-icon">{divestMutation.isPending ? '⏳' : '📉'}</span> {divestMutation.isPending ? 'Divesting...' : 'Divest'}
            </button>
          </div>
          <p id="investment-error-message" className="text-red-600 text-xs mt-2 text-center">
            {error}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="border p-3 rounded bg-gray-100">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <span className="btn-icon">🧾</span> Investment History
            </h3>
            {!investmentState?.history?.length && <p className="text-xs text-gray-500">No investment events yet.</p>}
            <ul className="text-xs max-h-48 overflow-y-auto space-y-1">
              {investmentState?.history?.map((event, idx) => (
                <li key={`${event.createdAt}-${idx}`} className="flex justify-between border-b pb-1">
                  <span className="font-semibold">{event.type}</span>
                  <span>${formatCurrency(Number(event.amount))} • {event.asset} • {getGameDateString(event.gameDay)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border p-3 rounded bg-gray-100">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <span className="btn-icon">💵</span> Repayment Income
            </h3>
            <div className="text-xs grid grid-cols-2 gap-2 mb-2">
              <div className="p-2 rounded bg-white border">
                <p className="text-gray-500">This month</p>
                <p className="font-semibold">${formatCurrency(Number(investmentState?.repaymentIncomeCurrentMonth || 0))}</p>
              </div>
              <div className="p-2 rounded bg-white border">
                <p className="text-gray-500">All time</p>
                <p className="font-semibold">${formatCurrency(Number(investmentState?.repaymentIncomeTotal || 0))}</p>
              </div>
            </div>
            {!investmentState?.repaymentIncome?.length && <p className="text-xs text-gray-500">No repayments recorded yet.</p>}
            <ul className="text-xs max-h-48 overflow-y-auto space-y-1">
              {investmentState?.repaymentIncome?.map((item, idx) => (
                <li key={`${item.createdAt}-${idx}`} className="flex justify-between border-b pb-1">
                  <span className="font-semibold">{item.clientName}</span>
                  <span>
                    ${formatCurrency(Number(item.amount))} • {item.type} • {getGameDateString(item.gameDay)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Link className="bw-button mt-2 self-center inline-block" to="/bank">
          <span className="btn-icon">🏦</span> Back to Bank View
        </Link>
      </Panel>
    </div>
  )
}
