'use client';

/* The front door, built on the YCGlobe pattern: brand on top, the dataset as
 * the hero, four floating stat cards around it, then the gate — one primary
 * way in ("Enter the map") and one shortcut (check an address). Nothing is
 * gated behind a sign-up.
 *
 * Both ways in fly the dot field into a place — Houston, or the address —
 * before handing over to the map (ZoomTransition → /map's loading frame →
 * MapIntro). */

import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { LandingData } from '@/lib/landing';
import { fitTexas, packDots, writeHandoff, type Camera } from '@/lib/dotField';
import { fetchSuggestions, warmBackend } from '@/lib/client';
import { useI18n } from '@/lib/i18n';
import TexasField from './TexasField';
import ZoomTransition from './ZoomTransition';
import BrandMark from './BrandMark';
import CountUp from './CountUp';

// Where "Enter the map" lands, and how close each way in zooms.
const HOUSTON = { lat: 29.7604, lng: -95.3698 };
const ENTER_ZOOM = 10;
const ADDRESS_ZOOM = 13;

interface Leaving {
  from: Camera;
  target: { lat: number; lng: number };
  zoom: number;
  href: string;
}

const CARD_SPOTS = ['left-[6%] top-[14%]', 'right-[6%] top-[22%]', 'left-[3%] bottom-[16%]', 'right-[4%] bottom-[10%]'];

export default function Landing({ data }: { data: LandingData }) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const freshness = data.latestReading
    ? t('land.freshAt', {
        time: new Intl.DateTimeFormat(locale, {
          hour: 'numeric',
          minute: '2-digit',
          timeZone: 'America/Chicago',
        }).format(new Date(data.latestReading)),
      })
    : t('land.fresh');
  const [address, setAddress] = useState('');
  const [finding, setFinding] = useState(false);
  const [leaving, setLeaving] = useState<Leaving | null>(null);
  const stage = useRef<HTMLDivElement>(null);

  // Warm the map route (its loading frame and JS) before anyone clicks.
  // and wake the backend while the visitor reads the page.
  useEffect(() => {
    router.prefetch('/map');
    warmBackend();
  }, [router]);

  const flyTo = (target: { lat: number; lng: number }, zoom: number, href: string) => {
    const r = stage.current?.getBoundingClientRect();
    if (!r) {
      router.push(href);
      return;
    }
    setLeaving({ from: fitTexas(r.left, r.top, r.width, r.height), target, zoom, href });
  };

  const arrive = () => {
    if (!leaving) return;
    writeHandoff({
      lat: leaving.target.lat,
      lng: leaving.target.lng,
      zoom: leaving.zoom,
      baseScale: leaving.from.scale,
      dots: packDots(data.dots),
    });
    router.push(leaving.href);
  };

  const enter = (e: MouseEvent) => {
    // A modified click (new tab) keeps the plain link.
    if (e.metaKey || e.ctrlKey || e.shiftKey || leaving) return;
    e.preventDefault();
    flyTo(HOUSTON, ENTER_ZOOM, '/map');
  };

  const check = async (e: FormEvent) => {
    e.preventDefault();
    const q = address.trim();
    if (leaving || finding) return;
    if (!q) {
      flyTo(HOUSTON, ENTER_ZOOM, '/map');
      return;
    }
    // Geocode first so the field flies to the real place, not a guess.
    setFinding(true);
    const [hit] = await fetchSuggestions(q).catch(() => []);
    setFinding(false);
    if (!hit) {
      flyTo(HOUSTON, ENTER_ZOOM, `/map?address=${encodeURIComponent(q)}`);
      return;
    }
    const href = `/map?address=${encodeURIComponent(hit.label)}&lat=${hit.lat}&lng=${hit.lng}`;
    flyTo({ lat: hit.lat, lng: hit.lng }, ADDRESS_ZOOM, href);
  };

  return (
    <main
      className={`relative flex min-h-[100svh] flex-col items-center overflow-x-hidden bg-ob-bg px-4 pb-8 text-ob-text ${
        leaving ? 'is-leaving' : ''
      }`}
    >
      <header className="land-in leave-up mt-8 flex flex-col items-center gap-1.5 sm:mt-10" style={{ animationDelay: '80ms' }}>
        <div className="flex items-center gap-2 text-ob-accent">
          <BrandMark className="h-7 w-7" />
          <span className="font-display text-[30px] text-ob-text">BayouGuard</span>
        </div>
        <p className="text-[12px] font-medium text-ob-accent">
          {t('land.tagline')}
        </p>
      </header>

      <section className="relative mt-2 w-full max-w-[1180px]" aria-label={t('land.heroAria')}>
        <div
          ref={stage}
          className="land-in relative mx-auto h-[min(58vh,520px)] min-h-[300px] w-full max-w-[640px]"
          style={{ animationDelay: '0ms' }}
        >
          <TexasField dots={data.dots} hidden={Boolean(leaving)} />
          <p className="sr-only">{t('land.heroSr', { n: data.dots.length })}</p>
        </div>

        {data.stats.map((s, i) => (
          <figure
            key={s.label}
            className={`stat-float leave-out ob-float pointer-events-none absolute hidden w-[176px] rounded-xl bg-ob-surface px-4 py-3 lg:block ${CARD_SPOTS[i]}`}
            style={{ animationDelay: `${420 + i * 90}ms, ${i * -1.7}s` }}
          >
            <span className="block text-[22px] font-bold leading-none tracking-[-0.02em] text-ob-accent/80 tabular">
              <CountUp value={s.value} delayMs={520 + i * 90} />
            </span>
            <figcaption className="mt-1.5 text-[12px] font-medium text-ob-muted">
              {t(s.label)}
            </figcaption>
            <p className="mt-1 text-[11px] leading-snug text-ob-muted">{t(s.detail, s.params)}</p>
          </figure>
        ))}
      </section>

      <section className="land-in leave-down flex w-full max-w-[392px] flex-col items-center text-center" style={{ animationDelay: '220ms' }}>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em]">{t('land.title')}</h1>
        <p className="mt-1 text-[14px] leading-relaxed text-ob-muted">
          {t('land.subtitle')}
          <span className="hidden sm:inline"> {t('land.hover')}</span>
        </p>
        <p className="mt-3 text-[12px] text-ob-muted">{freshness}</p>

        <Link
          href="/map"
          onClick={enter}
          className="mt-3 flex h-12 w-full items-center justify-center rounded-xl bg-ob-accent text-[15px] font-semibold text-white transition-transform duration-150 hover:brightness-110 active:scale-[0.98]"
        >
          {t('land.enter')}
        </Link>

        <form onSubmit={check} className="mt-2.5 flex w-full gap-2">
          <label htmlFor="landing-address" className="sr-only">
            {t('land.addressLabel')}
          </label>
          <input
            id="landing-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t('land.addressLabel')}
            autoComplete="street-address"
            className="h-11 min-w-0 flex-1 rounded-xl border border-ob-border bg-ob-surface px-3.5 text-[14px] text-ob-text outline-none transition placeholder:text-ob-muted focus:border-ob-water"
          />
          <button
            type="submit"
            disabled={finding}
            className="h-11 shrink-0 rounded-xl border border-ob-accent/40 bg-ob-surface px-4 text-[14px] font-semibold text-ob-accent transition hover:bg-ob-accent/5 active:scale-[0.98] disabled:opacity-70"
          >
            {finding ? t('land.finding') : t('search.submit')}
          </button>
        </form>

        {/* The floating cards need width; small screens get the two that matter. */}
        <dl className="mt-6 grid w-full grid-cols-2 gap-2 lg:hidden">
          {data.stats.slice(0, 2).map((s) => (
            <div key={s.label} className="ob-float rounded-xl bg-ob-surface px-3.5 py-3 text-left">
              <dt className="text-[12px] font-medium text-ob-muted">{t(s.label)}</dt>
              <dd className="mt-1 text-[20px] font-bold leading-none text-ob-accent/80 tabular">
                <CountUp value={s.value} delayMs={500} />
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className="leave-down mt-auto flex flex-col items-center gap-1 pt-10 text-center text-[11px] text-ob-muted">
        {data.sample && (
          <p className="rounded-full border border-ob-border bg-ob-surface px-3 py-1 text-ob-muted">
            {t('land.sample')}
          </p>
        )}
        <p>{t('land.credit')}</p>
      </footer>


      {leaving && (
        <ZoomTransition
          from={leaving.from}
          target={leaving.target}
          zoom={leaving.zoom}
          dots={data.dots}
          onDone={arrive}
        />
      )}
    </main>
  );
}
