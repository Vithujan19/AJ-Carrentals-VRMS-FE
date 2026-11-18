import { useState } from 'react';
import { apiRequest, apiResourceUrl } from '../api.js';

function formatPrice(rate) {
  return `${rate.currency} ${Number(rate.rentalPrice).toLocaleString('en-LK')} / ${rate.package.name}`;
}

export default function VehiclePublicationPanel({ vehicle, canPublish, onChanged }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);

  const publicUrl = `${window.location.origin}/fleet/${vehicle.id}`;
  const isPublished = vehicle.isPublished;
  const ineligible = vehicle.archivedAt || vehicle.status !== 'ACTIVE';

  const toggle = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await apiRequest(`/v1/vehicles/${vehicle.id}/publication`, {
        method: 'PATCH',
        body: { isPublished: !isPublished },
      });
      setMessage(isPublished
        ? 'Public sharing turned off. The vehicle is no longer on the public website.'
        : 'Public sharing turned on. The vehicle is now on the public website.');
      await onChanged();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setMessage('Public link copied.');
    } catch {
      setError('Could not copy automatically. Select the link and copy it manually.');
    }
  };

  const togglePreview = async () => {
    if (preview) {
      setPreview(null);
      return;
    }
    setPreviewing(true);
    setError('');
    try {
      const result = await apiRequest(`/v1/vehicles/${vehicle.id}/public-preview`);
      setPreview(result.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPreviewing(false);
    }
  };

  const specification = preview?.specification;
  const lowestRate = preview?.rates?.[0];

  return (
    <section className="content-card publication-panel" aria-labelledby="publication-heading">
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
        <div>
          <p className="eyebrow">VEHICLE PUBLICATION</p>
          <h2 className="h5 mb-1" id="publication-heading">Public sharing</h2>
          <p className="text-secondary mb-0">
            {isPublished
              ? 'This vehicle appears on the public AJ Car Rentals website, and customers can view its details and availability.'
              : 'This vehicle is private and does not appear on the public website.'}
          </p>
        </div>
        <div className="d-flex align-items-center gap-3">
          <span className={`badge ${isPublished ? 'text-bg-success' : 'text-bg-secondary'}`}>
            {isPublished ? 'Published' : 'Not published'}
          </span>
          <div className="form-check form-switch publication-switch m-0">
            <input
              id="public-sharing-switch"
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={isPublished}
              disabled={!canPublish || saving || (ineligible && !isPublished)}
              onChange={toggle}
              aria-describedby="public-sharing-help"
            />
            <label className="form-check-label fw-semibold" htmlFor="public-sharing-switch">
              {isPublished ? 'ON' : 'OFF'}
            </label>
          </div>
        </div>
      </div>

      <p id="public-sharing-help" className="small text-secondary mt-3 mb-0">
        {!canPublish && 'You do not have permission to change public sharing. '}
        {ineligible && 'Only active, unarchived vehicles can be published. '}
        Public visibility is separate from availability: a published vehicle stays listed while it is
        reserved or rented, and customers can check future dates. Turning sharing off never deletes the
        vehicle or its booking history.
      </p>

      {isPublished && (
        <div className="input-group mt-3">
          <input className="form-control" readOnly value={publicUrl} aria-label="Public vehicle link"
            onFocus={(event) => event.target.select()} />
          <button type="button" className="btn btn-outline-secondary" onClick={copyLink}>Copy link</button>
          <a className="btn btn-outline-secondary" href={publicUrl} target="_blank" rel="noreferrer">Open</a>
        </div>
      )}

      <div className="d-flex flex-wrap gap-2 mt-3">
        <button type="button" className="btn btn-outline-primary" onClick={togglePreview} disabled={previewing}>
          {previewing ? 'Loading preview…' : preview ? 'Hide preview' : 'Preview public listing'}
        </button>
      </div>

      <div aria-live="polite">
        {message && <div className="alert alert-success mt-3 mb-0" role="status">{message}</div>}
        {error && <div className="alert alert-danger mt-3 mb-0" role="alert">{error}</div>}
      </div>

      {preview && (
        <article className="publication-preview mt-3">
          <p className="small text-secondary mb-2">
            Preview of what customers see. Only published photos and currently effective active rates are shown.
          </p>
          {preview.images[0]
            ? <img className="publication-preview-image" alt={preview.images[0].caption || 'Vehicle'}
                src={apiResourceUrl(preview.images[0].url)} />
            : <div className="alert alert-warning">No published photo yet. Publish a photo under Images &amp; documents.</div>}
          <h3 className="h6 mt-2">{specification?.make} {specification?.model} {specification?.variant}</h3>
          <p className="mb-1">{preview.description || <em>No public description.</em>}</p>
          <p className="mb-0 fw-semibold">
            {lowestRate ? `From ${formatPrice(lowestRate)}` : 'No active rate: price will show as unavailable.'}
          </p>
        </article>
      )}
    </section>
  );
}
