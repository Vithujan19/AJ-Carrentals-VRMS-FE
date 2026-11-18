import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiRequest, apiResourceUrl } from '../api.js';
import { colomboDateTimeToIso, colomboInputValue, formatColomboDateTime } from '../date-time.js';

function defaultTime(hours) {
  return colomboInputValue(new Date(Date.now() + hours * 60 * 60 * 1000));
}

export default function PublicBookingPage() {
  const [params] = useSearchParams();
  const initialPickup = params.get('pickup');
  const initialReturn = params.get('return');
  const vehicleId = params.get('vehicleId');
  const [pickupAt, setPickupAt] = useState(() => initialPickup || defaultTime(24));
  const [returnAt, setReturnAt] = useState(() => initialReturn || defaultTime(48));
  const [vehicles, setVehicles] = useState([]);
  const [selectedRate, setSelectedRate] = useState(null);
  const [contact, setContact] = useState({ fullName: '', mobileNumber: '', email: '' });
  const [customerNotes, setCustomerNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [lookup, setLookup] = useState({ reference: '', token: '' });
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const searchSequence = useRef(0);
  const submittingRef = useRef(false);

  const searchDates = useCallback(async (pickup, end) => {
    const sequence = ++searchSequence.current;
    setError('');
    setSuccess(null);
    setSelectedRate(null);
    setVehicles([]);
    const pickupIso = colomboDateTimeToIso(pickup);
    const returnIso = colomboDateTimeToIso(end);
    if (!pickupIso || !returnIso || new Date(pickupIso) <= new Date() ||
      new Date(pickupIso) >= new Date(returnIso)) {
      setLoading(false);
      setError('Choose a future pickup and a later return.');
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        pickupAt: pickupIso,
        returnAt: returnIso,
        page: '1',
        limit: '100',
      });
      if (vehicleId) params.set('vehicleId', vehicleId);
      const result = await apiRequest(`/v1/public/vehicles/available?${params}`);
      if (sequence !== searchSequence.current) return;
      setVehicles(result.data.items);
      if (!result.data.items.length) setError('No vehicles with an active rental rate are available for this period.');
    } catch (requestError) {
      if (sequence !== searchSequence.current) return;
      setError(requestError.message);
    } finally {
      if (sequence === searchSequence.current) setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    if (initialPickup && initialReturn) {
      setPickupAt(initialPickup);
      setReturnAt(initialReturn);
      void searchDates(initialPickup, initialReturn);
    } else {
      setLoading(false);
      setVehicles([]);
      setSelectedRate(null);
      setError('');
    }
    return () => { searchSequence.current += 1; };
  }, [initialPickup, initialReturn, searchDates]);

  const invalidateSearch = () => {
    searchSequence.current += 1;
    setLoading(false);
    setVehicles([]);
    setSelectedRate(null);
    setError('');
  };

  const search = (event) => {
    event.preventDefault();
    void searchDates(pickupAt, returnAt);
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    if (!selectedRate) {
      setError('Choose a vehicle and rental rate before submitting.');
      return;
    }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError('');
    try {
      const result = await apiRequest('/v1/public/booking-requests', {
        method: 'POST',
        body: {
          vehicleId: selectedRate.vehicle.id,
          rentalPackageId: selectedRate.rate.package.id,
          vehicleRateId: selectedRate.rate.id,
          pickupAt: colomboDateTimeToIso(pickupAt),
          returnAt: colomboDateTimeToIso(returnAt),
          fullName: contact.fullName,
          mobileNumber: contact.mobileNumber,
          email: contact.email.trim() || undefined,
          customerNotes: customerNotes.trim() || null,
        },
      });
      setSuccess(result.data);
      setLookup({ reference: result.data.reference, token: result.data.lookupToken });
      setSelectedRate(null);
      setVehicles([]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const findBooking = async (event) => {
    event.preventDefault();
    setLookupLoading(true);
    setLookupError('');
    setLookupResult(null);
    try {
      const result = await apiRequest('/v1/public/booking-lookup', {
        method: 'POST',
        body: lookup,
      });
      setLookupResult(result.data);
    } catch (requestError) {
      setLookupError(requestError.message);
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <main className="public-booking-page">
      <header className="public-booking-header">
        <div className="container d-flex flex-wrap justify-content-between align-items-center gap-3">
          <Link className="public-brand" to="/"><span className="brand-mark">AJ</span><strong>AJ Car Rentals</strong></Link>
          <a className="btn btn-outline-success" href="#booking-lookup">Check a booking</a>
        </div>
      </header>
      <div className="container py-5">
        <section className="public-booking-hero mb-4">
          <p className="eyebrow">AJ CAR RENTALS</p>
          <h1>Find your next rental</h1>
          <p className="text-secondary mb-0">Search dates, choose an available vehicle and send a request. A request is not confirmed until our staff reviews it.</p>
          {vehicleId && <p className="mt-2 mb-0">Searching for your selected vehicle. <Link to="/book">Search all vehicles</Link></p>}
        </section>

        <section className="content-card mb-4">
          <form className="row g-3 align-items-end" onSubmit={search}>
            <div className="col-12 col-md-5">
              <label className="form-label" htmlFor="public-pickup">Pickup · Sri Lanka time</label>
              <input id="public-pickup" className="form-control" type="datetime-local" required
                value={pickupAt} onChange={(event) => { invalidateSearch(); setPickupAt(event.target.value); }} />
            </div>
            <div className="col-12 col-md-5">
              <label className="form-label" htmlFor="public-return">Return · Sri Lanka time</label>
              <input id="public-return" className="form-control" type="datetime-local" required
                value={returnAt} onChange={(event) => { invalidateSearch(); setReturnAt(event.target.value); }} />
            </div>
            <div className="col-12 col-md-2 d-grid">
              <button className="btn btn-success" disabled={loading}>
                {loading ? 'Searching…' : 'Find vehicles'}
              </button>
            </div>
          </form>
          {error && <div className="alert alert-danger mt-3 mb-0" role="alert">{error}</div>}
        </section>

        {vehicles.length > 0 && (
          <section className="mb-5">
            <h2 className="h4 mb-3">Available vehicles</h2>
            <div className="row g-3">
              {vehicles.map((vehicle) => (
                <div className="col-12 col-lg-6" key={vehicle.id}>
                  <article className={`content-card h-100 public-vehicle-card${selectedRate?.vehicle.id === vehicle.id ? ' selected' : ''}`}>
                    {vehicle.imageUrl && (
                      <img className="public-vehicle-image" src={apiResourceUrl(vehicle.imageUrl)}
                        alt={`${vehicle.specification?.make} ${vehicle.specification?.model}`} loading="lazy" />
                    )}
                    <div className="d-flex justify-content-between align-items-start gap-3">
                      <div>
                        <h3 className="h5 mb-1">{vehicle.specification?.make} {vehicle.specification?.model}</h3>
                        <p className="small text-secondary mb-3">
                          {vehicle.specification?.category ?? 'Vehicle'}
                          {vehicle.specification?.manufacturingYear ? ` · ${vehicle.specification.manufacturingYear}` : ''}
                          {vehicle.specification?.transmission ? ` · ${vehicle.specification.transmission}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="d-grid gap-2">
                      {vehicle.rates.map((rate) => {
                        const selected = selectedRate?.rate.id === rate.id;
                        return (
                          <button type="button" key={rate.id}
                            className={`btn text-start ${selected ? 'btn-success' : 'btn-outline-success'}`}
                            onClick={() => setSelectedRate({ vehicle, rate })}>
                            <strong className="d-block">{rate.package.name}</strong>
                            <span>{rate.currency} {rate.rentalPrice} / {rate.package.durationCount} {rate.package.rentalPeriod.toLowerCase()}</span>
                            <small className="d-block">
                              Deposit {rate.currency} {rate.securityDeposit} · {rate.includedMileageKm.toLocaleString()} km included
                            </small>
                          </button>
                        );
                      })}
                    </div>
                  </article>
                </div>
              ))}
            </div>
          </section>
        )}

        {selectedRate && (
          <section className="content-card mb-5">
            <h2 className="h4">Send a booking request</h2>
            <p className="text-secondary">
              {selectedRate.vehicle.specification?.make} {selectedRate.vehicle.specification?.model}
              {' · '}{selectedRate.rate.package.name}
              {' · '}{formatColomboDateTime(colomboDateTimeToIso(pickupAt))}
              {' – '}{formatColomboDateTime(colomboDateTimeToIso(returnAt))}
            </p>
            <form className="row g-3" onSubmit={submitRequest}>
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="public-name">Full name</label>
                <input id="public-name" className="form-control" required maxLength={160}
                  value={contact.fullName}
                  onChange={(event) => setContact({ ...contact, fullName: event.target.value })} />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="public-mobile">Mobile number</label>
                <input id="public-mobile" className="form-control" required maxLength={32}
                  value={contact.mobileNumber}
                  onChange={(event) => setContact({ ...contact, mobileNumber: event.target.value })} />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="public-email">Email (optional)</label>
                <input id="public-email" className="form-control" type="email" maxLength={254}
                  value={contact.email}
                  onChange={(event) => setContact({ ...contact, email: event.target.value })} />
              </div>
              <div className="col-12">
                <label className="form-label" htmlFor="public-notes">Special requests (optional)</label>
                <textarea id="public-notes" className="form-control" rows="2" maxLength={4000}
                  value={customerNotes} onChange={(event) => setCustomerNotes(event.target.value)} />
              </div>
              <div className="col-12 d-flex justify-content-end">
                <button className="btn btn-success" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit pending request'}
                </button>
              </div>
            </form>
          </section>
        )}

        {success && (
          <section className="alert alert-success mb-5" role="status">
            <h2 className="h5">Request received: {success.reference}</h2>
            <p>Status: <strong>{success.status}</strong>. This is a request only; vehicle availability is checked again when staff confirms it.</p>
            <p>Estimated rental quote: <strong>{success.currency} {success.estimatedTotal}</strong>. Security deposit is separate and is not included in the rental quote.</p>
            <label className="form-label" htmlFor="public-lookup-token">Private lookup token — save it now</label>
            <input id="public-lookup-token" className="form-control font-monospace" readOnly value={success.lookupToken} />
            <p className="small mt-2 mb-0">The token is shown only once here and is also emailed when email delivery is configured.</p>
          </section>
        )}

        <section className="content-card" id="booking-lookup">
          <h2 className="h4">Check your booking request</h2>
          <p className="text-secondary">Use both your booking reference and the private lookup token from the submission confirmation.</p>
          <form className="row g-3" onSubmit={findBooking}>
            <div className="col-12 col-md-4">
              <label className="form-label" htmlFor="lookup-reference">Booking reference</label>
              <input id="lookup-reference" className="form-control" required maxLength={20}
                placeholder="AJR-2026-000001" value={lookup.reference}
                onChange={(event) => setLookup({ ...lookup, reference: event.target.value })} />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="lookup-token">Private lookup token</label>
              <input id="lookup-token" className="form-control font-monospace" required minLength={32} maxLength={128}
                value={lookup.token}
                onChange={(event) => setLookup({ ...lookup, token: event.target.value })} />
            </div>
            <div className="col-12 col-md-2 d-grid align-items-end">
              <button className="btn btn-outline-success" disabled={lookupLoading}>
                {lookupLoading ? 'Checking…' : 'Look up'}
              </button>
            </div>
          </form>
          {lookupError && <div className="alert alert-danger mt-3 mb-0" role="alert">{lookupError}</div>}
          {lookupResult && (
            <div className="alert alert-light border mt-3 mb-0">
              <strong>{lookupResult.reference}</strong> · {lookupResult.status}
              <div>{formatColomboDateTime(lookupResult.pickupAt)} – {formatColomboDateTime(lookupResult.returnAt)}</div>
              <div>{lookupResult.vehicle?.specification?.make} {lookupResult.vehicle?.specification?.model}</div>
              <div>Estimated rental quote: {lookupResult.currency} {lookupResult.confirmedTotal ?? lookupResult.estimatedTotal}</div>
              <div className="small mt-2">Status history: {lookupResult.statusHistory.map((entry) => entry.toStatus).join(' → ')}</div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
