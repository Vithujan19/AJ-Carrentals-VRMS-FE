import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { colomboDateTimeToIso, colomboInputValue } from '../date-time.js';
import PublicFleet from '../components/PublicFleet.jsx';
import PublicLayout from '../components/PublicLayout.jsx';
import heroImage from '../assets/cover1.jpeg';
import ctaImage from '../assets/car-br.jpeg';

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
    <PublicLayout>
        <section className="public-site-hero" style={{ backgroundImage: `linear-gradient(90deg, rgb(0 0 0 / 88%), rgb(0 0 0 / 55%)), url(${heroImage})` }}>
          <div className="container">
            <p className="eyebrow">AJ CAR RENTALS</p>
            <h1>The best from the best.</h1>
            <p className="public-site-lead">Choose your dates, explore the available rental options and send us a booking request.</p>
            <div className="d-flex flex-wrap gap-2">
              <Link className="btn btn-primary btn-lg" to="/fleet">Explore vehicles</Link>
              <a className="btn btn-outline-light btn-lg" href="#search">Check your dates</a>
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
                <button className="btn btn-primary" type="submit">Search</button>
              </div>
            </form>
            {error && <div className="alert alert-danger mt-3 mb-0" role="alert">{error}</div>}
          </div>
        </section>
        <section className="container py-5">
          <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
            <div><p className="eyebrow">OUR FLEET</p><h2 className="h3 mb-0">Explore our vehicles</h2></div>
            <Link className="btn btn-outline-dark" to="/fleet">View all vehicles</Link>
          </div>
          <p className="text-secondary">Browse our published fleet. Availability is checked for your selected dates.</p>
          <PublicFleet featured />
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
      <section className="public-cta" style={{ backgroundImage: `linear-gradient(90deg, rgb(0 0 0 / 80%), rgb(0 0 0 / 35%)), url(${ctaImage})` }}>
        <div className="container">
          <h2>Ready to hit the road?</h2>
          <p>Send a booking request and our team will confirm your reservation.</p>
          <Link className="btn btn-primary btn-lg" to="/book">Book Now</Link>
        </div>
      </section>
    </PublicLayout>
  );
}
