import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, setUnauthorizedHandler } from './api.js'
import {
  API_BASE,
  DAILY_WITHDRAWAL_LIMIT,
  DAYS_PER_YEAR,
  POLL_INTERVAL_MS,
  STORAGE_KEYS,
} from './constants.js'
import { ActivityChart, ClientMoneyChart } from './components/Charts.jsx'
import { formatCurrency, getGameDateString, getUserLabel } from './utils.js'

const DEFAULT_SCREEN = 'login'
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
  if (!rangeMonths || rangeMonths >= DAYS_PER_YEAR) {
    return getGameDateString(dayNumber)
  }
  if (rangeMonths >= 6) {
    return `M${(dayNumber % DAYS_PER_YEAR) + 1}`
  }
  return `D${index + 1}`
}

function App() {
  const initialToken = localStorage.getItem(STORAGE_KEYS.authToken)
  const [token, setToken] = useState(initialToken)
  const [adminStatus, setAdminStatus] = useState(
    localStorage.getItem(STORAGE_KEYS.adminStatus) === 'true',
  )
  const [screen, setScreen] = useState(
    localStorage.getItem(STORAGE_KEYS.screen) || (initialToken ? 'home' : DEFAULT_SCREEN),
  )
  const [currentSlot, setCurrentSlot] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.slot)
    return saved ? Number(saved) : null
  })
  const [selectedClientId, setSelectedClientId] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.clientId)
    return saved ? Number(saved) : null
  })
  const [showRegister, setShowRegister] = useState(false)
  const [saveVisible, setSaveVisible] = useState(false)
  const [hudMenuOpen, setHudMenuOpen] = useState(false)
  const [activityMenuOpen, setActivityMenuOpen] = useState(false)
  const [showClientsModal, setShowClientsModal] = useState(false)

  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [registerUsername, setRegisterUsername] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerConfirm, setRegisterConfirm] = useState('')
  const [registerAdminStatus, setRegisterAdminStatus] = useState(false)
  const [clientName, setClientName] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [investAmount, setInvestAmount] = useState('')
  const [divestAmount, setDivestAmount] = useState('')
  const [loginError, setLoginError] = useState('')
  const [registerError, setRegisterError] = useState('')
  const [clientError, setClientError] = useState('')
  const [addClientError, setAddClientError] = useState('')
  const [investmentError, setInvestmentError] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [activityRange, setActivityRange] = useState('all')

  const hudMenuRef = useRef(null)
  const activityMenuRef = useRef(null)
  const saveTimerRef = useRef(null)
  const queryClient = useQueryClient()

  const clearSession = useCallback(() => {
    setToken(null)
    setCurrentSlot(null)
    setSelectedClientId(null)
    setScreen(DEFAULT_SCREEN)
    setHudMenuOpen(false)
    setAdminStatus(false)
    localStorage.removeItem(STORAGE_KEYS.authToken)
    localStorage.removeItem(STORAGE_KEYS.adminStatus)
    localStorage.removeItem(STORAGE_KEYS.slot)
    localStorage.removeItem(STORAGE_KEYS.clientId)
    localStorage.removeItem(STORAGE_KEYS.screen)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession()
      setLoginError('Session expired. Please log in again.')
    })
  }, [clearSession])

  useEffect(() => {
    if (!token) {
      setScreen(DEFAULT_SCREEN)
      return
    }
    const savedScreen = localStorage.getItem(STORAGE_KEYS.screen)
    const savedSlot = localStorage.getItem(STORAGE_KEYS.slot)
    const savedClientId = localStorage.getItem(STORAGE_KEYS.clientId)
    if (savedSlot) {
      setCurrentSlot(Number(savedSlot))
    }
    if (savedClientId) {
      setSelectedClientId(Number(savedClientId))
    }
    if (savedScreen && savedScreen !== DEFAULT_SCREEN) {
      setScreen(savedScreen)
    } else {
      setScreen(savedSlot ? 'bank' : 'home')
    }
  }, [token])

  useEffect(() => {
    if (token) {
      localStorage.setItem(STORAGE_KEYS.authToken, token)
    } else {
      localStorage.removeItem(STORAGE_KEYS.authToken)
    }
  }, [token])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.adminStatus, String(adminStatus))
  }, [adminStatus])

  useEffect(() => {
    if (currentSlot) {
      localStorage.setItem(STORAGE_KEYS.slot, String(currentSlot))
    } else {
      localStorage.removeItem(STORAGE_KEYS.slot)
    }
  }, [currentSlot])

  useEffect(() => {
    if (selectedClientId) {
      localStorage.setItem(STORAGE_KEYS.clientId, String(selectedClientId))
    } else {
      localStorage.removeItem(STORAGE_KEYS.clientId)
    }
  }, [selectedClientId])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.screen, screen)
  }, [screen])

  useEffect(() => {
    const handleClick = (event) => {
      const clickedHudMenu = hudMenuRef.current?.contains(event.target)
      const clickedActivityMenu = activityMenuRef.current?.contains(event.target)
      if (!clickedHudMenu) {
        setHudMenuOpen(false)
      }
      if (!clickedActivityMenu) {
        setActivityMenuOpen(false)
      }
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setHudMenuOpen(false)
        setActivityMenuOpen(false)
        setShowClientsModal(false)
      }
    }
    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [])

  const triggerSaveIndicator = useCallback(() => {
    setSaveVisible(true)
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    saveTimerRef.current = setTimeout(() => {
      setSaveVisible(false)
    }, 800)
  }, [])

  const userLabel = useMemo(() => getUserLabel(token), [token])
  const isAdmin = adminStatus === true

  const shouldPollBank = screen === 'bank' || screen === 'client' || screen === 'investment'
  const shouldPollClients = screen === 'bank' || screen === 'client'
  const shouldPollCharts = screen === 'bank'

  const slotsQuery = useQuery({
    queryKey: ['slots'],
    queryFn: () => apiFetch(API_BASE),
    enabled: Boolean(token),
  })

  const bankStateQuery = useQuery({
    queryKey: ['bank', currentSlot],
    queryFn: () => apiFetch(`${API_BASE}/${currentSlot}/bank`),
    enabled: Boolean(token && currentSlot),
    refetchInterval: shouldPollBank ? POLL_INTERVAL_MS : false,
  })

  const clientsQuery = useQuery({
    queryKey: ['clients', currentSlot],
    queryFn: () => apiFetch(`${API_BASE}/${currentSlot}/clients`),
    enabled: Boolean(token && currentSlot),
    refetchInterval: shouldPollClients ? POLL_INTERVAL_MS : false,
  })

  const transactionsQuery = useQuery({
    queryKey: ['transactions', currentSlot, selectedClientId],
    queryFn: () =>
      apiFetch(`${API_BASE}/${currentSlot}/clients/${selectedClientId}/transactions`),
    enabled: Boolean(token && currentSlot && selectedClientId && screen === 'client'),
    refetchInterval: screen === 'client' ? POLL_INTERVAL_MS : false,
  })

  const investmentQuery = useQuery({
    queryKey: ['investment', currentSlot],
    queryFn: () => apiFetch(`${API_BASE}/${currentSlot}/investments/sp500`),
    enabled: Boolean(token && currentSlot && screen === 'investment'),
    refetchInterval: screen === 'investment' ? POLL_INTERVAL_MS : false,
  })

  const clientDistributionQuery = useQuery({
    queryKey: ['charts', currentSlot, 'clients'],
    queryFn: () => apiFetch(`${API_BASE}/${currentSlot}/charts/clients`),
    enabled: Boolean(token && currentSlot && screen === 'bank'),
    refetchInterval: shouldPollCharts ? POLL_INTERVAL_MS : false,
  })

  const activityChartQuery = useQuery({
    queryKey: ['charts', currentSlot, 'activity'],
    queryFn: () => apiFetch(`${API_BASE}/${currentSlot}/charts/activity`),
    enabled: Boolean(token && currentSlot && screen === 'bank'),
    refetchInterval: shouldPollCharts ? POLL_INTERVAL_MS : false,
  })

  const loginMutation = useMutation({
    mutationFn: ({ usernameOrEmail, password }) =>
      apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ usernameOrEmail, password }),
      }),
    onSuccess: (data) => {
      setToken(data.token)
      setAdminStatus(Boolean(data.adminStatus))
      setLoginPassword('')
      setLoginError('')
      setRegisterError('')
      setShowRegister(false)
    },
    onError: (error) => {
      setLoginError(error.message || 'Login failed.')
    },
  })

  const registerMutation = useMutation({
    mutationFn: ({ username, email, password, adminStatus }) =>
      apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password, adminStatus }),
      }),
    onSuccess: (data) => {
      setToken(data.token)
      setAdminStatus(Boolean(data.adminStatus))
      setRegisterPassword('')
      setRegisterConfirm('')
      setRegisterAdminStatus(false)
      setRegisterError('')
      setLoginError('')
      setShowRegister(false)
    },
    onError: (error) => {
      setRegisterError(error.message || 'Registration failed.')
    },
  })

  const startSlotMutation = useMutation({
    mutationFn: (slotId) => apiFetch(`${API_BASE}/${slotId}/start`, { method: 'POST' }),
    onSuccess: (data, slotId) => {
      setCurrentSlot(slotId)
      setSelectedClientId(null)
      setScreen('bank')
      queryClient.setQueryData(['bank', slotId], data)
      queryClient.invalidateQueries({ queryKey: ['slots'] })
      queryClient.invalidateQueries({ queryKey: ['clients', slotId] })
      queryClient.invalidateQueries({ queryKey: ['charts', slotId] })
      triggerSaveIndicator()
    },
  })

  const createClientMutation = useMutation({
    mutationFn: ({ slotId, name }) =>
      apiFetch(`${API_BASE}/${slotId}/clients`, {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      setClientName('')
      setAddClientError('')
      setScreen('bank')
      queryClient.invalidateQueries({ queryKey: ['clients', currentSlot] })
      queryClient.invalidateQueries({ queryKey: ['bank', currentSlot] })
      queryClient.invalidateQueries({ queryKey: ['charts', currentSlot] })
      triggerSaveIndicator()
    },
    onError: (error) => {
      setAddClientError(error.message)
    },
  })

  const depositMutation = useMutation({
    mutationFn: ({ slotId, clientId, amount }) =>
      apiFetch(`${API_BASE}/${slotId}/clients/${clientId}/deposit`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }),
    onSuccess: () => {
      setDepositAmount('')
      setClientError('')
      queryClient.invalidateQueries({ queryKey: ['clients', currentSlot] })
      queryClient.invalidateQueries({ queryKey: ['transactions', currentSlot, selectedClientId] })
      queryClient.invalidateQueries({ queryKey: ['bank', currentSlot] })
      queryClient.invalidateQueries({ queryKey: ['charts', currentSlot] })
      triggerSaveIndicator()
    },
    onError: (error) => {
      setClientError(error.message)
    },
  })

  const withdrawMutation = useMutation({
    mutationFn: ({ slotId, clientId, amount }) =>
      apiFetch(`${API_BASE}/${slotId}/clients/${clientId}/withdraw`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }),
    onSuccess: () => {
      setWithdrawAmount('')
      setClientError('')
      queryClient.invalidateQueries({ queryKey: ['clients', currentSlot] })
      queryClient.invalidateQueries({ queryKey: ['transactions', currentSlot, selectedClientId] })
      queryClient.invalidateQueries({ queryKey: ['bank', currentSlot] })
      queryClient.invalidateQueries({ queryKey: ['charts', currentSlot] })
      triggerSaveIndicator()
    },
    onError: (error) => {
      setClientError(error.message)
    },
  })

  const investMutation = useMutation({
    mutationFn: ({ slotId, amount }) =>
      apiFetch(`${API_BASE}/${slotId}/investments/sp500/invest`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }),
    onSuccess: () => {
      setInvestAmount('')
      setInvestmentError('')
      queryClient.invalidateQueries({ queryKey: ['investment', currentSlot] })
      queryClient.invalidateQueries({ queryKey: ['bank', currentSlot] })
      triggerSaveIndicator()
    },
    onError: (error) => {
      setInvestmentError(error.message)
    },
  })

  const divestMutation = useMutation({
    mutationFn: ({ slotId, amount }) =>
      apiFetch(`${API_BASE}/${slotId}/investments/sp500/divest`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }),
    onSuccess: () => {
      setDivestAmount('')
      setInvestmentError('')
      queryClient.invalidateQueries({ queryKey: ['investment', currentSlot] })
      queryClient.invalidateQueries({ queryKey: ['bank', currentSlot] })
      triggerSaveIndicator()
    },
    onError: (error) => {
      setInvestmentError(error.message)
    },
  })

  const slots = slotsQuery.data || []
  const bankState = bankStateQuery.data
  const clients = clientsQuery.data || []
  const transactions = transactionsQuery.data || []
  const investmentState = investmentQuery.data
  const clientDistribution = clientDistributionQuery.data?.clients || []
  const activityData = activityChartQuery.data

  const selectedClient = clients.find((client) => String(client.id) === String(selectedClientId))

  const hudDate = bankState ? getGameDateString(bankState.gameDay) : '---'
  const hudMode = useMemo(() => {
    if (screen === 'bank') return 'Bank Dashboard'
    if (screen === 'add-client') return 'Bank > Add Client'
    if (screen === 'client') return `Client > ${selectedClient?.name || ''}`
    if (screen === 'investment') return 'Bank > Investments'
    if (screen === 'products') return 'Bank > Client Products'
    if (screen === 'admin-products') return 'Bank > Admin Products'
    return '---'
  }, [screen, selectedClient])

  const handleStartSlot = (slotId) => {
    const summary = slots.find((slot) => slot.slotId === slotId)
    if (summary?.hasData) {
      const confirmed = window.confirm(
        `Slot ${slotId} has data. Start a new game and overwrite it?`,
      )
      if (!confirmed) return
    }
    startSlotMutation.mutate(slotId)
  }

  const handleLoadSlot = (slotId) => {
    setCurrentSlot(slotId)
    setSelectedClientId(null)
    setScreen('bank')
  }

  const handleLogout = () => {
    clearSession()
    setLoginPassword('')
    setRegisterPassword('')
    setRegisterConfirm('')
    setRegisterAdminStatus(false)
    setShowRegister(false)
  }

  const handleChooseSave = () => {
    setCurrentSlot(null)
    setSelectedClientId(null)
    setScreen('home')
  }

  const handleCancelAddClient = useCallback(() => {
    setScreen('bank')
  }, [])

  const handleRegisterClient = useCallback(() => {
    if (!currentSlot) return
    if (!clientName.trim()) {
      setAddClientError('Please enter the client name.')
      return
    }
    createClientMutation.mutate({ slotId: currentSlot, name: clientName.trim() })
  }, [clientName, createClientMutation, currentSlot])

  useEffect(() => {
    if (screen === 'client' && selectedClientId && !selectedClient) {
      setScreen('bank')
      setSelectedClientId(null)
    }
  }, [screen, selectedClientId, selectedClient])

  useEffect(() => {
    if (screen === 'admin-products' && !isAdmin) {
      setScreen('bank')
    }
  }, [isAdmin, screen])

  useEffect(() => {
    if (screen !== 'add-client') return
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        handleCancelAddClient()
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        if (!createClientMutation.isPending) {
          handleRegisterClient()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [createClientMutation.isPending, handleCancelAddClient, handleRegisterClient, screen])

  const handleDeposit = () => {
    if (!selectedClientId || !currentSlot) return
    const amount = Number(depositAmount)
    if (!amount || amount <= 0) {
      setClientError('Invalid deposit amount.')
      return
    }
    depositMutation.mutate({ slotId: currentSlot, clientId: selectedClientId, amount })
  }

  const handleWithdraw = () => {
    if (!selectedClientId || !currentSlot) return
    const amount = Number(withdrawAmount)
    if (!amount || amount <= 0) {
      setClientError('Invalid withdrawal amount.')
      return
    }
    withdrawMutation.mutate({ slotId: currentSlot, clientId: selectedClientId, amount })
  }

  const handleInvest = () => {
    if (!currentSlot) return
    const amount = Number(investAmount)
    if (!amount || amount <= 0) {
      setInvestmentError('Invalid investment amount.')
      return
    }
    investMutation.mutate({ slotId: currentSlot, amount })
  }

  const handleDivest = () => {
    if (!currentSlot) return
    const amount = Number(divestAmount)
    if (!amount || amount <= 0) {
      setInvestmentError('Invalid divestment amount.')
      return
    }
    divestMutation.mutate({ slotId: currentSlot, amount })
  }

  const handleLoginSubmit = (event) => {
    event.preventDefault()
    if (!loginUsername || !loginPassword) {
      setLoginError('Enter your username/email and password.')
      return
    }
    setLoginError('')
    loginMutation.mutate({ usernameOrEmail: loginUsername, password: loginPassword })
  }

  const handleRegisterSubmit = (event) => {
    event.preventDefault()
    if (!registerUsername || !registerEmail || !registerPassword || !registerConfirm) {
      setRegisterError('Fill out all fields to register.')
      return
    }
    if (registerPassword !== registerConfirm) {
      setRegisterError('Passwords do not match.')
      return
    }
    setRegisterError('')
    registerMutation.mutate({
      username: registerUsername,
      email: registerEmail,
      password: registerPassword,
      adminStatus: registerAdminStatus,
    })
  }

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

  const showHud = !['login', 'home'].includes(screen)

  return (
    <div className="aspect-ratio-container">
      <div className="game-screen">
        <div className="hud" id="game-hud" style={{ display: showHud ? 'flex' : 'none' }}>
          <div>
            <span>
              <span id="hud-mode">{hudMode}</span>
            </span>{' '}
            |{' '}
            <span>
              Date: <span id="hud-date">{hudDate}</span>
            </span>
            {isAdmin && (
              <span className="text-green-600 ml-2">Admin status = True</span>
            )}
          </div>
          <div>
            <span className={`save-indicator${saveVisible ? ' visible' : ''}`}>Saving...</span>
            <span className={`user-credential text-xs text-gray-600 ml-2${userLabel ? '' : ' hidden'}`}>
              {userLabel ? `User: ${userLabel}` : ''}
            </span>
            <button id="logout-button" className="bw-button" onClick={handleLogout}>
              <span className="btn-icon">🔒</span> Logout
            </button>
            <div id="hud-menu" className="hud-menu" ref={hudMenuRef}>
              <button
                id="hud-menu-button"
                className="bw-button"
                type="button"
                aria-expanded={hudMenuOpen}
                aria-haspopup="true"
                onClick={(event) => {
                  event.stopPropagation()
                  setHudMenuOpen((prev) => !prev)
                }}
              >
                <span className="btn-icon">📋</span> Menu
              </button>
              <div id="hud-menu-panel" className={`hud-menu-panel${hudMenuOpen ? ' open' : ''}`} role="menu">
                <button
                  id="hud-menu-home"
                  className="bw-button hud-menu-item"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setHudMenuOpen(false)
                    setScreen('bank')
                  }}
                >
                  <span className="btn-icon">🏦</span> Home
                </button>
                <button
                  id="hud-menu-choose-save"
                  className="bw-button hud-menu-item"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setHudMenuOpen(false)
                    handleChooseSave()
                  }}
                >
                  <span className="btn-icon">💾</span> Choose save file
                </button>
              </div>
            </div>
          </div>
        </div>

        <div id="login-screen" className={`screen ${screen === 'login' ? 'active' : ''}`}>
          <div className="bw-panel flex-grow flex flex-col justify-center items-center">
            <h1 className="bw-header mb-4">
              <span className="header-icon">🔐</span> Banking Sim Login
            </h1>
            <form id="login-form" className={`auth-form w-full max-w-xs ${showRegister ? 'hidden' : ''}`} onSubmit={handleLoginSubmit}>
              <label htmlFor="login-username-input" className="bw-label">
                Username or Email
              </label>
              <input
                type="text"
                id="login-username-input"
                className="bw-input"
                placeholder="Enter username or email"
                autoComplete="username"
                value={loginUsername}
                onChange={(event) => setLoginUsername(event.target.value)}
              />
              <label htmlFor="login-password-input" className="bw-label">
                Password
              </label>
              <input
                type={showLoginPassword ? 'text' : 'password'}
                id="login-password-input"
                className="bw-input"
                placeholder="Enter password"
                autoComplete="current-password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
              />
              <label className="password-toggle">
                <input
                  type="checkbox"
                  className="bw-checkbox"
                  checked={showLoginPassword}
                  onChange={(event) => setShowLoginPassword(event.target.checked)}
                />
                <span>Show password</span>
              </label>
              <p id="login-error-message" className="text-red-600 text-xs mt-2 text-center">
                {loginError}
              </p>
              <div className="flex justify-center mt-2">
                <button className="bw-button" type="submit" disabled={loginMutation.isPending}>
                  <span className="btn-icon">✅</span> Login
                </button>
              </div>
              <div className="text-center mt-2">
                <button
                  id="show-register-button"
                  className="bw-button"
                  type="button"
                  onClick={() => {
                    setShowRegister(true)
                  setRegisterAdminStatus(false)
                    setLoginError('')
                  }}
                >
                  <span className="btn-icon">🆕</span> Register
                </button>
              </div>
            </form>
            <form
              id="register-form"
              className={`auth-form w-full max-w-xs ${showRegister ? '' : 'hidden'}`}
              onSubmit={handleRegisterSubmit}
            >
              <label htmlFor="register-username-input" className="bw-label">
                Username
              </label>
              <input
                type="text"
                id="register-username-input"
                className="bw-input"
                placeholder="Choose a username"
                autoComplete="username"
                value={registerUsername}
                onChange={(event) => setRegisterUsername(event.target.value)}
              />
              <label htmlFor="register-email-input" className="bw-label">
                Email
              </label>
              <input
                type="email"
                id="register-email-input"
                className="bw-input"
                placeholder="Enter email address"
                autoComplete="email"
                value={registerEmail}
                onChange={(event) => setRegisterEmail(event.target.value)}
              />
              <label htmlFor="register-password-input" className="bw-label">
                Password
              </label>
              <input
                type={showRegisterPassword ? 'text' : 'password'}
                id="register-password-input"
                className="bw-input"
                placeholder="Create a password"
                autoComplete="new-password"
                value={registerPassword}
                onChange={(event) => setRegisterPassword(event.target.value)}
              />
              <label htmlFor="register-confirm-input" className="bw-label">
                Confirm Password
              </label>
              <input
                type={showRegisterPassword ? 'text' : 'password'}
                id="register-confirm-input"
                className="bw-input"
                placeholder="Confirm password"
                autoComplete="new-password"
                value={registerConfirm}
                onChange={(event) => setRegisterConfirm(event.target.value)}
              />
              <label className="password-toggle">
                <input
                  type="checkbox"
                  className="bw-checkbox"
                  checked={showRegisterPassword}
                  onChange={(event) => setShowRegisterPassword(event.target.checked)}
                />
                <span>Show password</span>
              </label>
              <label className="password-toggle">
                <input
                  type="checkbox"
                  className="bw-checkbox"
                  checked={registerAdminStatus}
                  onChange={(event) => setRegisterAdminStatus(event.target.checked)}
                />
                <span>Make new user admin</span>
              </label>
              <p id="register-error-message" className="text-red-600 text-xs mt-2 text-center">
                {registerError}
              </p>
              <div className="flex justify-center mt-2">
                <button className="bw-button" type="submit" disabled={registerMutation.isPending}>
                  <span className="btn-icon">📝</span> Create Account
                </button>
              </div>
              <div className="text-center mt-2">
                <button
                  id="show-login-button"
                  className="bw-button"
                  type="button"
                  onClick={() => {
                    setShowRegister(false)
                    setRegisterError('')
                  }}
                >
                  <span className="btn-icon">↩</span> Back to Login
                </button>
              </div>
            </form>
          </div>
        </div>

        <div id="home-screen" className={`screen ${screen === 'home' ? 'active' : ''}`}>
          <div className="bw-panel flex-grow flex flex-col justify-center items-center">
            <h1 className="bw-header mb-4">
              <span className="header-icon">🏦</span> Banking Sim <span className="header-icon">🏦</span>
            </h1>
            <div className="save-slots w-full max-w-xs">
              {slots.map((slot) => (
                <div className="slot" key={slot.slotId}>
                  <span className="slot-info" id={`slot-${slot.slotId}-info`}>
                    Slot {slot.slotId}: {slot.hasData ? `${getGameDateString(slot.gameDay)}, ${slot.clientCount} clients` : 'Empty'}
                  </span>
                  <div className="slot-actions">
                    <button className="bw-button" onClick={() => handleStartSlot(slot.slotId)}>
                      <span className="btn-icon">▶</span> New
                    </button>
                    <button className="bw-button" onClick={() => handleLoadSlot(slot.slotId)} disabled={!slot.hasData}>
                      <span className="btn-icon">📂</span> Load
                    </button>
                  </div>
                </div>
              ))}
              {!slots.length && (
                <div className="slot">
                  <span className="slot-info">Loading slots...</span>
                </div>
              )}
            </div>
            <div className="mt-3">
              <span className={`user-credential text-xs text-gray-600 mr-2${userLabel ? '' : ' hidden'}`}>
                {userLabel ? `User: ${userLabel}` : ''}
              </span>
              <button id="home-logout-button" className="bw-button" onClick={handleLogout}>
                <span className="btn-icon">🔒</span> Logout
              </button>
            </div>
          </div>
        </div>

        <div id="add-client-screen" className={`screen ${screen === 'add-client' ? 'active' : ''}`}>
          <div className="bw-panel">
            <h2 className="bw-header">
              <span className="header-icon">👤</span> New Client Registration
            </h2>
            <label htmlFor="client-name-input" className="bw-label">
              Client Name:
            </label>
            <input
              type="text"
              id="client-name-input"
              className="bw-input"
              placeholder="Enter client's full name"
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
            />
            <p className="text-xs text-gray-500 mb-4">
              Opens a checking account and issues a debit card.
            </p>
            <p className="text-red-600 text-xs mt-1 text-center">{addClientError}</p>
            <div className="flex justify-end gap-2">
              <button className="bw-button" onClick={handleCancelAddClient}>
                <span className="btn-icon">↩</span> Cancel
              </button>
              <button
                className="bw-button"
                onClick={handleRegisterClient}
                disabled={createClientMutation.isPending}
              >
                <span className="btn-icon">✔</span> Register Client
              </button>
            </div>
          </div>
        </div>

        <div id="client-view-screen" className={`screen ${screen === 'client' ? 'active' : ''}`}>
          <div className="bw-panel">
            <h2 className="bw-header">
              <span className="header-icon">💳</span> Client: <span id="client-view-name">{selectedClient?.name}</span>
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
                <p className="text-xs">
                  Number: <span id="client-view-card-number">{selectedClient?.cardNumber}</span>
                </p>
                <p className="text-xs">
                  Expires: <span id="client-view-card-expiry">{selectedClient?.cardExpiry}</span>
                </p>
                <p className="text-xs">
                  CVV: <span id="client-view-card-cvv">{selectedClient?.cardCvv}</span>
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 analytics-grid">
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
                <p className="text-xs text-gray-500 mb-1">
                  Limit: $<span id="client-view-withdraw-limit">{formatCurrency(DAILY_WITHDRAWAL_LIMIT)}</span> / Day
                </p>
                <button className="bw-button w-full" onClick={handleWithdraw} disabled={withdrawMutation.isPending}>
                  <span className="btn-icon">➖</span> Withdraw
                </button>
              </div>
            </div>
            <p id="client-error-message" className="text-red-600 text-xs mt-2 text-center">
              {clientError}
            </p>
            <div className="transaction-log">
              <h4>
                <span className="header-icon">📜</span> Transaction History
              </h4>
              <div id="client-log-area" className="log-area">
                {!transactions.length && <p className="text-xs text-gray-500">No transactions yet.</p>}
                {transactions.map((tx) => {
                  const typeClass = tx.type === 'DEPOSIT' ? 'log-type-deposit' : 'log-type-withdrawal'
                  const typeSymbol = tx.type === 'DEPOSIT' ? '➕' : '➖'
                  return (
                    <div className="log-entry" key={tx.id}>
                      <span className="text-gray-500">{getGameDateString(tx.gameDay)}:</span>{' '}
                      <span className={typeClass}>
                        {typeSymbol} {tx.type.charAt(0) + tx.type.slice(1).toLowerCase()}
                      </span>{' '}
                      <span>${formatCurrency(tx.amount)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <button className="bw-button mt-2 self-center" onClick={() => setScreen('bank')}>
            <span className="btn-icon">🏦</span> Back to Bank View
          </button>
        </div>

        <div id="bank-view-screen" className={`screen ${screen === 'bank' ? 'active' : ''}`}>
          <div className="bw-panel">
            <h2 className="bw-header">
              <span className="header-icon">💴</span> ALKI corp.
            </h2>
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm">
                <p>
                  Liquid Cash: $<span id="bank-liquid-cash">{formatCurrency(bankState?.liquidCash || 0)}</span>
                </p>
                <p>
                  Invested: $<span id="bank-invested-amount">{formatCurrency(bankState?.investedSp500 || 0)}</span>
                </p>
                <p className="font-semibold">
                  Total Assets: $<span id="bank-total-assets">{formatCurrency(bankState?.totalAssets || 0)}</span>
                </p>
              </div>
              <button className="bw-button" onClick={() => setScreen('add-client')}>
                <span className="btn-icon">👤</span> Add New Client
              </button>
            </div>

            <h3 className="text-sm font-semibold mb-2 border-t pt-2 uppercase flex items-center gap-2">
              <span className="header-icon">👥</span> Clients
              <button
                className="bw-button"
                type="button"
                onClick={() => setShowClientsModal(true)}
              >
                View All
              </button>
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
                      setScreen('client')
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
                      aria-expanded={activityMenuOpen}
                      aria-haspopup="true"
                      onClick={(event) => {
                        event.stopPropagation()
                        setActivityMenuOpen((prev) => !prev)
                      }}
                    >
                      <span className="chart-range-label">{activityRangeOption.label}</span>
                      <span className="dropdown-arrow" aria-hidden="true">
                        ▾
                      </span>
                    </button>
                    <div
                      className={`hud-menu-panel chart-range-panel${activityMenuOpen ? ' open' : ''}`}
                      role="menu"
                    >
                      {ACTIVITY_RANGE_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          className="bw-button hud-menu-item chart-range-item"
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setActivityRange(option.id)
                            setActivityMenuOpen(false)
                          }}
                        >
                          {option.label}
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

            <h3 className="text-sm font-semibold mb-2 border-t pt-2 uppercase flex items-center gap-2">
              <span className="header-icon">💰</span> Investments
            </h3>
            <div className="flex justify-center gap-2">
              <button className="bw-button" onClick={() => setScreen('investment')}>
                <span className="btn-icon">⚙️</span> Manage Investments
              </button>
              <button className="bw-button" onClick={() => setScreen('products')}>
                <span className="btn-icon">🧰</span> Manage Client Products
              </button>
              {isAdmin && (
                <button className="bw-button" onClick={() => setScreen('admin-products')}>
                  <span className="btn-icon">🛠</span> Add/Edit Products
                </button>
              )}
            </div>
          </div>
        </div>

        {screen === 'bank' && showClientsModal && (
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="All clients"
            onClick={() => setShowClientsModal(false)}
          >
            <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
              <button
                className="bw-button modal-close"
                type="button"
                onClick={() => setShowClientsModal(false)}
              >
                Close
              </button>
              <h3 className="text-sm font-semibold mb-2 uppercase flex items-center gap-2 modal-header">
                <span className="header-icon">👥</span> Clients
              </h3>
              <div className="modal-client-list border p-2 rounded bg-gray-100">
                {!clients.length && <p className="text-xs text-gray-500">No clients yet.</p>}
                {[...clients]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((client) => (
                    <div
                      key={client.id}
                      className="flex justify-between items-center text-xs p-2 hover:bg-gray-200 cursor-pointer rounded border border-transparent hover:border-gray-500"
                      onClick={() => {
                        setSelectedClientId(client.id)
                        setScreen('client')
                        setShowClientsModal(false)
                      }}
                    >
                      <span>{client.name}</span>
                      <span>Bal: ${formatCurrency(client.checkingBalance)}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        <div id="investment-view-screen" className={`screen ${screen === 'investment' ? 'active' : ''}`}>
          <div className="bw-panel">
            <h2 className="bw-header">
              <span className="header-icon">💼</span> Investment Portfolio
            </h2>
            <p className="text-sm mb-2 text-center">
              Bank Liquid Cash: $<span id="invest-view-liquid-cash">{formatCurrency(investmentState?.liquidCash || 0)}</span>
            </p>
            <div className="border p-3 rounded bg-gray-100 mb-4">
              <h3 className="font-semibold text-center mb-2">S&P 500 Index Fund</h3>
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
                <button className="bw-button" onClick={handleInvest} disabled={investMutation.isPending}>
                  <span className="btn-icon">📈</span> Invest
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
                <button className="bw-button" onClick={handleDivest} disabled={divestMutation.isPending}>
                  <span className="btn-icon">📉</span> Divest
                </button>
              </div>
              <p id="investment-error-message" className="text-red-600 text-xs mt-2 text-center">
                {investmentError}
              </p>
            </div>

            <button className="bw-button mt-2 self-center" onClick={() => setScreen('bank')}>
              <span className="btn-icon">🏦</span> Back to Bank View
            </button>
          </div>
        </div>

        <div id="products-view-screen" className={`screen ${screen === 'products' ? 'active' : ''}`}>
          <div className="bw-panel">
            <h2 className="bw-header">
              <span className="header-icon">🧰</span> Manage Client Products
            </h2>
            <p className="text-sm mb-2 text-center">Client products dashboard coming soon.</p>
            <button className="bw-button mt-2 self-center" onClick={() => setScreen('bank')}>
              <span className="btn-icon">🏦</span> Back to Bank View
            </button>
          </div>
        </div>
        <div
          id="admin-products-view-screen"
          className={`screen ${screen === 'admin-products' ? 'active' : ''}`}
        >
          <div className="bw-panel">
            <h2 className="bw-header">
              <span className="header-icon">🛠</span> Add/Edit Products
            </h2>
            <button className="bw-button mt-2 self-center" onClick={() => setScreen('bank')}>
              <span className="btn-icon">🏦</span> Back to Bank View
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
