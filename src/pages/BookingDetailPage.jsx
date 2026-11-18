import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest, apiResourceUrl } from '../api.js';
import { formatColomboDateTime } from '../date-time.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { staffWhatsAppUrl } from '../whatsapp.js';

function money(value, currency) {
  return value == null ? '—' : `${currency} ${value}`;
}

function StatusBadge({ status }) {
  const classes = {
    PENDING: 'text-bg-warning',
    UNDER_REVIEW: 'text-bg-warning',
    CONFIRMED: 'text-bg-primary',
    HANDED_OVER: 'text-bg-info',
    RETURNED: 'text-bg-info',
    COMPLETED: 'text-bg-success',
    CANCELLED: 'text-bg-secondary',
    REJECTED: 'text-bg-danger',
    EXPIRED: 'text-bg-secondary',
    NO_SHOW: 'text-bg-dark',
  };
  return <span className={`badge ${classes[status] ?? 'text-bg-secondary'}`}>{status?.replace('_', ' ')}</span>;
}

function Section({ title, children }) {
  return (
    <section className="content-card h-100">
      <h2 className="h5 mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <div className="booking-detail-field">
      <span className="small text-secondary">{label}</span>
      <strong>{children ?? '—'}</strong>
    </div>
  );
}

const actionLabels = {
  review: 'Move to review',
  reject: 'Reject booking',
  cancel: 'Cancel booking',
  expire: 'Expire request',
  'no-show': 'Mark no-show',
  confirm: 'Confirm booking',
};

export default function BookingDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const permissions = user.permissions;
  const canSeeFinancials =
    permissions.includes('bookings.pricing.view') || permissions.includes('payments.view');
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [action, setAction] = useState('');
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest(`/v1/bookings/${id}`);
      setBooking(result.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const retryWhatsApp = async () => {
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/v1/whatsapp/bookings/${id}/retry`, { method: 'POST' });
      await load();
      setNotice('WhatsApp message retry requested. Check the status below; it is not delivered until WhatsApp confirms.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const performAction = async () => {
    setSaving(true);
    setError('');
    try {
      const body = action === 'confirm' ? undefined : { reason: reason.trim() };
      const result = await apiRequest(`/v1/bookings/${id}/${action}`, { method: 'POST', body });
      setBooking(result.data);
      setNotice(`Booking ${result.data.reference} updated to ${result.data.status}.`);
      setAction('');
      setReason('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="content-card" role="status">Loading booking…</div>;
  }
  if (!booking) {
    return (
      <>
        <div className="alert alert-danger" role="alert">{error || 'Booking unavailable.'}</div>
        <Link className="btn btn-outline-secondary" to="/bookings">Back to bookings</Link>
      </>
    );
  }

  const canReview = permissions.includes('bookings.update');
  const canConfirm = permissions.includes('bookings.confirm');
  const canReject = permissions.includes('bookings.reject');
  const canCancel = permissions.includes('bookings.cancel');
  const canExpire = permissions.includes('bookings.expire');
  const canNoShow = permissions.includes('bookings.no_show');
  const canUseRentalOperations = [
    'rental.operations.view',
    'rental.operations.view.assigned',
    'rental.handover.create',
    'rental.return.create',
  ].some((permission) => permissions.includes(permission));
  const canAdjustPricing = permissions.includes('bookings.pricing.adjust');
  const canSeeInternal = permissions.includes('bookings.view');
  const canManageWhatsApp = permissions.includes('whatsapp.manage');
  const whatsappMessages = booking.whatsappMessages ?? [];
  const hasFailedMessage = whatsappMessages.some((message) => message.status === 'FAILED');
  const contactUrl = booking.customer?.mobileNumber
    ? staffWhatsAppUrl(
      booking.customer.mobileNumber,
      `Hello ${booking.customer.fullName ?? ''}, this is AJ Car Rentals regarding your booking ${booking.reference}.`,
    )
    : null;
  const consentLabel = !booking.whatsappConsent
    ? 'No consent given'
    : booking.whatsappConsentRevokedAt
      ? `Withdrawn ${formatColomboDateTime(booking.whatsappConsentRevokedAt)}`
      : `Given ${formatColomboDateTime(booking.whatsappConsentAt)}`;

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow"><Link to="/bookings">BOOKINGS</Link> / DETAILS</p>
          <h1 className="d-flex align-items-center gap-3 flex-wrap">
            {booking.reference} <StatusBadge status={booking.status} />
          </h1>
          <p className="text-secondary mb-0">Created {formatColomboDateTime(booking.createdAt)} · {booking.source?.replace('_', ' ')}</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          {booking.status === 'PENDING' && canReview && (
            <button type="button" className="btn btn-outline-warning" onClick={() => setAction('review')}>Review</button>
          )}
          {['PENDING', 'UNDER_REVIEW'].includes(booking.status) && canConfirm && (
            <button type="button" className="btn btn-primary" onClick={() => setAction('confirm')}>Confirm</button>
          )}
          {['PENDING', 'UNDER_REVIEW'].includes(booking.status) && canReject && (
            <button type="button" className="btn btn-outline-danger" onClick={() => setAction('reject')}>Reject</button>
          )}
          {['PENDING', 'UNDER_REVIEW', 'CONFIRMED'].includes(booking.status) && canCancel && (
            <button type="button" className="btn btn-outline-secondary" onClick={() => setAction('cancel')}>Cancel</button>
          )}
          {['PENDING', 'UNDER_REVIEW'].includes(booking.status) && canExpire && (
            <button type="button" className="btn btn-outline-secondary" onClick={() => setAction('expire')}>Expire</button>
          )}
          {booking.status === 'CONFIRMED' && canNoShow && new Date(booking.pickupAt) <= new Date() && (
            <button type="button" className="btn btn-outline-danger" onClick={() => setAction('no-show')}>Mark no-show</button>
          )}
          {canUseRentalOperations && ['CONFIRMED', 'HANDED_OVER', 'RETURNED', 'COMPLETED'].includes(booking.status) && (
            <Link className="btn btn-outline-primary" to={`/rental-operations/${booking.id}`}>
              Open rental operations
            </Link>
          )}
        </div>
      </div>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {notice && <div className="alert alert-success" role="status">{notice}</div>}

      <div className="row g-3">
        <div className="col-12 col-xl-6">
          <Section title="Booking and customer">
            <div className="booking-detail-grid">
              <Field label="Reference">{booking.reference}</Field>
              <Field label="Channel">{booking.source?.replace('_', ' ')}</Field>
              <Field label="Created by">{booking.createdBy?.displayName ?? 'Public website'}</Field>
              <Field label="Last updated">{formatColomboDateTime(booking.updatedAt)}</Field>
              <Field label="Customer name">{booking.customer?.fullName ?? 'Customer details restricted'}</Field>
              <Field label="Contact number">{booking.customer?.mobileNumber ?? '—'}</Field>
              <Field label="Email">{booking.customer?.email ?? '—'}</Field>
              <Field label="Pickup location">{booking.pickupLocationSnapshot}</Field>
              <Field label="Return location">{booking.returnLocationSnapshot}</Field>
            </div>
            {booking.customerNotes && (
              <div className="mt-3"><strong className="small">Customer requests</strong><p className="mb-0">{booking.customerNotes}</p></div>
            )}
            {canSeeInternal && booking.internalNotes && (
              <div className="alert alert-light border mt-3 mb-0"><strong>Internal notes</strong><p className="mb-0">{booking.internalNotes}</p></div>
            )}
            {booking.rejectionReason && <div className="alert alert-danger mt-3 mb-0">{booking.rejectionReason}</div>}
            {booking.cancellationReason && <div className="alert alert-secondary mt-3 mb-0">{booking.cancellationReason}</div>}
          </Section>
        </div>
        {(booking.customer?.mobileNumber || whatsappMessages.length > 0) && (
          <div className="col-12">
            <Section title="WhatsApp">
              <div className="d-grid gap-2">
                <Field label="Customer consent">{consentLabel}</Field>
                <Field label="Customer opened WhatsApp">
                  {booking.whatsappOpenedAt ? formatColomboDateTime(booking.whatsappOpenedAt) : 'Not recorded'}
                </Field>
              </div>
              {contactUrl && (
                <a className="btn btn-outline-primary mt-3" href={contactUrl} target="_blank" rel="noopener noreferrer">
                  Contact customer on WhatsApp
                </a>
              )}
              {whatsappMessages.length > 0 ? (
                <div className="table-responsive mt-3">
                  <table className="table table-sm align-middle mb-0">
                    <thead><tr><th>Message</th><th>Status</th><th>Sent</th><th>Delivered</th><th>Detail</th></tr></thead>
                    <tbody>
                      {whatsappMessages.map((message) => (
                        <tr key={message.id}>
                          <td>{message.category.replaceAll('_', ' ')}</td>
                          <td><span className={`badge ${message.status === 'FAILED' ? 'text-bg-danger' : ['DELIVERED', 'READ'].includes(message.status) ? 'text-bg-success' : 'text-bg-secondary'}`}>{message.status}</span></td>
                          <td>{message.sentAt ? formatColomboDateTime(message.sentAt) : '—'}</td>
                          <td>{message.deliveredAt ? formatColomboDateTime(message.deliveredAt) : '—'}</td>
                          <td className="small">{message.errorMessage ?? (message.retryCount ? `${message.retryCount} retries` : '')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="small text-secondary mt-3 mb-0">No automatic WhatsApp message has been queued for this booking.</p>
              )}
              {canManageWhatsApp && hasFailedMessage && (
                <button type="button" className="btn btn-outline-danger mt-3" disabled={saving} onClick={retryWhatsApp}>
                  Retry failed message
                </button>
              )}
            </Section>
          </div>
        )}
        <div className="col-12 col-xl-6">
          <Section title="Vehicle and rental">
            <div className="d-flex gap-3 align-items-start mb-3">
              {booking.vehicle?.imageUrl && (
                <img className="vehicle-thumb vehicle-thumb-large" src={apiResourceUrl(booking.vehicle.imageUrl)}
                  alt="" />
              )}
              <div>
                <strong className="d-block">{booking.vehicle?.specification?.make} {booking.vehicle?.specification?.model} {booking.vehicle?.specification?.variant}</strong>
                <span>{booking.registrationSnapshot}</span>
                {booking.vehicle && (
                  <Link className="d-block small" to={`/vehicles/${booking.vehicle.id}`}>Open vehicle profile</Link>
                )}
              </div>
            </div>
            <div className="booking-detail-grid">
              <Field label="Pickup">{formatColomboDateTime(booking.pickupAt)}</Field>
              <Field label="Return">{formatColomboDateTime(booking.returnAt)}</Field>
              <Field label="Package">{booking.packageNameSnapshot}</Field>
              <Field label="Billable units">{booking.rentalDurationUnits}</Field>
              <Field label="Package period">{booking.rentalPeriodSnapshot} × {booking.durationCountSnapshot}</Field>
              <Field label="Mileage allowance">{booking.includedMileageKmSnapshot?.toLocaleString()} km</Field>
              <Field label="Extra kilometre rate">{money(booking.additionalKmRateSnapshot, booking.currency)}</Field>
              <Field label="Confirmed by">{booking.confirmedBy?.displayName}</Field>
            </div>
          </Section>
        </div>

        {canSeeFinancials && (
          <div className="col-12 col-xl-6">
            <Section title="Financial summary">
              <div className="booking-detail-grid">
                <Field label="Rental charge">{money(booking.financialSummary?.rentalCharges, booking.currency)}</Field>
                <Field label="Quoted rental total">{money(booking.confirmedTotal ?? booking.estimatedTotal, booking.currency)}</Field>
                <Field label="Amount received">{money(booking.financialSummary?.rentalReceived, booking.currency)}</Field>
                <Field label="Rental outstanding">{money(booking.financialSummary?.rentalOutstanding, booking.currency)}</Field>
                <Field label="Security deposit">{money(booking.financialSummary?.securityDepositRequired, booking.currency)}</Field>
                <Field label="Deposit held">{money(booking.financialSummary?.securityDepositHeld, booking.currency)}</Field>
                <Field label="Deposit outstanding">{money(booking.financialSummary?.securityDepositOutstanding, booking.currency)}</Field>
                <Field label="Payment status">{booking.financialSummary?.paymentStatus}</Field>
              </div>
              {booking.charges?.length > 0 && (
                <div className="table-responsive mt-3">
                  <table className="table table-sm mb-0">
                    <thead><tr><th>Charge</th><th>Description</th><th className="text-end">Amount</th><th>Status</th></tr></thead>
                    <tbody>
                      {booking.charges.map((charge) => (
                        <tr key={charge.id}>
                          <td>{charge.chargeType}</td><td>{charge.description}</td>
                          <td className="text-end">{charge.direction === 'CREDIT' ? '−' : ''}{charge.currency} {charge.amount}</td>
                          <td>{charge.voidedAt ? 'Voided' : charge.recognizedAt ? 'Recognized' : 'Open'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {booking.payments?.length > 0 && (
                <div className="mt-3">
                  <h3 className="h6">Recorded payments</h3>
                  {booking.payments.map((payment) => (
                    <div className="d-flex justify-content-between border-top py-2" key={payment.id}>
                      <span>{payment.direction} · {payment.method} · {payment.status}{payment.reference ? ` · ${payment.reference}` : ''}</span>
                      <strong>{payment.currency} {payment.amount}</strong>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        )}

        <div className="col-12 col-xl-6">
          <Section title="Status history">
            {booking.statusHistory?.length ? (
              <ol className="booking-history-list mb-0">
                {booking.statusHistory.map((entry) => (
                  <li key={entry.id}>
                    <div className="d-flex flex-wrap justify-content-between gap-2">
                      <strong>{entry.fromStatus ?? 'REQUEST'} → {entry.toStatus}</strong>
                      <time className="small text-secondary">{formatColomboDateTime(entry.occurredAt)}</time>
                    </div>
                    <span className="small text-secondary">
                      {entry.actor?.displayName ?? 'Customer'}{entry.reason ? ` · ${entry.reason}` : ''}
                    </span>
                  </li>
                ))}
              </ol>
            ) : <p className="text-secondary mb-0">No status changes recorded.</p>}
            {booking.scheduleChanges?.length > 0 && (
              <div className="mt-3">
                <h3 className="h6">Schedule history</h3>
                {booking.scheduleChanges.map((change) => (
                  <div className="border-top py-2 small" key={change.id}>
                    {formatColomboDateTime(change.previousPickupAt)} – {formatColomboDateTime(change.previousReturnAt)}
                    {' → '}
                    {formatColomboDateTime(change.newPickupAt)} – {formatColomboDateTime(change.newReturnAt)}
                    <div className="text-secondary">{change.reason} · {change.changedBy?.displayName}</div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        {booking.handover && (
          <div className="col-12">
            <Section title="Handover and return">
              <div className="booking-detail-grid">
                <Field label="Handed over">{formatColomboDateTime(booking.handover.handedOverAt)}</Field>
                <Field label="Starting mileage">{booking.handover.startingOdometerKm?.toLocaleString()} km</Field>
                <Field label="Starting fuel">{booking.handover.startingFuelPercent}%</Field>
                <Field label="Returned">{formatColomboDateTime(booking.handover.returnedAt)}</Field>
                <Field label="Ending mileage">{booking.handover.endingOdometerKm?.toLocaleString()} km</Field>
                <Field label="Ending fuel">{booking.handover.endingFuelPercent ? `${booking.handover.endingFuelPercent}%` : '—'}</Field>
              </div>
              {booking.handover.inspections.map((inspection) => (
                <div className="border-top mt-3 pt-3" key={inspection.id}>
                  <strong>{inspection.stage} inspection</strong>
                  <p className="small text-secondary mb-2">{inspection.conditionSummary || 'No condition notes.'}</p>
                  {inspection.damages.map((damage) => (
                    <div className="alert alert-warning py-2 mb-2" key={damage.id}>
                      {damage.category} · {damage.severity} · {damage.origin} · {damage.status}: {damage.description}
                    </div>
                  ))}
                </div>
              ))}
            </Section>
          </div>
        )}

        {booking.handover && (
          <div className="col-12">
            <Section title="Rental operation records">
              <p className="text-secondary">Handover and return records are managed through the guided rental-operations workflow.</p>
              {canUseRentalOperations && (
                <Link className="btn btn-outline-primary" to={`/rental-operations/${booking.id}`}>
                  View operation record
                </Link>
              )}
            </Section>
          </div>
        )}

        {booking.rentalPolicy && (
          <div className="col-12">
            <Section title={`Rental terms · version ${booking.rentalPolicy.version}`}>
              <p className="mb-0 white-space-pre-wrap">{booking.rentalPolicy.rentalTerms}</p>
              {canSeeInternal && booking.rentalPolicy.cancellationTerms && (
                <p className="small text-secondary mt-3 mb-0">{booking.rentalPolicy.cancellationTerms}</p>
              )}
            </Section>
          </div>
        )}
      </div>

      {action && (
        <div className="booking-dialog-backdrop" role="presentation">
          <section className="booking-dialog content-card" role="dialog" aria-modal="true"
            aria-labelledby="booking-action-title">
            <h2 id="booking-action-title" className="h5">{actionLabels[action]}</h2>
            {action === 'confirm' ? (
              <p>Confirmation rechecks vehicle availability in a database transaction. The booking will not be marked paid.</p>
            ) : (
              <>
                <label className="form-label" htmlFor="booking-action-reason">Reason</label>
                <textarea id="booking-action-reason" className="form-control" rows="3" maxLength={1000}
                  required value={reason} onChange={(event) => setReason(event.target.value)} />
                {action === 'cancel' && (
                  <p className="small text-secondary mt-2 mb-0">
                    Cancelling releases availability. No payment is automatically refunded and no cancellation fee is applied.
                  </p>
                )}
              </>
            )}
            <div className="d-flex justify-content-end gap-2 mt-4">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setAction('')} disabled={saving}>Keep booking</button>
              <button type="button"
                className={`btn ${['reject', 'cancel', 'no-show'].includes(action) ? 'btn-danger' : 'btn-primary'}`}
                onClick={performAction}
                disabled={saving || (action !== 'confirm' && !reason.trim())}>
                {saving ? 'Saving…' : actionLabels[action]}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
