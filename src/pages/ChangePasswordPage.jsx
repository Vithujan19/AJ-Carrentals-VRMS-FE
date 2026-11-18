import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';

export default function ChangePasswordPage() {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNotice('Password changed. Other active sessions have been signed out.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">ACCOUNT SECURITY</p><h1>Change password</h1></div></div>
      <section className="content-card" style={{ maxWidth: '620px' }}>
        <p className="text-secondary">Use a unique password with at least 12 characters. Changing it revokes other active sessions.</p>
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        {notice && <div className="alert alert-success" role="status">{notice}</div>}
        <form onSubmit={submit}>
          <label className="form-label" htmlFor="current-password">Current password</label>
          <input id="current-password" type="password" autoComplete="current-password" className="form-control mb-3"
            value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
          <label className="form-label" htmlFor="new-password">New password</label>
          <input id="new-password" type="password" autoComplete="new-password" className="form-control mb-3"
            minLength={12} maxLength={128} value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)} required />
          <label className="form-label" htmlFor="confirm-password">Confirm new password</label>
          <input id="confirm-password" type="password" autoComplete="new-password" className="form-control mb-4"
            minLength={12} maxLength={128} value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)} required />
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Updating…' : 'Update password'}</button>
        </form>
      </section>
    </>
  );
}
