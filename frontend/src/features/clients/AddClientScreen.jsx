import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import Panel from '../../components/Panel.jsx'
import { useSlot } from '../../providers/SlotProvider.jsx'
import { apiFetch } from '../../api.js'
import { API_BASE } from '../../constants.js'

export default function AddClientScreen() {
  const { currentSlot } = useSlot()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [clientName, setClientName] = useState('')
  const [error, setError] = useState('')

  const createClientMutation = useMutation({
    mutationFn: ({ slotId, name }) =>
      apiFetch(`${API_BASE}/${slotId}/clients`, {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      setClientName('')
      setError('')
      queryClient.invalidateQueries({ queryKey: ['clients', currentSlot] })
      queryClient.invalidateQueries({ queryKey: ['bank', currentSlot] })
      queryClient.invalidateQueries({ queryKey: ['charts', currentSlot] })
      navigate('/bank')
    },
    onError: (err) => setError(err.message),
  })

  const handleSubmit = () => {
    if (!currentSlot) return
    if (!clientName.trim()) {
      setError('Please enter the client name.')
      return
    }
    createClientMutation.mutate({ slotId: currentSlot, name: clientName.trim() })
  }

  return (
    <div id="add-client-screen" className="screen active">
      <Panel>
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
        <p className="text-xs text-gray-500 mb-4">Opens a checking account and issues a debit card.</p>
        <p className="text-red-600 text-xs mt-1 text-center">{error}</p>
        <div className="flex justify-end gap-2">
          <button className="bw-button" onClick={() => navigate('/bank')}>
            <span className="btn-icon">↩</span> Cancel
          </button>
          <button className="bw-button" onClick={handleSubmit} disabled={createClientMutation.isPending}>
            <span className="btn-icon">✔</span> Register Client
          </button>
        </div>
      </Panel>
    </div>
  )
}
