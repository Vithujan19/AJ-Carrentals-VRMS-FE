import { useEffect, useState } from 'react';
import { apiDownload, apiRequest, apiResourceUrl, apiUpload } from '../api.js';

function dateValue(value) {
  return value?.slice(0, 10) ?? '';
}

export default function VehicleMediaPanel({ vehicle, user, onChanged }) {
  const canManageImages = user.permissions.includes('vehicles.images.manage');
  const canViewDocuments = user.permissions.includes('vehicles.documents.view');
  const canManageDocuments = user.permissions.includes('vehicles.documents.manage');
  const [documents, setDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [documentFile, setDocumentFile] = useState(null);
  const [documentType, setDocumentType] = useState('INSURANCE');
  const [issueDate, setIssueDate] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadDocuments = async () => {
    if (!canViewDocuments) return;
    setLoadingDocuments(true);
    setError('');
    try {
      const result = await apiRequest(`/v1/vehicles/${vehicle.id}/documents`);
      setDocuments(result.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingDocuments(false);
    }
  };

  useEffect(() => { void loadDocuments(); }, [vehicle.id, canViewDocuments]);

  const uploadImages = async (event) => {
    event.preventDefault();
    if (!imageFiles.length) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const formData = new FormData();
      imageFiles.forEach((file) => formData.append('images', file));
      await apiUpload(`/v1/vehicles/${vehicle.id}/images`, formData);
      setImageFiles([]);
      event.target.reset();
      setNotice('Vehicle images uploaded.');
      await onChanged();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const updateImage = async (image, patch) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await apiRequest(`/v1/vehicles/${vehicle.id}/images/${image.id}`, {
        method: 'PATCH',
        body: patch,
      });
      await onChanged();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const archiveImage = async (image) => {
    if (!window.confirm('Archive this vehicle image?')) return;
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/v1/vehicles/${vehicle.id}/images/${image.id}`, { method: 'DELETE' });
      setNotice('Vehicle image archived.');
      await onChanged();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const moveImage = async (imageIndex, direction) => {
    const orderedImages = [...vehicle.images].sort((left, right) => left.sortOrder - right.sortOrder);
    const targetIndex = imageIndex + direction;
    if (targetIndex < 0 || targetIndex >= orderedImages.length) return;
    [orderedImages[imageIndex], orderedImages[targetIndex]] = [
      orderedImages[targetIndex],
      orderedImages[imageIndex],
    ];
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/v1/vehicles/${vehicle.id}/images/order`, {
        method: 'PUT',
        body: { imageIds: orderedImages.map(({ id }) => id) },
      });
      setNotice('Vehicle image order updated.');
      await onChanged();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const uploadDocument = async (event) => {
    event.preventDefault();
    if (!documentFile) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const formData = new FormData();
      formData.append('document', documentFile);
      formData.append('documentType', documentType);
      if (issueDate) formData.append('issueDate', issueDate);
      if (expiresAt) formData.append('expiresAt', expiresAt);
      await apiUpload(`/v1/vehicles/${vehicle.id}/documents`, formData);
      setDocumentFile(null);
      setIssueDate('');
      setExpiresAt('');
      event.target.reset();
      setNotice('Vehicle document uploaded. The previous active document of this type was archived.');
      await loadDocuments();
      await onChanged();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const downloadDocument = async (document) => {
    setError('');
    try {
      const blob = await apiDownload(
        `/v1/vehicles/${vehicle.id}/documents/${document.id}/download`,
      );
      const objectUrl = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = document.originalName;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const updateDocumentExpiry = async (document, value) => {
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/v1/vehicles/${vehicle.id}/documents/${document.id}`, {
        method: 'PATCH',
        body: { expiresAt: value || null },
      });
      await loadDocuments();
      setNotice('Document expiry date updated.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const archiveDocument = async (document) => {
    if (!window.confirm('Archive this document? Its private file will no longer be downloadable.')) return;
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/v1/vehicles/${vehicle.id}/documents/${document.id}`, { method: 'DELETE' });
      setNotice('Vehicle document archived.');
      await loadDocuments();
      await onChanged();
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
        <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
          <div>
            <h2 className="h5 mb-1">Vehicle images</h2>
            <p className="small text-secondary mb-0">Only explicitly published images appear on public vehicle listings.</p>
          </div>
          <span className="badge text-bg-light">{vehicle.images.length} active</span>
        </div>
        {canManageImages && !vehicle.archivedAt && (
          <form className="row g-2 align-items-end mb-4" onSubmit={uploadImages}>
            <div className="col-12 col-md-8">
              <label className="form-label" htmlFor="vehicle-images-upload">Add images</label>
              <input id="vehicle-images-upload" className="form-control" type="file" multiple
                accept="image/jpeg,image/png,image/webp" max="10"
                onChange={(event) => setImageFiles([...event.target.files])} />
              <small className="text-secondary">JPEG, PNG or WebP; up to 10 files per upload.</small>
            </div>
            <div className="col-12 col-md-4">
              <button className="btn btn-success w-100" disabled={busy || imageFiles.length === 0}>
                {busy ? 'Uploading…' : 'Upload images'}
              </button>
            </div>
          </form>
        )}
        {vehicle.images.length === 0 ? (
          <p className="text-secondary mb-0">No images have been uploaded.</p>
        ) : (
          <div className="row g-3">
            {[...vehicle.images].sort((left, right) => left.sortOrder - right.sortOrder).map((image, imageIndex, orderedImages) => (
              <div className="col-12 col-md-6 col-xl-4" key={image.id}>
                <article className="vehicle-media-card">
                  <img
                    className="vehicle-media-preview"
                    src={apiResourceUrl(image.contentUrl)}
                    alt={image.caption || `${vehicle.registrationNumber} fleet image`}
                    crossOrigin="use-credentials"
                    loading="lazy"
                  />
                  <div className="p-3">
                    <div className="d-flex flex-wrap gap-2 mb-2">
                      {image.isPrimary && <span className="badge text-bg-success">Primary</span>}
                      {image.isPublished
                        ? <span className="badge text-bg-primary">Public</span>
                        : <span className="badge text-bg-secondary">Private</span>}
                    </div>
                    <p className="small text-secondary mb-2">{image.caption || 'No caption'}</p>
                    {canManageImages && !vehicle.archivedAt && (
                      <div className="d-flex flex-wrap gap-2">
                        <button className="btn btn-sm btn-outline-secondary" disabled={busy || imageIndex === 0}
                          onClick={() => moveImage(imageIndex, -1)}>Move up</button>
                        <button className="btn btn-sm btn-outline-secondary" disabled={busy || imageIndex === orderedImages.length - 1}
                          onClick={() => moveImage(imageIndex, 1)}>Move down</button>
                        <button className="btn btn-sm btn-outline-success" disabled={busy || image.isPrimary}
                          onClick={() => updateImage(image, { isPrimary: true })}>Set primary</button>
                        <button className="btn btn-sm btn-outline-secondary" disabled={busy}
                          onClick={() => updateImage(image, { isPublished: !image.isPublished })}>
                          {image.isPublished ? 'Unpublish' : 'Publish'}
                        </button>
                        <button className="btn btn-sm btn-outline-danger" disabled={busy}
                          onClick={() => archiveImage(image)}>Archive</button>
                      </div>
                    )}
                  </div>
                </article>
              </div>
            ))}
          </div>
        )}
      </section>

      {canViewDocuments && (
        <section>
          <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
            <div>
              <h2 className="h5 mb-1">Private vehicle documents</h2>
              <p className="small text-secondary mb-0">Downloads require permission and are never exposed as public URLs.</p>
            </div>
            <span className="badge text-bg-light">{documents.length} active</span>
          </div>
          {canManageDocuments && !vehicle.archivedAt && (
            <form className="row g-3 align-items-end mb-4" onSubmit={uploadDocument}>
              <div className="col-12 col-md-3">
                <label className="form-label" htmlFor="vehicle-document-type">Document type</label>
                <select id="vehicle-document-type" className="form-select" value={documentType}
                  onChange={(event) => setDocumentType(event.target.value)}>
                  {['REGISTRATION', 'INSURANCE', 'REVENUE_LICENSE', 'EMISSION_CERTIFICATE',
                    'PURCHASE_DOCUMENT', 'SERVICE_RECORD', 'OTHER']
                    .map((type) => <option key={type}>{type}</option>)}
                </select>
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label" htmlFor="vehicle-document-issue">Issue date</label>
                <input id="vehicle-document-issue" className="form-control" type="date" value={issueDate}
                  onChange={(event) => setIssueDate(event.target.value)} />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label" htmlFor="vehicle-document-expiry">Expiry date</label>
                <input id="vehicle-document-expiry" className="form-control" type="date" value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)} />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label" htmlFor="vehicle-document-file">File</label>
                <input id="vehicle-document-file" className="form-control" type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={(event) => setDocumentFile(event.target.files[0] ?? null)} required />
              </div>
              <div className="col-12">
                <button className="btn btn-success" disabled={busy || !documentFile}>
                  {busy ? 'Uploading…' : 'Upload / replace document'}
                </button>
              </div>
            </form>
          )}
          {loadingDocuments ? (
            <p role="status">Loading private documents…</p>
          ) : documents.length === 0 ? (
            <p className="text-secondary mb-0">No active documents.</p>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle">
                <thead><tr><th>Type</th><th>File</th><th>Issue date</th><th>Expiry date</th><th>Size</th><th /></tr></thead>
                <tbody>
                  {documents.map((document) => (
                    <tr key={document.id}>
                      <td>{document.documentType}</td>
                      <td>{document.originalName}</td>
                      <td>{dateValue(document.issueDate) || '—'}</td>
                      <td>
                        {canManageDocuments && !vehicle.archivedAt ? (
                          <input aria-label={`Expiry date for ${document.originalName}`}
                            className="form-control form-control-sm" type="date"
                            value={dateValue(document.expiresAt)}
                            onChange={(event) => updateDocumentExpiry(document, event.target.value)} />
                        ) : dateValue(document.expiresAt) || '—'}
                      </td>
                      <td>{Math.ceil(Number(document.sizeBytes) / 1024)} KB</td>
                      <td className="text-nowrap">
                        <button className="btn btn-sm btn-outline-success me-2" disabled={busy}
                          onClick={() => downloadDocument(document)}>Download</button>
                        {canManageDocuments && !vehicle.archivedAt && (
                          <button className="btn btn-sm btn-outline-danger" disabled={busy}
                            onClick={() => archiveDocument(document)}>Archive</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
