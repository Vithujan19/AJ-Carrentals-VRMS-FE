import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';

function StaffRow({
  staff,
  roles,
  onChanged,
  allowRoleChange,
  allowStatusChange,
  allowSessionManagement,
  allowPasswordTokens,
}) {
  const [roleIds, setRoleIds] = useState(staff.roles.map(({ id }) => id));
  const [sessions, setSessions] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [passwordToken, setPasswordToken] = useState(null);

  const updateRoles = async () => {
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/staff/${staff.id}/roles`, { method: 'PUT', body: { roleIds } });
      await onChanged();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async () => {
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/staff/${staff.id}/status`, {
        method: 'PATCH',
        body: { status: ['ACTIVE', 'PENDING_SETUP'].includes(staff.status) ? 'INACTIVE' : 'ACTIVE' },
      });
      await onChanged();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleSessions = async () => {
    setError('');
    try {
      if (sessions) {
        setSessions(null);
        return;
      }
      const result = await apiRequest(`/staff/${staff.id}/sessions`);
      setSessions(result.data);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const revokeSession = async (sessionId) => {
    setError('');
    try {
      await apiRequest(`/staff/${staff.id}/sessions/${sessionId}`, { method: 'DELETE' });
      const result = await apiRequest(`/staff/${staff.id}/sessions`);
      setSessions(result.data);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const generatePasswordToken = async () => {
    setBusy(true);
    setError('');
    setPasswordToken(null);
    try {
      const result = await apiRequest(`/staff/${staff.id}/password-token`, { method: 'POST' });
      setPasswordToken(result.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const revokePasswordTokens = async () => {
    if (!window.confirm(`Revoke unused password tokens for ${staff.displayName}?`)) return;
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/staff/${staff.id}/password-token`, { method: 'DELETE' });
      setPasswordToken(null);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr>
      <td>
        <strong className="d-block">{staff.displayName}</strong>
        <span className="small text-secondary">{staff.email}</span>
        {error && <span className="d-block small text-danger mt-1">{error}</span>}
      </td>
      <td><span className={`badge ${staff.status === 'ACTIVE' ? 'text-bg-success' : 'text-bg-secondary'}`}>{staff.status}</span></td>
      <td>
        {allowRoleChange ? (
          <>
            <select
              className="form-select form-select-sm"
              aria-label={`Roles for ${staff.displayName}`}
              value={roleIds}
              multiple
              onChange={(event) => setRoleIds([...event.target.selectedOptions].map(({ value }) => value))}
            >
              {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
            </select>
            <button className="btn btn-sm btn-outline-success mt-2" onClick={updateRoles} disabled={busy}>
              Save roles
            </button>
          </>
        ) : staff.roles.map(({ name }) => name).join(', ')}
      </td>
      <td className="text-nowrap">
        {allowSessionManagement && (
          <button className="btn btn-sm btn-outline-secondary me-2" onClick={toggleSessions}>
            {sessions ? 'Hide sessions' : 'Sessions'}
          </button>
        )}
        {allowStatusChange && (
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={updateStatus}
            disabled={busy}
          >
            {['ACTIVE', 'PENDING_SETUP'].includes(staff.status) ? 'Deactivate' : 'Activate'}
          </button>
        )}
        {allowPasswordTokens && (
          <div className="mt-2">
            {['ACTIVE', 'PENDING_SETUP'].includes(staff.status) && (
              <button className="btn btn-sm btn-outline-success me-2" onClick={generatePasswordToken} disabled={busy}>
                Generate {staff.status === 'PENDING_SETUP' ? 'setup' : 'reset'} token
              </button>
            )}
            <button className="btn btn-sm btn-outline-danger" onClick={revokePasswordTokens} disabled={busy}>
              Revoke tokens
            </button>
            {passwordToken && (
              <div className="alert alert-warning mt-2 text-wrap" role="status">
                <p className="mb-1">Share this token securely. It will not be shown again.</p>
                <label className="visually-hidden" htmlFor={`password-token-${staff.id}`}>Password token</label>
                <input id={`password-token-${staff.id}`} className="form-control form-control-sm"
                  readOnly value={passwordToken.token} onFocus={(event) => event.target.select()} />
                <small>Expires {new Date(passwordToken.expiresAt).toLocaleString('en-LK', { timeZone: 'Asia/Colombo' })} (Sri Lanka time).</small>
                <button className="btn btn-link btn-sm d-block p-0" onClick={() => setPasswordToken(null)}>Hide token</button>
              </div>
            )}
          </div>
        )}
        {sessions && (
          <div className="session-list mt-2">
            {sessions.length === 0 && <span className="small text-secondary">No sessions</span>}
            {sessions.map((session) => (
              <div className="small border-top py-2" key={session.id}>
                <span className="d-block">{session.userAgent || 'Unknown browser'}</span>
                <span className="text-secondary">{session.ipAddress || 'IP unavailable'}</span>
                {!session.revokedAt && (
                  <button
                    className="btn btn-link btn-sm p-0 ms-2"
                    onClick={() => revokeSession(session.id)}
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </td>
    </tr>
  );
}

export default function StaffPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({ displayName: '', email: '', mobileNumber: '', roleIds: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const canCreate = user.permissions.includes('staff.create');
  const canManageRoles = user.permissions.includes('staff.roles.assign');
  const canManageStatus = user.permissions.includes('staff.deactivate');
  const canManageSessions = user.permissions.includes('staff.sessions.manage');
  const canManagePasswordTokens = user.permissions.includes('staff.manage');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const staffPromise = apiRequest('/staff?limit=100');
      const rolesPromise = user.permissions.includes('roles.view')
        ? apiRequest('/roles')
        : Promise.resolve({ data: [] });
      const [staffResult, roleResult] = await Promise.all([staffPromise, rolesPromise]);
      setStaff(staffResult.data.items);
      setRoles(roleResult.data);
      setForm((current) => ({
        ...current,
        roleIds: current.roleIds.length ? current.roleIds : roleResult.data.slice(0, 1).map(({ id }) => id),
      }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [user.permissions]);

  useEffect(() => { void load(); }, [load]);

  const createStaff = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await apiRequest('/staff', {
        method: 'POST',
        body: {
          ...form,
          mobileNumber: form.mobileNumber || undefined,
        },
      });
      setNotice(`Account created for ${result.data.staff.email}. An administrator must generate a setup token.`);
      setForm({ displayName: '', email: '', mobileNumber: '', roleIds: roles.slice(0, 1).map(({ id }) => id) });
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">ACCESS MANAGEMENT</p><h1>Staff</h1></div>
        <button className="btn btn-outline-secondary" onClick={load} disabled={loading}>Refresh</button>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {notice && <div className="alert alert-info">{notice}</div>}
      {canCreate && (
        <section className="content-card mb-4">
          <h2 className="h5">Create staff member</h2>
          <form className="row g-3 align-items-end" onSubmit={createStaff}>
            <div className="col-12 col-md-3">
              <label className="form-label" htmlFor="staff-name">Full name</label>
              <input id="staff-name" className="form-control" value={form.displayName} maxLength={160} required
                onChange={(event) => setForm({ ...form, displayName: event.target.value })} />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label" htmlFor="staff-email">Work email</label>
              <input id="staff-email" type="email" className="form-control" value={form.email} maxLength={254} required
                onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </div>
            <div className="col-12 col-md-2">
              <label className="form-label" htmlFor="staff-mobile">Mobile</label>
              <input id="staff-mobile" className="form-control" value={form.mobileNumber} maxLength={32}
                onChange={(event) => setForm({ ...form, mobileNumber: event.target.value })} />
            </div>
            <div className="col-12 col-md-2">
              <label className="form-label" htmlFor="staff-role">Initial role</label>
              <select id="staff-role" className="form-select" value={form.roleIds[0] ?? ''}
                onChange={(event) => setForm({ ...form, roleIds: event.target.value ? [event.target.value] : [] })} required>
                {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
              </select>
            </div>
            <div className="col-12 col-md-2">
              <button className="btn btn-success w-100" disabled={saving || !roles.length}>
                {saving ? 'Creating…' : 'Create staff'}
              </button>
            </div>
          </form>
          <p className="small text-secondary mt-3 mb-0">New accounts remain pending until the staff member uses an administrator-generated setup token.</p>
        </section>
      )}
      <section className="content-card">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h2 className="h5 mb-0">Staff accounts</h2>
          <span className="small text-secondary">{staff.length} shown</span>
        </div>
        {loading ? <p>Loading staff…</p> : staff.length === 0 ? <p className="text-secondary mb-0">No staff accounts found.</p> : (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead><tr><th>Staff member</th><th>Status</th><th>Roles</th><th>Sessions / actions</th></tr></thead>
              <tbody>
                {staff.map((item) => (
                  <StaffRow
                    key={item.id}
                    staff={item}
                    roles={roles}
                    onChanged={load}
                    allowRoleChange={canManageRoles}
                    allowStatusChange={canManageStatus}
                    allowSessionManagement={canManageSessions || item.id === user.id}
                    allowPasswordTokens={canManagePasswordTokens}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
