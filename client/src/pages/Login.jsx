import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { HeartbeatLine, PulseMark } from '../components/Pulse.jsx';
import { Field } from '../components/ui.jsx';

export default function Login() {
  const { login, setup } = useAuth();
  const [needsSetup, setNeedsSetup] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/auth/status').then((r) => setNeedsSetup(r.needsSetup)).catch((e) => setError(e.message));
  }, []);

  const bind = (k) => ({ value: form[k], onChange: (e) => setForm((f) => ({ ...f, [k]: e.target.value })) });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (needsSetup) await setup(form);
      else await login(form.email, form.password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
      <section className="relative hidden overflow-hidden bg-harbor-800 lg:block">
        <div className="relative z-10 flex h-full flex-col justify-between p-12 xl:p-16">
          <div className="flex items-center gap-3">
            <PulseMark size={34} />
            <span className="font-display text-2xl font-bold text-white" style={{ fontVariationSettings: "'wdth' 86" }}>PartnerPulse</span>
          </div>
          <div>
            <h1 className="max-w-[16ch] text-[56px] font-bold leading-[1.02] text-white xl:text-[64px]">Know which suppliers you can count on.</h1>
            <p className="mt-6 max-w-[44ch] text-lg leading-relaxed text-harbor-200">
              Delivery reliability, contract renewals and SLA breaches for every supplier, scored in one place and ready for Tableau.
            </p>
          </div>
          <p className="text-sm text-harbor-300">Supplier relationship and performance analytics</p>
        </div>
        <HeartbeatLine className="absolute inset-x-0 top-1/2 h-[240px] w-full -translate-y-[34%] opacity-90" />
      </section>

      <section className="flex items-center justify-center bg-paper px-6 py-12">
        <form onSubmit={submit} className="w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <PulseMark />
            <span className="font-display text-xl font-bold">PartnerPulse</span>
          </div>
          <h2 className="text-[30px] font-bold leading-tight">{needsSetup ? 'Create the first admin account' : 'Sign in'}</h2>
          <p className="mt-2 text-[15px] text-quiet">
            {needsSetup ? 'No accounts exist yet. This one will have full access.' : 'Use the account your administrator created for you.'}
          </p>

          <div className="mt-7 space-y-4">
            {needsSetup && (
              <Field label="Your name">
                <input className="input" required autoComplete="name" {...bind('name')} />
              </Field>
            )}
            <Field label="Work email">
              <input className="input" type="email" required autoComplete="email" {...bind('email')} />
            </Field>
            <Field label="Password" hint={needsSetup ? 'At least 8 characters' : undefined}>
              <input className="input" type="password" required minLength={needsSetup ? 8 : undefined} autoComplete={needsSetup ? 'new-password' : 'current-password'} {...bind('password')} />
            </Field>
          </div>

          {error && <p role="alert" className="mt-4 rounded-[3px] bg-bad-tint px-3 py-2 text-sm font-medium text-bad-text">{error}</p>}

          <button className="btn-primary mt-6 h-11 w-full text-[15px]" disabled={busy}>
            {busy ? 'Please wait…' : needsSetup ? 'Create account' : 'Sign in'}
          </button>

          {!needsSetup && (
            <p className="mt-6 border-t border-line pt-4 text-[13px] leading-relaxed text-quiet">
              Seeded demo data? Sign in with <span className="font-semibold text-harbor-700">admin@partnerpulse.test</span> and password <span className="font-semibold text-harbor-700">Pulse@2026</span>.
            </p>
          )}
        </form>
      </section>
    </div>
  );
}
