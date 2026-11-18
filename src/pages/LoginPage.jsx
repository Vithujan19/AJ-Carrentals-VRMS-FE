import { useState } from 'react';
import logo from '../assets/logo.png';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function LoginPage() {
  const { login, sessionExpired } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
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
          <img className="brand-logo" src={logo} alt="AJ Car Rentals" />
          <span>
            <strong>AJ Car Rentals</strong>
            <small>Staff portal</small>
          </span>
        </div>
        <h1 className="h3 mb-1">Welcome back</h1>
        <p className="text-secondary mb-4">Sign in to manage your assigned operations.</p>
        {sessionExpired && <div className="alert alert-warning">Your session expired. Please sign in again.</div>}
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label" htmlFor="email">Work email</label>
            <input
              id="email"
              type="email"
              className="form-control form-control-lg"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={254}
              required
            />
          </div>
          <div className="mb-4">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-control form-control-lg"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              maxLength={128}
              required
            />
          </div>
          <button className="btn btn-primary btn-lg w-100" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="small mt-4 mb-0">Need to set or reset your password? Contact an administrator, then <Link to="/reset-password">enter your token</Link>.</p>
      </section>
    </main>
  );
}
