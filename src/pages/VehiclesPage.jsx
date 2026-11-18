import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, apiResourceUrl } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import VehicleForm from '../components/VehicleForm.jsx';

const initialFilters = {
  search: '',
  status: '',
  category: '',
  fuelType: '',
  transmission: '',
  yearFrom: '',
  yearTo: '',
  documentExpiry: '',
  maintenance: '',
  priceFrom: '',
  priceTo: '',
  availableFrom: '',
  availableTo: '',
};

function statusBadge(status) {
  const classes = {
    AVAILABLE: 'text-bg-success',
    RESERVED: 'text-bg-warning',
    RENTED: 'text-bg-primary',
    MAINTENANCE: 'text-bg-danger',
    INACTIVE: 'text-bg-secondary',
  };
  return <span className={`badge ${classes[status] ?? 'text-bg-secondary'}`}>{status}</span>;
}

export default function VehiclesPage() {
  const { user } = useAuth();
  const canCreate = user.permissions.includes('vehicles.create');
  const canViewPricing = user.permissions.includes('vehicles.pricing.view');
  const [vehicles, setVehicles] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(pagination.page), limit: '20' });
      for (const [key, value] of Object.entries(appliedFilters)) {
        if (!value) continue;
        if (key === 'availableFrom' || key === 'availableTo') {
          if (appliedFilters.availableFrom && appliedFilters.availableTo) {
            params.set(key, new Date(value).toISOString());
          }
        } else {
          params.set(key, value);
        }
      }
      params.set('sortBy', 'createdAt');
      params.set('sortOrder', 'desc');
      const result = await apiRequest(`/v1/vehicles?${params}`);
      setVehicles(result.data.items);
      setPagination(result.data.pagination);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, pagination.page]);

  useEffect(() => { void load(); }, [load]);

  const createVehicle = async (input) => {
    setSaving(true);
    setError('');
    try {
      await apiRequest('/v1/vehicles', { method: 'POST', body: input });
      setNotice('Vehicle created.');
      setShowCreate(false);
      setPagination((current) => ({ ...current, page: 1 }));
      setAppliedFilters({ ...initialFilters });
      setFilters({ ...initialFilters });
    } catch (requestError) {
      setError(requestError.message);
      throw requestError;
    } finally {
      setSaving(false);
    }
  };

  const submitFilters = (event) => {
    event.preventDefault();
    if (Boolean(filters.availableFrom) !== Boolean(filters.availableTo)) {
      setError('Choose both availability dates to filter by a rental period.');
      return;
    }
    setError('');
    setPagination((current) => ({ ...current, page: 1 }));
    setAppliedFilters({ ...filters });
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">FLEET MANAGEMENT</p>
          <h1>Vehicles</h1>
          <p className="text-secondary mb-0">Manage vehicle records, availability and fleet details.</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={load} disabled={loading}>Refresh</button>
          {canCreate && (
            <button className="btn btn-primary" onClick={() => setShowCreate((current) => !current)}>
              {showCreate ? 'Close form' : 'Add vehicle'}
            </button>
          )}
        </div>
      </div>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {notice && <div className="alert alert-success" role="status">{notice}</div>}

      {showCreate && canCreate && (
        <section className="content-card mb-4">
          <h2 className="h5 mb-3">New vehicle</h2>
          <VehicleForm saving={saving} onSubmit={createVehicle} onCancel={() => setShowCreate(false)} />
        </section>
      )}

      <section className="content-card mb-4">
        <form className="row g-3 align-items-end" onSubmit={submitFilters}>
          <div className="col-12 col-lg-3">
            <label className="form-label" htmlFor="vehicle-search">Search fleet</label>
            <input id="vehicle-search" className="form-control" maxLength={100}
              placeholder="Registration, VIN, make or model" value={filters.search}
              onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
          </div>
          <div className="col-6 col-lg-2">
            <label className="form-label" htmlFor="vehicle-status">Operational status</label>
            <select id="vehicle-status" className="form-select" value={filters.status}
              onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              <option value="">All vehicles</option>
              {['AVAILABLE', 'RESERVED', 'RENTED', 'MAINTENANCE', 'INACTIVE']
                .map((value) => <option key={value}>{value}</option>)}
            </select>
          </div>
          <div className="col-6 col-lg-1">
            <label className="form-label" htmlFor="vehicle-year-from">Year from</label>
            <input id="vehicle-year-from" className="form-control" type="number" min="1886" max="2100"
              value={filters.yearFrom}
              onChange={(event) => setFilters({ ...filters, yearFrom: event.target.value })} />
          </div>
          <div className="col-6 col-lg-1">
            <label className="form-label" htmlFor="vehicle-year-to">Year to</label>
            <input id="vehicle-year-to" className="form-control" type="number" min="1886" max="2100"
              value={filters.yearTo}
              onChange={(event) => setFilters({ ...filters, yearTo: event.target.value })} />
          </div>
          <div className="col-6 col-lg-2">
            <label className="form-label" htmlFor="vehicle-document-expiry">Document expiry</label>
            <select id="vehicle-document-expiry" className="form-select" value={filters.documentExpiry}
              onChange={(event) => setFilters({ ...filters, documentExpiry: event.target.value })}>
              <option value="">All documents</option>
              <option value="expiring">Expiring soon</option>
              <option value="expired">Expired</option>
              <option value="missing">Missing required documents</option>
            </select>
          </div>
          <div className="col-6 col-lg-2">
            <label className="form-label" htmlFor="vehicle-maintenance-filter">Maintenance</label>
            <select id="vehicle-maintenance-filter" className="form-select" value={filters.maintenance}
              onChange={(event) => setFilters({ ...filters, maintenance: event.target.value })}>
              <option value="">All vehicles</option>
              <option value="due">Service due soon</option>
              <option value="overdue">Service overdue</option>
              <option value="in_progress">Job in progress</option>
            </select>
          </div>
          {canViewPricing && (
            <>
              <div className="col-6 col-lg-2">
                <label className="form-label" htmlFor="vehicle-price-from">Minimum rate (LKR)</label>
                <input id="vehicle-price-from" className="form-control" type="number" min="0" step="0.01"
                  value={filters.priceFrom}
                  onChange={(event) => setFilters({ ...filters, priceFrom: event.target.value })} />
              </div>
              <div className="col-6 col-lg-2">
                <label className="form-label" htmlFor="vehicle-price-to">Maximum rate (LKR)</label>
                <input id="vehicle-price-to" className="form-control" type="number" min="0" step="0.01"
                  value={filters.priceTo}
                  onChange={(event) => setFilters({ ...filters, priceTo: event.target.value })} />
              </div>
            </>
          )}
          <div className="col-6 col-lg-2">
            <label className="form-label" htmlFor="vehicle-category-filter">Category</label>
            <select id="vehicle-category-filter" className="form-select" value={filters.category}
              onChange={(event) => setFilters({ ...filters, category: event.target.value })}>
              <option value="">All</option>
              {['SEDAN', 'HATCHBACK', 'SUV', 'VAN', 'PICKUP', 'WAGON', 'COUPE', 'OTHER']
                .map((value) => <option key={value}>{value}</option>)}
            </select>
          </div>
          <div className="col-6 col-lg-2">
            <label className="form-label" htmlFor="vehicle-fuel-filter">Fuel</label>
            <select id="vehicle-fuel-filter" className="form-select" value={filters.fuelType}
              onChange={(event) => setFilters({ ...filters, fuelType: event.target.value })}>
              <option value="">All</option>
              {['PETROL', 'DIESEL', 'HYBRID', 'ELECTRIC', 'LPG', 'OTHER']
                .map((value) => <option key={value}>{value}</option>)}
            </select>
          </div>
          <div className="col-6 col-lg-2">
            <label className="form-label" htmlFor="vehicle-transmission-filter">Transmission</label>
            <select id="vehicle-transmission-filter" className="form-select" value={filters.transmission}
              onChange={(event) => setFilters({ ...filters, transmission: event.target.value })}>
              <option value="">All</option>
              {['MANUAL', 'AUTOMATIC', 'OTHER'].map((value) => <option key={value}>{value}</option>)}
            </select>
          </div>
          <div className="col-6 col-lg-2">
            <label className="form-label" htmlFor="available-from">Available from</label>
            <input id="available-from" className="form-control" type="datetime-local"
              value={filters.availableFrom}
              onChange={(event) => setFilters({ ...filters, availableFrom: event.target.value })} />
          </div>
          <div className="col-6 col-lg-2">
            <label className="form-label" htmlFor="available-to">Available until</label>
            <input id="available-to" className="form-control" type="datetime-local"
              value={filters.availableTo}
              onChange={(event) => setFilters({ ...filters, availableTo: event.target.value })} />
          </div>
          <div className="col-12 col-lg-2">
            <button className="btn btn-outline-primary w-100">Apply filters</button>
          </div>
        </form>
      </section>

      <section className="content-card">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h5 mb-0">Fleet inventory</h2>
          <span className="small text-secondary">{pagination.total} vehicles</span>
        </div>
        {loading ? (
          <div className="d-flex align-items-center gap-2 py-4" role="status">
            <span className="spinner-border spinner-border-sm text-success" />
            <span>Loading vehicles…</span>
          </div>
        ) : vehicles.length === 0 ? (
          <p className="text-secondary mb-0">No vehicles match these filters.</p>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Registration</th>
                  <th>Status</th>
                  <th>Year / fuel</th>
                  <th>Mileage</th>
                  {canViewPricing && <th>Current rates</th>}
                  <th><span className="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((vehicle) => {
                  const image =
                    vehicle.images.find(({ isPrimary, isPublished }) => isPrimary && isPublished) ??
                    vehicle.images.find(({ isPublished }) => isPublished);
                  return (
                    <tr key={vehicle.id}>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          {image ? (
                            <img className="vehicle-thumb" src={apiResourceUrl(image.publicUrl)}
                              alt="" loading="lazy" />
                          ) : <div className="vehicle-thumb vehicle-thumb-empty" aria-hidden="true">AJ</div>}
                          <span>
                            <strong className="d-block">{vehicle.specification?.make} {vehicle.specification?.model}</strong>
                            <small className="text-secondary">
                              {vehicle.specification?.category ?? 'Category not set'}
                              {vehicle.specification?.transmission ? ` · ${vehicle.specification.transmission}` : ''}
                            </small>
                          </span>
                        </div>
                      </td>
                      <td className="text-nowrap">{vehicle.registrationNumber}</td>
                      <td>{statusBadge(vehicle.operationalStatus)}</td>
                      <td className="text-nowrap">
                        {vehicle.specification?.manufacturingYear ?? '—'}
                        {vehicle.specification?.fuelType ? ` · ${vehicle.specification.fuelType}` : ''}
                      </td>
                      <td className="text-nowrap">
                        {vehicle.currentOdometerKm == null
                          ? 'Not recorded'
                          : `${vehicle.currentOdometerKm.toLocaleString()} km`}
                      </td>
                      {canViewPricing && (
                        <td>
                          {vehicle.rates.length
                            ? vehicle.rates.map((rate) => (
                                <span className="d-block small" key={rate.id}>
                                  {rate.package.name}: {rate.currency} {rate.rentalPrice}
                                </span>
                              ))
                            : <span className="text-secondary">No active rates</span>}
                        </td>
                      )}
                      <td>
                        <Link className="btn btn-sm btn-outline-primary"
                          to={`/vehicles/${vehicle.id}`}>Manage</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="d-flex justify-content-between align-items-center mt-3">
          <span className="small text-secondary">
            Page {pagination.page} of {Math.max(pagination.pages, 1)}
          </span>
          <div className="btn-group">
            <button className="btn btn-outline-secondary btn-sm"
              disabled={loading || pagination.page <= 1}
              onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))}>
              Previous
            </button>
            <button className="btn btn-outline-secondary btn-sm"
              disabled={loading || pagination.page >= pagination.pages}
              onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))}>
              Next
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
