import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import Panel from '../../components/Panel.jsx'
import { useSlots } from '../../hooks/useSlots.js'
import { API_BASE } from '../../constants.js'
import { apiFetch } from '../../api.js'
import { useSlot } from '../../providers/SlotProvider.jsx'
import { getGameDateString } from '../../utils.js'

export default function HomeScreen() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: slots = [] } = useSlots()
  const { setCurrentSlot, setSelectedClientId } = useSlot()

  const startSlotMutation = useMutation({
    mutationFn: (slotId) => apiFetch(`${API_BASE}/${slotId}/start`, { method: 'POST' }),
    onSuccess: (data, slotId) => {
      setCurrentSlot(slotId)
      setSelectedClientId(null)
      queryClient.setQueryData(['bank', slotId], data)
      queryClient.invalidateQueries({ queryKey: ['slots'] })
      queryClient.invalidateQueries({ queryKey: ['clients', slotId] })
      queryClient.invalidateQueries({ queryKey: ['charts', slotId] })
      navigate('/bank')
    },
  })

  const handleStartSlot = (slotId, hasData) => {
    if (hasData) {
      const confirmed = window.confirm(`Slot ${slotId} has data. Start a new game and overwrite it?`)
      if (!confirmed) return
    }
    startSlotMutation.mutate(slotId)
  }

  const handleLoadSlot = (slotId, hasData) => {
    if (!hasData) return
    setCurrentSlot(slotId)
    setSelectedClientId(null)
    navigate('/bank')
  }

  return (
    <div id="home-screen" className="screen active">
      <Panel className="flex-grow flex flex-col justify-center items-center">
        <img src="/banksim_logo.png" alt="Banking Sim logo" className="auth-logo" />
        <h1 className="bw-header mb-4">
          <span className="header-icon">🏦</span> Banking Sim <span className="header-icon">🏦</span>
        </h1>
        <div className="save-slots w-full max-w-xs">
          {slots.map((slot) => (
            <div className="slot" key={slot.slotId}>
              <span className="slot-info" id={`slot-${slot.slotId}-info`}>
                Slot {slot.slotId}:{' '}
                {slot.hasData
                  ? `${getGameDateString(slot.gameDay)}, ${slot.clientCount} clients`
                  : 'Empty'}
              </span>
              <div className="slot-actions">
                <button className="bw-button" onClick={() => handleStartSlot(slot.slotId, slot.hasData)}>
                  <span className="btn-icon">▶</span> New
                </button>
                <button
                  className="bw-button"
                  onClick={() => handleLoadSlot(slot.slotId, slot.hasData)}
                  disabled={!slot.hasData}
                >
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
      </Panel>
    </div>
  )
}
