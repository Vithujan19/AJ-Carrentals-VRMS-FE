import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api.js';

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: { token, newPassword },
        suppressAuthExpiry: true,
      });
      setToken('');
      setNewPassword('');
      setConfirmPassword('');
      setDone(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand-lockup mb-4">
          <span className="brand-mark">AJ</span>
          <span><strong>AJ Car Rentals</strong><small>Staff portal</small></span>
        </div>
        <h1 className="h3">Choose a new password</h1>
        {done ? (
          <>
            <div className="alert alert-success mt-3">Password reset complete. Sign in with your new password.</div>
            <Link className="btn btn-success w-100" to="/login">Go to sign in</Link>
          </>
        ) : (
          <>
            <p className="text-secondary">Enter the token provided by your administrator. It can only be used once.</p>
            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            <form onSubmit={submit}>
              <label className="form-label" htmlFor="password-token">Setup or reset token</label>
              <input id="password-token" className="form-control form-control-lg mb-3"
                autoComplete="off" value={token} minLength={32} maxLength={256}
                onChange={(event) => setToken(event.target.value)} required />
              <label className="form-label" htmlFor="new-password">New password</label>
              <input
                id="new-password"
                type="password"
                className="form-control form-control-lg mb-3"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
              <label className="form-label" htmlFor="confirm-password">Confirm password</label>
              <input
                id="confirm-password"
                type="password"
                className="form-control form-control-lg mb-4"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
              <button className="btn btn-success btn-lg w-100" disabled={submitting}>
                {submitting ? 'Updating…' : 'Set password'}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
