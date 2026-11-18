import PublicFleet from '../components/PublicFleet.jsx';
import PublicLayout from '../components/PublicLayout.jsx';

export default function PublicVehiclesPage() {
  return (
    <PublicLayout className="public-page">
      <div className="container py-5">
        <p className="eyebrow">AJ CAR RENTALS</p>
        <h1>Our Vehicles</h1>
        <p className="text-secondary">Browse published vehicles and check availability for your travel dates.</p>
        <PublicFleet />
      </div>
    </PublicLayout>
  );
}
