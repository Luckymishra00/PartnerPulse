import { useEffect, useMemo, useState } from 'react';
import { PackageCheck, Plus, Search } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth, useLoad } from '../lib/auth.jsx';
import { date, dateInput, inr, metricTone, num, pct } from '../lib/format.js';
import { useForm } from '../lib/useForm.js';
import { DataTable, Empty, ErrorNote, Field, FigureBand, PageHeader, Segmented, Sheet, Spinner, Tone, useToast } from '../components/ui.jsx';

const today = () => dateInput(new Date());
const blank = () => ({ poNumber: '', supplier: '', item: '', orderDate: today(), promisedDate: dateInput(new Date(Date.now() + 10 * 86400000)), quantityOrdered: '', amount: '', status: 'Ordered', deliveredDate: '', quantityReceived: '', defectiveQty: 0, notes: '' });

function DeliverySheet({ open, delivery, suppliers, onClose, onSaved }) {
  const f = useForm(blank());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { user } = useAuth();
  const editing = !!delivery?._id;

  useEffect(() => {
    if (!open) return;
    setError('');
    if (!delivery) return f.setV(blank());
    f.setV({
      ...blank(), ...delivery,
      supplier: delivery.supplier?._id || delivery.supplier,
      orderDate: dateInput(delivery.orderDate), promisedDate: dateInput(delivery.promisedDate), deliveredDate: dateInput(delivery.deliveredDate),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, delivery]);

  const delivered = f.v.status === 'Delivered';
  const delay = delivered && f.v.deliveredDate && f.v.promisedDate ? Math.round((new Date(f.v.deliveredDate) - new Date(f.v.promisedDate)) / 86400000) : null;

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { _id, __v, id, createdAt, updatedAt, delayDays, defectRate, overdueDays, contract, ...body } = f.v;
      if (!delivered) {
        body.deliveredDate = null;
        if (body.quantityReceived === '') delete body.quantityReceived;
      }
      if (editing) await api.put(`/deliveries/${delivery._id}`, body);
      else await api.post('/deliveries', body);
      toast(delivered ? 'Delivery saved and checked against the SLA' : 'Order saved');
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete ${delivery.poNumber}? Any breach it raised is removed too.`)) return;
    try {
      await api.del(`/deliveries/${delivery._id}`);
      toast('Order deleted');
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? (delivered ? 'Delivery details' : `Update ${delivery.poNumber}`) : 'Record an order'}
      subtitle="Saving a delivered order checks it against the contract and raises an SLA breach if it was late or defective."
      footer={
        <>
          {editing && user.role === 'admin' && <button type="button" className="btn-danger mr-auto" onClick={remove}>Delete</button>}
          <button type="button" className="btn-quiet" onClick={onClose}>Cancel</button>
          <button form="delivery-form" className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </>
      }
    >
      <form id="delivery-form" onSubmit={save} className="grid grid-cols-2 gap-4">
        <Field label="PO number"><input className="input" required {...f.bind('poNumber')} placeholder="PO-4801" /></Field>
        <Field label="Supplier">
          <select className="input" required {...f.bind('supplier')}>
            <option value="">Choose a supplier</option>
            {suppliers.filter((s) => s.status !== 'Offboarded').map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Item or service" className="col-span-2"><input className="input" required {...f.bind('item')} /></Field>
        <Field label="Order date"><input className="input" type="date" required {...f.bind('orderDate')} /></Field>
        <Field label="Promised date"><input className="input" type="date" required {...f.bind('promisedDate')} /></Field>
        <Field label="Quantity ordered"><input className="input" type="number" min="1" required {...f.bind('quantityOrdered')} /></Field>
        <Field label="Order value (₹)"><input className="input" type="number" min="0" required {...f.bind('amount')} /></Field>
        <Field label="Status" className="col-span-2">
          <select className="input" {...f.bind('status')}>{['Ordered', 'In transit', 'Delivered', 'Cancelled'].map((t) => <option key={t}>{t}</option>)}</select>
        </Field>
        {delivered && (
          <>
            <Field label="Delivered on"><input className="input" type="date" required {...f.bind('deliveredDate')} /></Field>
            <Field label="Units received"><input className="input" type="number" min="0" required {...f.bind('quantityReceived')} /></Field>
            <Field label="Defective units"><input className="input" type="number" min="0" {...f.bind('defectiveQty')} /></Field>
            <div className="flex items-end pb-2 text-sm">
              {delay != null && (delay <= 0 ? <Tone tone="good">{delay < 0 ? `${-delay} days early` : 'On time'}</Tone> : <Tone tone="warn">{delay} days late</Tone>)}
            </div>
          </>
        )}
        <Field label="Notes" className="col-span-2"><textarea className="input" rows={2} {...f.bind('notes')} /></Field>
        {error && <p role="alert" className="col-span-2 rounded-[3px] bg-bad-tint px-3 py-2 text-sm font-medium text-bad-text">{error}</p>}
      </form>
    </Sheet>
  );
}

export default function Deliveries() {
  const { canWrite } = useAuth();
  const { data, error, loading, reload } = useLoad(async () => {
    const [d, s] = await Promise.all([api.get('/deliveries?limit=2000'), api.get('/suppliers?limit=1000')]);
    return { deliveries: d.items, suppliers: s.items };
  });
  const [filter, setFilter] = useState('All');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(100);
  const [sheet, setSheet] = useState({ open: false, delivery: null });

  const rows = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    const test = {
      All: () => true,
      Open: (d) => d.status === 'Ordered' || d.status === 'In transit',
      Overdue: (d) => d.overdueDays > 0,
      Late: (d) => d.status === 'Delivered' && d.delayDays > 0,
      Delivered: (d) => d.status === 'Delivered',
    }[filter];
    return data.deliveries.filter((d) => test(d) && (!needle || [d.poNumber, d.item, d.supplier?.name].some((x) => x?.toLowerCase().includes(needle))));
  }, [data, filter, q]);

  if (loading) return <Spinner />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;

  const done = data.deliveries.filter((d) => d.status === 'Delivered');
  const onTime = done.filter((d) => d.delayDays <= 0).length;
  const late = done.filter((d) => d.delayDays > 0);
  const units = done.reduce((s, d) => s + d.quantityReceived, 0);
  const bad = done.reduce((s, d) => s + d.defectiveQty, 0);
  const overdue = data.deliveries.filter((d) => d.overdueDays > 0).length;
  const open = (delivery = null) => setSheet({ open: true, delivery });
  const receive = (d) => open({ ...d, status: 'Delivered', deliveredDate: today(), quantityReceived: d.quantityReceived || d.quantityOrdered });

  const columns = [
    { key: 'po', label: 'PO', sort: (r) => r.poNumber, render: (r) => (<><span className="block font-semibold">{r.poNumber}</span><span className="text-[13px] text-quiet">{r.item}</span></>) },
    { key: 'sup', label: 'Supplier', sort: (r) => r.supplier?.name, render: (r) => r.supplier?.name },
    { key: 'order', label: 'Ordered', sort: (r) => new Date(r.orderDate).getTime(), render: (r) => date(r.orderDate) },
    { key: 'promised', label: 'Promised', sort: (r) => new Date(r.promisedDate).getTime(), render: (r) => date(r.promisedDate) },
    { key: 'result', label: 'Result', sort: (r) => (r.status === 'Delivered' ? r.delayDays : r.overdueDays || -99), render: (r) => r.status === 'Cancelled' ? <Tone>Cancelled</Tone> : r.status !== 'Delivered' ? <Tone tone={r.overdueDays ? 'bad' : 'info'}>{r.overdueDays ? `Overdue ${r.overdueDays} days` : r.status}</Tone> : r.delayDays <= 0 ? <Tone tone="good">{r.delayDays < 0 ? `${-r.delayDays} days early` : 'On time'}</Tone> : <Tone tone={r.delayDays > 3 ? 'bad' : 'warn'}>{r.delayDays} days late</Tone> },
    { key: 'defects', label: 'Defects', align: 'right', sort: (r) => r.defectRate, render: (r) => (r.status === 'Delivered' ? <span className="num">{pct(r.defectRate, 1)}</span> : <span className="text-quiet">–</span>) },
    { key: 'amount', label: 'Value', align: 'right', sort: (r) => r.amount, render: (r) => <span className="num font-semibold">{inr(r.amount)}</span> },
    ...(canWrite ? [{ key: 'act', label: '', render: (r) => (r.status === 'Ordered' || r.status === 'In transit') ? <button className="btn-quiet h-8" onClick={(e) => { e.stopPropagation(); receive(r); }}><PackageCheck className="h-4 w-4" /> Receive</button> : null }] : []),
  ];

  return (
    <>
      <PageHeader
        title="Deliveries"
        sub="Every purchase order and service delivery. Record what arrived and when; late or defective deliveries are checked against the contract automatically."
        actions={canWrite && <button className="btn-primary" onClick={() => open()}><Plus className="h-4 w-4" /> Record order</button>}
      />

      <FigureBand
        items={[
          { label: 'On-time rate', value: pct(done.length ? (onTime / done.length) * 100 : null), tone: metricTone(done.length ? (onTime / done.length) * 100 : null, 92, 85), note: `${num(onTime)} of ${num(done.length)} delivered` },
          { label: 'Average days late', value: late.length ? (late.reduce((s, d) => s + d.delayDays, 0) / late.length).toFixed(1) : '–', note: `Across ${num(late.length)} late deliveries` },
          { label: 'Defect rate', value: pct(units ? (bad / units) * 100 : null, 2), note: `${num(bad)} of ${num(units)} units` },
          { label: 'Overdue now', value: overdue, tone: overdue ? 'text-bad-text' : 'text-ok-text', note: overdue ? 'Promised date has passed' : 'No open order is late' },
        ]}
      />

      <div className="mb-3 mt-8 flex flex-wrap items-center justify-between gap-3">
        <Segmented label="Filter deliveries" value={filter} onChange={(v) => { setFilter(v); setLimit(100); }} options={['All', 'Open', 'Overdue', 'Late', 'Delivered']} />
        <div className="relative w-full sm:w-[300px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-quiet" />
          <input className="input pl-9" placeholder="Search PO, item or supplier" value={q} onChange={(e) => { setQ(e.target.value); setLimit(100); }} aria-label="Search deliveries" />
        </div>
      </div>

      <section className="panel overflow-hidden">
        <DataTable columns={columns} rows={rows} limit={limit} initialSort={{ key: 'order', dir: 'desc' }} onRowClick={canWrite ? (r) => open(r) : undefined} empty={<Empty title="No deliveries in this view">Try another filter or clear the search.</Empty>} />
        {rows.length > limit && (
          <div className="border-t border-line p-3 text-center">
            <button className="btn-quiet" onClick={() => setLimit((l) => l + 100)}>Show 100 more ({rows.length - limit} left)</button>
          </div>
        )}
      </section>

      <DeliverySheet open={sheet.open} delivery={sheet.delivery} suppliers={data.suppliers} onClose={() => setSheet((s) => ({ ...s, open: false }))} onSaved={reload} />
    </>
  );
}
