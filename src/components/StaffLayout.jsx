import { NavLink, Outlet } from 'react-router-dom';
import logo from '../assets/logo.png';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';

const links = [
  { to: '/portal', label: 'Dashboard', permission: null, end: true },
  { to: '/staff', label: 'Staff', permission: 'staff.view' },
  { to: '/roles', label: 'Roles & permissions', permission: 'roles.view' },
  { to: '/audit', label: 'Audit log', permission: 'audit_logs.view' },
  { to: '/vehicles', label: 'Vehicles', permission: ['vehicles.view', 'vehicles.view.assigned'] },
  { to: '/bookings', label: 'Bookings', permission: ['bookings.view', 'bookings.view.assigned', 'bookings.create'] },
  { to: '/rental-operations', label: 'Rental operations', permission: ['rental.active.view', 'rental.operations.view', 'rental.operations.view.assigned'] },
  { to: '/rental-operations/settings', label: 'Rental operations settings', permission: 'settings.manage' },
];

export default function StaffLayout() {
  const { user, logout, sessionExpired } = useAuth();
  const [error, setError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const visibleLinks = links.filter(({ permission }) =>
    !permission ||
    (Array.isArray(permission)
      ? permission.some((item) => user.permissions.includes(item))
      : user.permissions.includes(permission)),
  );

  const handleLogout = async () => {
    setError('');
    setLoggingOut(true);
    try {
      await logout();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="portal-shell">
      <header className="portal-header">
        <div className="container-fluid px-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="brand-lockup">
            <img className="brand-logo" src={logo} alt="AJ Car Rentals" />
            <span>
              <strong>AJ Car Rentals</strong>
              <small>Staff portal</small>
            </span>
          </div>
          <div className="d-flex align-items-center gap-3">
            <span className="text-end d-none d-sm-block">
              <strong className="d-block">{user.displayName}</strong>
              <small className="text-white-50">{user.roles.map(({ name }) => name).join(', ')}</small>
            </span>
            <NavLink className="btn btn-sm btn-outline-light" to="/change-password">Password</NavLink>
            <button className="btn btn-sm btn-outline-light" onClick={handleLogout} disabled={loggingOut}>
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </header>
      <div className="container-fluid px-4">
        {sessionExpired && (
          <div className="alert alert-warning mt-3 mb-0" role="alert">
            Your session expired. Sign in again to continue.
          </div>
        )}
        {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}
        <div className="portal-content">
          <aside className="portal-sidebar">
            <nav className="nav flex-column" aria-label="Staff portal">
              {visibleLinks.map(({ to, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) => `portal-nav-link${isActive ? ' active' : ''}`}
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          </aside>
          <main className="portal-main">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
