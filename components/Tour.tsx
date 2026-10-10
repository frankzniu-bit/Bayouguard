'use client';

/* First-visit coach marks, from the YCGlobe reference: the page dims, the
 * thing being described is cut out of the dim, and a small card sits beside
 * it with Skip · progress dots · Next. Steps whose target isn't on screen
 * (the rail and board are desktop-only) are dropped, not shown floating. */

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import BrandMark from './BrandMark';
import { useI18n, type MsgKey } from '@/lib/i18n';

const STORAGE_KEY = 'bayouguard_tour_v1';
const GAP = 12;
const CARD_W = 300;
const PAD = 6;

interface Step {
  /** data-tour value of the element to spotlight; null centres the card. */
  target: string | null;
  title: MsgKey;
  body: MsgKey;
}

const STEPS: Step[] = [
  { target: 'search', title: 'tour.search.title', body: 'tour.search.body' },
  { target: 'filters', title: 'tour.filters.title', body: 'tour.filters.body' },
  { target: 'board', title: 'tour.board.title', body: 'tour.board.body' },
  { target: null, title: 'tour.dot.title', body: 'tour.dot.body' },
];

function visibleRect(target: string | null): DOMRect | null {
  if (!target) return null;
  const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
  const r = el?.getBoundingClientRect();
  return r && r.width > 0 && r.height > 0 ? r : null;
}

export default function Tour({ ready = true }: { ready?: boolean }) {
  const { t } = useI18n();
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Decide once, after layout, whether to run and which steps can be anchored.
  useEffect(() => {
    if (!ready) return;
    let done = false;
    try {
      done = localStorage.getItem(STORAGE_KEY) === 'done';
    } catch {
      // Storage blocked (private mode): show the tour; it just won't remember.
    }
    if (done) return;
    const id = window.setTimeout(() => {
      setSteps(STEPS.filter((s) => s.target === null || visibleRect(s.target)));
    }, 900);
    return () => window.clearTimeout(id);
  }, [ready]);

  const step = steps?.[i] ?? null;

  useLayoutEffect(() => {
    if (!step) return;
    const measure = () => setRect(visibleRect(step.target));
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [step]);

  const finish = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'done');
    } catch {
      // Nothing to do — see above.
    }
    setSteps(null);
  }, []);

  useEffect(() => {
    if (!step) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, finish]);

  if (!steps || !step) return null;

  const last = i === steps.length - 1;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(CARD_W, vw - 24);

  // Beside the target when there's room, otherwise below it; centred when untargeted.
  let left = (vw - width) / 2;
  let top = vh / 2 - 90;
  if (rect) {
    const roomRight = vw - rect.right - GAP - width >= 12;
    if (roomRight && rect.height > 160) {
      left = rect.right + GAP;
      top = Math.min(rect.top, vh - 220);
    } else {
      left = Math.min(Math.max(12, rect.left + rect.width / 2 - width / 2), vw - width - 12);
      top = rect.bottom + GAP;
    }
  }

  return (
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-xl transition-all duration-300 ease-out"
          style={{
            left: rect.left - PAD,
            top: rect.top - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: '0 0 0 9999px rgb(var(--ob-text-rgb) / 0.38)',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-ob-text/40 backdrop-blur-[2px]" />
      )}

      <div
        key={i}
        className="ob-float reveal absolute rounded-xl bg-ob-surface p-4 text-ob-text"
        style={{ left, top, width }}
      >
        <div className="flex items-center gap-1.5 text-ob-accent">
          <BrandMark className="h-4 w-4" />
          <span className="font-display text-[14px] text-ob-text">BayouGuard</span>
        </div>
        <h2 id="tour-title" className="mt-2 text-[16px] font-semibold tracking-[-0.01em]">
          {t(step.title)}
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ob-muted">{t(step.body)}</p>

        <div className="mt-4 flex items-center">
          <button type="button" onClick={finish} className="text-[13px] font-medium text-ob-muted hover:text-ob-text">
            {t('tour.skip')}
          </button>
          <span className="mx-auto flex gap-1.5" aria-label={t('tour.step', { n: i + 1, total: steps.length })}>
            {steps.map((_, k) => (
              <span
                key={k}
                className={`h-1.5 rounded-full transition-all ${k === i ? 'w-4 bg-ob-accent' : 'w-1.5 bg-ob-border'}`}
              />
            ))}
          </span>
          <button
            type="button"
            autoFocus
            onClick={() => (last ? finish() : setI(i + 1))}
            className="h-9 rounded-full bg-ob-accent px-4 text-[13px] font-semibold text-ob-onaccent hover:brightness-110"
          >
            {last ? t('tour.done') : t('tour.next')}
          </button>
        </div>
      </div>
    </div>
  );
}
