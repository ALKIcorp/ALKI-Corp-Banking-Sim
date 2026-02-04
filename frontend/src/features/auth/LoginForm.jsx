import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Panel from '../../components/Panel.jsx'
import { useAuth } from '../../providers/AuthProvider.jsx'

export default function LoginForm() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirm: '',
    adminStatus: false,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const isLogin = mode === 'login'

  const handleChange = (field) => (event) => {
    const value = field === 'adminStatus' ? event.target.checked : event.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isLogin) {
        if (!form.username || !form.password) {
          setError('Enter username/email and password.')
        } else {
          await login({ usernameOrEmail: form.username, password: form.password })
          navigate('/home')
        }
      } else {
        if (!form.username || !form.email || !form.password || !form.confirm) {
          setError('Fill out all fields to register.')
        } else if (form.password !== form.confirm) {
          setError('Passwords do not match.')
        } else {
          await register({
            username: form.username,
            email: form.email,
            password: form.password,
            adminStatus: form.adminStatus,
          })
          navigate('/home')
        }
      }
    } catch (err) {
      setError(err?.message || 'Request failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-screen">
      <Panel className="flex-grow flex flex-col justify-center items-center">
        <img src="/banksim_logo.png" alt="Banking Sim logo" className="auth-logo" />
        <h1 className="bw-header mb-4">
          <span className="header-icon">🏦</span> Banking Sim
        </h1>
        <form className="auth-form w-full max-w-xs" onSubmit={handleSubmit}>
          <label htmlFor="username-input" className="bw-label">
            Username or Email
          </label>
          <input
            id="username-input"
            className="bw-input"
            value={form.username}
            onChange={handleChange('username')}
            autoComplete="username"
          />
          {!isLogin && (
            <>
              <label htmlFor="email-input" className="bw-label">
                Email
              </label>
              <input
                id="email-input"
                className="bw-input"
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                autoComplete="email"
              />
            </>
          )}
          <label htmlFor="password-input" className="bw-label">
            Password
          </label>
          <input
            id="password-input"
            className="bw-input"
            type="password"
            value={form.password}
            onChange={handleChange('password')}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
          />
          {!isLogin && (
            <>
              <label htmlFor="confirm-input" className="bw-label">
                Confirm Password
              </label>
              <input
                id="confirm-input"
                className="bw-input"
                type="password"
                value={form.confirm}
                onChange={handleChange('confirm')}
                autoComplete="new-password"
              />
              <label className="password-toggle">
                <input
                  type="checkbox"
                  className="bw-checkbox"
                  checked={form.adminStatus}
                  onChange={handleChange('adminStatus')}
                />
                <span>Make new user admin</span>
              </label>
            </>
          )}
          <p className="text-red-600 text-xs mt-2 text-center min-h-[1rem]">{error}</p>
          <div className="flex justify-center mt-2">
            <button className="bw-button" type="submit" disabled={loading}>
              <span className="btn-icon">{isLogin ? '✅' : '📝'}</span> {isLogin ? 'Login' : 'Create Account'}
            </button>
          </div>
        </form>
        <div className="text-center mt-2">
          <button
            className="bw-button"
            type="button"
            onClick={() => {
              setMode(isLogin ? 'register' : 'login')
              setError('')
            }}
          >
            {isLogin ? 'Need an account? Register' : 'Back to Login'}
          </button>
        </div>
      </Panel>
    </div>
  )
}
