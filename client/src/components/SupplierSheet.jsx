import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { CATEGORIES, dateInput } from '../lib/format.js';
import { useForm } from '../lib/useForm.js';
import { Field, Sheet, useToast } from './ui.jsx';

const blank = { name: '', category: 'Raw materials', tier: 'Approved', status: 'Active', contactName: '', email: '', phone: '', city: '', country: 'India', taxId: '', onboardedOn: dateInput(new Date()), notes: '' };

export default function SupplierSheet({ open, supplier, onClose, onSaved }) {
  const f = useForm(blank);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const editing = !!supplier;

  useEffect(() => {
    if (open) {
      setError('');
      f.setV(supplier ? { ...blank, ...supplier, onboardedOn: dateInput(supplier.onboardedOn) } : blank);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, supplier]);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { _id, __v, code, createdAt, updatedAt, id, ...body } = f.v;
      const saved = editing ? await api.put(`/suppliers/${supplier._id}`, body) : await api.post('/suppliers', body);
      toast(editing ? 'Supplier updated' : 'Supplier added');
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? 'Edit supplier' : 'Add supplier'}
      subtitle={editing ? supplier.code : 'A supplier code is assigned automatically.'}
      footer={
        <>
          <button type="button" className="btn-quiet" onClick={onClose}>Cancel</button>
          <button form="supplier-form" className="btn-primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add supplier'}</button>
        </>
      }
    >
      <form id="supplier-form" onSubmit={save} className="grid grid-cols-2 gap-4">
        <Field label="Supplier name" className="col-span-2"><input className="input" required {...f.bind('name')} /></Field>
        <Field label="Category"><select className="input" {...f.bind('category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Tier"><select className="input" {...f.bind('tier')}>{['Strategic', 'Preferred', 'Approved', 'Probation'].map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Status"><select className="input" {...f.bind('status')}>{['Active', 'On hold', 'Offboarded'].map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Onboarded on"><input className="input" type="date" {...f.bind('onboardedOn')} /></Field>
        <Field label="Contact person"><input className="input" {...f.bind('contactName')} /></Field>
        <Field label="Phone"><input className="input" {...f.bind('phone')} /></Field>
        <Field label="Email" className="col-span-2"><input className="input" type="email" {...f.bind('email')} /></Field>
        <Field label="City"><input className="input" {...f.bind('city')} /></Field>
        <Field label="Country"><input className="input" {...f.bind('country')} /></Field>
        <Field label="GSTIN or tax ID" className="col-span-2"><input className="input" {...f.bind('taxId')} /></Field>
        <Field label="Notes" className="col-span-2"><textarea className="input" rows={3} {...f.bind('notes')} /></Field>
        {error && <p role="alert" className="col-span-2 rounded-[3px] bg-bad-tint px-3 py-2 text-sm font-medium text-bad-text">{error}</p>}
      </form>
    </Sheet>
  );
}
