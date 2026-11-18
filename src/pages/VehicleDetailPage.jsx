import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import VehicleForm from '../components/VehicleForm.jsx';
import VehiclePublicationPanel from '../components/VehiclePublicationPanel.jsx';
import VehicleHistoryPanel from '../components/VehicleHistoryPanel.jsx';
import VehicleMediaPanel from '../components/VehicleMediaPanel.jsx';
import VehicleMileagePanel from '../components/VehicleMileagePanel.jsx';
import VehiclePricingPanel from '../components/VehiclePricingPanel.jsx';

function expiryState(dateString) {
  if (!dateString) return null;
  const date = new Date(`${dateString.slice(0, 10)}T00:00:00.000Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const warningDate = new Date(today);
  warningDate.setUTCDate(warningDate.getUTCDate() + 30);
  if (date < today) return 'Expired';
  if (date <= warningDate) return 'Expiring soon';
  return 'Valid';
}

function Detail({ label, value }) {
  return (
    <div>
      <dt className="small text-secondary">{label}</dt>
      <dd className="mb-0">{value ?? '—'}</dd>
    </div>
  );
}

export default function VehicleDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [archiveReason, setArchiveReason] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest(`/v1/vehicles/${id}`);
      setVehicle(result.data);
      setStatus(result.data.status);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const permissions = user.permissions;
  const canEdit = permissions.includes('vehicles.update') && !vehicle?.archivedAt;
  const canChangeStatus = permissions.includes('vehicles.status.update') && !vehicle?.archivedAt;
  const canArchive = permissions.includes('vehicles.archive') && !vehicle?.archivedAt;
  const tabs = useMemo(() => [
    { id: 'overview', label: 'Overview', show: true },
    {
      id: 'pricing',
      label: 'Pricing',
      show: permissions.includes('vehicles.pricing.view'),
    },
    {
      id: 'media',
      label: 'Images & documents',
      show: permissions.some((permission) => [
        'vehicles.view',
        'vehicles.view.assigned',
        'vehicles.images.manage',
        'vehicles.documents.view',
      ].includes(permission)),
    },
    {
      id: 'mileage',
      label: 'Mileage',
      show: permissions.some((permission) => [
        'vehicles.mileage.view',
        'vehicles.mileage.update',
        'vehicles.mileage.correct',
      ].includes(permission)),
    },
    {
      id: 'maintenance',
      label: 'Maintenance',
      show: permissions.includes('vehicles.maintenance.view'),
    },
    {
      id: 'bookings',
      label: 'Booking history',
      show: permissions.includes('vehicles.booking_history.view'),
    },
    {
      id: 'audit',
      label: 'Audit history',
      show: permissions.includes('vehicles.audit.view'),
    },
  ], [permissions]);

  const saveVehicle = async (input) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await apiRequest(`/v1/vehicles/${id}`, { method: 'PATCH', body: input });
      setEditing(false);
      setNotice('Vehicle details saved.');
      await load();
    } catch (requestError) {
      setError(requestError.message);
      throw requestError;
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await apiRequest(`/v1/vehicles/${id}/status`, {
        method: 'PATCH',
        body: { status, reason: statusReason },
      });
      setStatusReason('');
      setNotice('Vehicle lifecycle status updated.');
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const archiveVehicle = async (event) => {
    event.preventDefault();
    if (!window.confirm('Archive this vehicle record? Transaction history will be retained.')) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await apiRequest(`/v1/vehicles/${id}/archive`, {
        method: 'POST',
        body: { reason: archiveReason },
      });
      setArchiveReason('');
      setNotice('Vehicle archived. Its history remains available to authorized staff.');
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !vehicle) {
    return <p className="py-4" role="status">Loading vehicle details…</p>;
  }
  if (!vehicle) {
    return (
      <>
        <div className="page-heading"><div><p className="eyebrow">FLEET MANAGEMENT</p><h1>Vehicle unavailable</h1></div></div>
        <div className="alert alert-danger" role="alert">{error || 'This vehicle could not be loaded.'}</div>
        <Link className="btn btn-outline-secondary" to="/vehicles">Back to vehicles</Link>
      </>
    );
  }

  const archived = Boolean(vehicle.archivedAt);
  const currentTab = tabs.some(({ id: tabId }) => tabId === activeTab) ? activeTab : 'overview';

  return (
    <>
      <div className="page-heading">
        <div>
          <Link className="small text-decoration-none" to="/vehicles">← Vehicles</Link>
          <p className="eyebrow mt-3 mb-1">FLEET RECORD</p>
          <h1>{vehicle.specification?.make} {vehicle.specification?.model}</h1>
          <p className="text-secondary mb-0">{vehicle.registrationNumber} · {vehicle.operationalStatus}</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button className="btn btn-outline-secondary" onClick={load} disabled={loading}>Refresh</button>
          {canEdit && !editing && (
            <button className="btn btn-primary" onClick={() => setEditing(true)}>Edit vehicle</button>
          )}
        </div>
      </div>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {notice && <div className="alert alert-success" role="status">{notice}</div>}
      {archived && (
        <div className="alert alert-secondary" role="status">
          This vehicle was archived on {new Date(vehicle.archivedAt).toLocaleString()}. Its history is read-only.
        </div>
      )}
      {loading && vehicle && <div className="small text-secondary mb-3" role="status">Refreshing vehicle…</div>}

      <nav className="nav nav-tabs vehicle-tabs mb-4" aria-label="Vehicle sections">
        {tabs.filter(({ show }) => show).map((tab) => (
          <button
            type="button"
            className={`nav-link${currentTab === tab.id ? ' active' : ''}`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {currentTab === 'overview' && (
        <div className="d-grid gap-4">
          {!editing && !vehicle.archivedAt && (
            <VehiclePublicationPanel
              vehicle={vehicle}
              canPublish={permissions.includes('vehicles.publish')}
              onChanged={load}
            />
          )}
          {editing ? (
            <section className="content-card">
              <h2 className="h5 mb-3">Edit vehicle details</h2>
              <VehicleForm
                vehicle={vehicle}
                saving={saving}
                onSubmit={saveVehicle}
                onCancel={() => setEditing(false)}
              />
            </section>
          ) : (
            <section className="content-card">
              <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
                <div>
                  <p className="eyebrow">OPERATIONAL STATUS</p>
                  <span className={`badge fs-6 ${vehicle.operationalStatus === 'AVAILABLE' ? 'text-bg-success' : 'text-bg-secondary'}`}>
                    {vehicle.operationalStatus}
                  </span>
                  <span className="badge text-bg-light ms-2">{vehicle.status}</span>
                </div>
                <div className="text-end">
                  <p className="small text-secondary mb-1">Current odometer</p>
                  <strong>{vehicle.currentOdometerKm == null
                    ? 'Not recorded'
                    : `${vehicle.currentOdometerKm.toLocaleString()} km`}</strong>
                </div>
              </div>
              <dl className="vehicle-detail-grid mb-0">
                <Detail label="Registration" value={vehicle.registrationNumber} />
                <Detail label="VIN" value={vehicle.vin} />
                <Detail label="Chassis number" value={vehicle.chassisNumber} />
                <Detail label="Engine number" value={vehicle.engineNumber} />
                <Detail label="Make / model" value={`${vehicle.specification?.make ?? ''} ${vehicle.specification?.model ?? ''} ${vehicle.specification?.variant ?? ''}`.trim()} />
                <Detail label="Category" value={vehicle.specification?.category} />
                <Detail label="Year" value={vehicle.specification?.manufacturingYear} />
                <Detail label="Engine capacity" value={vehicle.specification?.engineCapacityCc == null ? null : `${vehicle.specification.engineCapacityCc} cc`} />
                <Detail label="Fuel / transmission" value={[vehicle.specification?.fuelType, vehicle.specification?.transmission].filter(Boolean).join(' / ')} />
                <Detail label="Colour" value={vehicle.specification?.colour} />
                <Detail label="Seats / doors" value={[vehicle.specification?.seatingCapacity, vehicle.specification?.numberOfDoors].filter((value) => value != null).join(' / ')} />
                <Detail label="Drive type" value={vehicle.specification?.driveType} />
                <Detail label="Air conditioning" value={vehicle.specification?.hasAirConditioning == null ? null : vehicle.specification.hasAirConditioning ? 'Yes' : 'No'} />
                <Detail label="Acquired" value={vehicle.acquisitionDate ? new Date(vehicle.acquisitionDate).toLocaleDateString() : null} />
                <Detail label="Description" value={vehicle.description} />
                <Detail label="Public description" value={vehicle.publicDescription} />
                <Detail label="Internal notes" value={vehicle.internalNotes} />
              </dl>
              {vehicle.specification?.features?.length > 0 && (
                <div className="mt-4"><h3 className="h6">Features</h3><div className="d-flex flex-wrap gap-2">
                  {vehicle.specification.features.map((feature) => <span className="badge text-bg-light" key={feature}>{feature}</span>)}
                </div></div>
              )}
            </section>
          )}

          <div className="row g-4">
            <div className="col-12 col-xl-7">
              <section className="content-card h-100">
                <h2 className="h5">Document expiry</h2>
                {vehicle.documentExpiry.length === 0 ? (
                  <p className="text-secondary mb-0">No active vehicle documents have expiry dates recorded.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table align-middle mb-0">
                      <thead><tr><th>Document</th><th>Expiry</th><th>Status</th></tr></thead>
                      <tbody>
                        {vehicle.documentExpiry.filter(({ expiresAt }) => expiresAt).map((document) => {
                          const state = expiryState(document.expiresAt);
                          return (
                            <tr key={document.id}>
                              <td>{document.documentType}</td>
                              <td>{new Date(document.expiresAt).toLocaleDateString()}</td>
                              <td><span className={`badge ${state === 'Expired' ? 'text-bg-danger' : state === 'Expiring soon' ? 'text-bg-warning' : 'text-bg-success'}`}>{state}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
            <div className="col-12 col-xl-5">
              <section className="content-card h-100">
                <h2 className="h5">Maintenance attention</h2>
                {vehicle.maintenance.jobs.length === 0 && vehicle.maintenance.schedules.length === 0 ? (
                  <p className="text-secondary mb-0">No active jobs or schedules.</p>
                ) : (
                  <div className="d-grid gap-3">
                    {vehicle.maintenance.jobs.map((job) => (
                      <div className="border-start border-3 border-warning ps-3" key={job.id}>
                        <strong>{job.summary}</strong>
                        <small className="d-block text-secondary">{job.status}</small>
                      </div>
                    ))}
                    {vehicle.maintenance.schedules.map((schedule) => (
                      <div className="border-start border-3 border-info ps-3" key={schedule.id}>
                        <strong>{schedule.category.name}</strong>
                        <small className="d-block text-secondary">
                          {schedule.dueAt ? `Due ${new Date(schedule.dueAt).toLocaleDateString()}` : 'Mileage-based service'}
                          {schedule.dueAtOdometerKm != null ? ` · ${schedule.dueAtOdometerKm.toLocaleString()} km` : ''}
                        </small>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>

          {canChangeStatus && (
            <section className="content-card">
              <h2 className="h5">Change lifecycle status</h2>
              <form className="row g-3 align-items-end" onSubmit={changeStatus}>
                <div className="col-12 col-md-3">
                  <label className="form-label" htmlFor="vehicle-lifecycle-status">Lifecycle</label>
                  <select id="vehicle-lifecycle-status" className="form-select" value={status}
                    onChange={(event) => setStatus(event.target.value)}>
                    {['ACTIVE', 'INACTIVE', 'RETIRED'].map((value) => <option key={value}>{value}</option>)}
                  </select>
                </div>
                <div className="col-12 col-md-7">
                  <label className="form-label" htmlFor="vehicle-status-reason">Reason</label>
                  <input id="vehicle-status-reason" className="form-control" maxLength="1000" required
                    value={statusReason} onChange={(event) => setStatusReason(event.target.value)} />
                </div>
                <div className="col-12 col-md-2">
                  <button className="btn btn-outline-primary w-100" disabled={saving || status === vehicle.status}>Update</button>
                </div>
              </form>
            </section>
          )}

          {canArchive && (
            <section className="content-card border-danger-subtle">
              <h2 className="h5">Archive vehicle</h2>
              <p className="small text-secondary">Archiving is a soft-retirement. Vehicle, booking and financial history is retained.</p>
              <form className="row g-3 align-items-end" onSubmit={archiveVehicle}>
                <div className="col-12 col-md-9">
                  <label className="form-label" htmlFor="vehicle-archive-reason">Archive reason</label>
                  <input id="vehicle-archive-reason" className="form-control" maxLength="1000" required
                    value={archiveReason} onChange={(event) => setArchiveReason(event.target.value)} />
                </div>
                <div className="col-12 col-md-3">
                  <button className="btn btn-outline-danger w-100" disabled={saving}>Archive vehicle</button>
                </div>
              </form>
            </section>
          )}

          <section className="content-card">
            <h2 className="h5">Lifecycle history</h2>
            {vehicle.statusHistory.length === 0 ? <p className="text-secondary mb-0">No status changes recorded.</p> : (
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead><tr><th>Changed</th><th>From</th><th>To</th><th>Reason</th><th>Staff</th></tr></thead>
                  <tbody>
                    {vehicle.statusHistory.map((entry) => (
                      <tr key={entry.id}>
                        <td>{new Date(entry.changedAt).toLocaleString()}</td>
                        <td>{entry.fromStatus ?? '—'}</td>
                        <td>{entry.toStatus}</td>
                        <td>{entry.reason ?? '—'}</td>
                        <td>{entry.actor?.displayName ?? 'System'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {currentTab === 'pricing' && <VehiclePricingPanel vehicle={vehicle} user={user} />}
      {currentTab === 'media' && <VehicleMediaPanel vehicle={vehicle} user={user} onChanged={load} />}
      {currentTab === 'mileage' && <VehicleMileagePanel vehicle={vehicle} user={user} onChanged={load} />}
      {currentTab === 'maintenance' && <VehicleHistoryPanel vehicleId={id} kind="maintenance" />}
      {currentTab === 'bookings' && <VehicleHistoryPanel vehicleId={id} kind="bookings" />}
      {currentTab === 'audit' && <VehicleHistoryPanel vehicleId={id} kind="audit" />}
    </>
  );
}
