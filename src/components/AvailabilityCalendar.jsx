import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api.js';
import {
  addCalendarDays,
  calendarRange,
  colomboDateTimeToIso,
  colomboMonthLabel,
  todayColombo,
} from '../date-time.js';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DEFAULT_TIME = '09:00';

function overlaps(ranges, startIso, endIso) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return ranges.some((range) => new Date(range.start).getTime() < end && new Date(range.end).getTime() > start);
}

function coverage(ranges, day) {
  const start = new Date(colomboDateTimeToIso(`${day}T00:00`)).getTime();
  const end = new Date(colomboDateTimeToIso(`${addCalendarDays(day, 1)}T00:00`)).getTime();
  const clipped = ranges
    .map((range) => [Math.max(start, new Date(range.start).getTime()), Math.min(end, new Date(range.end).getTime())])
    .filter(([from, to]) => to > from)
    .sort((left, right) => left[0] - right[0]);
  if (clipped.length === 0) return 'free';
  let cursor = start;
  for (const [from, to] of clipped) {
    if (from > cursor) return 'partial';
    cursor = Math.max(cursor, to);
  }
  return cursor >= end ? 'booked' : 'partial';
}

// Pickup is inclusive and return is exclusive; all dates are Asia/Colombo.
export default function AvailabilityCalendar({ vehicleId, value, onChange }) {
  const today = todayColombo();
  const [anchor, setAnchor] = useState(`${today.slice(0, 7)}-01`);
  const [ranges, setRanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [pending, setPending] = useState(null);
  const [notice, setNotice] = useState('');

  const range = useMemo(() => calendarRange(anchor, 'month'), [anchor]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const query = new URLSearchParams({ from: range.from, to: range.to });
    apiRequest(`/v1/public/vehicles/${encodeURIComponent(vehicleId)}/calendar?${query}`)
      .then(({ data }) => { if (active) setRanges(data.unavailable); })
      .catch((err) => { if (active) { setRanges([]); setError(err.message); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [vehicleId, range.from, range.to, retry]);

  const days = useMemo(() => {
    const start = addCalendarDays(anchor, -new Date(`${anchor}T00:00:00Z`).getUTCDay());
    return Array.from({ length: 42 }, (_, index) => addCalendarDays(start, index)).map((day) => ({
      day,
      inMonth: day.slice(0, 7) === anchor.slice(0, 7),
      past: day < today,
      state: coverage(ranges, day),
    }));
  }, [anchor, ranges, today]);

  const selectDay = (day) => {
    setNotice('');
    if (!pending) {
      setPending(day);
      onChange?.(null);
      return;
    }
    if (day <= pending) {
      setPending(day);
      return;
    }
    const pickupIso = colomboDateTimeToIso(`${pending}T${DEFAULT_TIME}`);
    const returnIso = colomboDateTimeToIso(`${day}T${DEFAULT_TIME}`);
    if (overlaps(ranges, pickupIso, returnIso)) {
      setNotice('That period includes dates when the vehicle is unavailable. Choose different dates.');
      setPending(null);
      return;
    }
    onChange?.({ pickup: `${pending}T${DEFAULT_TIME}`, return: `${day}T${DEFAULT_TIME}` });
    setPending(null);
  };

  const selectedStart = pending ?? value?.pickup?.slice(0, 10);
  const selectedEnd = pending ? null : value?.return?.slice(0, 10);
  const canGoBack = anchor.slice(0, 7) > today.slice(0, 7);
  const move = (months) => {
    const [year, month] = anchor.split('-').map(Number);
    const next = new Date(Date.UTC(year, month - 1 + months, 1));
    setAnchor(`${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01`);
  };

  return (
    <div className="availability-calendar" aria-busy={loading}>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <button type="button" className="btn btn-sm btn-outline-dark" disabled={!canGoBack} onClick={() => move(-1)} aria-label="Previous month">‹</button>
        <strong aria-live="polite">{colomboMonthLabel(anchor)}</strong>
        <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => move(1)} aria-label="Next month">›</button>
      </div>
      <div className="availability-grid" role="grid" aria-label="Vehicle availability">
        {WEEKDAYS.map((name) => <div className="availability-weekday" key={name} role="columnheader">{name}</div>)}
        {days.map(({ day, inMonth, past, state }) => {
          const disabled = past || state === 'booked' || !inMonth;
          const inRange = selectedStart && selectedEnd && day >= selectedStart && day <= selectedEnd;
          const classes = [
            'availability-day',
            !inMonth ? 'is-outside' : '',
            past ? 'is-past' : '',
            state === 'booked' ? 'is-booked' : '',
            state === 'partial' ? 'is-partial' : '',
            day === selectedStart || day === selectedEnd ? 'is-selected' : '',
            inRange ? 'is-in-range' : '',
          ].filter(Boolean).join(' ');
          return (
            <button type="button" key={day} className={classes} disabled={disabled} onClick={() => selectDay(day)}
              aria-pressed={day === selectedStart || day === selectedEnd}
              aria-label={`${day}${state === 'booked' ? ', unavailable' : state === 'partial' ? ', partly unavailable' : ''}`}>
              {Number(day.slice(8))}
            </button>
          );
        })}
      </div>
      <ul className="availability-legend list-inline small mt-2 mb-0">
        <li className="list-inline-item"><span className="legend-swatch" /> Available</li>
        <li className="list-inline-item"><span className="legend-swatch is-partial" /> Partly unavailable</li>
        <li className="list-inline-item"><span className="legend-swatch is-booked" /> Unavailable</li>
        <li className="list-inline-item"><span className="legend-swatch is-selected" /> Selected</li>
      </ul>
      <p className="small text-secondary mt-2 mb-0">
        {pending ? 'Now choose your return date.' : 'Choose your pickup date, then your return date.'} Times are in Sri Lanka time; the return day is not counted as booked.
      </p>
      {loading && <p className="small mb-0" role="status">Loading availability…</p>}
      {notice && <div className="alert alert-warning mt-2 mb-0" role="alert">{notice}</div>}
      {error && (
        <div className="alert alert-danger mt-2 mb-0" role="alert">
          {error} <button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={() => setRetry((count) => count + 1)}>Try again</button>
        </div>
      )}
    </div>
  );
}
