import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../providers/AuthProvider.jsx'
import { useSlot } from '../providers/SlotProvider.jsx'

export default function AppLayout() {
  const { userLabel, logout, adminStatus } = useAuth()
  const { currentSlot, setCurrentSlot, setSelectedClientId } = useSlot()
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div className="app-shell">
      <header className="hud simple-hud">
        <div className="hud-left">
          <span className="hud-brand" role="img" aria-label="bank">
            🏦
          </span>
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
        <div className="hud-right">
          <span className="text-xs text-gray-600">{userLabel ? `User: ${userLabel}` : ''}</span>
          <span className="text-xs text-gray-600 ml-2">{currentSlot ? `Slot ${currentSlot}` : 'No slot'}</span>
          <button
            className="bw-button ml-3"
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
