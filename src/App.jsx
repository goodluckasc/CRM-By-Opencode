import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout/Layout'
import PrivateRoute from './components/Common/PrivateRoute'
import LoadingSpinner from './components/Common/LoadingSpinner'

const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const DashboardContent = lazy(() => import('./components/Dashboard/Dashboard'))
const CustomerList = lazy(() => import('./components/Customers/CustomerList'))
const CallListContent = lazy(() => import('./components/CallList/CallList'))
const JobCardListContent = lazy(() => import('./components/JobCards/JobCardList'))
const InventoryListContent = lazy(() => import('./components/Inventory/InventoryList'))
const ReportsContent = lazy(() => import('./components/Reports/Reports'))
const Users = lazy(() => import('./pages/Users'))
const Settings = lazy(() => import('./pages/Settings'))

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Suspense fallback={<LoadingSpinner size="lg" />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <Layout />
                  </PrivateRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardContent />} />
                <Route path="customers" element={<CustomerList />} />
                <Route path="call-list" element={<CallListContent />} />
                <Route path="job-cards" element={<JobCardListContent />} />
                <Route path="inventory" element={<InventoryListContent />} />
                <Route path="reports" element={<ReportsContent />} />
                <Route
                  path="users"
                  element={
                    <PrivateRoute adminOnly>
                      <Users />
                    </PrivateRoute>
                  }
                />
                <Route path="settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
