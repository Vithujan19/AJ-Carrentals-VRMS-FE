import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { colomboDateTimeToIso, colomboInputValue } from '../date-time.js';

function defaultTime(hours) {
  return colomboInputValue(new Date(Date.now() + hours * 60 * 60 * 1000));
}

export default function PublicHomePage() {
  const navigate = useNavigate();
  const [pickup, setPickup] = useState(() => defaultTime(24));
  const [returnAt, setReturnAt] = useState(() => defaultTime(48));
  const [error, setError] = useState('');

  function search(event) {
    event.preventDefault();
    const pickupIso = colomboDateTimeToIso(pickup);
    const returnIso = colomboDateTimeToIso(returnAt);
    if (!pickupIso || !returnIso || new Date(pickupIso) <= new Date() ||
      new Date(returnIso) <= new Date(pickupIso)) {
      setError('Choose a future pickup and a later return.');
      return;
    }
    const query = new URLSearchParams({ pickup, return: returnAt });
    navigate(`/book?${query}`);
  }

  return (
    <div className="public-site">
      <header className="public-site-header">
        <div className="container d-flex flex-wrap justify-content-between align-items-center gap-3">
          <Link className="public-brand" to="/"><span className="brand-mark">AJ</span><strong>AJ Car Rentals</strong></Link>
          <nav className="d-flex flex-wrap align-items-center gap-3" aria-label="Main navigation">
            <Link to="/book">Find a vehicle</Link>
            <Link to="/book#booking-lookup">Check a request</Link>
            <Link to="/login">Staff sign in</Link>
          </nav>
        </div>
      </header>
      <main>
        <section className="public-site-hero">
          <div className="container">
            <p className="eyebrow">AJ CAR RENTALS</p>
            <h1>Find the right car for every journey.</h1>
            <p className="public-site-lead">Choose your dates, explore the available rental options and send us a booking request.</p>
            <div className="d-flex flex-wrap gap-2">
              <Link className="btn btn-success btn-lg" to="/book">Explore vehicles</Link>
              <a className="btn btn-outline-success btn-lg" href="#search">Check your dates</a>
            </div>
          </div>
        </section>
        <section className="container public-site-search" id="search">
          <div className="content-card">
            <h2 className="h4">Find a vehicle for your dates</h2>
            <p className="text-secondary">All times are in Sri Lanka time. A search result is not a confirmed reservation.</p>
            <form className="row g-3 align-items-end" onSubmit={search}>
              <div className="col-12 col-md-5">
                <label className="form-label" htmlFor="home-pickup">Pickup date and time</label>
                <input className="form-control" id="home-pickup" type="datetime-local" value={pickup}
                  onChange={(event) => setPickup(event.target.value)} required />
              </div>
              <div className="col-12 col-md-5">
                <label className="form-label" htmlFor="home-return">Return date and time</label>
                <input className="form-control" id="home-return" type="datetime-local" value={returnAt}
                  onChange={(event) => setReturnAt(event.target.value)} required />
              </div>
              <div className="col-12 col-md-2 d-grid">
                <button className="btn btn-success" type="submit">Search</button>
              </div>
            </form>
            {error && <div className="alert alert-danger mt-3 mb-0" role="alert">{error}</div>}
          </div>
        </section>
        <section className="container py-5">
          <h2 className="h3 mb-4">How booking works</h2>
          <div className="row g-3">
            {[
              ['01', 'Choose your dates', 'Search current vehicle and package availability.'],
              ['02', 'Send a request', 'Choose a vehicle and share your contact details.'],
              ['03', 'Await confirmation', 'Our team reviews your request before confirming a reservation.'],
            ].map(([number, title, description]) => (
              <div className="col-12 col-md-4" key={number}>
                <article className="content-card h-100">
                  <p className="eyebrow">{number}</p>
                  <h3 className="h5">{title}</h3>
                  <p className="text-secondary mb-0">{description}</p>
                </article>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer className="public-site-footer">
        <div className="container d-flex flex-wrap justify-content-between gap-3">
          <span>AJ Car Rentals</span>
          <nav className="d-flex flex-wrap gap-3" aria-label="Footer navigation">
            <Link to="/book">Book a vehicle</Link>
            <Link to="/login">Staff portal</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
