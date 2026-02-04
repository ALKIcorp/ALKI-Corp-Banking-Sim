import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from '../providers/AuthProvider.jsx'
import LoginForm from '../features/auth/LoginForm.jsx'
import HomeScreen from '../features/home/HomeScreen.jsx'
import BankDashboard from '../features/bank/BankDashboard.jsx'
import ClientScreen from '../features/clients/ClientScreen.jsx'
import AddClientScreen from '../features/clients/AddClientScreen.jsx'
import InvestmentScreen from '../features/investment/InvestmentScreen.jsx'
import PropertyMarket from '../features/properties/PropertyMarket.jsx'
import ApplicationsScreen from '../features/applications/ApplicationsScreen.jsx'
import AdminProductsScreen from '../features/admin/AdminProductsScreen.jsx'
import AppLayout from '../components/AppLayout.jsx'

function PrivateOutlet() {
  const { token } = useAuth()
  return token ? <Outlet /> : <Navigate to="/login" replace />
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginForm />} />
      <Route element={<PrivateOutlet />}>
        <Route element={<AppLayout />}>
          <Route path="/home" element={<HomeScreen />} />
          <Route path="/bank" element={<BankDashboard />} />
          <Route path="/clients/new" element={<AddClientScreen />} />
          <Route path="/clients/:clientId" element={<ClientScreen />} />
          <Route path="/investment" element={<InvestmentScreen />} />
          <Route path="/properties" element={<PropertyMarket />} />
          <Route path="/applications" element={<ApplicationsScreen />} />
          <Route path="/admin/products" element={<AdminProductsScreen />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
