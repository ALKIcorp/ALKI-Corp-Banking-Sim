import { useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { REAL_MS_PER_GAME_DAY } from '../constants.js'
import { useAuth } from '../providers/AuthProvider.jsx'
import { useSlot } from '../providers/SlotProvider.jsx'
import { useBank } from '../hooks/useBank.js'
import { getGameDateString } from '../utils.js'

export default function AppLayout() {
  const { userLabel, logout, adminStatus } = useAuth()
  const { currentSlot, setCurrentSlot, setSelectedClientId } = useSlot()
  const bankQuery = useBank(currentSlot, true)
  const bankState = bankQuery.data
  const location = useLocation()
  const navigate = useNavigate()

  // Keep the game date label fresh between polls.
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 500)
    return () => clearInterval(id)
  }, [])

  const displayGameDay = useMemo(() => {
    if (!bankState || !bankQuery.dataUpdatedAt) return bankState?.gameDay ?? null
    const baseGameDay = Number(bankState.gameDay || 0)
    const elapsedMs = Math.max(0, nowMs - bankQuery.dataUpdatedAt)
    return baseGameDay + elapsedMs / REAL_MS_PER_GAME_DAY
  }, [bankQuery.dataUpdatedAt, bankState, nowMs])

  const gameDateLabel = displayGameDay !== null ? getGameDateString(displayGameDay) : '---'

  return (
    <div className="app-shell">
      <header className="hud simple-hud">
        <div className="hud-left">
          <nav className="hud-nav">
            <Link className={location.pathname === '/home' ? 'active' : ''} to="/home">
              Home
            </Link>
            <Link className={location.pathname === '/bank' ? 'active' : ''} to="/bank">
              Bank
            </Link>
            <Link className={location.pathname.startsWith('/investment') ? 'active' : ''} to="/investment">
              Investment
            </Link>
            <Link className={location.pathname.startsWith('/applications') ? 'active' : ''} to="/applications">
              Applications
            </Link>
            <Link className={location.pathname.startsWith('/properties') ? 'active' : ''} to="/properties">
              Properties
            </Link>
            {adminStatus && (
              <Link className={location.pathname.startsWith('/admin') ? 'active' : ''} to="/admin/products">
                Admin
              </Link>
            )}
          </nav>
        </div>
        <div className="hud-center-logo">
          <Link className="hud-brand" to="/home" aria-label="home">
            <img src="/banksim_logo.png" alt="BankSim logo" className="hud-logo-image" />
          </Link>
        </div>
        <div className="hud-right">
          <span className="hud-date">{gameDateLabel}</span>
          <span className="hud-user">{userLabel ? `User: ${userLabel}` : 'User: —'}</span>
          <span className="hud-slot">{currentSlot ? `Slot ${currentSlot}` : ''}</span>
          <button
            className="bw-button hud-button"
            type="button"
            onClick={() => {
              logout()
              setCurrentSlot(null)
              setSelectedClientId(null)
              navigate('/login')
            }}
          >
            <span className="btn-icon">🔒</span> Logout
          </button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
