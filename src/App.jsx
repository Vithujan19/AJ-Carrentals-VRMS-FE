import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext.jsx';
import ChangePasswordPage from './pages/ChangePasswordPage.jsx';
import AuditPage from './pages/AuditPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import RolesPage from './pages/RolesPage.jsx';
import StaffPage from './pages/StaffPage.jsx';
import VehiclesPage from './pages/VehiclesPage.jsx';
import VehicleDetailPage from './pages/VehicleDetailPage.jsx';
import BookingsPage from './pages/BookingsPage.jsx';
import BookingDetailPage from './pages/BookingDetailPage.jsx';
import PublicBookingPage from './pages/PublicBookingPage.jsx';
import PublicHomePage from './pages/PublicHomePage.jsx';
import PublicVehiclesPage from './pages/PublicVehiclesPage.jsx';
import PublicVehicleDetailPage from './pages/PublicVehicleDetailPage.jsx';
import RentalOperationsPage from './pages/RentalOperationsPage.jsx';
import RentalOperationDetailPage from './pages/RentalOperationDetailPage.jsx';
import RentalOperationsSettingsPage from './pages/RentalOperationsSettingsPage.jsx';
import StaffLayout from './components/StaffLayout.jsx';

function SessionLoading() {
  return (
    <main className="container min-vh-100 d-flex align-items-center justify-content-center">
      <div className="spinner-border text-danger" role="status">
        <span className="visually-hidden">Loading session</span>
      </div>
    </main>
  );
}

function SessionIssue() {
  const { loadError, reload } = useAuth();
  return (
    <main className="container min-vh-100 d-flex align-items-center justify-content-center">
      <div className="alert alert-danger w-100" role="alert">
        <h1 className="h5">Staff portal unavailable</h1>
        <p>{loadError}</p>
        <button className="btn btn-outline-danger" onClick={reload}>Try again</button>
      </div>
    </main>
  );
}

function ProtectedRoute({ permission, children }) {
  const { user, loading, loadError } = useAuth();
  if (loading) return <SessionLoading />;
  if (loadError) return <SessionIssue />;
  if (!user) return <Navigate to="/login" replace />;
  const hasPermission = Array.isArray(permission)
    ? permission.some((item) => user.permissions.includes(item))
    : !permission || user.permissions.includes(permission);
  if (!hasPermission) {
    return (
      <div className="container py-5">
        <div className="alert alert-warning">You do not have permission to view this page.</div>
      </div>
    );
  }
  return children;
}

function LoginRoute() {
  const { user, loading, loadError } = useAuth();
  if (loading) return <SessionLoading />;
  if (loadError) return <SessionIssue />;
  if (user) return <Navigate to="/portal" replace />;
  return <LoginPage />;
}

export function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/" element={<PublicHomePage />} />
      <Route path="/fleet" element={<PublicVehiclesPage />} />
      <Route path="/fleet/:id" element={<PublicVehicleDetailPage />} />
      <Route path="/book" element={<PublicBookingPage />} />
      <Route path="/forgot-password" element={<Navigate to="/reset-password" replace />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <StaffLayout />
          </ProtectedRoute>
        }
      >
        <Route path="portal" element={<DashboardPage />} />
        <Route path="change-password" element={<ChangePasswordPage />} />
        <Route
          path="staff"
          element={
            <ProtectedRoute permission="staff.view">
              <StaffPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="roles"
          element={
            <ProtectedRoute permission="roles.view">
              <RolesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="audit"
          element={
            <ProtectedRoute permission="audit_logs.view">
              <AuditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="vehicles"
          element={
            <ProtectedRoute permission={['vehicles.view', 'vehicles.view.assigned']}>
              <VehiclesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="vehicles/:id"
          element={
            <ProtectedRoute permission={['vehicles.view', 'vehicles.view.assigned']}>
              <VehicleDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="bookings"
          element={
            <ProtectedRoute permission={['bookings.view', 'bookings.view.assigned', 'bookings.create']}>
              <BookingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="bookings/:id"
          element={
            <ProtectedRoute permission={['bookings.view', 'bookings.view.assigned']}>
              <BookingDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="rental-operations"
          element={
            <ProtectedRoute permission={[
              'rental.active.view',
              'rental.operations.view',
              'rental.operations.view.assigned',
            ]}>
              <RentalOperationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="rental-operations/settings"
          element={
            <ProtectedRoute permission="settings.manage">
              <RentalOperationsSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="rental-operations/:id"
          element={
            <ProtectedRoute permission={[
              'rental.active.view',
              'rental.operations.view',
              'rental.operations.view.assigned',
            ]}>
              <RentalOperationDetailPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to={user ? '/portal' : '/'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
