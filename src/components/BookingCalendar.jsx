import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api.js';
import {
  addCalendarDays,
  calendarRange,
  colomboDateTimeToIso,
  colomboMonthLabel,
  todayColombo,
} from '../date-time.js';

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const statusClass = {
  PENDING: 'calendar-event-pending',
  UNDER_REVIEW: 'calendar-event-review',
  CONFIRMED: 'calendar-event-confirmed',
  HANDED_OVER: 'calendar-event-handed-over',
  RETURNED: 'calendar-event-returned',
  COMPLETED: 'calendar-event-completed',
  CANCELLED: 'calendar-event-cancelled',
  REJECTED: 'calendar-event-rejected',
  EXPIRED: 'calendar-event-cancelled',
  NO_SHOW: 'calendar-event-rejected',
  MAINTENANCE: 'calendar-event-maintenance',
};

function daysForView(cursor, view) {
  if (view === 'day') return [cursor];
  if (view === 'week') {
    const [year, month, day] = cursor.split('-').map(Number);
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    const start = addCalendarDays(cursor, -weekday);
    return Array.from({ length: 7 }, (_, index) => addCalendarDays(start, index));
  }
  const [year, month] = cursor.split('-').map(Number);
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
  const weekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const start = addCalendarDays(firstDay, -weekday);
  return Array.from({ length: 42 }, (_, index) => addCalendarDays(start, index));
}

function eventsOnDate(events, date) {
  const start = new Date(colomboDateTimeToIso(`${date}T00:00`)).getTime();
  const end = new Date(colomboDateTimeToIso(`${addCalendarDays(date, 1)}T00:00`)).getTime();
  return events.filter((event) => {
    const eventStart = new Date(event.start).getTime();
    const eventEnd = event.end ? new Date(event.end).getTime() : Number.POSITIVE_INFINITY;
    return eventStart < end && eventEnd > start;
  });
}

export default function BookingCalendar({ initialStatus = '' }) {
  const [view, setView] = useState('month');
  const [cursor, setCursor] = useState(todayColombo());
  const [status, setStatus] = useState(initialStatus);
  const [vehicleId, setVehicleId] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState('');
  const range = useMemo(() => calendarRange(cursor, view), [cursor, view]);
  const days = useMemo(() => daysForView(cursor, view), [cursor, view]);

  useEffect(() => {
    let active = true;
    apiRequest('/v1/vehicles?page=1&limit=100&sortBy=registration&sortOrder=asc')
      .then((result) => {
        if (active) setVehicles(result.data.items);
      })
      .catch(() => {
        if (active) setVehicles([]);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ ...range, view });
    if (status) params.set('status', status);
    if (vehicleId) params.set('vehicleId', vehicleId);
    setLoading(true);
    setError('');
    apiRequest(`/v1/bookings/calendar?${params}`)
      .then((result) => {
        if (!active) return;
        setEvents(result.data.items);
        setTruncated(result.data.truncated);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [range, view, status, vehicleId]);

  const navigate = (direction) => {
    const amount = view === 'month' ? 28 : view === 'week' ? 7 : 1;
    if (direction === 'today') {
      setCursor(todayColombo());
      return;
    }
    if (view === 'month') {
      const [year, month, day] = cursor.split('-').map(Number);
      const nextMonth = new Date(Date.UTC(year, month - 1 + (direction === 'next' ? 1 : -1), 1));
      const lastDay = new Date(Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, 0)).getUTCDate();
      const next = new Date(Date.UTC(
        nextMonth.getUTCFullYear(),
        nextMonth.getUTCMonth(),
        Math.min(day, lastDay),
      ));
      setCursor(`${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`);
      return;
    }
    setCursor(addCalendarDays(cursor, direction === 'next' ? amount : -amount));
  };

  const heading = view === 'day'
    ? new Intl.DateTimeFormat('en-LK', { timeZone: 'Asia/Colombo', dateStyle: 'full' })
      .format(new Date(colomboDateTimeToIso(`${cursor}T12:00`)))
    : colomboMonthLabel(cursor);

  return (
    <section className="content-card">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div>
          <h2 className="h5 mb-1">Booking calendar</h2>
          <p className="small text-secondary mb-0">{heading} · all times Sri Lanka time</p>
        </div>
        <div className="btn-group" role="group" aria-label="Calendar view">
          {['month', 'week', 'day'].map((value) => (
            <button type="button" className={`btn btn-sm ${view === value ? 'btn-primary' : 'btn-outline-primary'}`}
              key={value} onClick={() => setView(value)}>{value[0].toUpperCase() + value.slice(1)}</button>
          ))}
        </div>
      </div>
      <div className="row g-2 align-items-end mb-3">
        <div className="col-12 col-sm-4 col-lg-3">
          <label className="form-label" htmlFor="calendar-status">Status</label>
          <select id="calendar-status" className="form-select form-select-sm" value={status}
            onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {['PENDING', 'UNDER_REVIEW', 'CONFIRMED', 'HANDED_OVER', 'RETURNED', 'COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED', 'NO_SHOW']
              .map((value) => <option key={value}>{value}</option>)}
          </select>
        </div>
        <div className="col-12 col-sm-5 col-lg-4">
          <label className="form-label" htmlFor="calendar-vehicle">Vehicle</label>
          <select id="calendar-vehicle" className="form-select form-select-sm" value={vehicleId}
            onChange={(event) => setVehicleId(event.target.value)}>
            <option value="">All vehicles</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.registrationNumber} · {vehicle.specification?.make} {vehicle.specification?.model}
              </option>
            ))}
          </select>
        </div>
        <div className="col-12 col-sm-3 col-lg-5 d-flex justify-content-sm-end gap-2">
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => navigate('previous')}>Previous</button>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => navigate('today')}>Today</button>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => navigate('next')}>Next</button>
        </div>
      </div>

      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {truncated && (
        <div className="alert alert-warning py-2" role="status">
          This range contains more than 500 events. Filter by vehicle or status to narrow the calendar.
        </div>
      )}
      {loading ? (
        <div className="py-4 text-secondary" role="status">Loading calendar…</div>
      ) : (
        <div className={`booking-calendar booking-calendar-${view}`}>
          {view !== 'day' && weekdays.map((weekday) => (
            <div className="booking-calendar-weekday" key={weekday}>{weekday}</div>
          ))}
          {days.map((day) => {
            const dayEvents = eventsOnDate(events, day);
            const isCurrentMonth = day.slice(0, 7) === cursor.slice(0, 7);
            const isToday = day === todayColombo();
            return (
              <div className={`booking-calendar-day${isCurrentMonth ? '' : ' outside-month'}${isToday ? ' today' : ''}`}
                key={day}>
                <div className="booking-calendar-date">{Number(day.slice(-2))}</div>
                <div className="booking-calendar-events">
                  {dayEvents.map((event) => {
                    const className = `booking-calendar-event ${statusClass[event.status] ?? 'calendar-event-cancelled'}`;
                    const content = (
                      <>
                        <strong className="d-block text-truncate">{event.title}</strong>
                        <span className="d-block text-truncate">{event.vehicle.registrationNumber} · {event.status}</span>
                      </>
                    );
                    return event.type === 'BOOKING' ? (
                      <Link className={className} key={`${event.type}-${event.id}`}
                        to={`/bookings/${event.id}`} title={`${event.title} · ${event.status}`}>
                        {content}
                      </Link>
                    ) : (
                      <div className={className} key={`${event.type}-${event.id}`} title={event.title}>
                        {content}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="calendar-legend mt-3">
        {Object.entries(statusClass).map(([label, className]) => (
          <span key={label} className="small d-inline-flex align-items-center gap-1">
            <i className={`calendar-legend-dot ${className}`} />
            {label.replace('_', ' ')}
          </span>
        ))}
      </div>
    </section>
  );
}
