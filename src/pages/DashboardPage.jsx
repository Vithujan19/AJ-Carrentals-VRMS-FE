import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';

const COUNTS = [
  { status: 'PENDING', label: 'Pending requests', hint: 'Awaiting a decision' },
  { status: 'UNDER_REVIEW', label: 'Under review', hint: 'Waiting on more information' },
  { status: 'CONFIRMED', label: 'Confirmed', hint: 'Upcoming rentals' },
];

function useBookingCounts(enabled) {
  const [counts, setCounts] = useState({});
  const [state, setState] = useState({ loading: enabled, error: '' });
  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    Promise.all(COUNTS.map(({ status }) =>
      apiRequest(`/v1/bookings?status=${status}&limit=1`).then(({ data }) => [status, data.pagination.total])))
      .then((entries) => { if (active) { setCounts(Object.fromEntries(entries)); setState({ loading: false, error: '' }); } })
      .catch((err) => { if (active) setState({ loading: false, error: err.message }); });
    return () => { active = false; };
  }, [enabled]);
  return { counts, ...state };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const canSeeBookings = user.permissions.includes('bookings.view');
  const { counts, loading, error } = useBookingCounts(canSeeBookings);
  const pending = counts.PENDING ?? 0;
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">OVERVIEW</p>
          <h1>Good to see you, {user.displayName.split(' ')[0]}</h1>
          <p className="text-secondary mb-0">Your access is based on your current staff permissions.</p>
        </div>
      </div>
      {canSeeBookings && (
        <section className="row g-3 mb-3" aria-label="Booking queue">
          {error && <div className="col-12"><div className="alert alert-danger mb-0" role="alert">{error}</div></div>}
          {COUNTS.map(({ status, label, hint }) => (
            <div className="col-12 col-md-4" key={status}>
              <Link className="content-card dashboard-stat h-100 d-block text-decoration-none" to={`/bookings?status=${status}`}>
                <p className="eyebrow">{label.toUpperCase()}</p>
                <p className="dashboard-stat-value mb-1">{loading ? '…' : counts[status] ?? 0}</p>
                <span className="small text-secondary">{hint}</span>
              </Link>
            </div>
          ))}
          {!loading && pending > 0 && (
            <div className="col-12">
              <div className="alert alert-warning mb-0" role="status">
                {pending} booking {pending === 1 ? 'request needs' : 'requests need'} your attention.{' '}
                <Link to="/bookings?status=PENDING">Open the pending queue</Link>
              </div>
            </div>
          )}
        </section>
      )}
      <section className="row g-3">
        <div className="col-12 col-lg-7">
          <div className="content-card h-100">
            <p className="eyebrow">ACCOUNT</p>
            <h2 className="h5">Your staff profile</h2>
            <dl className="row mb-0">
              <dt className="col-sm-4">Name</dt>
              <dd className="col-sm-8">{user.displayName}</dd>
              <dt className="col-sm-4">Email</dt>
              <dd className="col-sm-8">{user.email}</dd>
              <dt className="col-sm-4">Role(s)</dt>
              <dd className="col-sm-8">{user.roles.map(({ name }) => name).join(', ')}</dd>
            </dl>
          </div>
        </div>
        <div className="col-12 col-lg-5">
          <div className="content-card h-100">
            <p className="eyebrow">ACCESS</p>
            <h2 className="h5">Granted permissions</h2>
            <div className="permission-tags">
              {user.permissions.map((permission) => <span key={permission}>{permission}</span>)}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
