import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest, apiResourceUrl } from '../api.js';

export default function PublicVehicleDetailPage() {
  const { id } = useParams();
  const [vehicle, setVehicle] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setVehicle(null);
    apiRequest(`/v1/public/vehicles/${encodeURIComponent(id)}`)
      .then(({ data }) => { if (active) setVehicle(data); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, retry]);

  const spec = vehicle?.specification;
  const name = [spec?.make, spec?.model, spec?.variant].filter(Boolean).join(' ') || 'Vehicle';
  return (
    <main className="public-booking-page">
      <header className="public-booking-header"><div className="container">
        <Link className="public-brand" to="/"><span className="brand-mark">AJ</span><strong>AJ Car Rentals</strong></Link>
      </div></header>
      <div className="container py-5">
        <Link to="/fleet">← Back to vehicles</Link>
        {loading && <p className="mt-4" role="status">Loading vehicle…</p>}
        {error && <div className="alert alert-danger mt-4" role="alert">{error} <button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={() => setRetry((value) => value + 1)}>Try again</button></div>}
        {vehicle && (
          <div className="row g-4 mt-2">
            <div className="col-12 col-lg-7">
              <div className="public-gallery">
                {vehicle.images.length
                  ? vehicle.images.map((image) => <img key={image.id} src={apiResourceUrl(image.url)} alt={image.caption || name} loading="lazy" />)
                  : <div className="public-image-placeholder">Vehicle photo unavailable</div>}
              </div>
            </div>
            <div className="col-12 col-lg-5">
              <h1>{name}</h1>
              {vehicle.description && <p className="public-description">{vehicle.description}</p>}
              <p>{[spec?.category, spec?.manufacturingYear, spec?.seatingCapacity ? `${spec.seatingCapacity} seats` : null, spec?.transmission, spec?.fuelType].filter(Boolean).join(' · ')}</p>
              {Array.isArray(spec?.features) && spec.features.length > 0 && <p>{spec.features.join(' · ')}</p>}
              <h2 className="h4 mt-4">Rental packages</h2>
              {vehicle.rates.length === 0 && <p>Contact us for pricing.</p>}
              {vehicle.rates.map((rate) => (
                <div className="content-card mb-3" key={rate.id}>
                  <h3 className="h5">{rate.package.name}</h3>
                  <p>{rate.currency} {rate.rentalPrice} / {rate.package.durationCount} {rate.package.rentalPeriod.toLowerCase()}</p>
                  <p className="small mb-0">{rate.includedMileageKm.toLocaleString()} km included · Additional km: {rate.currency} {rate.additionalKmRate} · Deposit: {rate.currency} {rate.securityDeposit}</p>
                  {rate.package.conditions && <p className="small mt-2 mb-0">{rate.package.conditions}</p>}
                </div>
              ))}
              <p className="text-secondary">Availability and rates are checked for your selected dates. Requests require staff confirmation.</p>
              <Link className="btn btn-success" to={`/book?vehicleId=${encodeURIComponent(vehicle.id)}`}>Check availability and book</Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
