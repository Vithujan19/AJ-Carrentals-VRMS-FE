const COLOMBO_OFFSET = '+05:30';

function parts(date, options) {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Colombo',
      ...options,
    })
      .formatToParts(date)
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value }) => [type, value]),
  );
}

export function colomboInputValue(date) {
  const value = parts(date, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return `${value.year}-${value.month}-${value.day}T${value.hour}:${value.minute}`;
}

export function colomboDateTimeToIso(value) {
  if (!value) return '';
  const date = new Date(`${value}:00${COLOMBO_OFFSET}`);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export function todayColombo() {
  return colomboDateValue(new Date());
}

export function colomboDateValue(date) {
  const value = parts(date, { year: 'numeric', month: '2-digit', day: '2-digit' });
  return `${value.year}-${value.month}-${value.day}`;
}

export function formatColomboDateTime(value, options = {}) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-LK', {
    timeZone: 'Asia/Colombo',
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options,
  }).format(new Date(value));
}

export function formatColomboDate(value, options = {}) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-LK', {
    timeZone: 'Asia/Colombo',
    dateStyle: 'medium',
    ...options,
  }).format(new Date(value));
}

export function addCalendarDays(value, days) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function dateOffset(value, days) {
  return colomboDateTimeToIso(`${addCalendarDays(value, days)}T00:00`);
}

export function calendarRange(value, view) {
  const [year, month, day] = value.split('-').map(Number);
  if (view === 'day') {
    return { from: dateOffset(value, 0), to: dateOffset(value, 1) };
  }
  if (view === 'week') {
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    const start = addCalendarDays(value, -weekday);
    return { from: dateOffset(start, 0), to: dateOffset(start, 7) };
  }
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
  const weekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const start = addCalendarDays(firstDay, -weekday);
  return { from: dateOffset(start, 0), to: dateOffset(start, 42) };
}

export function colomboMonthLabel(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('en-LK', {
    timeZone: 'Asia/Colombo',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day, 6)));
}
