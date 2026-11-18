import { useEffect, useState } from 'react';
import { apiRequest } from '../api.js';

export default function VehicleMileagePanel({ vehicle, user, onChanged }) {
  const canRecord = user.permissions.includes('vehicles.mileage.update');
  const canCorrect = user.permissions.includes('vehicles.mileage.correct');
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({ readingKm: '', reason: '' });
  const [correction, setCorrection] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest(`/v1/vehicles/${vehicle.id}/mileage?page=1&limit=50`);
      setHistory(result.data.items);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [vehicle.id]);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const endpoint = correction ? 'mileage/corrections' : 'mileage';
      await apiRequest(`/v1/vehicles/${vehicle.id}/${endpoint}`, {
        method: 'POST',
        body: { readingKm: Number(form.readingKm), reason: form.reason },
      });
      setForm({ readingKm: '', reason: '' });
      setNotice(correction ? 'Mileage correction recorded.' : 'Mileage reading recorded.');
      await Promise.all([load(), onChanged()]);
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
      <section className="content-card">
        <h2 className="h5">Current odometer</h2>
        <p className="display-6 mb-0">
          {vehicle.currentOdometerKm == null
            ? 'Not recorded'
            : `${vehicle.currentOdometerKm.toLocaleString()} km`}
        </p>
        <p className="small text-secondary mt-2 mb-0">
          Mileage updates are append-only and cannot decrease without an audited correction.
        </p>
      </section>

      {canRecord && !vehicle.archivedAt && (
        <section className="content-card">
          <div className="d-flex justify-content-between align-items-start gap-3">
            <div>
              <h2 className="h5">{correction ? 'Correct odometer record' : 'Record odometer reading'}</h2>
              <p className="small text-secondary">Include the source or reason for the reading.</p>
            </div>
            {canCorrect && (
              <button className="btn btn-sm btn-outline-secondary" type="button"
                onClick={() => setCorrection((current) => !current)}>
                {correction ? 'Record a new reading' : 'Correct a previous reading'}
              </button>
            )}
          </div>
          <form className="row g-3 align-items-end" onSubmit={submit}>
            <div className="col-12 col-md-4">
              <label className="form-label" htmlFor="mileage-reading">Odometer (km)</label>
              <input id="mileage-reading" className="form-control" type="number" min="0"
                max="4294967295" required value={form.readingKm}
                onChange={(event) => setForm({ ...form, readingKm: event.target.value })} />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="mileage-reason">Reason / source</label>
              <input id="mileage-reason" className="form-control" maxLength="1000" required
                value={form.reason}
                onChange={(event) => setForm({ ...form, reason: event.target.value })} />
            </div>
            <div className="col-12 col-md-2">
              <button className={`btn w-100 ${correction ? 'btn-outline-danger' : 'btn-primary'}`}
                disabled={busy || (correction && !canCorrect)}>
                {busy ? 'Saving…' : correction ? 'Record correction' : 'Record reading'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="content-card">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h5 mb-0">Mileage history</h2>
          <button className="btn btn-sm btn-outline-secondary" onClick={load} disabled={loading}>Refresh</button>
        </div>
        {loading ? <p role="status">Loading mileage history…</p> : history.length === 0 ? (
          <p className="text-secondary mb-0">No mileage readings have been recorded.</p>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead><tr><th>Recorded</th><th>Reading</th><th>Previous</th><th>Type</th><th>Recorded by</th><th>Reason</th></tr></thead>
              <tbody>
                {history.map((reading) => (
                  <tr key={reading.id}>
                    <td className="text-nowrap">{new Date(reading.recordedAt).toLocaleString()}</td>
                    <td>{reading.readingKm.toLocaleString()} km</td>
                    <td>{reading.previousOdometerKm == null ? '—' : `${reading.previousOdometerKm.toLocaleString()} km`}</td>
                    <td>
                      <span className={`badge ${reading.source === 'CORRECTION' ? 'text-bg-warning' : 'text-bg-light'}`}>
                        {reading.source}
                      </span>
                    </td>
                    <td>{reading.recordedBy?.displayName ?? 'Unknown'}</td>
                    <td>{reading.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
