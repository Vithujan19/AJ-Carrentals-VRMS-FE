import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';

export default function RolesPage() {
  const { user } = useAuth();
  const canManage = user.permissions.includes('roles.manage');
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [rolesResult, permissionResult] = await Promise.all([
        apiRequest('/roles'),
        apiRequest('/roles/permissions'),
      ]);
      setRoles(rolesResult.data);
      setPermissions(permissionResult.data);
      setSelectedRoleId((current) => current || rolesResult.data[0]?.id || '');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const selectedRole = roles.find(({ id }) => id === selectedRoleId);
  useEffect(() => {
    setSelectedPermissions(selectedRole?.permissions.map(({ code }) => code) ?? []);
  }, [selectedRoleId, roles]);

  const save = async () => {
    if (!selectedRole) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await apiRequest(`/roles/${selectedRole.id}/permissions`, {
        method: 'PUT',
        body: { permissionCodes: selectedPermissions },
      });
      setNotice('Role permissions saved. Existing sessions for affected staff were revoked.');
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (code) => {
    setSelectedPermissions((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    );
  };

  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">ACCESS MANAGEMENT</p><h1>Roles & permissions</h1></div>
        {canManage && <button className="btn btn-success" onClick={save} disabled={saving || loading || !selectedRole}>
          {saving ? 'Saving…' : 'Save permissions'}
        </button>}
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}
      {loading ? <p>Loading permissions…</p> : (
        <div className="row g-4">
          <div className="col-12 col-xl-3">
            <section className="content-card">
              <h2 className="h5">Roles</h2>
              <div className="list-group list-group-flush">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    className={`list-group-item list-group-item-action${selectedRoleId === role.id ? ' active' : ''}`}
                    onClick={() => setSelectedRoleId(role.id)}
                  >
                    <strong className="d-block">{role.name}</strong>
                    <span className="small">{role.staffCount} staff</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
          <div className="col-12 col-xl-9">
            {selectedRole && (
              <section className="content-card">
                <p className="eyebrow">{selectedRole.code}{selectedRole.isSystem ? ' · SYSTEM ROLE' : ''}</p>
                <h2 className="h5">{selectedRole.name}</h2>
                <p className="text-secondary">{selectedRole.description}</p>
                <div className="permission-grid">
                  {permissions.map((permission) => (
                    <label className="permission-option" key={permission.code}>
                      <input
                        type="checkbox"
                        className="form-check-input mt-1"
                        checked={selectedPermissions.includes(permission.code)}
                        disabled={!canManage}
                        onChange={() => togglePermission(permission.code)}
                      />
                      <span>
                        <strong>{permission.code}</strong>
                        <small>{permission.description}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </>
  );
}
