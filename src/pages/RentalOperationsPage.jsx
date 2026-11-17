import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api.js';
import { formatColomboDateTime } from '../date-time.js';

const buckets = [
  { value: 'ACTIVE', label: 'Active rentals', count: 'active' },
  { value: 'DUE_TODAY', label: 'Due today', count: 'dueToday' },
  { value: 'OVERDUE', label: 'Overdue', count: 'overdue' },
  { value: 'UPCOMING', label: 'Upcoming', count: 'upcoming' },
];

function statusClass(booking) {
  if (booking.isOverdue) return 'text-bg-danger';
  return booking.status === 'CONFIRMED' ? 'text-bg-primary' : 'text-bg-info';
}

export default function RentalOperationsPage() {
  const [bucket, setBucket] = useState('ACTIVE');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({
        bucket,
        page: String(page),
        limit: '20',
      });
      if (appliedSearch) query.set('search', appliedSearch);
      const result = await apiRequest(`/v1/rental-operations/dashboard?${query}`);
      setData(result.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, bucket, page]);

  useEffect(() => { void load(); }, [load]);

  const selectBucket = (value) => {
    setBucket(value);
    setPage(1);
  };

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(search.trim());
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">FLEET WORKSPACE</p>
          <h1>Rental operations</h1>
          <p className="text-secondary mb-0">Prepare handovers, inspect returns and close out active rentals.</p>
        </div>
      </div>

      {error && <div className="alert alert-danger" role="alert">{error}</div>}

      <section className="content-card mb-4">
        <div className="row g-3">
          {buckets.map((item) => (
            <div className="col-6 col-xl-3" key={item.value}>
              <button
                type="button"
                className={`btn w-100 h-100 text-start p-3 ${bucket === item.value ? 'btn-success' : 'btn-outline-success'}`}
                onClick={() => selectBucket(item.value)}
              >
                <span className="d-block small">{item.label}</span>
                <strong className="fs-4">{data?.counts?.[item.count] ?? '—'}</strong>
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="content-card">
        <form className="row g-2 align-items-end mb-3" onSubmit={submitSearch}>
          <div className="col-12 col-md-8">
            <label className="form-label" htmlFor="rental-search">Find a booking or vehicle</label>
            <input
              id="rental-search"
              className="form-control"
              value={search}
              maxLength={100}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Reference, customer or registration"
            />
          </div>
          <div className="col-12 col-md-auto">
            <button type="submit" className="btn btn-outline-success">Search</button>
          </div>
        </form>

        {loading ? (
          <div className="py-4 text-center" role="status">Loading rental operations…</div>
        ) : data?.items?.length ? (
          <>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Booking</th>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    <th>Pickup</th>
                    <th>Return due</th>
                    <th>Status</th>
                    <th><span className="visually-hidden">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((booking) => (
                    <tr key={booking.id}>
                      <td><strong>{booking.reference}</strong></td>
                      <td>
                        <span className="d-block">{booking.customer.fullName}</span>
                        <small className="text-secondary">{booking.customer.mobileNumber}</small>
                      </td>
                      <td>
                        <span className="d-block">{booking.vehicle.registrationNumber}</span>
                        <small className="text-secondary">
                          {[booking.vehicle.make, booking.vehicle.model].filter(Boolean).join(' ')}
                        </small>
                      </td>
                      <td>{formatColomboDateTime(booking.pickupAt)}</td>
                      <td>{formatColomboDateTime(booking.returnAt)}</td>
                      <td><span className={`badge ${statusClass(booking)}`}>{booking.isOverdue ? 'OVERDUE' : booking.status.replace('_', ' ')}</span></td>
                      <td className="text-end">
                        <Link className="btn btn-sm btn-outline-success" to={`/rental-operations/${booking.id}`}>
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="d-flex justify-content-between align-items-center">
              <small className="text-secondary">{data.total} record{data.total === 1 ? '' : 's'}</small>
              <div className="btn-group">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >Previous</button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  disabled={page * data.limit >= data.total}
                  onClick={() => setPage((current) => current + 1)}
                >Next</button>
              </div>
            </div>
          </>
        ) : (
          <p className="text-secondary text-center py-4 mb-0">
            {bucket === 'ACTIVE' ? 'No active rentals found.' : 'No bookings match this queue.'}
          </p>
        )}
      </section>
    </>
  );
}
