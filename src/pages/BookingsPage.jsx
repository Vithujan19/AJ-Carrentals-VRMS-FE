import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api.js';
import { addCalendarDays, colomboDateTimeToIso, formatColomboDateTime } from '../date-time.js';
import { useAuth } from '../auth/AuthContext.jsx';
import BookingCalendar from '../components/BookingCalendar.jsx';
import BookingForm from '../components/BookingForm.jsx';

const emptyFilters = {
  search: '',
  status: '',
  from: '',
  to: '',
  vehicleId: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

function badgeClass(status) {
  const classes = {
    PENDING: 'text-bg-warning',
    UNDER_REVIEW: 'text-bg-warning',
    CONFIRMED: 'text-bg-primary',
    HANDED_OVER: 'text-bg-info',
    RETURNED: 'text-bg-info',
    COMPLETED: 'text-bg-success',
    CANCELLED: 'text-bg-secondary',
    REJECTED: 'text-bg-danger',
    EXPIRED: 'text-bg-secondary',
    NO_SHOW: 'text-bg-dark',
  };
  return classes[status] ?? 'text-bg-secondary';
}

export default function BookingsPage() {
  const { user } = useAuth();
  const permissions = user.permissions;
  const canCreate = permissions.includes('bookings.create');
  const canViewCustomers = permissions.includes('customers.view');
  const canViewFinancials =
    permissions.includes('bookings.pricing.view') || permissions.includes('payments.view');
  const canViewVehicles =
    permissions.includes('vehicles.view') || permissions.includes('vehicles.view.assigned');
  const [searchParams] = useSearchParams();
  const initialFilters = { ...emptyFilters, status: searchParams.get('status') ?? '' };
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [vehicles, setVehicles] = useState([]);
  const [view, setView] = useState('list');
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: '20',
        sortBy: appliedFilters.sortBy,
        sortOrder: appliedFilters.sortOrder,
      });
      if (appliedFilters.search) params.set('search', appliedFilters.search);
      if (appliedFilters.status) params.set('status', appliedFilters.status);
      if (appliedFilters.vehicleId) params.set('vehicleId', appliedFilters.vehicleId);
      if (appliedFilters.from && appliedFilters.to) {
        params.set('from', colomboDateTimeToIso(`${appliedFilters.from}T00:00`));
        params.set('to', colomboDateTimeToIso(`${addCalendarDays(appliedFilters.to, 1)}T00:00`));
      }
      const result = await apiRequest(`/v1/bookings?${params}`);
      setItems(result.data.items);
      setPagination(result.data.pagination);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, pagination.page]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!canViewVehicles) return;
    apiRequest('/v1/vehicles?page=1&limit=100&sortBy=registration&sortOrder=asc')
      .then((result) => setVehicles(result.data.items))
      .catch(() => setVehicles([]));
  }, [canViewVehicles]);

  const submitFilters = (event) => {
    event.preventDefault();
    if (Boolean(filters.from) !== Boolean(filters.to)) {
      setError('Choose both dates for a date-range filter.');
      return;
    }
    if (filters.from && filters.to && filters.from > filters.to) {
      setError('The date range is invalid.');
      return;
    }
    setError('');
    setPagination((current) => ({ ...current, page: 1 }));
    setAppliedFilters({ ...filters });
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    setPagination((current) => ({ ...current, page: 1 }));
    setAppliedFilters(emptyFilters);
    setError('');
  };

  const createBooking = async (input) => {
    setSaving(true);
    setError('');
    try {
      const result = await apiRequest('/v1/bookings', { method: 'POST', body: input });
      setNotice(`Booking ${result.data.reference} created as ${result.data.status}.`);
      setShowCreate(false);
      setPagination((current) => ({ ...current, page: 1 }));
      setAppliedFilters(emptyFilters);
      setFilters(emptyFilters);
    } catch (requestError) {
      setError(requestError.message);
      throw requestError;
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">RENTAL OPERATIONS</p>
          <h1>Bookings</h1>
          <p className="text-secondary mb-0">Review requests, protect vehicle availability and manage rental status.</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className={`btn ${view === 'list' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setView('list')}>List</button>
          <button type="button" className={`btn ${view === 'calendar' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setView('calendar')}>Calendar</button>
          {canCreate && (
            <button type="button" className="btn btn-primary"
              onClick={() => setShowCreate((current) => !current)}>
              {showCreate ? 'Close form' : 'New booking'}
            </button>
          )}
        </div>
      </div>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {notice && <div className="alert alert-success" role="status">{notice}</div>}

      {showCreate && canCreate && (
        <section className="content-card mb-4">
          <h2 className="h5 mb-3">Create staff booking</h2>
          <BookingForm
            permissions={permissions}
            saving={saving}
            onSubmit={createBooking}
            onCancel={() => setShowCreate(false)}
          />
        </section>
      )}

      {view === 'calendar' ? (
        <BookingCalendar initialStatus={appliedFilters.status} />
      ) : (
        <>
          <section className="content-card mb-4">
            <form className="row g-3 align-items-end" onSubmit={submitFilters}>
              <div className="col-12 col-lg-3">
                <label className="form-label" htmlFor="bookings-search">Search</label>
                <input id="bookings-search" className="form-control" maxLength={100}
                  placeholder={canViewCustomers ? 'Reference, customer or vehicle' : 'Reference or vehicle'}
                  value={filters.search}
                  onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
              </div>
              <div className="col-6 col-lg-2">
                <label className="form-label" htmlFor="bookings-status">Status</label>
                <select id="bookings-status" className="form-select" value={filters.status}
                  onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
                  <option value="">All statuses</option>
                  {['PENDING', 'UNDER_REVIEW', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'NO_SHOW', 'HANDED_OVER', 'RETURNED', 'COMPLETED']
                    .map((status) => <option key={status}>{status}</option>)}
                </select>
              </div>
              {canViewVehicles && (
                <div className="col-6 col-lg-2">
                  <label className="form-label" htmlFor="bookings-vehicle">Vehicle</label>
                  <select id="bookings-vehicle" className="form-select" value={filters.vehicleId}
                    onChange={(event) => setFilters({ ...filters, vehicleId: event.target.value })}>
                    <option value="">All vehicles</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>{vehicle.registrationNumber}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="col-6 col-lg-2">
                <label className="form-label" htmlFor="bookings-from">From</label>
                <input id="bookings-from" className="form-control" type="date" value={filters.from}
                  onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
              </div>
              <div className="col-6 col-lg-2">
                <label className="form-label" htmlFor="bookings-to">To</label>
                <input id="bookings-to" className="form-control" type="date" value={filters.to}
                  onChange={(event) => setFilters({ ...filters, to: event.target.value })} />
              </div>
              <div className="col-6 col-lg-2">
                <label className="form-label" htmlFor="bookings-sort">Sort by</label>
                <select id="bookings-sort" className="form-select" value={filters.sortBy}
                  onChange={(event) => setFilters({ ...filters, sortBy: event.target.value })}>
                  <option value="createdAt">Created date</option>
                  <option value="pickupAt">Pickup</option>
                  <option value="returnAt">Return</option>
                  <option value="reference">Reference</option>
                </select>
              </div>
              <div className="col-12 d-flex gap-2 justify-content-end">
                <button className="btn btn-outline-secondary" type="button" onClick={clearFilters}>Clear filters</button>
                <button className="btn btn-outline-primary" type="submit">Apply filters</button>
              </div>
            </form>
          </section>

          <section className="content-card">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="h5 mb-0">Booking records</h2>
              <span className="small text-secondary">{pagination.total} bookings</span>
            </div>
            {loading ? (
              <div className="py-4 text-secondary" role="status">Loading bookings…</div>
            ) : items.length === 0 ? (
              <div className="py-4">
                <h3 className="h6">No bookings found</h3>
                <p className="text-secondary mb-0">Try changing the filters or create a staff booking.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Customer</th>
                      <th>Vehicle</th>
                      <th>Pickup</th>
                      <th>Return</th>
                      {canViewFinancials && <th>Quoted total</th>}
                      {canViewFinancials && <th>Payment</th>}
                      <th>Status</th>
                      <th><span className="visually-hidden">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((booking) => (
                      <tr key={booking.id}>
                        <td className="text-nowrap"><Link to={`/bookings/${booking.id}`}><strong>{booking.reference}</strong></Link></td>
                        <td>
                          {booking.customer
                            ? <><strong className="d-block">{booking.customer.fullName}</strong><small className="text-secondary">{booking.customer.mobileNumber}</small></>
                            : <span className="text-secondary">Customer details restricted</span>}
                        </td>
                        <td>
                          <strong className="d-block">{booking.registrationSnapshot}</strong>
                          <small className="text-secondary">{booking.vehicle?.specification?.make} {booking.vehicle?.specification?.model}</small>
                        </td>
                        <td className="text-nowrap">{formatColomboDateTime(booking.pickupAt)}</td>
                        <td className="text-nowrap">{formatColomboDateTime(booking.returnAt)}</td>
                        {canViewFinancials && (
                          <td className="text-nowrap">
                            {booking.currency} {booking.confirmedTotal ?? booking.estimatedTotal}
                            <small className="d-block text-secondary">Deposit {booking.securityDepositSnapshot}</small>
                          </td>
                        )}
                        {canViewFinancials && (
                          <td>{booking.financialSummary?.paymentStatus ?? '—'}</td>
                        )}
                        <td><span className={`badge ${badgeClass(booking.status)}`}>{booking.status.replace('_', ' ')}</span></td>
                        <td><Link className="btn btn-sm btn-outline-primary" to={`/bookings/${booking.id}`}>Open</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="d-flex justify-content-between align-items-center mt-3">
              <span className="small text-secondary">Page {pagination.page} of {Math.max(pagination.pages, 1)}</span>
              <div className="btn-group">
                <button type="button" className="btn btn-outline-secondary btn-sm"
                  disabled={loading || pagination.page <= 1}
                  onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))}>Previous</button>
                <button type="button" className="btn btn-outline-secondary btn-sm"
                  disabled={loading || pagination.page >= pagination.pages}
                  onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))}>Next</button>
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}
