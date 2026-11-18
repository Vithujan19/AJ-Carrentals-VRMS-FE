import { Link } from 'react-router-dom';
import PublicFleet from '../components/PublicFleet.jsx';

export default function PublicVehiclesPage() {
  return (
    <main className="public-booking-page">
      <header className="public-booking-header"><div className="container d-flex justify-content-between gap-3">
        <Link className="public-brand" to="/"><span className="brand-mark">AJ</span><strong>AJ Car Rentals</strong></Link>
        <Link className="btn btn-outline-success" to="/book">Check availability</Link>
      </div></header>
      <div className="container py-5">
        <p className="eyebrow">AJ CAR RENTALS</p>
        <h1>Our fleet</h1>
        <p className="text-secondary">Browse published vehicles and check availability for your travel dates.</p>
        <PublicFleet />
      </div>
    </main>
  );
}
