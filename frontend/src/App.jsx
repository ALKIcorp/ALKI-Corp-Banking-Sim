import { BrowserRouter } from 'react-router-dom'
import AppRoutes from './router/routes.jsx'
import { AuthProvider } from './providers/AuthProvider.jsx'
import { SlotProvider } from './providers/SlotProvider.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SlotProvider>
          <AppRoutes />
        </SlotProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
