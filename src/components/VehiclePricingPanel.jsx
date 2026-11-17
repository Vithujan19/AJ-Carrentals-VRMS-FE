import { useEffect, useState } from 'react';
import { apiRequest } from '../api.js';

function localDateTimeValue(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function emptyRate() {
  return {
    rentalPackageId: '',
    rentalPrice: '',
    currency: 'LKR',
    includedMileageKm: '100',
    additionalKmRate: '',
    securityDeposit: '0',
    effectiveFrom: localDateTimeValue(new Date(Date.now() + 5 * 60_000)),
    effectiveTo: '',
  };
}

export default function VehiclePricingPanel({ vehicle, user }) {
  const canManage = user.permissions.includes('vehicles.pricing.manage');
  const [packages, setPackages] = useState([]);
  const [rates, setRates] = useState([]);
  const [rateForm, setRateForm] = useState(emptyRate);
  const [packageForm, setPackageForm] = useState({
    code: '',
    name: '',
    rentalPeriod: 'DAILY',
    durationCount: '1',
    conditions: '',
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [packageResult, rateResult] = await Promise.all([
        apiRequest('/v1/rental-packages?includeInactive=true'),
        apiRequest(`/v1/vehicles/${vehicle.id}/rates?includeInactive=true`),
      ]);
      setPackages(packageResult.data);
      setRates(rateResult.data);
      setRateForm((current) => ({
        ...current,
        rentalPackageId: current.rentalPackageId || packageResult.data.find(({ isActive }) => isActive)?.id || '',
      }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [vehicle.id]);

  const createPackage = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await apiRequest('/v1/rental-packages', {
        method: 'POST',
        body: {
          ...packageForm,
          durationCount: Number(packageForm.durationCount),
          conditions: packageForm.conditions || null,
        },
      });
      setPackageForm({ code: '', name: '', rentalPeriod: 'DAILY', durationCount: '1', conditions: '' });
      setNotice('Rental package created.');
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const createRate = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await apiRequest(`/v1/vehicles/${vehicle.id}/rates`, {
        method: 'POST',
        body: {
          ...rateForm,
          includedMileageKm: Number(rateForm.includedMileageKm),
          effectiveFrom: new Date(rateForm.effectiveFrom).toISOString(),
          effectiveTo: rateForm.effectiveTo
            ? new Date(rateForm.effectiveTo).toISOString()
            : null,
        },
      });
      setRateForm((current) => ({ ...emptyRate(), rentalPackageId: current.rentalPackageId }));
      setNotice('Vehicle rate created. Existing booking price snapshots are unchanged.');
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const deactivateRate = async (rate) => {
    if (!window.confirm('Deactivate this rate? Existing bookings retain their saved price snapshot.')) return;
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/v1/vehicles/${vehicle.id}/rates/${rate.id}`, {
        method: 'PATCH',
        body: { isActive: false },
      });
      setNotice('Rate deactivated.');
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const deactivatePackage = async (rentalPackage) => {
    if (!window.confirm('Deactivate this rental package? Historical rate and booking records are retained.')) return;
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/v1/rental-packages/${rentalPackage.id}`, {
        method: 'PATCH',
        body: { isActive: false },
      });
      setNotice('Rental package deactivated.');
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="d-grid gap-4">
      {error && <div className="alert alert-danger mb-0" role="alert">{error}</div>}
      {notice && <div className="alert alert-success mb-0" role="status">{notice}</div>}
      <section>
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h2 className="h5 mb-1">Rental rates</h2>
            <p className="small text-secondary mb-0">Rates use non-overlapping effective periods and are never applied retroactively to booking snapshots.</p>
          </div>
          <button className="btn btn-sm btn-outline-secondary" onClick={load} disabled={loading}>Refresh</button>
        </div>
        {loading ? <p role="status">Loading vehicle rates…</p> : rates.length === 0 ? (
          <p className="text-secondary">No rates have been configured for this vehicle.</p>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr><th>Package</th><th>Price</th><th>Included km</th><th>Extra km</th><th>Deposit</th><th>Effective</th><th>Status</th><th /></tr>
              </thead>
              <tbody>
                {rates.map((rate) => (
                  <tr key={rate.id}>
                    <td>{rate.rentalPackage.name}<small className="d-block text-secondary">{rate.rentalPackage.rentalPeriod} × {rate.rentalPackage.durationCount}</small></td>
                    <td>{rate.currency} {rate.rentalPrice}</td>
                    <td>{rate.includedMileageKm.toLocaleString()} km</td>
                    <td>{rate.currency} {rate.additionalKmRate}/km</td>
                    <td>{rate.currency} {rate.securityDeposit}</td>
                    <td className="text-nowrap">
                      {new Date(rate.effectiveFrom).toLocaleString()}
                      {rate.effectiveTo && <small className="d-block text-secondary">until {new Date(rate.effectiveTo).toLocaleString()}</small>}
                    </td>
                    <td>
                      <span className={`badge ${rate.isActive && rate.rentalPackage.isActive ? 'text-bg-success' : 'text-bg-secondary'}`}>
                        {rate.isActive && rate.rentalPackage.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td>
                      {canManage && rate.isActive && (
                        <button className="btn btn-sm btn-outline-danger" disabled={busy}
                          onClick={() => deactivateRate(rate)}>Deactivate</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {canManage && !vehicle.archivedAt && (
        <div className="row g-4">
          <div className="col-12 col-xl-5">
            <section className="content-card h-100">
              <h2 className="h5">Create rental package</h2>
              <form className="row g-3" onSubmit={createPackage}>
                <div className="col-12 col-md-4">
                  <label className="form-label" htmlFor="package-code">Code</label>
                  <input id="package-code" className="form-control" maxLength="40" required
                    value={packageForm.code}
                    onChange={(event) => setPackageForm({ ...packageForm, code: event.target.value })} />
                </div>
                <div className="col-12 col-md-8">
                  <label className="form-label" htmlFor="package-name">Package name</label>
                  <input id="package-name" className="form-control" maxLength="120" required
                    value={packageForm.name}
                    onChange={(event) => setPackageForm({ ...packageForm, name: event.target.value })} />
                </div>
                <div className="col-8">
                  <label className="form-label" htmlFor="package-period">Rental period</label>
                  <select id="package-period" className="form-select" value={packageForm.rentalPeriod}
                    onChange={(event) => setPackageForm({ ...packageForm, rentalPeriod: event.target.value })}>
                    {['DAILY', 'WEEKLY', 'MONTHLY'].map((value) => <option key={value}>{value}</option>)}
                  </select>
                </div>
                <div className="col-4">
                  <label className="form-label" htmlFor="package-duration">Units</label>
                  <input id="package-duration" className="form-control" type="number" min="1" max="365" required
                    value={packageForm.durationCount}
                    onChange={(event) => setPackageForm({ ...packageForm, durationCount: event.target.value })} />
                </div>
                <div className="col-12">
                  <label className="form-label" htmlFor="package-conditions">Conditions</label>
                  <textarea id="package-conditions" className="form-control" rows="2" maxLength="12000"
                    value={packageForm.conditions}
                    onChange={(event) => setPackageForm({ ...packageForm, conditions: event.target.value })} />
                </div>
                <div className="col-12">
                  <button className="btn btn-outline-success" disabled={busy}>
                    {busy ? 'Saving…' : 'Create package'}
                  </button>
                </div>
              </form>
              <hr />
              <h3 className="h6">Existing packages</h3>
              <ul className="list-group list-group-flush">
                {packages.map((item) => (
                  <li className="list-group-item px-0 d-flex justify-content-between gap-2" key={item.id}>
                    <span>{item.name}<small className="d-block text-secondary">{item.code} · {item.rentalPeriod}</small></span>
                    {item.isActive ? (
                      <button className="btn btn-sm btn-link text-danger" disabled={busy}
                        onClick={() => deactivatePackage(item)}>Deactivate</button>
                    ) : <span className="badge text-bg-secondary align-self-center">Inactive</span>}
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <div className="col-12 col-xl-7">
            <section className="content-card h-100">
              <h2 className="h5">Add vehicle rate</h2>
              <form className="row g-3" onSubmit={createRate}>
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="rate-package">Rental package</label>
                  <select id="rate-package" className="form-select" required value={rateForm.rentalPackageId}
                    onChange={(event) => setRateForm({ ...rateForm, rentalPackageId: event.target.value })}>
                    <option value="">Select a package</option>
                    {packages.filter(({ isActive }) => isActive).map((item) => (
                      <option key={item.id} value={item.id}>{item.name} ({item.rentalPeriod})</option>
                    ))}
                  </select>
                </div>
                <div className="col-6 col-md-3">
                  <label className="form-label" htmlFor="rate-price">Price (LKR)</label>
                  <input id="rate-price" className="form-control" inputMode="decimal" pattern="(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?" required
                    value={rateForm.rentalPrice}
                    onChange={(event) => setRateForm({ ...rateForm, rentalPrice: event.target.value })} />
                </div>
                <div className="col-6 col-md-3">
                  <label className="form-label" htmlFor="rate-deposit">Security deposit</label>
                  <input id="rate-deposit" className="form-control" inputMode="decimal" pattern="(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?" required
                    value={rateForm.securityDeposit}
                    onChange={(event) => setRateForm({ ...rateForm, securityDeposit: event.target.value })} />
                </div>
                <div className="col-6">
                  <label className="form-label" htmlFor="rate-included">Included mileage (km)</label>
                  <input id="rate-included" className="form-control" type="number" min="0" required
                    value={rateForm.includedMileageKm}
                    onChange={(event) => setRateForm({ ...rateForm, includedMileageKm: event.target.value })} />
                </div>
                <div className="col-6">
                  <label className="form-label" htmlFor="rate-extra">Additional km rate (LKR)</label>
                  <input id="rate-extra" className="form-control" inputMode="decimal" pattern="(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?" required
                    value={rateForm.additionalKmRate}
                    onChange={(event) => setRateForm({ ...rateForm, additionalKmRate: event.target.value })} />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="rate-from">Effective from</label>
                  <input id="rate-from" className="form-control" type="datetime-local" required
                    value={rateForm.effectiveFrom}
                    onChange={(event) => setRateForm({ ...rateForm, effectiveFrom: event.target.value })} />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="rate-to">Effective until (optional)</label>
                  <input id="rate-to" className="form-control" type="datetime-local"
                    value={rateForm.effectiveTo}
                    onChange={(event) => setRateForm({ ...rateForm, effectiveTo: event.target.value })} />
                </div>
                <div className="col-12">
                  <button className="btn btn-success" disabled={busy || packages.every(({ isActive }) => !isActive)}>
                    {busy ? 'Saving…' : 'Save rate'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
