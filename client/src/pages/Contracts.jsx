import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth, useLoad } from '../lib/auth.jsx';
import { dateInput, date, inr } from '../lib/format.js';
import { useForm } from '../lib/useForm.js';
import Runway from '../components/Runway.jsx';
import { DataTable, Empty, ErrorNote, Field, FigureBand, PageHeader, Segmented, SectionTitle, Sheet, Spinner, Tone, useToast } from '../components/ui.jsx';

const blank = () => ({
  supplier: '', contractNumber: '', title: '', type: 'Supply', state: 'Active',
  startDate: dateInput(new Date()), endDate: dateInput(new Date(Date.now() + 365 * 86400000)),
  annualValue: '', paymentTerms: 'Net 45', renewalNoticeDays: 60, autoRenew: false, notes: '',
  sla: { onTimeTarget: 95, maxDelayDays: 3, maxDefectRate: 2, responseHours: 24, penaltyPerBreach: 10000 },
});

const LIFE_TONE = (l) => (l === 'Active' ? 'good' : l === 'Lapsed' ? 'bad' : l.startsWith('Renew within 30') ? 'bad' : l.startsWith('Renew') ? 'warn' : 'mute');

function ContractSheet({ open, contract, suppliers, onClose, onSaved }) {
  const f = useForm(blank());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { user } = useAuth();
  const editing = !!contract;

  useEffect(() => {
    if (!open) return;
    setError('');
    f.setV(contract ? { ...blank(), ...contract, supplier: contract.supplier?._id || contract.supplier, startDate: dateInput(contract.startDate), endDate: dateInput(contract.endDate) } : blank());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contract]);

  const extend = () => {
    const d = new Date(f.v.endDate || Date.now());
    d.setUTCFullYear(d.getUTCFullYear() + 1);
    f.setV((s) => ({ ...s, endDate: dateInput(d), state: 'Active' }));
  };

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { _id, __v, id, createdAt, updatedAt, daysLeft, lifecycle, ...body } = f.v;
      if (editing) await api.put(`/contracts/${contract._id}`, body);
      else await api.post('/contracts', body);
      toast(editing ? 'Contract updated' : 'Contract added');
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete contract ${contract.contractNumber}?`)) return;
    try {
      await api.del(`/contracts/${contract._id}`);
      toast('Contract deleted');
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
      title={editing ? 'Edit contract' : 'Add contract'}
      subtitle="SLA terms below are what deliveries are checked against."
      footer={
        <>
          {editing && user.role === 'admin' && <button type="button" className="btn-danger mr-auto" onClick={remove}>Delete</button>}
          <button type="button" className="btn-quiet" onClick={onClose}>Cancel</button>
          <button form="contract-form" className="btn-primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add contract'}</button>
        </>
      }
    >
      <form id="contract-form" onSubmit={save} className="grid grid-cols-2 gap-4">
        <Field label="Supplier" className="col-span-2">
          <select className="input" required {...f.bind('supplier')}>
            <option value="">Choose a supplier</option>
            {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Contract number"><input className="input" required {...f.bind('contractNumber')} placeholder="CT-2026-101" /></Field>
        <Field label="Type"><select className="input" {...f.bind('type')}>{['Supply', 'Service', 'Maintenance', 'Licensing'].map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Title" className="col-span-2"><input className="input" required {...f.bind('title')} /></Field>
        <Field label="Start date"><input className="input" type="date" required {...f.bind('startDate')} /></Field>
        <Field label="End date">
          <div className="flex gap-2">
            <input className="input" type="date" required {...f.bind('endDate')} />
            <button type="button" className="btn-quiet shrink-0" onClick={extend} title="Move the end date forward by one year">+1 year</button>
          </div>
        </Field>
        <Field label="Annual value (₹)"><input className="input" type="number" min="0" required {...f.bind('annualValue')} /></Field>
        <Field label="State"><select className="input" {...f.bind('state')}>{['Draft', 'Active', 'Terminated'].map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Payment terms"><input className="input" {...f.bind('paymentTerms')} /></Field>
        <Field label="Renewal notice (days)" hint="Reminders count back from the end date."><input className="input" type="number" min="0" {...f.bind('renewalNoticeDays')} /></Field>
        <label className="col-span-2 flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" className="h-4 w-4" {...f.bindCheck('autoRenew')} /> Renews automatically unless cancelled
        </label>

        <p className="col-span-2 mt-2 border-t border-line pt-4 font-display text-lg font-semibold">SLA terms</p>
        <Field label="On-time target (%)"><input className="input" type="number" min="0" max="100" {...f.bindNested('sla', 'onTimeTarget')} /></Field>
        <Field label="Late grace period (days)" hint="Later than this counts as a breach."><input className="input" type="number" min="0" {...f.bindNested('sla', 'maxDelayDays')} /></Field>
        <Field label="Maximum defect rate (%)"><input className="input" type="number" step="0.1" min="0" {...f.bindNested('sla', 'maxDefectRate')} /></Field>
        <Field label="Response time (hours)"><input className="input" type="number" min="0" {...f.bindNested('sla', 'responseHours')} /></Field>
        <Field label="Penalty per minor breach (₹)" hint="Major breaches cost 2x, critical 3x." className="col-span-2"><input className="input" type="number" min="0" {...f.bindNested('sla', 'penaltyPerBreach')} /></Field>
        <Field label="Notes" className="col-span-2"><textarea className="input" rows={2} {...f.bind('notes')} /></Field>
        {error && <p role="alert" className="col-span-2 rounded-[3px] bg-bad-tint px-3 py-2 text-sm font-medium text-bad-text">{error}</p>}
      </form>
    </Sheet>
  );
}

export default function Contracts() {
  const { canWrite } = useAuth();
  const { data, error, loading, reload } = useLoad(async () => {
    const [c, s, r] = await Promise.all([api.get('/contracts?limit=1000'), api.get('/suppliers?limit=1000'), api.get('/analytics/renewals')]);
    return { contracts: c.items, suppliers: s.items, renewals: r };
  });
  const [filter, setFilter] = useState('All');
  const [sheet, setSheet] = useState({ open: false, contract: null });

  const rows = useMemo(() => {
    if (!data) return [];
    const f = {
      All: () => true,
      'Renewing soon': (c) => c.state === 'Active' && c.daysLeft >= 0 && c.daysLeft <= 90,
      Lapsed: (c) => c.state === 'Active' && c.daysLeft < 0,
      Active: (c) => c.state === 'Active' && c.daysLeft > 90,
    }[filter];
    return data.contracts.filter(f);
  }, [data, filter]);

  if (loading) return <Spinner />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;

  const active = data.contracts.filter((c) => c.state === 'Active');
  const soon = data.renewals.filter((r) => r.daysLeft >= 0);
  const lapsed = data.renewals.filter((r) => r.daysLeft < 0);
  const open = (contract = null) => setSheet({ open: true, contract });

  const columns = [
    { key: 'no', label: 'Contract', sort: (r) => r.contractNumber, render: (r) => (<><span className="block font-semibold">{r.contractNumber}</span><span className="text-[13px] text-quiet">{r.title}</span></>) },
    { key: 'sup', label: 'Supplier', sort: (r) => r.supplier?.name, render: (r) => r.supplier?.name },
    { key: 'end', label: 'Ends', sort: (r) => new Date(r.endDate).getTime(), render: (r) => (<><span className="block">{date(r.endDate)}</span><span className="text-[13px] text-quiet">{r.state !== 'Active' ? '' : r.daysLeft < 0 ? `${-r.daysLeft} days ago` : `in ${r.daysLeft} days`}</span></>) },
    { key: 'val', label: 'Annual value', align: 'right', sort: (r) => r.annualValue, render: (r) => <span className="num font-semibold">{inr(r.annualValue)}</span> },
    { key: 'sla', label: 'SLA', render: (r) => <span className="text-[13px] text-quiet">{r.sla.onTimeTarget}% on time · {r.sla.maxDelayDays}d grace · {r.sla.maxDefectRate}% defects</span> },
    { key: 'ren', label: 'Renewal', render: (r) => (r.autoRenew ? <Tone tone="info">Auto-renews</Tone> : <span className="text-[13px] text-quiet">{r.renewalNoticeDays}-day notice</span>) },
    { key: 'life', label: 'Status', render: (r) => <Tone tone={LIFE_TONE(r.lifecycle)}>{r.lifecycle}</Tone> },
  ];

  return (
    <>
      <PageHeader
        title="Contracts"
        sub="Track what each agreement is worth, when it ends and what the supplier has promised on delivery and quality."
        actions={canWrite && <button className="btn-primary" onClick={() => open()}><Plus className="h-4 w-4" /> Add contract</button>}
      />

      <FigureBand
        items={[
          { label: 'Active contracts', value: active.length, note: `${inr(active.reduce((s, c) => s + c.annualValue, 0))} a year in total` },
          { label: 'Ending within 90 days', value: soon.length, tone: soon.length ? 'text-warn-text' : 'text-harbor-800', note: `${inr(soon.reduce((s, c) => s + c.annualValue, 0))} up for renewal` },
          { label: 'Lapsed, not renewed', value: lapsed.length, tone: lapsed.length ? 'text-bad-text' : 'text-ok-text', note: lapsed.length ? `${inr(lapsed.reduce((s, c) => s + c.annualValue, 0))} running without a contract` : 'Nothing is running unprotected' },
          { label: 'Notice dates passed', value: data.renewals.filter((r) => r.noticeOverdue && !r.autoRenew).length, note: 'Without auto-renewal: act now or let it end' },
        ]}
      />

      <section className="panel mt-8 overflow-hidden">
        <div className="px-5 pt-5"><SectionTitle title="Renewal runway" note="Contracts ending in the next 90 days, plus any that have lapsed" /></div>
        <Runway rows={data.renewals} />
      </section>

      <section className="panel mt-8 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
          <h2 className="text-xl font-semibold">All contracts</h2>
          <Segmented label="Filter contracts" value={filter} onChange={setFilter} options={['All', 'Renewing soon', 'Lapsed', 'Active']} />
        </div>
        <DataTable columns={columns} rows={rows} initialSort={{ key: 'end', dir: 'asc' }} onRowClick={canWrite ? (r) => open(r) : undefined} empty={<Empty title="No contracts in this view" />} />
      </section>

      <ContractSheet open={sheet.open} contract={sheet.contract} suppliers={data.suppliers} onClose={() => setSheet((s) => ({ ...s, open: false }))} onSaved={reload} />
    </>
  );
}
