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
const INSUFFICIENT_MORTGAGE_FUNDS_MESSAGE = 'Not enough funds to purchase property.'
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

function normalizeMortgageRate(rate) {
  const value = Number(rate)
  if (!Number.isFinite(value)) return 0
  return value > 1 ? value / 100 : value
}

function calculateMonthlyPayment({ principal, termYears, interestRate }) {
  const principalValue = Number(principal || 0)
  const years = Number(termYears || 0)
  const rate = normalizeMortgageRate(interestRate)
  if (!principalValue || !years) return null
  const months = years * 12
  const monthlyRate = rate / 12
  if (!monthlyRate) return principalValue / months
  const factor = Math.pow(1 + monthlyRate, months)
  return (principalValue * monthlyRate * factor) / (factor - 1)
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
  const [showClientTransactionsModal, setShowClientTransactionsModal] = useState(false)
  const [showLoanModal, setShowLoanModal] = useState(false)
  const [showMortgageModal, setShowMortgageModal] = useState(false)
  const [showPropertyModal, setShowPropertyModal] = useState(false)
  const [showMortgageFundingModal, setShowMortgageFundingModal] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [mortgageFundingContext, setMortgageFundingContext] = useState(null)

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
  const [loanAmount, setLoanAmount] = useState('')
  const [loanTermYears, setLoanTermYears] = useState(15)
  const [mortgageTermYears, setMortgageTermYears] = useState(30)
  const [mortgageDownPayment, setMortgageDownPayment] = useState('')
  const [productName, setProductName] = useState('')
  const [productPrice, setProductPrice] = useState('')
  const [productDescription, setProductDescription] = useState('')
  const [productRooms, setProductRooms] = useState('')
  const [productSqft, setProductSqft] = useState('')
  const [productImageUrl, setProductImageUrl] = useState('')
  const [editingProductId, setEditingProductId] = useState(null)
  const [mortgageRateInput, setMortgageRateInput] = useState('')
  const [loginError, setLoginError] = useState('')
  const [registerError, setRegisterError] = useState('')
  const [clientError, setClientError] = useState('')
  const [addClientError, setAddClientError] = useState('')
  const [investmentError, setInvestmentError] = useState('')
  const [productError, setProductError] = useState('')
  const [loanApplicationError, setLoanApplicationError] = useState('')
  const [mortgageApplicationError, setMortgageApplicationError] = useState('')
  const [adminProductsError, setAdminProductsError] = useState('')
  const [mortgageFundingError, setMortgageFundingError] = useState('')
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
        setShowApplyOptions(false)
        setShowLoanModal(false)
        setShowMortgageModal(false)
        setShowPropertyModal(false)
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

  const shouldPollBank =
    screen === 'bank' || screen === 'client' || screen === 'investment' || screen === 'property-market'
  const shouldPollClients = screen === 'bank' || screen === 'client' || screen === 'products'
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

  const productsQuery = useQuery({
    queryKey: ['products', currentSlot],
    queryFn: () => apiFetch(`${API_BASE}/${currentSlot}/products`),
    enabled: Boolean(token && currentSlot),
  })

  const adminProductsQuery = useQuery({
    queryKey: ['products', currentSlot, 'admin'],
    queryFn: () => apiFetch(`${API_BASE}/${currentSlot}/products/all`),
    enabled: Boolean(token && currentSlot && isAdmin),
  })

  const loansQuery = useQuery({
    queryKey: ['loans', currentSlot],
    queryFn: () => apiFetch(`${API_BASE}/${currentSlot}/loans`),
    enabled: Boolean(token && currentSlot && screen === 'products'),
  })

  const mortgagesQuery = useQuery({
    queryKey: ['mortgages', currentSlot],
    queryFn: () => apiFetch(`${API_BASE}/${currentSlot}/mortgages`),
    enabled: Boolean(token && currentSlot && screen === 'products'),
  })

  const ownedPropertiesQuery = useQuery({
    queryKey: ['client-properties', currentSlot, selectedClientId],
    queryFn: () =>
      apiFetch(`${API_BASE}/${currentSlot}/clients/${selectedClientId}/properties`),
    enabled: Boolean(token && currentSlot && selectedClientId && screen === 'client'),
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

  const createLoanMutation = useMutation({
    mutationFn: ({ slotId, clientId, amount, termYears }) =>
      apiFetch(`${API_BASE}/${slotId}/clients/${clientId}/loans`, {
        method: 'POST',
        body: JSON.stringify({ amount, termYears }),
      }),
    onSuccess: () => {
      setLoanAmount('')
      setLoanApplicationError('')
      setShowLoanModal(false)
      queryClient.invalidateQueries({ queryKey: ['loans', currentSlot] })
      triggerSaveIndicator()
    },
    onError: (error) => {
      setLoanApplicationError(error.message)
    },
  })

  const createMortgageMutation = useMutation({
    mutationFn: ({ slotId, clientId, productId, termYears, downPayment }) =>
      apiFetch(`${API_BASE}/${slotId}/clients/${clientId}/mortgages`, {
        method: 'POST',
        body: JSON.stringify({ productId, termYears, downPayment }),
      }),
    onSuccess: () => {
      setMortgageDownPayment('')
      setMortgageApplicationError('')
      setShowMortgageModal(false)
      setShowPropertyModal(false)
      setSelectedProperty(null)
      queryClient.invalidateQueries({ queryKey: ['mortgages', currentSlot] })
      triggerSaveIndicator()
    },
    onError: (error) => {
      setMortgageApplicationError(error.message)
    },
  })

  const createProductMutation = useMutation({
    mutationFn: ({ slotId, payload }) =>
      apiFetch(`${API_BASE}/${slotId}/products`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setProductName('')
      setProductPrice('')
      setProductDescription('')
      setProductRooms('')
      setProductSqft('')
      setProductImageUrl('')
      setEditingProductId(null)
      setProductError('')
      setAdminProductsError('')
      queryClient.invalidateQueries({ queryKey: ['products', currentSlot, 'admin'] })
      queryClient.invalidateQueries({ queryKey: ['products', currentSlot] })
      triggerSaveIndicator()
    },
    onError: (error) => {
      setProductError(error.message)
    },
  })

  const updateProductMutation = useMutation({
    mutationFn: ({ slotId, productId, payload }) =>
      apiFetch(`${API_BASE}/${slotId}/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setEditingProductId(null)
      setProductError('')
      setAdminProductsError('')
      queryClient.invalidateQueries({ queryKey: ['products', currentSlot, 'admin'] })
      queryClient.invalidateQueries({ queryKey: ['products', currentSlot] })
      triggerSaveIndicator()
    },
    onError: (error) => {
      setProductError(error.message)
    },
  })

  const deleteProductMutation = useMutation({
    mutationFn: ({ slotId, productId }) =>
      apiFetch(`${API_BASE}/${slotId}/products/${productId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      setAdminProductsError('')
      queryClient.invalidateQueries({ queryKey: ['products', currentSlot, 'admin'] })
      queryClient.invalidateQueries({ queryKey: ['products', currentSlot] })
      triggerSaveIndicator()
    },
    onError: (error) => {
      setAdminProductsError(error.message)
    },
  })

  const approveLoanMutation = useMutation({
    mutationFn: ({ slotId, loanId }) =>
      apiFetch(`${API_BASE}/${slotId}/loans/${loanId}/approve`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans', currentSlot] })
      triggerSaveIndicator()
    },
  })

  const rejectLoanMutation = useMutation({
    mutationFn: ({ slotId, loanId }) =>
      apiFetch(`${API_BASE}/${slotId}/loans/${loanId}/reject`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans', currentSlot] })
      triggerSaveIndicator()
    },
  })

  const approveMortgageMutation = useMutation({
    mutationFn: ({ slotId, mortgageId }) =>
      apiFetch(`${API_BASE}/${slotId}/mortgages/${mortgageId}/approve`, { method: 'POST' }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mortgages', currentSlot] })
      queryClient.invalidateQueries({ queryKey: ['products', currentSlot] })
      const targetClientId = variables?.clientId ?? selectedClientId
      if (targetClientId) {
        queryClient.invalidateQueries({ queryKey: ['client-properties', currentSlot, targetClientId] })
      }
      queryClient.invalidateQueries({ queryKey: ['clients', currentSlot] })
      if (variables?.clientId) {
        queryClient.invalidateQueries({ queryKey: ['transactions', currentSlot, variables.clientId] })
      }
      setMortgageFundingError('')
      setShowMortgageFundingModal(false)
      setMortgageFundingContext(null)
      triggerSaveIndicator()
    },
    onError: (error, variables) => {
      if (error.message === INSUFFICIENT_MORTGAGE_FUNDS_MESSAGE && variables?.mortgage) {
        const client = clients.find((entry) => String(entry.id) === String(variables.mortgage.clientId))
        setMortgageFundingContext({ mortgage: variables.mortgage, client })
        setMortgageFundingError(error.message)
        setShowMortgageFundingModal(true)
        return
      }
      setMortgageFundingError(error.message)
    },
  })

  const rejectMortgageMutation = useMutation({
    mutationFn: ({ slotId, mortgageId }) =>
      apiFetch(`${API_BASE}/${slotId}/mortgages/${mortgageId}/reject`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mortgages', currentSlot] })
      triggerSaveIndicator()
    },
  })

  const fundMortgageDownPaymentMutation = useMutation({
    mutationFn: ({ slotId, clientId, amount }) =>
      apiFetch(`${API_BASE}/${slotId}/clients/${clientId}/mortgage-funding`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }),
    onSuccess: (data, variables) => {
      setMortgageFundingError('')
      queryClient.invalidateQueries({ queryKey: ['clients', currentSlot] })
      if (variables?.clientId) {
        queryClient.invalidateQueries({ queryKey: ['transactions', currentSlot, variables.clientId] })
      }
      triggerSaveIndicator()
      if (variables?.slotId && variables?.mortgageId) {
        approveMortgageMutation.mutate({
          slotId: variables.slotId,
          mortgageId: variables.mortgageId,
          clientId: variables.clientId,
          mortgage: variables.mortgage,
        })
      }
    },
    onError: (error) => {
      setMortgageFundingError(error.message)
    },
  })

  const updateMortgageRateMutation = useMutation({
    mutationFn: ({ slotId, mortgageRate }) =>
      apiFetch(`${API_BASE}/${slotId}/mortgage-rate`, {
        method: 'PUT',
        body: JSON.stringify({ mortgageRate }),
      }),
    onSuccess: () => {
      setMortgageRateInput('')
      setAdminProductsError('')
      queryClient.invalidateQueries({ queryKey: ['bank', currentSlot] })
      triggerSaveIndicator()
    },
    onError: (error) => {
      setAdminProductsError(error.message)
    },
  })

  const slots = slotsQuery.data || []
  const bankState = bankStateQuery.data
  const clients = clientsQuery.data || []
  const transactions = transactionsQuery.data || []
  const investmentState = investmentQuery.data
  const clientDistribution = clientDistributionQuery.data?.clients || []
  const activityData = activityChartQuery.data
  const availableProducts = productsQuery.data || []
  const adminProducts = adminProductsQuery.data || []
  const loans = loansQuery.data || []
  const mortgages = mortgagesQuery.data || []
  const ownedProperties = ownedPropertiesQuery.data || []

  const selectedClient = clients.find((client) => String(client.id) === String(selectedClientId))
  const mortgageRate = normalizeMortgageRate(bankState?.mortgageRate)
  const hasMortgageRate = bankState?.mortgageRate !== undefined && bankState?.mortgageRate !== null
  const clientNameById = useMemo(() => {
    const map = new Map()
    clients.forEach((client) => {
      map.set(String(client.id), client.name)
    })
    return map
  }, [clients])
  const productById = useMemo(() => {
    const map = new Map()
    ;[...availableProducts, ...adminProducts].forEach((product) => {
      map.set(String(product.id), product)
    })
    return map
  }, [availableProducts, adminProducts])
  const mortgageFundingDetails = useMemo(() => {
    if (!mortgageFundingContext?.mortgage) return null
    const mortgage = mortgageFundingContext.mortgage
    const client = mortgageFundingContext.client
    const availableFunds = Number(client?.checkingBalance || 0)
    const downPaymentAmount = Number(mortgage?.downPayment || 0)
    const propertyValue = Number(mortgage?.propertyPrice || 0)
    const amountNeeded = Math.max(0, Number((downPaymentAmount - availableFunds).toFixed(2)))
    return { mortgage, client, availableFunds, downPaymentAmount, propertyValue, amountNeeded }
  }, [mortgageFundingContext])

  const hudDate = bankState ? getGameDateString(bankState.gameDay) : '---'
  const hudMode = useMemo(() => {
    if (screen === 'bank') return 'Bank Dashboard'
    if (screen === 'add-client') return 'Bank > Add Client'
    if (screen === 'client') return `Client > ${selectedClient?.name || ''}`
    if (screen === 'investment') return 'Bank > Investments'
    if (screen === 'products') return 'Bank > Applications'
    if (screen === 'admin-products') return 'Bank > Admin Products'
    if (screen === 'property-market') return 'Bank > Property Market'
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
    if (screen === 'admin-products' && bankState?.mortgageRate !== undefined) {
      setMortgageRateInput(String(normalizeMortgageRate(bankState.mortgageRate)))
    }
  }, [bankState?.mortgageRate, screen])

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

  const handleOpenLoanCard = () => {
    setLoanApplicationError('')
    setMortgageApplicationError('')
    setShowLoanModal(true)
  }

  const handleLoanSubmit = () => {
    if (!currentSlot || !selectedClientId) return
    const amount = Number(loanAmount)
    if (!amount || amount <= 0) {
      setLoanApplicationError('Loan amount must be greater than zero.')
      return
    }
    if (!loanTermYears || loanTermYears < 5 || loanTermYears > 30) {
      setLoanApplicationError('Term must be between 5 and 30 years.')
      return
    }
    createLoanMutation.mutate({
      slotId: currentSlot,
      clientId: selectedClientId,
      amount,
      termYears: loanTermYears,
    })
  }

  const handleMortgageSubmit = () => {
    if (!currentSlot || !selectedClientId || !selectedProperty) return
    const downPayment = Number(mortgageDownPayment || 0)
    if (downPayment < 0) {
      setMortgageApplicationError('Down payment cannot be negative.')
      return
    }
    if (!mortgageTermYears || mortgageTermYears < 5 || mortgageTermYears > 30) {
      setMortgageApplicationError('Term must be between 5 and 30 years.')
      return
    }
    createMortgageMutation.mutate({
      slotId: currentSlot,
      clientId: selectedClientId,
      productId: selectedProperty.id,
      termYears: mortgageTermYears,
      downPayment,
    })
  }

  const closeMortgageFundingModal = () => {
    setShowMortgageFundingModal(false)
    setMortgageFundingContext(null)
    setMortgageFundingError('')
  }

  const handleSubmitProduct = () => {
    if (!currentSlot) return
    const price = Number(productPrice)
    const rooms = Number(productRooms)
    const sqft2 = Number(productSqft)
    if (!productName.trim()) {
      setProductError('Property name is required.')
      return
    }
    if (!price || price <= 0) {
      setProductError('Price must be greater than zero.')
      return
    }
    if (!productDescription.trim()) {
      setProductError('Description is required.')
      return
    }
    if (!rooms || rooms <= 0) {
      setProductError('Rooms must be greater than zero.')
      return
    }
    if (!sqft2 || sqft2 <= 0) {
      setProductError('Square footage must be greater than zero.')
      return
    }
    const payload = {
      name: productName.trim(),
      price,
      description: productDescription.trim(),
      rooms,
      sqft2,
      imageUrl: productImageUrl.trim() || null,
    }
    if (editingProductId) {
      updateProductMutation.mutate({
        slotId: currentSlot,
        productId: editingProductId,
        payload,
      })
      return
    }
    createProductMutation.mutate({ slotId: currentSlot, payload })
  }

  const handleEditProduct = (product) => {
    setEditingProductId(product.id)
    setProductName(product.name)
    setProductPrice(String(product.price))
    setProductDescription(product.description)
    setProductRooms(String(product.rooms))
    setProductSqft(String(product.sqft2))
    setProductImageUrl(product.imageUrl || '')
    setProductError('')
  }

  const handleCancelProductEdit = () => {
    setEditingProductId(null)
    setProductName('')
    setProductPrice('')
    setProductDescription('')
    setProductRooms('')
    setProductSqft('')
    setProductImageUrl('')
    setProductError('')
  }

  const handleUpdateMortgageRate = () => {
    if (!currentSlot) return
    const rate = Number(mortgageRateInput)
    if (Number.isNaN(rate) || rate < 0) {
      setAdminProductsError('Mortgage rate must be a non-negative number.')
      return
    }
    updateMortgageRateMutation.mutate({ slotId: currentSlot, mortgageRate: rate })
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

  const mortgagePayment = useMemo(() => {
    if (!selectedProperty) return null
    const price = Number(selectedProperty.price || 0)
    const downPaymentValue = Number(mortgageDownPayment || 0)
    const principal = Math.max(price - downPaymentValue, 0)
    const months = Number(mortgageTermYears || 0) * 12
    if (!months || principal <= 0) return null
    const monthlyRate = mortgageRate / 12
    if (!monthlyRate) {
      return principal / months
    }
    const factor = Math.pow(1 + monthlyRate, months)
    return (principal * monthlyRate * factor) / (factor - 1)
  }, [mortgageDownPayment, mortgageRate, mortgageTermYears, selectedProperty])

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
          <div className="hud-center-logo" aria-hidden="true">
            <img src="/banksim_logo.png" alt="" className="hud-logo-image" />
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
            <img src="/banksim_logo.png" alt="Banking Sim logo" className="auth-logo" />
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
            <img src="/banksim_logo.png" alt="Banking Sim logo" className="auth-logo" />
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
            <div className="dual-action-card dual-action-card-left mb-4">
              <button
                className="dual-action-option dual-action-option-loan"
                type="button"
                onClick={handleOpenLoanCard}
              >
                <div className="dual-action-title">Apply For Loan</div>
                <div className="dual-action-subtitle">Start a new loan request</div>
              </button>
              <div className="dual-action-divider" aria-hidden="true" />
              <button
                className="dual-action-option dual-action-option-properties"
                type="button"
                onClick={() => setScreen('property-market')}
              >
                <div className="dual-action-title">View Properties For Sale</div>
                <div className="dual-action-subtitle">Browse listings and apply for mortgages</div>
              </button>
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
              </div>
            </div>
            <p id="client-error-message" className="text-red-600 text-xs mt-2 text-center">
              {clientError}
            </p>
            <div className="transaction-log">
              <h4>
                <span className="header-icon">🏠</span> Assets
              </h4>
              <div className="property-grid">
                {!ownedProperties.length && (
                  <p className="text-xs text-gray-500">No properties owned yet.</p>
                )}
                {ownedProperties.map((property) => (
                  <div key={property.id} className="property-card">
                    {property.imageUrl ? (
                      <div
                        className="property-image"
                        style={{ backgroundImage: `url(${property.imageUrl})` }}
                      />
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
                <button className="bw-button" type="button" onClick={() => setShowClientTransactionsModal(true)}>
                  View All
                </button>
              </h4>
              <div id="client-log-area" className="log-area">
                {!transactions.length && <p className="text-xs text-gray-500">No transactions yet.</p>}
                {transactions.map((tx) => {
                  const isDeposit =
                    tx.type === 'DEPOSIT' ||
                    tx.type === 'LOAN_DISBURSEMENT' ||
                    tx.type === 'MORTGAGE_DOWN_PAYMENT_FUNDING'
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
                      <span className="text-gray-500">{getGameDateString(tx.gameDay)}:</span>{' '}
                      <span className={typeClass}>
                        {typeSymbol} {typeLabel}
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

        {screen === 'client' && showClientTransactionsModal && (
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="All transactions"
            onClick={() => setShowClientTransactionsModal(false)}
          >
            <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
              <button
                className="bw-button modal-close"
                type="button"
                onClick={() => setShowClientTransactionsModal(false)}
              >
                Close
              </button>
              <h3 className="text-sm font-semibold mb-2 uppercase flex items-center gap-2 modal-header">
                <span className="header-icon">📜</span> Transaction History
              </h3>
              <div className="modal-client-list border p-2 rounded bg-gray-100">
                {!transactions.length && <p className="text-xs text-gray-500">No transactions yet.</p>}
                {transactions.map((tx) => {
                  const isDeposit =
                    tx.type === 'DEPOSIT' ||
                    tx.type === 'LOAN_DISBURSEMENT' ||
                    tx.type === 'MORTGAGE_DOWN_PAYMENT_FUNDING'
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
                      <span className="text-gray-500">{getGameDateString(tx.gameDay)}:</span>{' '}
                      <span className={typeClass}>
                        {typeSymbol} {typeLabel}
                      </span>{' '}
                      <span>${formatCurrency(tx.amount)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        <div id="bank-view-screen" className={`screen ${screen === 'bank' ? 'active' : ''}`}>
          <div className="bw-panel">
            <h2 className="bw-header">
              ALKI corp.
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
                <span className="btn-icon">🧰</span> Applications
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

        {showLoanModal && (
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Loan application"
            onClick={() => setShowLoanModal(false)}
          >
            <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
              <button className="bw-button modal-close" type="button" onClick={() => setShowLoanModal(false)}>
                Close
              </button>
              <h3 className="text-sm font-semibold mb-2 uppercase flex items-center gap-2 modal-header">
                <span className="header-icon">📄</span> Loan Application
              </h3>
              <label htmlFor="loan-amount" className="bw-label">
                Loan Amount
              </label>
              <input
                type="number"
                id="loan-amount"
                className="bw-input"
                min="0"
                step="0.01"
                value={loanAmount}
                onChange={(event) => setLoanAmount(event.target.value)}
              />
              <label htmlFor="loan-term" className="bw-label mt-2">
                Term Years
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  id="loan-term"
                  className="bw-range term-slider"
                  min="5"
                  max="30"
                  value={loanTermYears}
                  onChange={(event) => setLoanTermYears(Number(event.target.value))}
                />
                <input
                  type="number"
                  className="bw-input term-input"
                  min="5"
                  max="30"
                  value={loanTermYears}
                  onChange={(event) => setLoanTermYears(Number(event.target.value))}
                />
              </div>
              <p className="text-red-600 text-xs mt-2 text-center">{loanApplicationError}</p>
              <button
                className="bw-button w-full mt-2"
                type="button"
                onClick={handleLoanSubmit}
                disabled={createLoanMutation.isPending}
              >
                Submit Loan Application
              </button>
            </div>
          </div>
        )}

        {showPropertyModal && selectedProperty && (
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Property details"
            onClick={() => {
              setShowPropertyModal(false)
              setSelectedProperty(null)
            }}
          >
            <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
              <button
                className="bw-button modal-close"
                type="button"
                onClick={() => {
                  setShowPropertyModal(false)
                  setSelectedProperty(null)
                }}
              >
                Close
              </button>
              <h3 className="text-sm font-semibold mb-2 uppercase flex items-center gap-2 modal-header">
                <span className="header-icon">🏘</span> {selectedProperty.name}
              </h3>
              {selectedProperty.imageUrl ? (
                <div
                  className="property-modal-image"
                  style={{ backgroundImage: `url(${selectedProperty.imageUrl})` }}
                />
              ) : (
                <div className="property-modal-image property-image-placeholder">No Image</div>
              )}
              <p className="text-sm font-semibold mt-2">${formatCurrency(selectedProperty.price)}</p>
              <p className="text-xs text-gray-600">
                {selectedProperty.rooms} rooms • {selectedProperty.sqft2} sqft
              </p>
              <p className="text-xs mt-2">{selectedProperty.description}</p>
              <button
                className="bw-button w-full mt-3"
                type="button"
                onClick={() => {
                  setShowPropertyModal(false)
                  setShowMortgageModal(true)
                }}
              >
                Apply for Mortgage
              </button>
            </div>
          </div>
        )}

        {showMortgageModal && selectedProperty && (
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Mortgage application"
            onClick={() => setShowMortgageModal(false)}
          >
            <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
              <button className="bw-button modal-close" type="button" onClick={() => setShowMortgageModal(false)}>
                Close
              </button>
              <h3 className="text-sm font-semibold mb-2 uppercase flex items-center gap-2 modal-header">
                <span className="header-icon">🏡</span> Mortgage Application
              </h3>
              <p className="text-xs text-gray-600">
                Property: {selectedProperty.name} • ${formatCurrency(selectedProperty.price)}
              </p>
              <label htmlFor="mortgage-term" className="bw-label mt-2">
                Term Years
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  id="mortgage-term"
                  className="bw-range term-slider"
                  min="5"
                  max="30"
                  value={mortgageTermYears}
                  onChange={(event) => setMortgageTermYears(Number(event.target.value))}
                />
                <input
                  type="number"
                  className="bw-input term-input"
                  min="5"
                  max="30"
                  value={mortgageTermYears}
                  onChange={(event) => setMortgageTermYears(Number(event.target.value))}
                />
              </div>
              <label htmlFor="mortgage-down-payment" className="bw-label mt-2">
                Down Payment
              </label>
              <input
                type="number"
                id="mortgage-down-payment"
                className="bw-input"
                min="0"
                step="0.01"
                value={mortgageDownPayment}
                onChange={(event) => setMortgageDownPayment(event.target.value)}
              />
              <p className="text-xs text-gray-600 mt-1">
                Fixed rate: {hasMortgageRate ? `${(mortgageRate * 100).toFixed(2)}%` : '---'}
              </p>
              <p className="mortgage-payment-preview">
                {mortgagePayment
                  ? `Estimated monthly payment: $${formatCurrency(mortgagePayment)}`
                  : 'Enter term and down payment to see monthly payment.'}
              </p>
              <p className="text-red-600 text-xs mt-2 text-center">{mortgageApplicationError}</p>
              <button
                className="bw-button w-full mt-2"
                type="button"
                onClick={handleMortgageSubmit}
                disabled={createMortgageMutation.isPending}
              >
                Submit Mortgage Application
              </button>
            </div>
          </div>
        )}

        {showMortgageFundingModal && mortgageFundingDetails && (
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Mortgage funding"
            onClick={closeMortgageFundingModal}
          >
            <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
              <button className="bw-button modal-close" type="button" onClick={closeMortgageFundingModal}>
                Close
              </button>
              <h3 className="text-sm font-semibold mb-2 uppercase flex items-center gap-2 modal-header">
                <span className="header-icon">⚠️</span>{' '}
                {mortgageFundingError || INSUFFICIENT_MORTGAGE_FUNDS_MESSAGE}
              </h3>
              <p className="text-xs text-gray-600">Will the bank fund the down deposit for dev purposes?</p>
              <div className="flex gap-2 mt-2">
                <button
                  className="bw-button"
                  type="button"
                  disabled={fundMortgageDownPaymentMutation.isPending}
                  onClick={() => {
                    if (!currentSlot || !mortgageFundingDetails.mortgage) return
                    const clientId = mortgageFundingDetails.mortgage.clientId
                    const amount = mortgageFundingDetails.amountNeeded
                    if (!amount || amount <= 0) return
                    fundMortgageDownPaymentMutation.mutate({
                      slotId: currentSlot,
                      clientId,
                      amount,
                      mortgageId: mortgageFundingDetails.mortgage.id,
                      mortgage: mortgageFundingDetails.mortgage,
                    })
                  }}
                >
                  Yes
                </button>
                <button className="bw-button" type="button" onClick={closeMortgageFundingModal}>
                  No
                </button>
              </div>
              <div className="text-xs mt-3" style={{ color: '#ffffff' }}>
                <p>
                  <span>
                    {(mortgageFundingDetails.client?.name ||
                      clientNameById.get(String(mortgageFundingDetails.mortgage.clientId)) ||
                      'Client')}{' '}
                    available funds:{' '}
                  </span>
                  <span>${formatCurrency(mortgageFundingDetails.availableFunds)}</span>
                </p>
                <p className="mt-2">
                  <span>Property value: </span>
                  <span>${formatCurrency(mortgageFundingDetails.propertyValue)}</span>
                </p>
                <p className="mt-2">
                  <span>Down deposit amount: </span>
                  <span>${formatCurrency(mortgageFundingDetails.downPaymentAmount)}</span>
                </p>
                <p className="mt-2">
                  <span>Amount needed: </span>
                  <span>${formatCurrency(mortgageFundingDetails.amountNeeded)}</span>
                </p>
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

        <div id="property-market-screen" className={`screen ${screen === 'property-market' ? 'active' : ''}`}>
          <div className="bw-panel">
            <h2 className="bw-header">
              <span className="header-icon">🏘</span> Property Market
            </h2>
            <div className="property-grid property-grid-scroll">
              {!availableProducts.length && (
                <p className="text-xs text-gray-500">No properties available right now.</p>
              )}
              {availableProducts.map((property) => (
                <div key={property.id} className="property-card">
                  {property.imageUrl ? (
                    <div
                      className="property-image"
                      style={{ backgroundImage: `url(${property.imageUrl})` }}
                    />
                  ) : (
                    <div className="property-image property-image-placeholder">No Image</div>
                  )}
                  <div className="property-body">
                    <div className="property-title">{property.name}</div>
                    <div className="property-description">{property.description}</div>
                    <div className="property-price">${formatCurrency(property.price)}</div>
                    <button
                      className="bw-button w-full mt-2"
                      type="button"
                      onClick={() => {
                        setSelectedProperty(property)
                        setShowPropertyModal(true)
                      }}
                    >
                      View Property
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button className="bw-button mt-2 self-center" onClick={() => setScreen('client')}>
              <span className="btn-icon">↩</span> Back to Client
            </button>
          </div>
        </div>

        <div id="products-view-screen" className={`screen ${screen === 'products' ? 'active' : ''}`}>
          <div className="bw-panel">
            <h2 className="bw-header">
              <span className="header-icon">🧰</span> Applications
            </h2>
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
                        <th>Client</th>
                        <th>Amount</th>
                        <th>Term</th>
                        <th>Status</th>
                        {isAdmin && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {loans.map((loan) => (
                        <tr key={loan.id}>
                          <td>{clientNameById.get(String(loan.clientId)) || loan.clientId}</td>
                          <td>${formatCurrency(loan.amount)}</td>
                          <td>{loan.termYears} yrs</td>
                          <td>{loan.status}</td>
                          {isAdmin && (
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
                                    className="bw-button"
                                    onClick={() => rejectLoanMutation.mutate({ slotId: currentSlot, loanId: loan.id })}
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span
                                  className={`text-xs ${
                                    loan.status === 'APPROVED' ? 'text-green-600' : 'text-red-600'
                                  }`}
                                >
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
                        <th>Client</th>
                        <th>Property</th>
                        <th>Loan</th>
                        <th>Down %</th>
                        <th>Monthly</th>
                        <th>Term</th>
                        <th>Status</th>
                        {isAdmin && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {mortgages.map((mortgage) => (
                        <tr key={mortgage.id}>
                          <td>{clientNameById.get(String(mortgage.clientId)) || mortgage.clientId}</td>
                          <td>
                            {productById.has(String(mortgage.productId)) ? (
                              <button
                                className="bw-button"
                                type="button"
                                onClick={() => {
                                  setSelectedProperty(productById.get(String(mortgage.productId)))
                                  setShowPropertyModal(true)
                                }}
                              >
                                View Property
                              </button>
                            ) : (
                              mortgage.productId
                            )}
                          </td>
                          <td>${formatCurrency(mortgage.loanAmount)}</td>
                          <td>
                            {mortgage.propertyPrice
                              ? `${((Number(mortgage.downPayment || 0) / Number(mortgage.propertyPrice)) * 100).toFixed(2)}%`
                              : '--'}
                          </td>
                          <td>
                            {(() => {
                              const monthlyPayment = calculateMonthlyPayment({
                                principal: mortgage.loanAmount,
                                termYears: mortgage.termYears,
                                interestRate: mortgage.interestRate,
                              })
                              return monthlyPayment ? `$${formatCurrency(monthlyPayment)}` : '--'
                            })()}
                          </td>
                          <td>{mortgage.termYears} yrs</td>
                          <td>{mortgage.status}</td>
                          {isAdmin && (
                            <td>
                              {mortgage.status === 'PENDING' ? (
                                <div className="flex gap-2">
                                  <button
                                    className="bw-button"
                                    onClick={() =>
                                      approveMortgageMutation.mutate({
                                        slotId: currentSlot,
                                        mortgageId: mortgage.id,
                                        clientId: mortgage.clientId,
                                        mortgage,
                                      })
                                    }
                                  >
                                    Approve
                                  </button>
                                  <button
                                    className="bw-button"
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
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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
            <div className="product-admin-section">
              <h3 className="text-sm font-semibold mb-2 uppercase flex items-center gap-2">
                <span className="header-icon">📈</span> Mortgage Rate
                <span className="text-green-600">
                  {bankState?.mortgageRate !== undefined ? `(${(mortgageRate * 100).toFixed(2)}%)` : '(---)'}
                </span>
              </h3>
              <div className="flex gap-2 items-end">
                <div className="flex-grow">
                  <label htmlFor="mortgage-rate-input" className="bw-label">
                    Fixed Mortgage Rate
                  </label>
                  <input
                    id="mortgage-rate-input"
                    className="bw-input bw-range"
                    type="range"
                    min="0.05"
                    max="0.15"
                    step="0.0005"
                    value={mortgageRateInput}
                    onChange={(event) => setMortgageRateInput(event.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Selected rate: {(Number(mortgageRateInput || 0) * 100).toFixed(2)}%
                  </p>
                </div>
                <button
                  className="bw-button bw-button-compact"
                  type="button"
                  onClick={handleUpdateMortgageRate}
                  disabled={updateMortgageRateMutation.isPending}
                >
                  Save Rate
                </button>
              </div>
            </div>
            <div className="product-admin-section">
              <h3 className="text-sm font-semibold mb-2 uppercase flex items-center gap-2">
                <span className="header-icon">🏠</span> Property Listing
              </h3>
              <label htmlFor="product-name" className="bw-label">
                Property Name
              </label>
              <input
                id="product-name"
                className="bw-input"
                type="text"
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
              />
              <label htmlFor="product-price" className="bw-label mt-2">
                Price
              </label>
              <input
                id="product-price"
                className="bw-input"
                type="number"
                min="0"
                step="0.01"
                value={productPrice}
                onChange={(event) => setProductPrice(event.target.value)}
              />
              <label htmlFor="product-description" className="bw-label mt-2">
                Description
              </label>
              <textarea
                id="product-description"
                className="bw-input"
                rows="3"
                value={productDescription}
                onChange={(event) => setProductDescription(event.target.value)}
              />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label htmlFor="product-rooms" className="bw-label">
                    Rooms
                  </label>
                  <input
                    id="product-rooms"
                    className="bw-input"
                    type="number"
                    min="1"
                    value={productRooms}
                    onChange={(event) => setProductRooms(event.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="product-sqft" className="bw-label">
                    Sqft
                  </label>
                  <input
                    id="product-sqft"
                    className="bw-input"
                    type="number"
                    min="1"
                    value={productSqft}
                    onChange={(event) => setProductSqft(event.target.value)}
                  />
                </div>
              </div>
              <label htmlFor="product-image" className="bw-label mt-2">
                Image URL
              </label>
              <input
                id="product-image"
                className="bw-input"
                type="text"
                value={productImageUrl}
                onChange={(event) => setProductImageUrl(event.target.value)}
              />
              <p className="text-red-600 text-xs mt-2 text-center">{productError || adminProductsError}</p>
              <div className="flex gap-2 justify-end mt-2">
                {editingProductId && (
                  <button className="bw-button" type="button" onClick={handleCancelProductEdit}>
                    Cancel
                  </button>
                )}
                <button
                  className="bw-button"
                  type="button"
                  onClick={handleSubmitProduct}
                  disabled={createProductMutation.isPending || updateProductMutation.isPending}
                >
                  {editingProductId ? 'Update Property' : 'Create Property'}
                </button>
              </div>
            </div>
            <div className="product-admin-section">
              <h3 className="text-sm font-semibold mb-2 uppercase flex items-center gap-2">
                <span className="header-icon">📋</span> Existing Properties
              </h3>
              <div className="property-grid property-grid-scroll">
                {!adminProducts.length && (
                  <p className="text-xs text-gray-500">No properties added yet.</p>
                )}
                {adminProducts.map((property) => (
                  <div key={property.id} className="property-card">
                    {property.imageUrl ? (
                      <div
                        className="property-image"
                        style={{ backgroundImage: `url(${property.imageUrl})` }}
                      />
                    ) : (
                      <div className="property-image property-image-placeholder">No Image</div>
                    )}
                    <div className="property-body">
                      <div className="property-title">{property.name}</div>
                      <div className="property-description">{property.description}</div>
                      <div className="property-price">${formatCurrency(property.price)}</div>
                      <div className="property-meta">Status: {property.status}</div>
                      <div className="flex gap-2 mt-2">
                        <button className="bw-button" type="button" onClick={() => handleEditProduct(property)}>
                          Edit
                        </button>
                        <button
                          className="bw-button"
                          type="button"
                          onClick={() =>
                            deleteProductMutation.mutate({ slotId: currentSlot, productId: property.id })
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
