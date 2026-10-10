'use client';

/* Flood-alert sign-up. Posts to /api/subscribe. Until the backend's
 * /subscribe exists nothing is stored, and the page says so plainly rather
 * than pretending to subscribe anyone. */

import { useState } from 'react';
import PageShell from '../PageShell';
import AddressSearch from '../AddressSearch';
import { LANGS, useI18n, type Lang, type MsgKey } from '@/lib/i18n';
import { LANG_NAME } from '../SettingsMenu';

type Slot = 'home' | 'parents' | 'work';
const SLOTS: Slot[] = ['home', 'parents', 'work'];
type Status = 'idle' | 'sending' | 'demo' | 'success' | 'error';

export function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').replace(/^1(?=\d{10})/, '').slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AlertsView({ initialAddress }: { initialAddress?: string }) {
  const { t, lang: uiLang } = useI18n();
  const [method, setMethod] = useState<'email' | 'sms'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addresses, setAddresses] = useState<Record<Slot, string>>({ home: initialAddress ?? '', parents: '', work: '' });
  const [slots, setSlots] = useState<Slot[]>(['home']);
  const [threshold, setThreshold] = useState<'HIGH' | 'CRITICAL'>('HIGH');
  const [lang, setLang] = useState<Lang>(uiLang);
  const [allClear, setAllClear] = useState(true);
  const [status, setStatus] = useState<Status>('idle');
  const [errors, setErrors] = useState<MsgKey[]>([]);

  const filled = slots.filter((s) => addresses[s].trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problems: MsgKey[] = [];
    if (method === 'email' && !EMAIL.test(email.trim())) problems.push('alerts.err.email');
    if (method === 'sms' && phone.replace(/\D/g, '').length !== 10) problems.push('alerts.err.phone');
    if (filled.length === 0) problems.push('alerts.err.address');
    setErrors(problems);
    if (problems.length) return;

    setStatus('sending');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: method === 'email' ? email.trim() : undefined,
          phone: method === 'sms' ? phone : undefined,
          addresses: filled.map((s) => addresses[s].trim()),
          threshold,
          lang,
          allClear,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { ok: boolean };
      setStatus(body.ok ? 'success' : 'demo');
    } catch {
      setStatus('error');
    }
  };

  const input =
    'h-11 w-full rounded-lg border border-ob-border bg-ob-surface px-3 text-[15px] text-ob-text outline-none placeholder:text-ob-muted focus:border-ob-water';
  const choice = (on: boolean) =>
    `flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border px-3 text-[15px] transition-colors ${
      on ? 'border-ob-accent bg-ob-accent/10 text-ob-text' : 'border-ob-border bg-ob-surface text-ob-text hover:bg-ob-bg'
    }`;

  if (status === 'success') {
    return (
      <PageShell>
        <section className="mt-4 rounded-xl border border-ob-border bg-ob-surface p-5" role="status">
          <h1 className="text-[24px] font-semibold text-ob-text">{t('alerts.success.title')}</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ob-text">
            {t(threshold === 'HIGH' ? 'alerts.success.high' : 'alerts.success.critical', {
              contact: method === 'email' ? email : phone,
              lang: LANG_NAME[lang],
            })}
          </p>
          <ul className="mt-3 list-disc pl-5 text-[15px] text-ob-text">
            {filled.map((s) => (
              <li key={s}>
                {t(`alerts.slot.${s}`)}: {addresses[s]}
              </li>
            ))}
          </ul>
          {allClear && <p className="mt-2 text-[14px] text-ob-muted">{t('alerts.success.allClear')}</p>}
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-ob-text">{t('alerts.title')}</h1>
      <p className="mt-1 text-[15px] leading-relaxed text-ob-muted">{t('alerts.intro')}</p>

      <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-6">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[16px] font-semibold text-ob-text">{t('alerts.contact')}</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className={choice(method === 'email')}>
              <input type="radio" name="method" checked={method === 'email'} onChange={() => setMethod('email')} className="h-4 w-4" />
              {t('alerts.email')}
            </label>
            <label className={choice(method === 'sms')}>
              <input type="radio" name="method" checked={method === 'sms'} onChange={() => setMethod('sms')} className="h-4 w-4" />
              {t('alerts.sms')}
            </label>
          </div>
          {method === 'email' ? (
            <label className="mt-2 flex flex-col gap-1">
              <span className="text-[13px] font-medium text-ob-text">{t('alerts.emailLabel')}</span>
              <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
            </label>
          ) : (
            <label className="mt-2 flex flex-col gap-1">
              <span className="text-[13px] font-medium text-ob-text">{t('alerts.phoneLabel')}</span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="(713) 555-0123"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                className={input}
              />
              <span className="text-[13px] text-ob-muted">{t('alerts.smsNote')}</span>
            </label>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-[16px] font-semibold text-ob-text">{t('alerts.addresses')}</legend>
          {slots.map((s) => (
            <AddressSearch
              key={s}
              variant="field"
              label={t(`alerts.slot.${s}`)}
              initialValue={s === 'home' ? initialAddress : undefined}
              onValue={(v) => setAddresses((a) => ({ ...a, [s]: v }))}
            />
          ))}
          {slots.length < SLOTS.length && (
            <button
              type="button"
              onClick={() => setSlots(SLOTS.slice(0, slots.length + 1))}
              className="h-11 self-start rounded-lg border border-ob-border bg-ob-surface px-4 text-[14px] font-semibold text-ob-accent hover:bg-ob-bg"
            >
              {t('alerts.addAddress', { slot: t(`alerts.slot.${SLOTS[slots.length]}`) })}
            </button>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[16px] font-semibold text-ob-text">{t('alerts.when')}</legend>
          <label className={choice(threshold === 'HIGH')}>
            <input type="radio" name="threshold" checked={threshold === 'HIGH'} onChange={() => setThreshold('HIGH')} className="h-4 w-4" />
            {t('alerts.atHigh')}
          </label>
          <label className={choice(threshold === 'CRITICAL')}>
            <input
              type="radio"
              name="threshold"
              checked={threshold === 'CRITICAL'}
              onChange={() => setThreshold('CRITICAL')}
              className="h-4 w-4"
            />
            {t('alerts.atCritical')}
          </label>
          <label className="mt-1 flex min-h-[44px] cursor-pointer items-center gap-3 text-[15px] text-ob-text">
            <input type="checkbox" checked={allClear} onChange={(e) => setAllClear(e.target.checked)} className="h-5 w-5" />
            {t('alerts.allClear')}
          </label>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[16px] font-semibold text-ob-text">{t('alerts.lang')}</legend>
          <div className="grid grid-cols-3 gap-2">
            {LANGS.map((l) => (
              <label key={l} className={choice(lang === l)} lang={l}>
                <input type="radio" name="lang" checked={lang === l} onChange={() => setLang(l)} className="h-4 w-4" />
                {LANG_NAME[l]}
              </label>
            ))}
          </div>
        </fieldset>

        <p className="text-[14px] leading-relaxed text-ob-muted">{t('alerts.privacy')}</p>

        {errors.length > 0 && (
          <ul role="alert" className="rounded-lg border-l-4 px-3 py-2 text-[14px]" style={{ borderColor: 'var(--tier-high-ink)', background: 'var(--tier-high-tint)', color: 'var(--tier-high-ink)' }}>
            {errors.map((k) => (
              <li key={k}>{t(k)}</li>
            ))}
          </ul>
        )}

        {status === 'demo' && (
          <p role="status" className="rounded-lg border-l-4 px-3 py-2 text-[14px] text-ob-text" style={{ borderColor: 'var(--tier-med-ink)', background: 'var(--tier-med-tint)' }}>
            {t('alerts.demo')}
          </p>
        )}
        {status === 'error' && (
          <p role="alert" className="text-[14px]" style={{ color: 'var(--tier-high-ink)' }}>
            {t('alerts.error')}
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'sending'}
          className="h-12 rounded-lg bg-ob-accent text-[16px] font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {status === 'sending' ? t('alerts.sending') : t('alerts.submit')}
        </button>
      </form>
    </PageShell>
  );
}
