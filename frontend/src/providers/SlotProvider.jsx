import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { STORAGE_KEYS } from '../constants.js'

const SlotContext = createContext(null)

export function SlotProvider({ children }) {
  const [currentSlot, setCurrentSlot] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.slot)
    return saved ? Number(saved) : null
  })
  const [selectedClientId, setSelectedClientId] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.clientId)
    return saved ? Number(saved) : null
  })

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

  const value = useMemo(
    () => ({
      currentSlot,
      setCurrentSlot,
      selectedClientId,
      setSelectedClientId,
    }),
    [currentSlot, selectedClientId],
  )

  return <SlotContext.Provider value={value}>{children}</SlotContext.Provider>
}

export function useSlot() {
  const ctx = useContext(SlotContext)
  if (!ctx) throw new Error('useSlot must be used within SlotProvider')
  return ctx
}
