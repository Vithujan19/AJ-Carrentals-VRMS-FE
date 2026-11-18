import { useEffect, useState } from 'react';
import { apiRequest } from '../api.js';

function PageControls({ pagination, loading, onPageChange }) {
  return (
    <div className="d-flex justify-content-between align-items-center mt-3">
      <span className="small text-secondary">
        Page {pagination.page} of {Math.max(pagination.pages, 1)} · {pagination.total} records
      </span>
      <div className="btn-group">
        <button className="btn btn-sm btn-outline-secondary" disabled={loading || pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}>Previous</button>
        <button className="btn btn-sm btn-outline-secondary" disabled={loading || pagination.page >= pagination.pages}
          onClick={() => onPageChange(pagination.page + 1)}>Next</button>
      </div>
    </div>
  );
}

function formatAmount(value, currency) {
  return value == null ? '—' : `${currency} ${value}`;
}

export default function VehicleHistoryPanel({ vehicleId, kind }) {
  const [result, setResult] = useState({
    items: [],
    schedules: [],
    pagination: { page: 1, limit: 20, total: 0, pages: 0 },
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const titles = {
    maintenance: 'Maintenance history',
    bookings: 'Booking history',
    audit: 'Vehicle audit history',
  };
  const paths = {
    maintenance: 'maintenance-history',
    bookings: 'booking-history',
    audit: 'audit-history',
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiRequest(`/v1/vehicles/${vehicleId}/${paths[kind]}?page=${page}&limit=20`);
      setResult(response.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [vehicleId, kind, page]);

  return (
    <section className="content-card">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h5 mb-0">{titles[kind]}</h2>
        <button className="btn btn-sm btn-outline-secondary" onClick={load} disabled={loading}>Refresh</button>
      </div>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {loading ? (
        <p role="status">Loading {titles[kind]?.toLowerCase()}…</p>
      ) : error ? null : kind === 'maintenance' ? (
        <div className="d-grid gap-4">
          <div>
            <h3 className="h6">Service schedule</h3>
            {result.schedules.length === 0 ? <p className="text-secondary">No maintenance schedules.</p> : (
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead><tr><th>Category</th><th>Status</th><th>Due date</th><th>Due mileage</th><th>Notes</th></tr></thead>
                  <tbody>
                    {result.schedules.map((schedule) => (
                      <tr key={schedule.id}>
                        <td>{schedule.category.name}</td>
                        <td>{schedule.status}</td>
                        <td>{schedule.dueAt ? new Date(schedule.dueAt).toLocaleDateString() : '—'}</td>
                        <td>{schedule.dueAtOdometerKm == null ? '—' : `${schedule.dueAtOdometerKm.toLocaleString()} km`}</td>
                        <td>{schedule.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div>
            <h3 className="h6">Service and repair jobs</h3>
            {result.items.length === 0 ? <p className="text-secondary">No maintenance jobs.</p> : (
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead><tr><th>Category / summary</th><th>Status</th><th>Service dates</th><th>Odometer</th><th>Actual cost</th><th>Next service</th></tr></thead>
                  <tbody>
                    {result.items.map((job) => (
                      <tr key={job.id}>
                        <td>{job.category.name}<small className="d-block text-secondary">{job.summary}</small></td>
                        <td>{job.status}</td>
                        <td>
                          {job.actualStartAt ? new Date(job.actualStartAt).toLocaleDateString() : '—'}
                          {job.completedAt && <small className="d-block text-secondary">completed {new Date(job.completedAt).toLocaleDateString()}</small>}
                        </td>
                        <td>{job.odometerKm == null ? '—' : `${job.odometerKm.toLocaleString()} km`}</td>
                        <td className="text-nowrap">
                          {job.actualPartsCost == null && job.actualLabourCost == null ? '—' : (
                            <>
                              {job.actualPartsCost != null && <span className="d-block">Parts: LKR {job.actualPartsCost}</span>}
                              {job.actualLabourCost != null && <span className="d-block">Labour: LKR {job.actualLabourCost}</span>}
                            </>
                          )}
                        </td>
                        <td>{job.nextServiceAt ? new Date(job.nextServiceAt).toLocaleDateString() : '—'}
                          {job.nextServiceOdometerKm != null && <small className="d-block text-secondary">{job.nextServiceOdometerKm.toLocaleString()} km</small>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <PageControls pagination={result.pagination} loading={loading} onPageChange={setPage} />
        </div>
      ) : result.items.length === 0 ? (
        <p className="text-secondary mb-0">No {kind === 'bookings' ? 'booking' : 'audit'} history is available.</p>
      ) : kind === 'bookings' ? (
        <>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead><tr><th>Reference</th><th>Customer</th><th>Status</th><th>Rental period</th><th>Estimated / confirmed</th><th>Created</th></tr></thead>
              <tbody>
                {result.items.map((booking) => (
                  <tr key={booking.id}>
                    <td>{booking.reference}</td>
                    <td>{booking.customerNameSnapshot}</td>
                    <td><span className="badge text-bg-light">{booking.status}</span></td>
                    <td className="text-nowrap">{new Date(booking.pickupAt).toLocaleString()}<small className="d-block text-secondary">to {new Date(booking.returnAt).toLocaleString()}</small></td>
                    <td>
                      {formatAmount(booking.confirmedTotal ?? booking.estimatedTotal, booking.currency)}
                      {booking.confirmedTotal && <small className="d-block text-secondary">estimated {booking.estimatedTotal}</small>}
                    </td>
                    <td className="text-nowrap">{new Date(booking.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PageControls pagination={result.pagination} loading={loading} onPageChange={setPage} />
        </>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead><tr><th>When</th><th>Action</th><th>Actor</th><th>Change details</th></tr></thead>
              <tbody>
                {result.items.map((entry) => (
                  <tr key={entry.id}>
                    <td className="text-nowrap">{new Date(entry.occurredAt).toLocaleString()}</td>
                    <td>{entry.action}</td>
                    <td>{entry.actor?.displayName ?? entry.actorIdentifierSnapshot ?? 'System'}</td>
                    <td><details><summary>View changes</summary><pre className="small mt-2 mb-0">{JSON.stringify({
                      before: entry.beforeSnapshot,
                      after: entry.afterSnapshot,
                    }, null, 2)}</pre></details></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PageControls pagination={result.pagination} loading={loading} onPageChange={setPage} />
        </>
      )}
    </section>
  );
}
