import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, apiResourceUrl } from '../api.js';

export function PublicVehicleCard({ vehicle }) {
  const spec = vehicle.specification;
  const name = [spec?.make, spec?.model, spec?.variant].filter(Boolean).join(' ') || 'Vehicle';
  const rate = vehicle.rates[0];
  return (
    <article className="content-card public-fleet-card h-100">
      {vehicle.images[0]
        ? <img className="public-vehicle-image" src={apiResourceUrl(vehicle.images[0].url)} alt={vehicle.images[0].caption || name} loading="lazy" />
        : <div className="public-image-placeholder">Vehicle photo unavailable</div>}
      <h3 className="h5">{name}</h3>
      <p className="text-secondary small">
        {[spec?.category, spec?.seatingCapacity ? `${spec.seatingCapacity} seats` : null, spec?.transmission, spec?.fuelType].filter(Boolean).join(' · ')}
      </p>
      <p>{rate ? `${rate.currency} ${rate.rentalPrice} / ${rate.package.durationCount} ${rate.package.rentalPeriod.toLowerCase()}` : 'Contact us for pricing'}</p>
      <p className="small text-secondary">Check availability for your dates.</p>
      <div className="d-flex flex-wrap gap-2 mt-auto">
        <Link className="btn btn-outline-primary" to={`/fleet/${vehicle.id}`}>View details</Link>
        <Link className="btn btn-primary" to={`/book?vehicleId=${encodeURIComponent(vehicle.id)}`}>Book now</Link>
      </div>
    </article>
  );
}

const emptyFilters = { search: '', category: '', seatingCapacity: '', transmission: '', fuelType: '', maxPrice: '', sort: 'newest' };

export default function PublicFleet({ featured = false }) {
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const query = new URLSearchParams({ page: String(page), limit: featured ? '6' : '12' });
    for (const [key, value] of Object.entries(applied)) if (value && !(key === 'sort' && value === 'newest')) query.set(key, value);
    apiRequest(`/v1/public/vehicles?${query}`)
      .then(({ data }) => { if (active) setResult(data); })
      .catch((err) => { if (active) { setResult(null); setError(err.message); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [applied, featured, page, retry]);

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  return (
    <>
      {!featured && (
        <form className="content-card row g-3 mb-4" onSubmit={(event) => { event.preventDefault(); setPage(1); setApplied({ ...filters }); }}>
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="fleet-search">Make or model</label>
            <input id="fleet-search" className="form-control" maxLength={100} value={filters.search} onChange={(event) => setFilter('search', event.target.value)} />
          </div>
          {[
            ['category', 'Category', ['SEDAN', 'HATCHBACK', 'SUV', 'VAN', 'PICKUP', 'WAGON', 'COUPE', 'OTHER']],
            ['transmission', 'Transmission', ['MANUAL', 'AUTOMATIC', 'OTHER']],
            ['fuelType', 'Fuel', ['PETROL', 'DIESEL', 'HYBRID', 'ELECTRIC', 'LPG', 'OTHER']],
          ].map(([key, label, options]) => (
            <div className="col-6 col-md-2" key={key}>
              <label className="form-label" htmlFor={`fleet-${key}`}>{label}</label>
              <select id={`fleet-${key}`} className="form-select" value={filters[key]} onChange={(event) => setFilter(key, event.target.value)}>
                <option value="">All</option>
                {options.map((option) => <option value={option} key={option}>{option.replaceAll('_', ' ')}</option>)}
              </select>
            </div>
          ))}
          <div className="col-6 col-md-2">
            <label className="form-label" htmlFor="fleet-seats">Minimum seats</label>
            <input id="fleet-seats" className="form-control" type="number" min="1" max="255" value={filters.seatingCapacity} onChange={(event) => setFilter('seatingCapacity', event.target.value)} />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label" htmlFor="fleet-maxPrice">Maximum rental price</label>
            <input id="fleet-maxPrice" className="form-control" type="number" min="0" value={filters.maxPrice} onChange={(event) => setFilter('maxPrice', event.target.value)} />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label" htmlFor="fleet-sort">Sort by</label>
            <select id="fleet-sort" className="form-select" value={filters.sort} onChange={(event) => setFilter('sort', event.target.value)}>
              <option value="newest">Newest listed</option>
              <option value="name">Make and model</option>
              <option value="year_desc">Year, newest first</option>
            </select>
          </div>
          <div className="col-12 d-flex gap-2">
            <button className="btn btn-primary">Apply filters</button>
            <button type="button" className="btn btn-outline-dark" onClick={() => { setFilters(emptyFilters); setApplied(emptyFilters); setPage(1); }}>Reset</button>
          </div>
        </form>
      )}
      {loading && <p role="status">Loading vehicles…</p>}
      {error && <div className="alert alert-danger" role="alert">{error} <button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={() => setRetry((value) => value + 1)}>Try again</button></div>}
      {!loading && !error && result?.items.length === 0 && <p>No published vehicles match your search. Please check back or change your filters.</p>}
      {!loading && !error && result?.items.length > 0 && (
        <div className="row g-3">
          {result.items.map((vehicle) => <div className="col-12 col-md-6 col-xl-4" key={vehicle.id}><PublicVehicleCard vehicle={vehicle} /></div>)}
        </div>
      )}
      {!featured && !loading && result?.pagination.pages > 1 && (
        <nav className="d-flex align-items-center gap-3 mt-4" aria-label="Vehicle pages">
          <button type="button" className="btn btn-outline-primary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
          <span>Page {page} of {result.pagination.pages}</span>
          <button type="button" className="btn btn-outline-primary" disabled={page >= result.pagination.pages} onClick={() => setPage((value) => value + 1)}>Next</button>
        </nav>
      )}
    </>
  );
}
