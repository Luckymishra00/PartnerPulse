import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, Check, Loader2, X } from 'lucide-react';
import { BAND, SEVERITY } from '../lib/format.js';

export function PageHeader({ title, sub, actions }) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-[32px] font-bold leading-[1.1] text-harbor-800 sm:text-[38px]">{title}</h1>
        {sub && <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-quiet">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function SectionTitle({ title, note, right }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
      <div>
        <h2 className="text-xl font-semibold text-harbor-800">{title}</h2>
        {note && <p className="mt-0.5 text-sm text-quiet">{note}</p>}
      </div>
      {right}
    </div>
  );
}

export function Pill({ children, fg = '#5B6E6A', bg = '#E6EAE8', dot }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[3px] text-xs font-semibold" style={{ color: fg, background: bg }}>
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />}
      {children}
    </span>
  );
}

export const BandPill = ({ band }) => {
  const b = BAND[band] || BAND.Unrated;
  return <Pill fg={b.fg} bg={b.bg} dot={b.stroke}>{band}</Pill>;
};

export const SeverityPill = ({ severity }) => <Pill fg={SEVERITY[severity]?.fg} bg={SEVERITY[severity]?.bg}>{severity}</Pill>;

const TONES = {
  good: ['#136C49', '#E0F3EA'],
  warn: ['#7D5200', '#FBF0D9'],
  bad: ['#A12333', '#FBE4E7'],
  info: ['#2441D9', '#E6EAFF'],
  mute: ['#5B6E6A', '#E6EAE8'],
};
export const Tone = ({ tone = 'mute', children }) => <Pill fg={TONES[tone][0]} bg={TONES[tone][1]}>{children}</Pill>;

export function Spinner({ label = 'Loading' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-20 text-sm text-quiet" role="status">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}…
    </div>
  );
}

export function ErrorNote({ message, onRetry }) {
  return (
    <div className="panel flex items-start gap-3 border-bad/40 bg-bad-tint p-4 text-sm text-bad-text" role="alert">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        <p className="font-semibold">Could not load this page</p>
        <p className="mt-0.5">{message}</p>
      </div>
      {onRetry && <button className="btn-quiet" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Empty({ title, children, action }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="font-display text-lg font-semibold text-harbor-800">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-sm text-sm text-quiet">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="hint block">{hint}</span>}
    </label>
  );
}

export function Segmented({ options, value, onChange, label }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-[3px] border border-line2 bg-sheet p-0.5">
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value;
        const l = typeof o === 'string' ? o : o.label;
        return (
          <button
            key={v}
            type="button"
            aria-pressed={value === v}
            onClick={() => onChange(v)}
            className={`h-8 rounded-[2px] px-3 text-[13px] font-semibold transition-colors ${value === v ? 'bg-harbor-800 text-white' : 'text-quiet hover:text-harbor-800'}`}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

// ---- Sheet: forms slide in from the right so the ledger stays visible behind them ----
export function Sheet({ open, title, subtitle, onClose, children, footer }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setTimeout(() => ref.current?.querySelector('input:not([type=hidden]), select, textarea')?.focus(), 60);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 animate-fade bg-harbor-900/45" onClick={onClose} aria-hidden="true" />
      <section ref={ref} role="dialog" aria-modal="true" aria-label={title} className="relative flex h-full w-full max-w-[560px] animate-sheet flex-col bg-sheet shadow-[-12px_0_40px_rgba(8,24,36,0.18)]">
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <h2 className="text-2xl font-bold text-harbor-800">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-quiet">{subtitle}</p>}
          </div>
          <button className="btn-ghost -mr-2 h-8 w-8 px-0" onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line bg-white/60 px-6 py-4">{footer}</div>}
      </section>
    </div>
  );
}

// ---- Toasts ----
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, tone = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setItems((s) => [...s, { id, message, tone }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`pointer-events-auto flex animate-fade items-center gap-2 rounded-[3px] px-4 py-2.5 text-sm font-semibold text-white shadow-lg ${t.tone === 'ok' ? 'bg-harbor-800' : 'bg-bad'}`}>
            {t.tone === 'ok' ? <Check className="h-4 w-4 text-[#7FE0B6]" /> : <AlertTriangle className="h-4 w-4" />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ---- Table ----
export function DataTable({ columns, rows, onRowClick, empty, initialSort, dense = false, limit }) {
  const [sort, setSort] = useState(initialSort || null);
  let data = [...rows];
  if (sort) {
    const col = columns.find((c) => c.key === sort.key);
    const get = col?.sort || ((r) => r[sort.key]);
    data.sort((a, b) => {
      const x = get(a);
      const y = get(b);
      if (x == null) return 1;
      if (y == null) return -1;
      const c = typeof x === 'string' ? x.localeCompare(y) : x - y;
      return sort.dir === 'asc' ? c : -c;
    });
  }
  if (limit) data = data.slice(0, limit);
  if (!rows.length) return empty || <Empty title="Nothing here yet" />;
  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {columns.map((c) => {
              const sortable = c.sort || c.sortable;
              const active = sort?.key === c.key;
              return (
                <th key={c.key} className={`th ${c.align === 'right' ? 'text-right' : ''} ${c.className || ''}`} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                  {sortable ? (
                    <button type="button" className={`inline-flex items-center gap-1 hover:text-harbor-800 ${active ? 'text-harbor-800' : ''}`} onClick={() => setSort(active && sort.dir === 'desc' ? { key: c.key, dir: 'asc' } : { key: c.key, dir: 'desc' })}>
                      {c.label}
                      {active && (sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr
              key={r._id || r.supplierId || r.contractId || i}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              onKeyDown={onRowClick ? (e) => e.key === 'Enter' && onRowClick(r) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              className={`transition-colors hover:bg-white ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {columns.map((c) => (
                <td key={c.key} className={`td ${dense ? '!py-2' : ''} ${c.align === 'right' ? 'text-right' : ''} ${c.className || ''}`}>
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- A single continuous band of figures (instead of a row of separate cards) ----
export function FigureBand({ items }) {
  return (
    <dl className="panel grid grid-cols-2 divide-line sm:grid-cols-3 lg:flex lg:divide-x">
      {items.map((it, i) => (
        <div key={it.label} className={`min-w-0 flex-1 px-5 py-4 ${i > 0 ? 'max-lg:border-t max-lg:border-line' : ''} ${i % 2 === 1 ? 'max-sm:border-l max-sm:border-line' : ''}`}>
          <dt className="text-[13px] font-semibold text-quiet">{it.label}</dt>
          <dd className={`num mt-1 text-[30px] font-bold leading-none ${it.tone || 'text-harbor-800'}`}>{it.value}</dd>
          {it.note && <p className={`mt-1.5 text-xs ${it.noteTone || 'text-quiet'}`}>{it.note}</p>}
        </div>
      ))}
    </dl>
  );
}

export const deltaNote = (d, unit = ' pts') =>
  d == null ? { note: 'Not enough history' } : d === 0 ? { note: 'Flat vs prior 90 days' } : { note: `${d > 0 ? '▲' : '▼'} ${Math.abs(d)}${unit} vs prior 90 days`, noteTone: d > 0 ? 'text-ok-text' : 'text-bad-text' };
