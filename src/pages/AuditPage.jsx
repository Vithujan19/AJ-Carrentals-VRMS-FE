import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api.js';

export default function AuditPage() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiRequest('/audit-logs?limit=100');
      setResult(response.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">GOVERNANCE</p><h1>Audit log</h1></div>
        <button className="btn btn-outline-secondary" onClick={load} disabled={loading}>Refresh</button>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <section className="content-card">
        <p className="small text-secondary">Recent staff, permission, session and operational security events.</p>
        {loading ? <p>Loading audit events…</p> : !result?.items.length ? <p className="text-secondary mb-0">No events recorded.</p> : (
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Record</th><th>Request</th></tr></thead>
              <tbody>
                {result.items.map((item) => (
                  <tr key={item.id}>
                    <td className="text-nowrap">{new Date(item.occurredAt).toLocaleString()}</td>
                    <td>{item.actorIdentifierSnapshot || 'System / unknown'}</td>
                    <td><code>{item.action}</code></td>
                    <td>{item.entityType}<span className="d-block small text-secondary">{item.entityId}</span></td>
                    <td className="small text-secondary">{item.requestId || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
