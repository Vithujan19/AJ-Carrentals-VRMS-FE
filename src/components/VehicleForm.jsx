import { useEffect, useState } from 'react';

const blankSpecification = {
  make: '',
  model: '',
  variant: '',
  category: 'SEDAN',
  manufacturingYear: '',
  engineCapacityCc: '',
  fuelType: 'PETROL',
  transmission: 'MANUAL',
  colour: '',
  seatingCapacity: '',
  numberOfDoors: '',
  bodyType: '',
  driveType: '',
  hasAirConditioning: false,
  features: '',
};

function formFromVehicle(vehicle) {
  const specification = vehicle?.specification ?? {};
  return {
    registrationNumber: vehicle?.registrationNumber ?? '',
    vin: vehicle?.vin ?? '',
    chassisNumber: vehicle?.chassisNumber ?? '',
    engineNumber: vehicle?.engineNumber ?? '',
    acquisitionDate: vehicle?.acquisitionDate?.slice(0, 10) ?? '',
    description: vehicle?.description ?? '',
    publicDescription: vehicle?.publicDescription ?? '',
    internalNotes: vehicle?.internalNotes ?? '',
    currentOdometerKm: '',
    initialOdometerReason: '',
    specification: {
      ...blankSpecification,
      ...specification,
      category: vehicle ? (specification.category ?? '') : (specification.category ?? 'SEDAN'),
      manufacturingYear: specification.manufacturingYear ?? '',
      engineCapacityCc: specification.engineCapacityCc ?? '',
      seatingCapacity: specification.seatingCapacity ?? '',
      numberOfDoors: specification.numberOfDoors ?? '',
      driveType: specification.driveType ?? '',
      features: Array.isArray(specification.features) ? specification.features.join(', ') : '',
    },
  };
}

function optionalText(value) {
  return value.trim() || null;
}

function optionalNumber(value) {
  return value === '' ? null : Number(value);
}

export default function VehicleForm({ vehicle, saving, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => formFromVehicle(vehicle));
  const [error, setError] = useState('');
  const editing = Boolean(vehicle);

  useEffect(() => {
    setForm(formFromVehicle(vehicle));
    setError('');
  }, [vehicle]);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updateSpecification = (field, value) => {
    setForm((current) => ({
      ...current,
      specification: { ...current.specification, [field]: value },
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const { specification, ...fields } = form;
    const payload = {
      registrationNumber: fields.registrationNumber.trim(),
      vin: optionalText(fields.vin),
      chassisNumber: optionalText(fields.chassisNumber),
      engineNumber: optionalText(fields.engineNumber),
      acquisitionDate: fields.acquisitionDate || null,
      description: optionalText(fields.description),
      publicDescription: optionalText(fields.publicDescription),
      internalNotes: optionalText(fields.internalNotes),
      specification: {
        make: specification.make.trim(),
        model: specification.model.trim(),
        variant: optionalText(specification.variant),
        category: specification.category || null,
        manufacturingYear: optionalNumber(specification.manufacturingYear),
        engineCapacityCc: optionalNumber(specification.engineCapacityCc),
        fuelType: specification.fuelType,
        transmission: specification.transmission,
        colour: optionalText(specification.colour),
        seatingCapacity: optionalNumber(specification.seatingCapacity),
        numberOfDoors: optionalNumber(specification.numberOfDoors),
        bodyType: optionalText(specification.bodyType),
        driveType: specification.driveType || null,
        hasAirConditioning: specification.hasAirConditioning,
        features: specification.features
          .split(',')
          .map((feature) => feature.trim())
          .filter(Boolean),
      },
    };
    if (!editing && fields.currentOdometerKm !== '') {
      payload.currentOdometerKm = Number(fields.currentOdometerKm);
      payload.initialOdometerReason = fields.initialOdometerReason.trim();
    }
    try {
      await onSubmit(payload);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <form onSubmit={submit}>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      <div className="row g-3">
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="vehicle-registration">Registration number</label>
          <input
            id="vehicle-registration"
            className="form-control"
            maxLength={24}
            required
            value={form.registrationNumber}
            onChange={(event) => updateField('registrationNumber', event.target.value)}
          />
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="vehicle-vin">VIN</label>
          <input id="vehicle-vin" className="form-control" maxLength={64} value={form.vin}
            onChange={(event) => updateField('vin', event.target.value)} />
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="vehicle-chassis">Chassis number</label>
          <input id="vehicle-chassis" className="form-control" maxLength={64} value={form.chassisNumber}
            onChange={(event) => updateField('chassisNumber', event.target.value)} />
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="vehicle-engine-number">Engine number</label>
          <input id="vehicle-engine-number" className="form-control" maxLength={64} value={form.engineNumber}
            onChange={(event) => updateField('engineNumber', event.target.value)} />
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="vehicle-acquisition">Acquisition date</label>
          <input id="vehicle-acquisition" className="form-control" type="date" value={form.acquisitionDate}
            onChange={(event) => updateField('acquisitionDate', event.target.value)} />
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="vehicle-make">Make</label>
          <input id="vehicle-make" className="form-control" maxLength={80} required
            value={form.specification.make}
            onChange={(event) => updateSpecification('make', event.target.value)} />
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="vehicle-model">Model</label>
          <input id="vehicle-model" className="form-control" maxLength={100} required
            value={form.specification.model}
            onChange={(event) => updateSpecification('model', event.target.value)} />
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="vehicle-variant">Variant</label>
          <input id="vehicle-variant" className="form-control" maxLength={100} value={form.specification.variant}
            onChange={(event) => updateSpecification('variant', event.target.value)} />
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="vehicle-category">Category</label>
          <select id="vehicle-category" className="form-select" value={form.specification.category}
            onChange={(event) => updateSpecification('category', event.target.value)}>
            {editing && <option value="">Not specified</option>}
            {['SEDAN', 'HATCHBACK', 'SUV', 'VAN', 'PICKUP', 'WAGON', 'COUPE', 'OTHER']
              .map((value) => <option key={value}>{value}</option>)}
          </select>
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="vehicle-year">Manufacturing year</label>
          <input id="vehicle-year" className="form-control" type="number" min="1886" max="2100"
            value={form.specification.manufacturingYear}
            onChange={(event) => updateSpecification('manufacturingYear', event.target.value)} />
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="vehicle-engine-capacity">Engine capacity (cc)</label>
          <input id="vehicle-engine-capacity" className="form-control" type="number" min="0"
            value={form.specification.engineCapacityCc}
            onChange={(event) => updateSpecification('engineCapacityCc', event.target.value)} />
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="vehicle-fuel">Fuel type</label>
          <select id="vehicle-fuel" className="form-select" value={form.specification.fuelType}
            onChange={(event) => updateSpecification('fuelType', event.target.value)}>
            {['PETROL', 'DIESEL', 'HYBRID', 'ELECTRIC', 'LPG', 'OTHER']
              .map((value) => <option key={value}>{value}</option>)}
          </select>
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="vehicle-transmission">Transmission</label>
          <select id="vehicle-transmission" className="form-select" value={form.specification.transmission}
            onChange={(event) => updateSpecification('transmission', event.target.value)}>
            {['MANUAL', 'AUTOMATIC', 'OTHER'].map((value) => <option key={value}>{value}</option>)}
          </select>
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="vehicle-colour">Colour</label>
          <input id="vehicle-colour" className="form-control" maxLength={50} value={form.specification.colour}
            onChange={(event) => updateSpecification('colour', event.target.value)} />
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="vehicle-seats">Seats</label>
          <input id="vehicle-seats" className="form-control" type="number" min="1" max="255"
            value={form.specification.seatingCapacity}
            onChange={(event) => updateSpecification('seatingCapacity', event.target.value)} />
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="vehicle-doors">Doors</label>
          <input id="vehicle-doors" className="form-control" type="number" min="0" max="255"
            value={form.specification.numberOfDoors}
            onChange={(event) => updateSpecification('numberOfDoors', event.target.value)} />
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="vehicle-drive">Drive type</label>
          <select id="vehicle-drive" className="form-select" value={form.specification.driveType}
            onChange={(event) => updateSpecification('driveType', event.target.value)}>
            <option value="">Not specified</option>
            {['FWD', 'RWD', 'AWD', 'FOUR_WD', 'OTHER'].map((value) => <option key={value}>{value}</option>)}
          </select>
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="vehicle-body">Body type</label>
          <input id="vehicle-body" className="form-control" maxLength={60} value={form.specification.bodyType}
            onChange={(event) => updateSpecification('bodyType', event.target.value)} />
        </div>
        <div className="col-12 col-md-4 d-flex align-items-end">
          <div className="form-check mb-2">
            <input id="vehicle-ac" className="form-check-input" type="checkbox"
              checked={form.specification.hasAirConditioning}
              onChange={(event) => updateSpecification('hasAirConditioning', event.target.checked)} />
            <label className="form-check-label" htmlFor="vehicle-ac">Air conditioning</label>
          </div>
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="vehicle-features">Features</label>
          <input id="vehicle-features" className="form-control" maxLength={1000}
            placeholder="ABS, Bluetooth, reverse camera"
            value={form.specification.features}
            onChange={(event) => updateSpecification('features', event.target.value)} />
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="vehicle-description">Description</label>
          <textarea id="vehicle-description" className="form-control" rows="2" maxLength={12000}
            value={form.description} onChange={(event) => updateField('description', event.target.value)} />
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="vehicle-public-description">Public description</label>
          <textarea id="vehicle-public-description" className="form-control" rows="2" maxLength={12000}
            value={form.publicDescription}
            onChange={(event) => updateField('publicDescription', event.target.value)} />
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="vehicle-internal-notes">Internal notes</label>
          <textarea id="vehicle-internal-notes" className="form-control" rows="2" maxLength={12000}
            value={form.internalNotes} onChange={(event) => updateField('internalNotes', event.target.value)} />
        </div>
        {!editing && (
          <>
            <div className="col-12 col-md-4">
              <label className="form-label" htmlFor="vehicle-initial-odometer">Initial odometer (km)</label>
              <input id="vehicle-initial-odometer" className="form-control" type="number" min="0"
                value={form.currentOdometerKm}
                onChange={(event) => updateField('currentOdometerKm', event.target.value)} />
            </div>
            {form.currentOdometerKm !== '' && (
              <div className="col-12 col-md-8">
                <label className="form-label" htmlFor="vehicle-odometer-reason">Initial reading source</label>
                <input id="vehicle-odometer-reason" className="form-control" maxLength={1000} required
                  value={form.initialOdometerReason}
                  onChange={(event) => updateField('initialOdometerReason', event.target.value)} />
              </div>
            )}
          </>
        )}
      </div>
      <div className="d-flex justify-content-end gap-2 mt-4">
        {onCancel && <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>Cancel</button>}
        <button className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Save vehicle' : 'Create vehicle'}
        </button>
      </div>
    </form>
  );
}
