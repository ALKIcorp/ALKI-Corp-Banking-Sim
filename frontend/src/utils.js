import { DAYS_PER_YEAR } from './constants.js'

export function formatCurrency(value) {
  const amount = typeof value === 'number' ? value : Number(value || 0)
  return amount.toFixed(2)
}

export function getGameDateString(dayNumber) {
  if (dayNumber === null || dayNumber === undefined || Number.isNaN(dayNumber)) {
    return '---'
  }
  const totalMonths = Math.floor(Number(dayNumber))
  const year = Math.floor(totalMonths / DAYS_PER_YEAR) + 1
  const month = (totalMonths % DAYS_PER_YEAR) + 1
  return `Y${year} M${month}`
}

export function decodeJwtPayload(token) {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length < 2) {
    return null
  }
  const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  try {
    return JSON.parse(atob(padded))
  } catch (error) {
    console.warn('Failed to decode auth token payload', error)
    return null
  }
}

export function getUserLabel(token) {
  const payload = decodeJwtPayload(token)
  if (!payload || !payload.sub) {
    return null
  }
  return payload.sub
}
