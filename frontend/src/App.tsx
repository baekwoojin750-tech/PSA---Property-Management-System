import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AuthorizationGate from './components/AuthorizationGate'
import { useAuthStore } from './stores/authStore'

const AuthPage                = lazy(() => import('./pages/auth/Login'))
const AuthCallback            = lazy(() => import('./pages/auth/AuthCallback'))
const ForgotPassword          = lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPassword           = lazy(() => import('./pages/auth/ResetPassword'))
const MainLayout              = lazy(() => import('./layouts/MainLayout'))
const Dashboard               = lazy(() => import('./pages/dashboard/Dashboard'))
const Assets                  = lazy(() => import('./pages/assets/Assets'))
const BorrowRequest           = lazy(() => import('./pages/borrow/BorrowRequest'))
const Inventory               = lazy(() => import('./pages/inventory/Inventory'))
const Profile                 = lazy(() => import('./pages/profile/Profile'))
const UserLayout              = lazy(() => import('./pages/profile/UserLayout'))   // user-only
const UserManagement          = lazy(() => import('./pages/users/UserManagement'))
const ActivityLogs            = lazy(() => import('./pages/activity-logs/ActivityLogs'))
const AuthorizationManagement = lazy(() => import('./pages/authorization/AuthorizationManagement'))

function App() {
  const { role } = useAuthStore()

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-[#080e1a]"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <Routes>

        {/* ── Public ── */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ── Super Admin + Admin — inside MainLayout with Navbar ── */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['super admin', 'admin']}>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/dashboard"
            element={
              role === 'admin'
                ? <AuthorizationGate pageName="Dashboard"><Dashboard /></AuthorizationGate>
                : <Dashboard />
            }
          />
          <Route
            path="/inventory"
            element={
              role === 'admin'
                ? <AuthorizationGate pageName="Inventory"><Inventory /></AuthorizationGate>
                : <Inventory />
            }
          />
          <Route
            path="/asset"
            element={
              role === 'admin'
                ? <AuthorizationGate pageName="Assets"><Assets /></AuthorizationGate>
                : <Assets />
            }
          />

          {/* Admin/SuperAdmin borrow & profile use the shared pages inside MainLayout */}
          <Route path="/request" element={<BorrowRequest />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* ── User only — UserLayout has its own navbar + slide panel ── */}
        <Route
          path="/user"
          element={
            <ProtectedRoute allowedRoles={['user']}>
              <UserLayout />
            </ProtectedRoute>
          }
        />

        {/* ── Super Admin only ── */}
        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={['super admin']}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/activity-logs"
          element={
            <ProtectedRoute allowedRoles={['super admin']}>
              <ActivityLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/authorization"
          element={
            <ProtectedRoute allowedRoles={['super admin']}>
              <AuthorizationManagement />
            </ProtectedRoute>
          }
        />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/login" />} />

      </Routes>
    </Suspense>
  )
}

export default App