// Indian number formatting: lakh and crore, because that is how procurement teams here talk about money.
export function inr(n, { compact = true } = {}) {
  if (n == null || Number.isNaN(n)) return '–';
  const abs = Math.abs(n);
  if (compact) {
    if (abs >= 1e7) return `₹${(n / 1e7).toFixed(abs >= 1e8 ? 1 : 2)} Cr`;
    if (abs >= 1e5) return `₹${(n / 1e5).toFixed(abs >= 1e6 ? 1 : 2)} L`;
  }
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

export const pct = (n, d = 1) => (n == null ? '–' : `${Number(n).toFixed(d)}%`);
export const num = (n) => (n == null ? '–' : Number(n).toLocaleString('en-IN'));

export function date(d) {
  if (!d) return '–';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const dateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

export function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' });
}

export function relDays(days) {
  if (days == null) return '–';
  if (days < 0) return `${Math.abs(days)} days ago`;
  if (days === 0) return 'today';
  return `in ${days} days`;
}

// Colour roles for each performance band. Text never relies on colour alone: the band name is always shown.
export const BAND = {
  Excellent: { fg: '#136C49', bg: '#E0F3EA', stroke: '#1F9D6B' },
  Reliable: { fg: '#24506A', bg: '#E1ECF2', stroke: '#3A6A86' },
  Watch: { fg: '#7D5200', bg: '#FBF0D9', stroke: '#D68A0C' },
  'At risk': { fg: '#A12333', bg: '#FBE4E7', stroke: '#D93A4B' },
  Unrated: { fg: '#5B6E6A', bg: '#E6EAE8', stroke: '#8A9A96' },
};

export const SEVERITY = {
  Minor: { fg: '#5B6E6A', bg: '#E6EAE8' },
  Major: { fg: '#7D5200', bg: '#FBF0D9' },
  Critical: { fg: '#A12333', bg: '#FBE4E7' },
};

export const CATEGORIES = ['Raw materials', 'Packaging', 'Logistics', 'IT services', 'Facility services', 'Electronics', 'Chemicals', 'Maintenance'];

export const metricTone = (v, good, ok) => (v == null ? 'text-quiet' : v >= good ? 'text-ok-text' : v >= ok ? 'text-warn-text' : 'text-bad-text');
