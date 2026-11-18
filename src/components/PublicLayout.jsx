import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import logo from '../assets/logo.png';

const whatsappNumber = String(import.meta.env.VITE_WHATSAPP_NUMBER ?? '').replace(/\D/g, '');

const links = [
  ['/', 'Home', true],
  ['/fleet', 'Our Vehicles'],
  ['/book#booking-lookup', 'Check a Request'],
];

export default function PublicLayout({ children, className = '' }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`public-site ${className}`}>
      <header className="public-site-header">
        <div className="container d-flex align-items-center justify-content-between gap-3">
          <Link className="public-brand" to="/" onClick={() => setOpen(false)}>
            <img className="public-logo" src={logo} alt="" width="44" height="44" />
            <span><strong>AJ Car Rentals</strong><small>The best from the best</small></span>
          </Link>
          <button className="btn btn-outline-light public-nav-toggle d-lg-none" type="button"
            aria-expanded={open} aria-controls="public-nav" onClick={() => setOpen((value) => !value)}>
            {open ? 'Close' : 'Menu'}
          </button>
          <nav id="public-nav" className={`public-nav ${open ? 'is-open' : ''}`} aria-label="Main navigation">
            {links.map(([to, label, end]) => (
              <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}>{label}</NavLink>
            ))}
            {whatsappNumber && (
              <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
            )}
            <Link className="btn btn-primary" to="/book" onClick={() => setOpen(false)}>Book Now</Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="public-site-footer">
        <div className="container d-flex flex-wrap justify-content-between align-items-center gap-3">
          <span className="d-flex align-items-center gap-2">
            <img className="public-logo" src={logo} alt="" width="32" height="32" />
            <span>© AJ Car Rentals</span>
          </span>
          <nav className="d-flex flex-wrap gap-3" aria-label="Footer navigation">
            <Link to="/fleet">Our Vehicles</Link>
            <Link to="/book">Book a vehicle</Link>
            <Link to="/login">Staff portal</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
