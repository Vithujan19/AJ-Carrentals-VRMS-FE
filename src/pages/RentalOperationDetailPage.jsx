import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiDownload, apiRequest, apiResourceUrl, apiUpload } from '../api.js';
import { colomboDateTimeToIso, colomboInputValue, formatColomboDateTime } from '../date-time.js';
import { useAuth } from '../auth/AuthContext.jsx';

const blankPolicy = {
  requiredCustomerDocumentTypes: [],
  requireValidDrivingLicence: false,
  requireSecurityDepositBeforeHandover: false,
  allowOutstandingBalanceAtFinalization: false,
  lateReturnRatePerHour: null,
  lateReturnBillingIncrementMinutes: null,
  requiredInspectionComponents: [],
  accessories: [],
};

const damageCategories = ['BODY', 'GLASS', 'TYRE', 'INTERIOR', 'MECHANICAL', 'ACCESSORY', 'OTHER'];
const damageSeverities = ['LOW', 'MEDIUM', 'HIGH'];
const conditions = ['GOOD', 'MINOR_ISSUE', 'DAMAGED', 'NOT_APPLICABLE'];

function Section({ title, children, className = '' }) {
  return (
    <section className={`content-card ${className}`}>
      <h2 className="h5 mb-3">{title}</h2>
      {children}
    </section>
  );
}

function money(value, currency) {
  return `${currency} ${Number(value ?? 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDraft(operation, booking, policy, draft) {
  const saved = draft?.payload ?? {};
  const inspectionItems = saved.inspectionItems ?? policy.requiredInspectionComponents.map((item) => ({
    componentCode: item.code,
    label: item.label,
    condition: '',
    notes: '',
  }));
  const accessories = saved.accessories ?? policy.accessories.map((item) => ({
    code: item.code,
    label: item.label,
    supplied: false,
    quantity: '0',
    condition: '',
    notes: '',
  }));
  const returnAccessories = saved.returnAccessories ?? (operation === 'return'
    ? (booking.handover?.accessories ?? []).map((item) => ({
        handoverAccessoryId: item.id,
        label: item.accessoryNameSnapshot,
        quantityReturned: '',
        notes: '',
      }))
    : []);
  return {
    actualAt: saved.actualAt
      ? colomboInputValue(new Date(saved.actualAt))
      : colomboInputValue(new Date()),
    odometerKm: saved.odometerKm?.toString() ??
      (operation === 'handover' ? booking.vehicle.currentOdometerKm?.toString() ?? '' : ''),
    fuelPercent: saved.fuelPercent?.toString() ?? '',
    notes: saved.notes ?? '',
    customerRepresentative: saved.customerRepresentative ?? '',
    returnLocation: saved.returnLocation ?? '',
    inspectionItems,
    accessories,
    returnAccessories,
    damages: saved.damages ?? [],
    maintenanceRequired: saved.maintenanceRequired ?? false,
    maintenanceReason: saved.maintenanceReason ?? '',
  };
}

function serializeDraft(operation, payload) {
  const result = {};
  const actualAt = colomboDateTimeToIso(payload.actualAt);
  if (actualAt) result.actualAt = actualAt;
  if (payload.odometerKm !== '') result.odometerKm = Number(payload.odometerKm);
  if (payload.fuelPercent !== '') result.fuelPercent = String(payload.fuelPercent);
  if (payload.notes !== undefined) result.notes = payload.notes || null;
  if (payload.customerRepresentative !== undefined) {
    result.customerRepresentative = payload.customerRepresentative || null;
  }
  if (payload.returnLocation !== undefined) result.returnLocation = payload.returnLocation || null;

  const inspectionItems = (payload.inspectionItems ?? []).filter((item) => (
    item.componentCode?.trim() && item.label?.trim() && item.condition
  )).map((item) => ({
    componentCode: item.componentCode.trim(),
    label: item.label.trim(),
    condition: item.condition,
    notes: item.notes?.trim() || null,
  }));
  if (inspectionItems.length) result.inspectionItems = inspectionItems;

  if (operation === 'handover') {
    const accessories = (payload.accessories ?? []).filter((item) => (
      item.code?.trim() && item.label?.trim() && item.condition &&
      item.quantity !== '' && item.quantity !== undefined
    )).map((item) => ({
      code: item.code.trim(),
      label: item.label.trim(),
      supplied: Boolean(item.supplied),
      quantity: Number(item.quantity),
      condition: item.condition,
      notes: item.notes?.trim() || null,
    }));
    if (accessories.length || payload.accessories?.length === 0) result.accessories = accessories;
    const damages = (payload.damages ?? []).filter((damage) => damage.description?.trim())
      .map((damage) => ({
        category: damage.category,
        severity: damage.severity,
        origin: 'PRE_EXISTING',
        description: damage.description.trim(),
        location: damage.location?.trim() || null,
        estimatedRepairCost: damage.estimatedRepairCost || null,
      }));
    if (damages.length) result.damages = damages;
  } else {
    const returnedAccessories = (payload.returnAccessories ?? [])
      .filter((item) => item.quantityReturned !== '' && item.quantityReturned !== undefined)
      .map((item) => ({
        handoverAccessoryId: item.handoverAccessoryId,
        quantityReturned: Number(item.quantityReturned),
        notes: item.notes?.trim() || null,
      }));
    if (returnedAccessories.length || payload.returnAccessories?.length === 0) {
      result.returnAccessories = returnedAccessories;
    }
    const damages = (payload.damages ?? []).filter((damage) => damage.description?.trim())
      .map((damage) => ({
        category: damage.category,
        severity: damage.severity,
        origin: damage.origin,
        description: damage.description.trim(),
        location: damage.location?.trim() || null,
        estimatedRepairCost: damage.estimatedRepairCost || null,
      }));
    if (damages.length) result.damages = damages;
    result.maintenanceRequired = Boolean(payload.maintenanceRequired);
    result.maintenanceReason = payload.maintenanceRequired
      ? payload.maintenanceReason || null
      : null;
  }
  return result;
}

function flattenDamages(booking) {
  return [
    ...(booking.handover?.inspection?.damages ?? []),
    ...(booking.return?.inspection?.damages ?? []),
  ];
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function InspectionItems({ items, onChange }) {
  const update = (index, key, value) => onChange(items.map((item, itemIndex) => (
    itemIndex === index ? { ...item, [key]: value } : item
  )));
  const add = () => onChange([...items, {
    componentCode: `CHECK_${Date.now()}`,
    label: '',
    condition: '',
    notes: '',
  }]);

  return (
    <fieldset>
      <legend className="h6">Vehicle condition checklist</legend>
      {items.map((item, index) => (
        <div className="row g-2 align-items-end border-bottom pb-2 mb-2" key={item.componentCode}>
          <div className="col-12 col-lg-3">
            <label className="form-label" htmlFor={`inspection-label-${index}`}>Component</label>
            <input id={`inspection-label-${index}`} className="form-control" maxLength={120} required
              value={item.label} onChange={(event) => update(index, 'label', event.target.value)} />
          </div>
          <div className="col-12 col-lg-3">
            <label className="form-label" htmlFor={`inspection-condition-${index}`}>Condition</label>
            <select id={`inspection-condition-${index}`} className="form-select" required
              value={item.condition} onChange={(event) => update(index, 'condition', event.target.value)}>
              <option value="">Select condition</option>
              {conditions.map((condition) => <option key={condition} value={condition}>{condition.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="col-12 col-lg-6">
            <label className="form-label" htmlFor={`inspection-notes-${index}`}>Notes</label>
            <input id={`inspection-notes-${index}`} className="form-control" maxLength={1000}
              value={item.notes ?? ''} onChange={(event) => update(index, 'notes', event.target.value)} />
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={add}>Add inspection item</button>
    </fieldset>
  );
}

function DamageEditor({ damages, onChange, handover = false }) {
  const update = (index, key, value) => onChange(damages.map((damage, damageIndex) => (
    damageIndex === index ? { ...damage, [key]: value } : damage
  )));
  const add = () => onChange([...damages, {
    category: '',
    severity: '',
    origin: handover ? 'PRE_EXISTING' : 'NEW',
    description: '',
    location: '',
    estimatedRepairCost: '',
  }]);

  return (
    <fieldset>
      <legend className="h6">{handover ? 'Pre-existing damage' : 'Damage identified at return'}</legend>
      {damages.map((damage, index) => (
        <div className="border rounded p-3 mb-2" key={`damage-${index}`}>
          <div className="row g-2">
            <div className="col-12 col-md-4">
              <label className="form-label" htmlFor={`damage-category-${index}`}>Category</label>
              <select id={`damage-category-${index}`} className="form-select" required
                value={damage.category} onChange={(event) => update(index, 'category', event.target.value)}>
                <option value="">Select category</option>
                {damageCategories.map((value) => <option key={value} value={value}>{value.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label" htmlFor={`damage-severity-${index}`}>Severity</label>
              <select id={`damage-severity-${index}`} className="form-select" required
                value={damage.severity} onChange={(event) => update(index, 'severity', event.target.value)}>
                <option value="">Select severity</option>
                {damageSeverities.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
            {!handover && (
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor={`damage-origin-${index}`}>Origin</label>
                <select id={`damage-origin-${index}`} className="form-select"
                  value={damage.origin} onChange={(event) => update(index, 'origin', event.target.value)}>
                  <option value="NEW">New</option>
                  <option value="PRE_EXISTING">Pre-existing</option>
                </select>
              </div>
            )}
            <div className="col-12">
              <label className="form-label" htmlFor={`damage-description-${index}`}>Description</label>
              <textarea id={`damage-description-${index}`} className="form-control" rows="2" maxLength={2000} required
                value={damage.description} onChange={(event) => update(index, 'description', event.target.value)} />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor={`damage-location-${index}`}>Location</label>
              <input id={`damage-location-${index}`} className="form-control" maxLength={160}
                value={damage.location ?? ''} onChange={(event) => update(index, 'location', event.target.value)} />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor={`damage-estimate-${index}`}>Estimated repair cost (optional)</label>
              <input id={`damage-estimate-${index}`} className="form-control" inputMode="decimal"
                value={damage.estimatedRepairCost ?? ''} onChange={(event) => update(index, 'estimatedRepairCost', event.target.value)} />
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={add}>Report damage</button>
    </fieldset>
  );
}

export default function RentalOperationDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const permissions = user.permissions;
  const [booking, setBooking] = useState(null);
  const [policy, setPolicy] = useState(blankPolicy);
  const [operation, setOperation] = useState(null);
  const [draft, setDraft] = useState(null);
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [verificationChecks, setVerificationChecks] = useState({
    identityVerified: false,
    licenceVerified: false,
    contactVerified: false,
    documentsReviewed: [],
  });
  const [verificationNotes, setVerificationNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [chargeDecisionReasons, setChargeDecisionReasons] = useState({});
  const [damageDecisions, setDamageDecisions] = useState({});
  const [paymentInput, setPaymentInput] = useState({
    purpose: 'PARTIAL',
    method: 'CASH',
    amount: '',
    reference: '',
    notes: '',
  });
  const [chargeInput, setChargeInput] = useState({
    chargeType: 'OTHER',
    quantity: '1',
    unitPrice: '',
    description: '',
    reason: '',
  });
  const [depositApplication, setDepositApplication] = useState({
    chargeId: '',
    amount: '',
    reason: '',
  });
  const canVerify = permissions.includes('customers.verify');
  const canViewDocuments = permissions.includes('customers.documents.view');
  const canCreateHandover = permissions.includes('rental.handover.create');
  const canCreateReturn = permissions.includes('rental.return.create');
  const canCreatePayment = permissions.includes('rental.payments.create');
  const canViewFinancials = permissions.includes('rental.payments.view') ||
    permissions.includes('rental.charges.view');
  const canCreateCharge = permissions.includes('rental.charges.create');
  const canApproveCharge = permissions.includes('rental.charges.approve');
  const canApproveDamage = permissions.includes('rental.damage.approve');
  const canApplyDeposit = permissions.includes('rental.deposits.apply');
  const canRefund = permissions.includes('rental.payments.refund');
  const canCorrectPayment = permissions.includes('rental.payments.correct');
  const canFinalize = permissions.includes('rental.finalize');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [detailResult, policyResult] = await Promise.all([
        apiRequest(`/v1/rental-operations/bookings/${id}`),
        apiRequest('/v1/rental-operations/policy'),
      ]);
      const detail = detailResult.data;
      const loadedPolicy = { ...blankPolicy, ...policyResult.data };
      setBooking(detail);
      setPolicy(loadedPolicy);
      const nextOperation = detail.status === 'CONFIRMED'
        ? 'handover'
        : detail.status === 'HANDED_OVER'
          ? 'return'
          : null;
      setOperation(nextOperation);
      if (nextOperation) {
        const draftResult = await apiRequest(`/v1/rental-operations/bookings/${id}/${nextOperation}/draft`);
        setDraft(draftResult.data);
        setPayload(formatDraft(nextOperation, detail, loadedPolicy, draftResult.data));
      } else {
        setDraft(null);
        setPayload(null);
      }
      const checks = detail.verification?.checks;
      if (checks) {
        setVerificationChecks({
          identityVerified: Boolean(checks.identityVerified),
          licenceVerified: Boolean(checks.licenceVerified),
          contactVerified: Boolean(checks.contactVerified),
          documentsReviewed: checks.documentsReviewed ?? [],
        });
        setVerificationNotes(detail.verification.notes ?? '');
      } else {
        setVerificationChecks({
          identityVerified: false,
          licenceVerified: false,
          contactVerified: false,
          documentsReviewed: [],
        });
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const damageReports = useMemo(() => booking ? flattenDamages(booking) : [], [booking]);
  const approvedCharges = useMemo(
    () => (booking?.charges ?? []).filter((charge) => (
      charge.approvalStatus === 'APPROVED' && charge.direction === 'DEBIT' && !charge.voidedAt
    )),
    [booking],
  );

  const startDraft = async () => {
    if (!operation) return;
    setSaving(true);
    setError('');
    try {
      const { data } = await apiRequest(`/v1/rental-operations/bookings/${id}/${operation}/draft`, {
        method: 'POST',
        body: {},
      });
      setDraft(data);
      setPayload(formatDraft(operation, booking, policy, data));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const persistDraft = async () => {
    if (!draft || !operation || !payload) return null;
    const changedPayload = serializeDraft(operation, payload);
    const { data } = await apiRequest(`/v1/rental-operations/bookings/${id}/${operation}/draft`, {
      method: 'PATCH',
      body: { version: draft.version, payload: changedPayload },
    });
    setDraft(data);
    setPayload(formatDraft(operation, booking, policy, data));
    return data;
  };

  const saveDraft = async (event) => {
    event?.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await persistDraft();
      setNotice('Operation draft saved.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const completeOperation = async () => {
    if (!acknowledged) {
      setError('Record the customer acknowledgement before completing the operation.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const saved = await persistDraft();
      if (!saved) return;
      const { data } = await apiRequest(`/v1/rental-operations/bookings/${id}/${operation}/complete`, {
        method: 'POST',
        body: { version: saved.version, customerAcknowledged: true },
      });
      setBooking(data);
      setNotice(operation === 'handover' ? 'Vehicle handover completed.' : 'Vehicle return completed.');
      setAcknowledged(false);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const updateVerificationCheck = (key, value) => {
    setVerificationChecks((current) => ({ ...current, [key]: value }));
  };

  const verifyCustomer = async (status) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const { data } = await apiRequest(`/v1/rental-operations/bookings/${id}/customer-verification`, {
        method: 'POST',
        body: {
          idempotencyKey: globalThis.crypto.randomUUID(),
          status,
          checks: verificationChecks,
          notes: verificationNotes || null,
          ...(status === 'REJECTED' ? { rejectionReason } : {}),
        },
      });
      setNotice(`Customer verification recorded as ${data.status.replace('_', ' ')}.`);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const uploadPhotos = async (event) => {
    event.preventDefault();
    if (!operation || !draft) return;
    const form = event.currentTarget;
    const formData = new FormData();
    for (const file of form.elements.photos.files) formData.append('photos', file);
    formData.append('caption', form.elements.caption.value);
    setSaving(true);
    setError('');
    try {
      const { data } = await apiUpload(
        `/v1/rental-operations/bookings/${id}/${operation}/draft/photos`,
        formData,
      );
      setDraft((current) => ({ ...current, photos: [...(current.photos ?? []), ...data] }));
      form.reset();
      setNotice('Inspection photographs uploaded privately.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const downloadPrivateFile = async (path, filename) => {
    setError('');
    try {
      downloadBlob(await apiDownload(path), filename);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const allocationType = paymentInput.purpose === 'SECURITY_DEPOSIT'
        ? 'SECURITY_DEPOSIT'
        : 'RENTAL';
      await apiRequest(`/v1/rental-operations/bookings/${id}/payments`, {
        method: 'POST',
        body: {
          idempotencyKey: globalThis.crypto.randomUUID(),
          ...paymentInput,
          amount: paymentInput.amount,
          currency: booking.currency,
          allocations: [{ allocationType, amount: paymentInput.amount }],
        },
      });
      setPaymentInput({ ...paymentInput, amount: '', reference: '', notes: '' });
      setNotice('Payment recorded.');
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const refundPayment = async (event, payment, type) => {
    event.preventDefault();
    const form = event.currentTarget;
    const amount = form.elements.amount.value;
    const reason = form.elements.reason.value.trim();
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/v1/rental-operations/bookings/${id}/payments/${payment.id}/refunds`, {
        method: 'POST',
        body: {
          idempotencyKey: globalThis.crypto.randomUUID(),
          method: form.elements.method.value,
          amount,
          reason,
          allocations: [{ allocationType: type, amount }],
        },
      });
      form.reset();
      setNotice('Refund recorded.');
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const correctPayment = async (payment) => {
    const reason = window.prompt('Reason for correcting this payment:')?.trim();
    if (!reason) return;
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/v1/rental-operations/bookings/${id}/payments/${payment.id}/corrections`, {
        method: 'POST',
        body: { reason },
      });
      setNotice('Payment correction recorded.');
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const submitCharge = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const direction = chargeInput.chargeType === 'DISCOUNT' ? 'CREDIT' : 'DEBIT';
      await apiRequest(`/v1/rental-operations/bookings/${id}/charges`, {
        method: 'POST',
        body: {
          idempotencyKey: globalThis.crypto.randomUUID(),
          ...chargeInput,
          direction,
        },
      });
      setChargeInput({ chargeType: 'OTHER', quantity: '1', unitPrice: '', description: '', reason: '' });
      setNotice('Charge proposal submitted for approval.');
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const decideCharge = async (charge, decision) => {
    const reason = chargeDecisionReasons[charge.id]?.trim();
    if (!reason) {
      setError('Enter an approval reason for this charge decision.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/v1/rental-operations/charges/${charge.id}/decision`, {
        method: 'POST',
        body: { decision, reason },
      });
      setNotice(`Charge ${decision.toLowerCase()}.`);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const decideDamage = async (damage, decision) => {
    const values = damageDecisions[damage.id] ?? {};
    if (!values.reason?.trim()) {
      setError('Enter a reason for this damage decision.');
      return;
    }
    if (decision === 'APPROVED' && !values.amount) {
      setError('Enter the customer charge amount approved for this damage.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/v1/rental-operations/damages/${damage.id}/decision`, {
        method: 'POST',
        body: {
          decision,
          reason: values.reason.trim(),
          ...(decision === 'APPROVED' ? { approvedChargeAmount: values.amount } : {}),
        },
      });
      setNotice(`Damage charge ${decision.toLowerCase()}.`);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const applyDeposit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/v1/rental-operations/bookings/${id}/deposit-applications`, {
        method: 'POST',
        body: {
          idempotencyKey: globalThis.crypto.randomUUID(),
          ...depositApplication,
        },
      });
      setDepositApplication({ chargeId: '', amount: '', reason: '' });
      setNotice('Deposit applied to the approved charge.');
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const finalizeRental = async () => {
    const notes = window.prompt('Optional finalization note:');
    if (notes === null) return;
    setSaving(true);
    setError('');
    try {
      const { data } = await apiRequest(`/v1/rental-operations/bookings/${id}/finalize`, {
        method: 'POST',
        body: { notes: notes.trim() || null },
      });
      setBooking(data);
      setNotice('Rental finalized.');
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="content-card" role="status">Loading rental operation…</div>;
  if (!booking) {
    return (
      <>
        <div className="alert alert-danger" role="alert">{error || 'Rental operation unavailable.'}</div>
        <Link className="btn btn-outline-secondary" to="/rental-operations">Back to rental operations</Link>
      </>
    );
  }

  const canStart = operation === 'handover' ? canCreateHandover : canCreateReturn;
  const displayedInspectionItems = payload?.inspectionItems ?? [];
  const displayedAccessories = payload?.accessories ?? [];
  const displayedReturnAccessories = payload?.returnAccessories ?? [];
  const pendingCharges = booking.charges.filter((charge) => charge.approvalStatus === 'PENDING');
  const pendingDamages = damageReports.filter((damage) => (
    damage.origin === 'NEW' && damage.chargeApprovalStatus === 'PENDING'
  ));
  const canUploadReceipt = canCreatePayment;
  const canReadReceipt = permissions.includes('rental.payments.view');

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow"><Link to="/rental-operations">RENTAL OPERATIONS</Link> / BOOKING</p>
          <h1>{booking.reference} <span className="badge text-bg-secondary">{booking.status.replace('_', ' ')}</span></h1>
          <p className="text-secondary mb-0">
            {booking.customer?.fullName} · {booking.vehicle?.registrationNumber} · {formatColomboDateTime(booking.pickupAt)} – {formatColomboDateTime(booking.returnAt)}
          </p>
        </div>
        <div className="d-flex gap-2">
          <Link className="btn btn-outline-secondary" to={`/bookings/${booking.id}`}>Booking details</Link>
          <button type="button" className="btn btn-outline-secondary" onClick={() => window.print()}>Print</button>
        </div>
      </div>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {notice && <div className="alert alert-success" role="status">{notice}</div>}

      <div className="row g-3">
        <div className="col-12 col-xl-5">
          <Section title="Customer verification">
            <div className="booking-detail-grid mb-3">
              <div><small className="text-secondary">Customer</small><strong className="d-block">{booking.customer?.fullName}</strong></div>
              <div><small className="text-secondary">Mobile</small><strong className="d-block">{booking.customer?.mobileNumber}</strong></div>
              <div><small className="text-secondary">Verification</small><strong className="d-block">{booking.verification?.status?.replace('_', ' ') ?? 'Not verified'}</strong></div>
              {policy.requireValidDrivingLicence && (
                <div><small className="text-secondary">Licence expiry</small><strong className="d-block">{booking.customer?.licenceExpiryDate?.slice(0, 10) ?? 'Not recorded'}</strong></div>
              )}
            </div>
            {canViewDocuments && (
              <div className="mb-3">
                <h3 className="h6">Private customer documents</h3>
                {booking.customer?.documents?.length ? (
                  <ul className="list-group">
                    {booking.customer.documents.map((document) => (
                      <li className="list-group-item d-flex justify-content-between align-items-center gap-2" key={document.id}>
                        <span>
                          <strong>{document.documentType.replaceAll('_', ' ')}</strong>
                          <small className="d-block text-secondary">
                            {document.expiresAt ? `Expires ${document.expiresAt.slice(0, 10)}` : 'No expiry date'}
                          </small>
                        </span>
                        <div className="d-flex align-items-center gap-2">
                          {canVerify && (
                            <input
                              className="form-check-input m-0"
                              type="checkbox"
                              aria-label={`Mark ${document.documentType} as reviewed`}
                              checked={verificationChecks.documentsReviewed.includes(document.id)}
                              onChange={(event) => updateVerificationCheck(
                                'documentsReviewed',
                                event.target.checked
                                  ? [...verificationChecks.documentsReviewed, document.id]
                                  : verificationChecks.documentsReviewed.filter((item) => item !== document.id),
                              )}
                            />
                          )}
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => downloadPrivateFile(
                              `/v1/rental-operations/customers/${booking.customer.id}/documents/${document.id}/download`,
                              document.originalName,
                            )}
                          >Download</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : <p className="small text-secondary mb-0">No active customer documents are on file.</p>}
              </div>
            )}
            {canVerify && booking.status === 'CONFIRMED' && (
              <div className="border-top pt-3">
                <div className="d-grid gap-2">
                  {[
                    ['identityVerified', 'Identity checked'],
                    ['licenceVerified', 'Driving licence checked'],
                    ['contactVerified', 'Contact details checked'],
                  ].map(([key, label]) => (
                    <label className="form-check" key={key}>
                      <input className="form-check-input" type="checkbox"
                        checked={verificationChecks[key]}
                        onChange={(event) => updateVerificationCheck(key, event.target.checked)} />
                      <span className="form-check-label">{label}</span>
                    </label>
                  ))}
                </div>
                <label className="form-label mt-3" htmlFor="verification-notes">Verification notes</label>
                <textarea id="verification-notes" className="form-control" rows="2" maxLength={2000}
                  value={verificationNotes} onChange={(event) => setVerificationNotes(event.target.value)} />
                <label className="form-label mt-3" htmlFor="verification-rejection">Rejection reason (only when rejecting)</label>
                <input id="verification-rejection" className="form-control" maxLength={1000}
                  value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} />
                <div className="d-flex flex-wrap gap-2 mt-3">
                  <button type="button" className="btn btn-success" disabled={saving}
                    onClick={() => verifyCustomer('VERIFIED')}>Mark verified</button>
                  <button type="button" className="btn btn-outline-danger" disabled={saving || !rejectionReason.trim()}
                    onClick={() => verifyCustomer('REJECTED')}>Reject verification</button>
                </div>
              </div>
            )}
            {booking.verification?.rejectionReason && (
              <div className="alert alert-danger mt-3 mb-0">{booking.verification.rejectionReason}</div>
            )}
          </Section>
        </div>

        <div className="col-12 col-xl-7">
          <Section title={operation === 'handover' ? 'Guided vehicle handover' : operation === 'return' ? 'Guided vehicle return' : 'Rental operation record'}>
            {operation && !draft && canStart && (
              <div className="alert alert-info">
                <p className="mb-2">Start a draft to record the inspection, mileage, fuel level, accessories and photographs.</p>
                <button type="button" className="btn btn-success" disabled={saving} onClick={startDraft}>
                  {saving ? 'Starting…' : `Start ${operation}`}
                </button>
              </div>
            )}
            {operation && !canStart && !draft && (
              <p className="text-secondary mb-0">You do not have permission to create this operation draft.</p>
            )}
            {draft && payload && (
              <div className="d-grid gap-4">
                <div className="row g-3">
                  <div className="col-12 col-md-4">
                    <label className="form-label" htmlFor="operation-actual-time">Operation time (Colombo)</label>
                    <input id="operation-actual-time" className="form-control" type="datetime-local" required
                      value={payload.actualAt}
                      onChange={(event) => setPayload({ ...payload, actualAt: event.target.value })} />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label" htmlFor="operation-odometer">{operation === 'handover' ? 'Starting' : 'Ending'} odometer (km)</label>
                    <input id="operation-odometer" className="form-control" type="number" min="0" step="1" required
                      value={payload.odometerKm}
                      onChange={(event) => setPayload({ ...payload, odometerKm: event.target.value })} />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label" htmlFor="operation-fuel">Fuel level (%)</label>
                    <input id="operation-fuel" className="form-control" type="number" min="0" max="100" step="0.01" required
                      value={payload.fuelPercent}
                      onChange={(event) => setPayload({ ...payload, fuelPercent: event.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label" htmlFor="operation-notes">Inspection notes</label>
                    <textarea id="operation-notes" className="form-control" rows="2" maxLength={2000}
                      value={payload.notes}
                      onChange={(event) => setPayload({ ...payload, notes: event.target.value })} />
                  </div>
                  {operation === 'handover' && (
                    <div className="col-12">
                      <label className="form-label" htmlFor="customer-representative">Customer representative (optional)</label>
                      <input id="customer-representative" className="form-control" maxLength={160}
                        value={payload.customerRepresentative}
                        onChange={(event) => setPayload({ ...payload, customerRepresentative: event.target.value })} />
                    </div>
                  )}
                  {operation === 'return' && (
                    <div className="col-12">
                      <label className="form-label" htmlFor="return-location">Return location</label>
                      <input id="return-location" className="form-control" maxLength={255}
                        value={payload.returnLocation}
                        onChange={(event) => setPayload({ ...payload, returnLocation: event.target.value })} />
                    </div>
                  )}
                </div>

                <InspectionItems
                  items={displayedInspectionItems}
                  onChange={(inspectionItems) => setPayload({ ...payload, inspectionItems })}
                />

                {operation === 'handover' && policy.accessories.length > 0 && (
                  <fieldset>
                    <legend className="h6">Accessories issued</legend>
                    {displayedAccessories.map((item, index) => (
                      <div className="row g-2 align-items-end border-bottom pb-2 mb-2" key={item.code}>
                        <div className="col-12 col-lg-3">
                          <label className="form-label" htmlFor={`accessory-name-${index}`}>Accessory</label>
                          <input id={`accessory-name-${index}`} className="form-control" value={item.label}
                            onChange={(event) => setPayload({
                              ...payload,
                              accessories: displayedAccessories.map((row, rowIndex) => rowIndex === index
                                ? { ...row, label: event.target.value } : row),
                            })} />
                        </div>
                        <div className="col-6 col-lg-2">
                          <label className="form-label" htmlFor={`accessory-quantity-${index}`}>Quantity</label>
                          <input id={`accessory-quantity-${index}`} className="form-control" type="number" min="0" max="100"
                            value={item.quantity} onChange={(event) => setPayload({
                              ...payload,
                              accessories: displayedAccessories.map((row, rowIndex) => rowIndex === index
                                ? { ...row, quantity: event.target.value } : row),
                            })} />
                        </div>
                        <div className="col-6 col-lg-2">
                          <label className="form-label" htmlFor={`accessory-supplied-${index}`}>Issued</label>
                          <select id={`accessory-supplied-${index}`} className="form-select" value={String(item.supplied)}
                            onChange={(event) => setPayload({
                              ...payload,
                              accessories: displayedAccessories.map((row, rowIndex) => rowIndex === index
                                ? { ...row, supplied: event.target.value === 'true' } : row),
                            })}>
                            <option value="false">No</option><option value="true">Yes</option>
                          </select>
                        </div>
                        <div className="col-12 col-lg-5">
                          <label className="form-label" htmlFor={`accessory-condition-${index}`}>Condition</label>
                          <select id={`accessory-condition-${index}`} className="form-select" value={item.condition}
                            onChange={(event) => setPayload({
                              ...payload,
                              accessories: displayedAccessories.map((row, rowIndex) => rowIndex === index
                                ? { ...row, condition: event.target.value } : row),
                            })}>
                            <option value="">Select condition</option>
                            {conditions.map((condition) => <option key={condition} value={condition}>{condition.replace('_', ' ')}</option>)}
                          </select>
                        </div>
                      </div>
                    ))}
                  </fieldset>
                )}

                {operation === 'return' && displayedReturnAccessories.length > 0 && (
                  <fieldset>
                    <legend className="h6">Accessory reconciliation</legend>
                    {displayedReturnAccessories.map((item, index) => (
                      <div className="row g-2 align-items-end mb-2" key={item.handoverAccessoryId}>
                        <div className="col-12 col-md-7">
                          <label className="form-label" htmlFor={`returned-accessory-${index}`}>{item.label}</label>
                          <input id={`returned-accessory-${index}`} className="form-control" type="number" min="0" max="100" required
                            value={item.quantityReturned}
                            onChange={(event) => setPayload({
                              ...payload,
                              returnAccessories: displayedReturnAccessories.map((row, rowIndex) => rowIndex === index
                                ? { ...row, quantityReturned: event.target.value } : row),
                            })} />
                        </div>
                        <div className="col-12 col-md-5">
                          <label className="form-label" htmlFor={`returned-accessory-notes-${index}`}>Notes</label>
                          <input id={`returned-accessory-notes-${index}`} className="form-control" maxLength={500}
                            value={item.notes ?? ''}
                            onChange={(event) => setPayload({
                              ...payload,
                              returnAccessories: displayedReturnAccessories.map((row, rowIndex) => rowIndex === index
                                ? { ...row, notes: event.target.value } : row),
                            })} />
                        </div>
                      </div>
                    ))}
                  </fieldset>
                )}

                <DamageEditor
                  damages={payload.damages}
                  handover={operation === 'handover'}
                  onChange={(damages) => setPayload({ ...payload, damages })}
                />

                {operation === 'return' && (
                  <div className="border rounded p-3">
                    <label className="form-check">
                      <input className="form-check-input" type="checkbox"
                        checked={payload.maintenanceRequired}
                        onChange={(event) => setPayload({ ...payload, maintenanceRequired: event.target.checked })} />
                      <span className="form-check-label">Restrict vehicle availability for maintenance</span>
                    </label>
                    {payload.maintenanceRequired && (
                      <textarea className="form-control mt-2" rows="2" maxLength={1000} required
                        aria-label="Maintenance restriction reason" placeholder="Reason for the availability restriction"
                        value={payload.maintenanceReason}
                        onChange={(event) => setPayload({ ...payload, maintenanceReason: event.target.value })} />
                    )}
                  </div>
                )}

                <div className="border rounded p-3">
                  <h3 className="h6">Private inspection photographs</h3>
                  {draft.photos?.length > 0 && (
                    <div className="d-flex flex-wrap gap-2 mb-3">
                      {draft.photos.map((photo) => (
                        <a key={photo.id} href={apiResourceUrl(photo.contentUrl)} target="_blank" rel="noreferrer">
                          <img src={apiResourceUrl(photo.contentUrl)} alt={photo.caption || 'Inspection'} width="110" height="80" style={{ objectFit: 'cover' }} />
                        </a>
                      ))}
                    </div>
                  )}
                  <form className="row g-2 align-items-end" onSubmit={uploadPhotos}>
                    <div className="col-12 col-lg-6">
                      <label className="form-label" htmlFor="inspection-photos">Add photos</label>
                      <input id="inspection-photos" className="form-control" type="file" name="photos"
                        accept="image/jpeg,image/png,image/webp" multiple />
                    </div>
                    <div className="col-12 col-lg-4">
                      <label className="form-label" htmlFor="inspection-caption">Caption</label>
                      <input id="inspection-caption" className="form-control" name="caption" maxLength={255} />
                    </div>
                    <div className="col-12 col-lg-2">
                      <button className="btn btn-outline-success w-100" disabled={saving}>Upload</button>
                    </div>
                  </form>
                </div>

                <div className="border-top pt-3">
                  <label className="form-check mb-3">
                    <input className="form-check-input" type="checkbox" checked={acknowledged}
                      onChange={(event) => setAcknowledged(event.target.checked)} />
                    <span className="form-check-label">Customer acknowledgement has been obtained for this inspection and operation.</span>
                  </label>
                  <div className="d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-outline-success" disabled={saving} onClick={saveDraft}>
                      {saving ? 'Saving…' : 'Save draft'}
                    </button>
                    <button type="button" className="btn btn-success" disabled={saving || !acknowledged}
                      onClick={completeOperation}>
                      {saving ? 'Completing…' : `Complete ${operation}`}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!operation && booking.handover && (
              <div className="booking-detail-grid">
                <div><small className="text-secondary">Handed over</small><strong className="d-block">{formatColomboDateTime(booking.handover.handedOverAt)}</strong></div>
                <div><small className="text-secondary">Starting odometer</small><strong className="d-block">{booking.handover.startingOdometerKm.toLocaleString()} km</strong></div>
                <div><small className="text-secondary">Returned</small><strong className="d-block">{formatColomboDateTime(booking.return?.returnedAt)}</strong></div>
                <div><small className="text-secondary">Ending odometer</small><strong className="d-block">{booking.return?.endingOdometerKm?.toLocaleString() ?? '—'}</strong></div>
              </div>
            )}
            {!operation && !booking.handover && <p className="text-secondary mb-0">No handover or return record is available for this booking.</p>}
          </Section>
        </div>
      </div>

      {canViewFinancials && (
        <div className="row g-3 mt-0">
          <div className="col-12 col-xl-5">
            <Section title="Financial summary">
              <dl className="row mb-0">
                <dt className="col-7">Approved rental charges</dt><dd className="col-5 text-end">{money(booking.financialSummary.rentalCharges, booking.currency)}</dd>
                <dt className="col-7">Rental collections</dt><dd className="col-5 text-end">{money(booking.financialSummary.rentalReceived, booking.currency)}</dd>
                <dt className="col-7">Outstanding balance</dt><dd className="col-5 text-end">{money(booking.financialSummary.rentalOutstanding, booking.currency)}</dd>
                <dt className="col-7">Deposit required</dt><dd className="col-5 text-end">{money(booking.financialSummary.securityDepositRequired, booking.currency)}</dd>
                <dt className="col-7">Deposit held</dt><dd className="col-5 text-end">{money(booking.financialSummary.securityDepositHeld, booking.currency)}</dd>
                <dt className="col-7">Deposit refunded</dt><dd className="col-5 text-end">{money(booking.financialSummary.securityDepositRefunded, booking.currency)}</dd>
                <dt className="col-7">Payment status</dt><dd className="col-5 text-end">{booking.financialSummary.paymentStatus}</dd>
              </dl>
            </Section>
          </div>
          <div className="col-12 col-xl-7">
            <Section title="Charges and approvals">
              {booking.charges.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead><tr><th>Charge</th><th>Amount</th><th>Status</th></tr></thead>
                    <tbody>
                      {booking.charges.map((charge) => (
                        <tr key={charge.id}>
                          <td>{charge.description}<small className="d-block text-secondary">{charge.chargeType.replaceAll('_', ' ')}</small></td>
                          <td>{money(charge.amount, booking.currency)}</td>
                          <td>
                            <span className="badge text-bg-secondary">{charge.approvalStatus}</span>
                            {charge.approvalStatus === 'PENDING' && canApproveCharge && (
                              <div className="mt-2">
                                <input className="form-control form-control-sm mb-1" maxLength={1000} placeholder="Decision reason"
                                  value={chargeDecisionReasons[charge.id] ?? ''}
                                  onChange={(event) => setChargeDecisionReasons({
                                    ...chargeDecisionReasons,
                                    [charge.id]: event.target.value,
                                  })} />
                                <div className="d-flex gap-1">
                                  <button type="button" className="btn btn-sm btn-success" disabled={saving}
                                    onClick={() => decideCharge(charge, 'APPROVED')}>Approve</button>
                                  <button type="button" className="btn btn-sm btn-outline-danger" disabled={saving}
                                    onClick={() => decideCharge(charge, 'REJECTED')}>Reject</button>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-secondary">No additional charge proposals.</p>}
              {canCreateCharge && ['HANDED_OVER', 'RETURNED'].includes(booking.status) && (
                <form className="border-top pt-3 row g-2" onSubmit={submitCharge}>
                  <div className="col-12 col-md-4">
                    <label className="form-label" htmlFor="charge-type">Type</label>
                    <select id="charge-type" className="form-select" value={chargeInput.chargeType}
                      onChange={(event) => setChargeInput({ ...chargeInput, chargeType: event.target.value })}>
                      {['OTHER', 'CLEANING', 'DELIVERY', 'EXTRA_KILOMETRE', 'LATE_RETURN', 'DAMAGE', 'DISCOUNT'].map((type) => (
                        <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-6 col-md-2">
                    <label className="form-label" htmlFor="charge-quantity">Quantity</label>
                    <input id="charge-quantity" className="form-control" inputMode="decimal" required
                      value={chargeInput.quantity}
                      onChange={(event) => setChargeInput({ ...chargeInput, quantity: event.target.value })} />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label" htmlFor="charge-unit-price">Unit price</label>
                    <input id="charge-unit-price" className="form-control" inputMode="decimal" required
                      value={chargeInput.unitPrice}
                      onChange={(event) => setChargeInput({ ...chargeInput, unitPrice: event.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label" htmlFor="charge-description">Description</label>
                    <input id="charge-description" className="form-control" maxLength={1000} required
                      value={chargeInput.description}
                      onChange={(event) => setChargeInput({ ...chargeInput, description: event.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label" htmlFor="charge-reason">Reason for proposal</label>
                    <input id="charge-reason" className="form-control" maxLength={1000} required
                      value={chargeInput.reason}
                      onChange={(event) => setChargeInput({ ...chargeInput, reason: event.target.value })} />
                  </div>
                  <div className="col-12 text-end">
                    <button className="btn btn-outline-success" disabled={saving}>Propose charge</button>
                  </div>
                </form>
              )}
            </Section>
          </div>

          <div className="col-12">
            <Section title="Damage decisions">
              {damageReports.length ? damageReports.map((damage) => (
                <div className="border-bottom pb-3 mb-3" key={damage.id}>
                  <div className="d-flex flex-wrap justify-content-between gap-2">
                    <strong>{damage.category} · {damage.severity} · {damage.origin}</strong>
                    <span className="badge text-bg-secondary">{damage.chargeApprovalStatus}</span>
                  </div>
                  <p className="mb-2">{damage.description}</p>
                  {damage.images?.length > 0 && (
                    <div className="d-flex gap-2 flex-wrap mb-2">
                      {damage.images.map((image) => (
                        <a key={image.id} href={apiResourceUrl(image.contentUrl)} target="_blank" rel="noreferrer">
                          <img src={apiResourceUrl(image.contentUrl)} alt={image.caption || 'Damage'} width="100" height="72" style={{ objectFit: 'cover' }} />
                        </a>
                      ))}
                    </div>
                  )}
                  {damage.origin === 'NEW' && damage.chargeApprovalStatus === 'PENDING' && canApproveDamage && (
                    <div className="row g-2">
                      <div className="col-12 col-md-3">
                        <label className="form-label" htmlFor={`damage-amount-${damage.id}`}>Approved customer charge</label>
                        <input id={`damage-amount-${damage.id}`} className="form-control" inputMode="decimal"
                          value={damageDecisions[damage.id]?.amount ?? ''}
                          onChange={(event) => setDamageDecisions({
                            ...damageDecisions,
                            [damage.id]: { ...damageDecisions[damage.id], amount: event.target.value },
                          })} />
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label" htmlFor={`damage-reason-${damage.id}`}>Decision reason</label>
                        <input id={`damage-reason-${damage.id}`} className="form-control" maxLength={1000}
                          value={damageDecisions[damage.id]?.reason ?? ''}
                          onChange={(event) => setDamageDecisions({
                            ...damageDecisions,
                            [damage.id]: { ...damageDecisions[damage.id], reason: event.target.value },
                          })} />
                      </div>
                      <div className="col-12 col-md-3 d-flex align-items-end gap-2">
                        <button type="button" className="btn btn-success" disabled={saving}
                          onClick={() => decideDamage(damage, 'APPROVED')}>Approve charge</button>
                        <button type="button" className="btn btn-outline-danger" disabled={saving}
                          onClick={() => decideDamage(damage, 'REJECTED')}>Reject</button>
                      </div>
                    </div>
                  )}
                </div>
              )) : <p className="text-secondary mb-0">No damage reports.</p>}
              {canApplyDeposit && Number(booking.financialSummary.securityDepositHeld) > 0 && approvedCharges.length > 0 && booking.status === 'RETURNED' && (
                <form className="row g-2 border-top pt-3" onSubmit={applyDeposit}>
                  <div className="col-12 col-md-4">
                    <label className="form-label" htmlFor="deposit-charge">Approved charge</label>
                    <select id="deposit-charge" className="form-select" required
                      value={depositApplication.chargeId}
                      onChange={(event) => setDepositApplication({ ...depositApplication, chargeId: event.target.value })}>
                      <option value="">Select a charge</option>
                      {approvedCharges.map((charge) => <option key={charge.id} value={charge.id}>{charge.description}</option>)}
                    </select>
                  </div>
                  <div className="col-12 col-md-3">
                    <label className="form-label" htmlFor="deposit-amount">Amount to apply</label>
                    <input id="deposit-amount" className="form-control" inputMode="decimal" required
                      value={depositApplication.amount}
                      onChange={(event) => setDepositApplication({ ...depositApplication, amount: event.target.value })} />
                  </div>
                  <div className="col-12 col-md-3">
                    <label className="form-label" htmlFor="deposit-reason">Reason</label>
                    <input id="deposit-reason" className="form-control" maxLength={1000} required
                      value={depositApplication.reason}
                      onChange={(event) => setDepositApplication({ ...depositApplication, reason: event.target.value })} />
                  </div>
                  <div className="col-12 col-md-2 d-flex align-items-end">
                    <button className="btn btn-outline-success w-100" disabled={saving}>Apply deposit</button>
                  </div>
                </form>
              )}
            </Section>
          </div>

          {canCreatePayment && ['CONFIRMED', 'HANDED_OVER', 'RETURNED'].includes(booking.status) && (
            <div className="col-12 col-xl-5">
              <Section title="Record manual payment">
                <form className="row g-2" onSubmit={submitPayment}>
                  <div className="col-12 col-md-6">
                    <label className="form-label" htmlFor="payment-purpose">Purpose</label>
                    <select id="payment-purpose" className="form-select" value={paymentInput.purpose}
                      onChange={(event) => setPaymentInput({ ...paymentInput, purpose: event.target.value })}>
                      {['ADVANCE', 'PARTIAL', 'FINAL', 'SECURITY_DEPOSIT', 'OTHER'].map((value) => (
                        <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label" htmlFor="payment-method">Method</label>
                    <select id="payment-method" className="form-select" value={paymentInput.method}
                      onChange={(event) => setPaymentInput({ ...paymentInput, method: event.target.value })}>
                      {['CASH', 'BANK_TRANSFER', 'CARD', 'OTHER'].map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label" htmlFor="payment-amount">Amount ({booking.currency})</label>
                    <input id="payment-amount" className="form-control" inputMode="decimal" required
                      value={paymentInput.amount}
                      onChange={(event) => setPaymentInput({ ...paymentInput, amount: event.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label" htmlFor="payment-reference">Reference</label>
                    <input id="payment-reference" className="form-control" maxLength={160}
                      value={paymentInput.reference}
                      onChange={(event) => setPaymentInput({ ...paymentInput, reference: event.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label" htmlFor="payment-notes">Notes</label>
                    <input id="payment-notes" className="form-control" maxLength={1000}
                      value={paymentInput.notes}
                      onChange={(event) => setPaymentInput({ ...paymentInput, notes: event.target.value })} />
                  </div>
                  <div className="col-12 text-end">
                    <button className="btn btn-success" disabled={saving}>Record payment</button>
                  </div>
                </form>
              </Section>
            </div>
          )}

          <div className="col-12 col-xl-7">
            <Section title="Payment history">
              {booking.payments.length ? booking.payments.map((payment) => (
                <div className="border-bottom pb-3 mb-3" key={payment.id}>
                  <div className="d-flex justify-content-between gap-2">
                    <strong>{payment.direction} · {payment.purpose.replaceAll('_', ' ')}</strong>
                    <strong>{money(payment.amount, payment.currency)}</strong>
                  </div>
                  <small className="text-secondary">
                    {payment.method.replaceAll('_', ' ')} · {payment.status} · {formatColomboDateTime(payment.transactionAt)}
                    {payment.reference ? ` · Ref ${payment.reference}` : ''}
                  </small>
                  {payment.allocations.map((allocation) => (
                    <div className="small" key={allocation.id}>
                      {allocation.allocationType.replaceAll('_', ' ')}: {money(allocation.amount, payment.currency)}
                    </div>
                  ))}
                  {payment.receipts?.map((receipt) => (
                    <button type="button" className="btn btn-sm btn-link px-0 me-2" key={receipt.id}
                      onClick={() => downloadPrivateFile(
                        `/v1/rental-operations/bookings/${id}/payments/${payment.id}/receipts/${receipt.id}/download`,
                        receipt.originalName,
                      )}>
                      {canReadReceipt ? `Download ${receipt.originalName}` : 'Receipt'}
                    </button>
                  ))}
                  {canUploadReceipt && payment.direction === 'COLLECTION' && payment.status === 'COMPLETED' && (
                    <form className="d-flex gap-2 mt-2" onSubmit={async (event) => {
                      event.preventDefault();
                      const formData = new FormData();
                      if (event.currentTarget.elements.receipt.files[0]) {
                        formData.append('receipt', event.currentTarget.elements.receipt.files[0]);
                      }
                      try {
                        await apiUpload(`/v1/rental-operations/bookings/${id}/payments/${payment.id}/receipts`, formData);
                        event.currentTarget.reset();
                        setNotice('Payment receipt uploaded privately.');
                        await load();
                      } catch (requestError) {
                        setError(requestError.message);
                      }
                    }}>
                      <input className="form-control form-control-sm" type="file" name="receipt" accept="image/*,application/pdf" required />
                      <button className="btn btn-sm btn-outline-success" disabled={saving}>Upload receipt</button>
                    </form>
                  )}
                  {canRefund && payment.direction === 'COLLECTION' && payment.status === 'COMPLETED' && payment.allocations.map((allocation) => (
                    <form className="row g-2 mt-2" key={allocation.id}
                      onSubmit={(event) => refundPayment(event, payment, allocation.allocationType)}>
                      <div className="col-12"><small>Refund from {allocation.allocationType.replaceAll('_', ' ')} allocation</small></div>
                      <div className="col-4">
                        <input className="form-control form-control-sm" name="amount" inputMode="decimal" placeholder="Amount" required />
                      </div>
                      <div className="col-4">
                        <select className="form-select form-select-sm" name="method">
                          {['CASH', 'BANK_TRANSFER', 'CARD', 'OTHER'].map((method) => <option key={method} value={method}>{method.replaceAll('_', ' ')}</option>)}
                        </select>
                      </div>
                      <div className="col-4">
                        <input className="form-control form-control-sm" name="reason" maxLength={1000} placeholder="Refund reason" required />
                      </div>
                      <div className="col-12 text-end">
                        <button className="btn btn-sm btn-outline-warning" disabled={saving}>Record refund</button>
                      </div>
                    </form>
                  ))}
                  {canCorrectPayment && payment.direction === 'COLLECTION' && payment.status === 'COMPLETED' && (
                    <button type="button" className="btn btn-sm btn-outline-danger mt-2" disabled={saving}
                      onClick={() => correctPayment(payment)}>Correct payment</button>
                  )}
                </div>
              )) : <p className="text-secondary mb-0">No payments have been recorded.</p>}
            </Section>
          </div>
        </div>
      )}

      {canFinalize && booking.status === 'RETURNED' && (
        <Section title="Rental close-out" className="mt-3">
          <p className="text-secondary">Finalization requires a completed return, resolved charge decisions, settled deposit balance and the configured balance policy.</p>
          <button type="button" className="btn btn-success" disabled={saving || pendingCharges.length > 0 || pendingDamages.length > 0}
            onClick={finalizeRental}>Finalize rental</button>
        </Section>
      )}
      {booking.finalization && (
        <Section title="Finalized record" className="mt-3">
          <p className="mb-1">Finalized {formatColomboDateTime(booking.finalization.finalizedAt)}</p>
          <p className="text-secondary mb-0">Outstanding at close-out: {money(booking.finalization.rentalOutstanding, booking.currency)}</p>
        </Section>
      )}
    </>
  );
}
