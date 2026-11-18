import { useState } from 'react';
import { apiRequest } from '../api.js';
import { colomboDateTimeToIso, colomboInputValue } from '../date-time.js';

function futureDefault(hours) {
  return colomboInputValue(new Date(Date.now() + hours * 60 * 60 * 1000));
}

export default function BookingForm({ permissions, saving, onSubmit, onCancel }) {
  const [pickupAt, setPickupAt] = useState(futureDefault(2));
  const [returnAt, setReturnAt] = useState(futureDefault(26));
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedRateId, setSelectedRateId] = useState('');
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [customerMode, setCustomerMode] = useState('existing');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newCustomer, setNewCustomer] = useState({ fullName: '', mobileNumber: '', email: '' });
  const [status, setStatus] = useState('PENDING');
  const [source, setSource] = useState('STAFF_PORTAL');
  const [pickupLocation, setPickupLocation] = useState('');
  const [returnLocation, setReturnLocation] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [adjustment, setAdjustment] = useState({
    chargeType: 'DELIVERY',
    amount: '',
    description: '',
  });
  const [error, setError] = useState('');
  const canAdjustPricing = permissions.includes('bookings.pricing.adjust');

  const selectedVehicle = vehicles.find(({ id }) => id === selectedVehicleId);
  const rateOptions = selectedVehicle?.rates ?? [];

  const searchVehicles = async () => {
    setError('');
    if (!pickupAt || !returnAt) {
      setError('Choose both pickup and return times.');
      return;
    }
    const pickupIso = colomboDateTimeToIso(pickupAt);
    const returnIso = colomboDateTimeToIso(returnAt);
    if (!pickupIso || !returnIso || new Date(pickupIso) >= new Date(returnIso)) {
      setError('Return must be later than pickup.');
      return;
    }
    setAvailabilityLoading(true);
    try {
      const params = new URLSearchParams({
        pickupAt: pickupIso,
        returnAt: returnIso,
        page: '1',
        limit: '100',
      });
      const result = await apiRequest(`/v1/bookings/availability?${params}`);
      setVehicles(result.data.items);
      setSelectedVehicleId('');
      setSelectedRateId('');
      if (!result.data.items.length) setError('No vehicles with an active rate are available for this period.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const searchCustomers = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const params = new URLSearchParams({ search: customerSearch, page: '1', limit: '10' });
      const result = await apiRequest(`/v1/bookings/customers?${params}`);
      setCustomerResults(result.data.items);
      if (!result.data.items.length) setError('No matching customer found. Register a new customer if authorized.');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const rate = rateOptions.find(({ id }) => id === selectedRateId);
    if (!rate) {
      setError('Search availability and select a rental rate.');
      return;
    }
    if (customerMode === 'existing' && !selectedCustomer) {
      setError('Search for and select a customer.');
      return;
    }
    const adjustments = canAdjustPricing && adjustment.amount
      ? [{
          chargeType: adjustment.chargeType,
          direction: adjustment.chargeType === 'DISCOUNT' ? 'CREDIT' : 'DEBIT',
          amount: adjustment.amount,
          description: adjustment.description.trim() || adjustment.chargeType,
        }]
      : [];
    try {
      await onSubmit({
        vehicleId: selectedVehicleId,
        rentalPackageId: rate.package.id,
        vehicleRateId: rate.id,
        pickupAt: colomboDateTimeToIso(pickupAt),
        returnAt: colomboDateTimeToIso(returnAt),
        pickupLocation: pickupLocation.trim() || null,
        returnLocation: returnLocation.trim() || null,
        source,
        status,
        ...(customerMode === 'existing'
          ? { customerId: selectedCustomer.id }
          : { customer: { ...newCustomer, email: newCustomer.email.trim() || undefined } }),
        customerNotes: customerNotes.trim() || null,
        internalNotes: internalNotes.trim() || null,
        adjustments,
      });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <form className="row g-3" onSubmit={submit}>
      {error && <div className="col-12"><div className="alert alert-danger mb-0" role="alert">{error}</div></div>}

      <div className="col-12 col-md-6">
        <label className="form-label" htmlFor="booking-pickup">Pickup · Sri Lanka time</label>
        <input id="booking-pickup" className="form-control" type="datetime-local" required
          value={pickupAt} onChange={(event) => setPickupAt(event.target.value)} />
      </div>
      <div className="col-12 col-md-6">
        <label className="form-label" htmlFor="booking-return">Return · Sri Lanka time</label>
        <input id="booking-return" className="form-control" type="datetime-local" required
          value={returnAt} onChange={(event) => setReturnAt(event.target.value)} />
      </div>
      <div className="col-12">
        <button type="button" className="btn btn-outline-primary" onClick={searchVehicles}
          disabled={availabilityLoading}>
          {availabilityLoading ? 'Checking availability…' : 'Search available vehicles'}
        </button>
      </div>

      {vehicles.length > 0 && (
        <>
          <div className="col-12 col-lg-6">
            <label className="form-label" htmlFor="booking-vehicle">Vehicle</label>
            <select id="booking-vehicle" className="form-select" required value={selectedVehicleId}
              onChange={(event) => {
                setSelectedVehicleId(event.target.value);
                setSelectedRateId('');
              }}>
              <option value="">Select an available vehicle</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.registrationNumber} · {vehicle.specification?.make} {vehicle.specification?.model}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-lg-6">
            <label className="form-label" htmlFor="booking-rate">Rental package and rate</label>
            <select id="booking-rate" className="form-select" required value={selectedRateId}
              disabled={!selectedVehicleId}
              onChange={(event) => setSelectedRateId(event.target.value)}>
              <option value="">Select a rate</option>
              {rateOptions.map((rate) => (
                <option key={rate.id} value={rate.id}>
                  {rate.package.name} · {rate.currency} {rate.rentalPrice} / {rate.package.durationCount} {rate.package.rentalPeriod.toLowerCase()}
                  {' · Deposit '} {rate.currency} {rate.securityDeposit}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <div className="col-12">
        <fieldset className="border rounded-3 p-3">
          <legend className="float-none w-auto px-2 fs-6">Customer</legend>
          <div className="d-flex gap-3 mb-3">
            <div className="form-check">
              <input className="form-check-input" type="radio" name="booking-customer-mode"
                id="booking-existing-customer" checked={customerMode === 'existing'}
                onChange={() => { setCustomerMode('existing'); setSelectedCustomer(null); }} />
              <label className="form-check-label" htmlFor="booking-existing-customer">Existing customer</label>
            </div>
            {permissions.includes('customers.create') && (
              <div className="form-check">
                <input className="form-check-input" type="radio" name="booking-customer-mode"
                  id="booking-new-customer" checked={customerMode === 'new'}
                  onChange={() => { setCustomerMode('new'); setSelectedCustomer(null); }} />
                <label className="form-check-label" htmlFor="booking-new-customer">Register new customer</label>
              </div>
            )}
          </div>
          {customerMode === 'existing' ? (
            <>
              <div className="input-group">
                <input className="form-control" minLength={2} maxLength={100}
                  aria-label="Search customers" placeholder="Search name, phone or email"
                  value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} />
                <button className="btn btn-outline-secondary" type="button" onClick={searchCustomers}
                  disabled={customerSearch.trim().length < 2}>Search</button>
              </div>
              {customerResults.length > 0 && (
                <div className="list-group mt-2">
                  {customerResults.map((customer) => (
                    <button className={`list-group-item list-group-item-action${selectedCustomer?.id === customer.id ? ' active' : ''}`}
                      type="button" key={customer.id} onClick={() => setSelectedCustomer(customer)}>
                      <strong>{customer.fullName}</strong> · {customer.mobileNumber}
                      {customer.email ? ` · ${customer.email}` : ''}
                    </button>
                  ))}
                </div>
              )}
              {selectedCustomer && (
                <p className="small text-success mt-2 mb-0">Selected: {selectedCustomer.fullName} · {selectedCustomer.mobileNumber}</p>
              )}
            </>
          ) : (
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="booking-customer-name">Full name</label>
                <input id="booking-customer-name" className="form-control" required maxLength={160}
                  value={newCustomer.fullName}
                  onChange={(event) => setNewCustomer({ ...newCustomer, fullName: event.target.value })} />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="booking-customer-mobile">Mobile number</label>
                <input id="booking-customer-mobile" className="form-control" required maxLength={32}
                  value={newCustomer.mobileNumber}
                  onChange={(event) => setNewCustomer({ ...newCustomer, mobileNumber: event.target.value })} />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="booking-customer-email">Email</label>
                <input id="booking-customer-email" className="form-control" type="email" maxLength={254}
                  value={newCustomer.email}
                  onChange={(event) => setNewCustomer({ ...newCustomer, email: event.target.value })} />
              </div>
            </div>
          )}
        </fieldset>
      </div>

      <div className="col-12 col-md-6">
        <label className="form-label" htmlFor="booking-source">Booking channel</label>
        <select id="booking-source" className="form-select" value={source}
          onChange={(event) => setSource(event.target.value)}>
          <option value="STAFF_PORTAL">Staff portal</option>
          <option value="PHONE">Phone</option>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
      <div className="col-12 col-md-6">
        <label className="form-label" htmlFor="booking-create-status">Initial status</label>
        <select id="booking-create-status" className="form-select" value={status}
          onChange={(event) => setStatus(event.target.value)}>
          <option value="PENDING">Pending review</option>
          {permissions.includes('bookings.confirm') && <option value="CONFIRMED">Confirm immediately</option>}
        </select>
      </div>
      <div className="col-12 col-md-6">
        <label className="form-label" htmlFor="booking-pickup-location">Pickup location</label>
        <input id="booking-pickup-location" className="form-control" maxLength={255}
          value={pickupLocation} onChange={(event) => setPickupLocation(event.target.value)} />
      </div>
      <div className="col-12 col-md-6">
        <label className="form-label" htmlFor="booking-return-location">Return location</label>
        <input id="booking-return-location" className="form-control" maxLength={255}
          value={returnLocation} onChange={(event) => setReturnLocation(event.target.value)} />
      </div>
      {canAdjustPricing && (
        <div className="col-12">
          <fieldset className="border rounded-3 p-3">
            <legend className="float-none w-auto px-2 fs-6">Optional manual quote adjustment</legend>
            <div className="row g-3">
              <div className="col-12 col-md-3">
                <label className="form-label" htmlFor="booking-adjustment-type">Type</label>
                <select id="booking-adjustment-type" className="form-select" value={adjustment.chargeType}
                  onChange={(event) => setAdjustment({ ...adjustment, chargeType: event.target.value })}>
                  <option value="DELIVERY">Delivery charge</option>
                  <option value="CLEANING">Cleaning charge</option>
                  <option value="OTHER">Other charge</option>
                  <option value="DISCOUNT">Discount</option>
                </select>
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label" htmlFor="booking-adjustment-amount">Amount (LKR)</label>
                <input id="booking-adjustment-amount" className="form-control" inputMode="decimal"
                  pattern="(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?" value={adjustment.amount}
                  onChange={(event) => setAdjustment({ ...adjustment, amount: event.target.value })} />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="booking-adjustment-description">Reason / description</label>
                <input id="booking-adjustment-description" className="form-control" maxLength={1000}
                  value={adjustment.description}
                  onChange={(event) => setAdjustment({ ...adjustment, description: event.target.value })} />
              </div>
            </div>
            <p className="small text-secondary mt-2 mb-0">
              Automatic pricing rules are not applied. Manual adjustments are audited and the deposit is shown separately.
            </p>
          </fieldset>
        </div>
      )}
      <div className="col-12">
        <label className="form-label" htmlFor="booking-customer-notes">Customer requests</label>
        <textarea id="booking-customer-notes" className="form-control" rows="2" maxLength={4000}
          value={customerNotes} onChange={(event) => setCustomerNotes(event.target.value)} />
      </div>
      {permissions.includes('bookings.view') && (
        <div className="col-12">
          <label className="form-label" htmlFor="booking-internal-notes">Internal notes</label>
          <textarea id="booking-internal-notes" className="form-control" rows="2" maxLength={4000}
            value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} />
        </div>
      )}
      <div className="col-12 d-flex flex-wrap gap-2 justify-content-end">
        <button className="btn btn-outline-secondary" type="button" onClick={onCancel} disabled={saving}>Close</button>
        <button className="btn btn-primary" type="submit" disabled={saving || !selectedRateId}>
          {saving ? 'Saving booking…' : status === 'CONFIRMED' ? 'Create and confirm' : 'Create pending booking'}
        </button>
      </div>
    </form>
  );
}
