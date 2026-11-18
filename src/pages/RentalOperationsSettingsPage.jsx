import { useEffect, useState } from 'react';
import { apiRequest } from '../api.js';

const documentTypes = [
  ['NIC_FRONT', 'NIC front'],
  ['NIC_BACK', 'NIC back'],
  ['DRIVING_LICENCE_FRONT', 'Driving licence front'],
  ['DRIVING_LICENCE_BACK', 'Driving licence back'],
  ['OTHER', 'Other'],
];

const emptyPolicy = {
  requiredCustomerDocumentTypes: [],
  requireValidDrivingLicence: false,
  requireSecurityDepositBeforeHandover: false,
  allowOutstandingBalanceAtFinalization: false,
  lateReturnRatePerHour: null,
  lateReturnBillingIncrementMinutes: null,
  requiredInspectionComponents: [],
  accessories: [],
};

function ListEditor({ title, items, onChange, codeLabel }) {
  const add = () => onChange([...items, { code: '', label: '' }]);
  const update = (index, key, value) => {
    onChange(items.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [key]: value } : item
    )));
  };
  const remove = (index) => onChange(items.filter((_item, itemIndex) => itemIndex !== index));

  return (
    <fieldset className="border rounded p-3">
      <legend className="float-none w-auto px-2 fs-6">{title}</legend>
      {items.map((item, index) => (
        <div className="row g-2 align-items-end mb-2" key={index}>
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor={`${codeLabel}-${index}-code`}>Code</label>
            <input
              id={`${codeLabel}-${index}-code`}
              className="form-control"
              maxLength={80}
              value={item.code}
              onChange={(event) => update(index, 'code', event.target.value)}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor={`${codeLabel}-${index}-label`}>Label</label>
            <input
              id={`${codeLabel}-${index}-label`}
              className="form-control"
              maxLength={120}
              value={item.label}
              onChange={(event) => update(index, 'label', event.target.value)}
              required
            />
          </div>
          <div className="col-12 col-md-2">
            <button type="button" className="btn btn-outline-danger w-100" onClick={() => remove(index)}>
              Remove
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={add}>
        Add item
      </button>
    </fieldset>
  );
}

export default function RentalOperationsSettingsPage() {
  const [policy, setPolicy] = useState(emptyPolicy);
  const [lateRateInput, setLateRateInput] = useState('');
  const [incrementInput, setIncrementInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    apiRequest('/v1/rental-operations/policy')
      .then(({ data }) => {
        if (!active) return;
        const value = { ...emptyPolicy, ...data };
        setPolicy(value);
        setLateRateInput(value.lateReturnRatePerHour ?? '');
        setIncrementInput(value.lateReturnBillingIncrementMinutes ?? '');
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const body = {
      ...policy,
      lateReturnRatePerHour: lateRateInput.trim() ? lateRateInput.trim() : null,
      lateReturnBillingIncrementMinutes: incrementInput
        ? Number(incrementInput)
        : null,
    };
    try {
      const { data } = await apiRequest('/v1/rental-operations/policy', {
        method: 'PUT',
        body,
      });
      setPolicy(data);
      setLateRateInput(data.lateReturnRatePerHour ?? '');
      setIncrementInput(data.lateReturnBillingIncrementMinutes ?? '');
      setNotice('Rental operations settings saved.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="content-card" role="status">Loading rental settings…</div>;

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">SYSTEM SETTINGS</p>
          <h1>Rental operations policy</h1>
          <p className="text-secondary mb-0">Configure operational requirements and explicitly approved rates. No charges are inferred when a rate is unset.</p>
        </div>
      </div>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {notice && <div className="alert alert-success" role="status">{notice}</div>}
      <form className="content-card d-grid gap-4" onSubmit={save}>
        <fieldset>
          <legend className="h5">Customer verification</legend>
          <div className="row g-3">
            <div className="col-12 col-xl-6">
              <span className="form-label d-block">Required customer documents</span>
              <div className="d-flex flex-wrap gap-3">
                {documentTypes.map(([value, label]) => (
                  <label className="form-check" key={value}>
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={policy.requiredCustomerDocumentTypes.includes(value)}
                      onChange={(event) => setPolicy((current) => ({
                        ...current,
                        requiredCustomerDocumentTypes: event.target.checked
                          ? [...current.requiredCustomerDocumentTypes, value]
                          : current.requiredCustomerDocumentTypes.filter((item) => item !== value),
                      }))}
                    />
                    <span className="form-check-label">{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="col-12 col-xl-6 d-grid gap-2">
              <label className="form-check">
                <input className="form-check-input" type="checkbox"
                  checked={policy.requireValidDrivingLicence}
                  onChange={(event) => setPolicy({ ...policy, requireValidDrivingLicence: event.target.checked })} />
                <span className="form-check-label">Require a verified, unexpired driving licence before handover</span>
              </label>
              <label className="form-check">
                <input className="form-check-input" type="checkbox"
                  checked={policy.requireSecurityDepositBeforeHandover}
                  onChange={(event) => setPolicy({ ...policy, requireSecurityDepositBeforeHandover: event.target.checked })} />
                <span className="form-check-label">Require the booking security deposit to be collected before handover</span>
              </label>
              <label className="form-check">
                <input className="form-check-input" type="checkbox"
                  checked={policy.allowOutstandingBalanceAtFinalization}
                  onChange={(event) => setPolicy({ ...policy, allowOutstandingBalanceAtFinalization: event.target.checked })} />
                <span className="form-check-label">Allow rental balances to remain outstanding after finalization</span>
              </label>
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend className="h5">Late-return rate</legend>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="late-rate">Rate per hour (booking currency)</label>
              <input id="late-rate" className="form-control" inputMode="decimal" maxLength={13}
                placeholder="Leave empty to disable automatic proposal"
                value={lateRateInput} onChange={(event) => setLateRateInput(event.target.value)} />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="late-increment">Billing increment (minutes)</label>
              <input id="late-increment" className="form-control" type="number" min="1" max="1440"
                value={incrementInput} onChange={(event) => setIncrementInput(event.target.value)} />
            </div>
          </div>
          <p className="small text-secondary mt-2 mb-0">Late charges use the booking’s grace period and remain pending until an authorized approver decides them. Fuel differences are recorded without an assumed fee.</p>
        </fieldset>

        <ListEditor
          title="Required inspection checklist"
          items={policy.requiredInspectionComponents}
          onChange={(items) => setPolicy({ ...policy, requiredInspectionComponents: items })}
          codeLabel="inspection"
        />
        <ListEditor
          title="Accessory checklist"
          items={policy.accessories}
          onChange={(items) => setPolicy({ ...policy, accessories: items })}
          codeLabel="accessory"
        />

        <div className="d-flex justify-content-end">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </form>
    </>
  );
}
