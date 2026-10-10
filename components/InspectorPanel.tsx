'use client';

/* Inspector for the watershed graph. Renders metrics for whatever node is
 * selected: the searched address (full risk + weather + drive + bayous) or a
 * single gauge (level vs flood stage, headroom, distance). */

import { useEffect, useState } from 'react';
import type { GraphSelection } from './WatershedGraph';
import type { DataSource, HomeSnapshot, Tier, DriveVerdict, Outlook, RainForecast } from '@/lib/types';
import type { GaugeHistory } from '@/lib/history';
import { TIER_COLOR, TIER_INK, TIER_TINT } from '@/lib/theme';
import { classifyTrend } from '@/lib/trend';
import { useI18n } from '@/lib/i18n';
import { outlookDetail, riskSentence, weatherLabel } from '@/lib/describe';

const DRIVE_COLOR: Record<DriveVerdict['state'], string> = {
  YES: TIER_INK.LOW,
  CAUTION: TIER_INK.MEDIUM,
  NO: TIER_INK.HIGH,
};

// Outlook levels reuse the tier palette so the panel stays one color system.
const OUTLOOK_COLOR: Record<Outlook['level'], string> = {
  CLEAR: TIER_INK.LOW,
  WATCH: TIER_INK.MEDIUM,
  WARNING: TIER_INK.HIGH,
};
const OUTLOOK_TINT: Record<Outlook['level'], string> = {
  CLEAR: TIER_TINT.LOW,
  WATCH: TIER_TINT.MEDIUM,
  WARNING: TIER_TINT.HIGH,
};

// Live gauge trend -> arrow + color. Rising water is the danger direction.
export function TrendArrow({ trend }: { trend: number }) {
  const { t, num } = useI18n();
  const state = classifyTrend(trend);
  if (state === 'steady') {
    return <span className="text-xs text-ob-muted">→ {t('trend.steady')}</span>;
  }
  const rising = state === 'rising';
  const label = t(rising ? 'trend.rising' : 'trend.falling', { rate: num(Math.abs(trend), 2) });
  return (
    <span className="text-xs font-medium" style={{ color: rising ? TIER_INK.HIGH : TIER_INK.LOW }}>
      <span aria-hidden>{rising ? '↑' : '↓'}</span> {label}
    </span>
  );
}

function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3959;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

export function TierBadge({ tier }: { tier: Tier }) {
  const { t } = useI18n();
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold"
      style={{ backgroundColor: TIER_TINT[tier], color: TIER_INK[tier] }}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: TIER_COLOR[tier] }}
      />
      {t(`tier.${tier}`)}
    </span>
  );
}

function Metric({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit?: string;
}) {
  // Numbers set in mono; words (weather) in the UI face, which has Vietnamese.
  const numeric = typeof value === 'number' || /^[\d.,\s-]+$/.test(value);
  return (
    <div className="rounded-lg border border-ob-border bg-ob-surface2 p-3">
      <p className="text-[12px] text-ob-muted font-medium">{label}</p>
      <p className={`mt-1 tabular text-ob-text ${numeric ? 'font-mono text-xl' : 'text-base font-medium'}`}>
        {value}
        {unit && <span className="ml-1 text-xs text-ob-muted">{unit}</span>}
      </p>
    </div>
  );
}

/* 6-hour outlook banner: where the water is heading, not just where it is. */
function OutlookCard({ outlook }: { outlook: Outlook }) {
  const { t, num } = useI18n();
  const color = OUTLOOK_COLOR[outlook.level];
  return (
    <div
      className="mt-3 rounded-xl border p-3"
      style={{ borderColor: color, backgroundColor: OUTLOOK_TINT[outlook.level] }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-ob-muted font-medium">
          {t('outlook.title')}
        </p>
        <span
          className="rounded-full px-2 py-0.5 text-[12px] font-semibold"
          style={{ backgroundColor: OUTLOOK_TINT[outlook.level], color }}
        >
          {t(`outlook.level.${outlook.level}`)}
        </span>
      </div>
      <p className="mt-0.5 font-semibold" style={{ color }}>
        {t(`outlook.${outlook.kind}`)}
      </p>
      <p className="mt-0.5 text-xs leading-relaxed text-ob-muted">{outlookDetail(outlook, t, num)}</p>
      <p className="mt-1 text-[11px] text-ob-muted">{t('outlook.note')}</p>
    </div>
  );
}

/* Hourly rain bars for the next 12h. Height scales to the wettest hour so a
 * drizzle day still reads; the wettest hour caps the scale. */
function RainBars({ rain }: { rain: RainForecast }) {
  const { t, num } = useI18n();
  const max = Math.max(0.1, ...rain.inches);
  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-baseline justify-between text-xs">
        <span className="text-[12px] text-ob-muted font-medium">{t('insp.rain12')}</span>
        <span className="font-mono tabular text-ob-muted">
          {t('insp.rainTotal', { inches: num(rain.totalNext12h, 2) })}
        </span>
      </div>
      <div className="flex h-10 items-end gap-1">
        {rain.inches.map((v, i) => (
          <div
            key={rain.hours[i] ?? i}
            className="flex-1 rounded-t-sm bg-ob-water"
            style={{
              height: `${Math.max(4, (v / max) * 100)}%`,
              opacity: v > 0 ? 1 : 0.18,
            }}
            title={`${new Date(rain.hours[i]).getHours()}:00 — ${v.toFixed(2)}"`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-ob-muted">
        <span>{t('common.now')}</span>
        <span>+6h</span>
        <span>+12h</span>
      </div>
    </div>
  );
}

/* 48h water-level sparkline for a single gauge. Fetches on gauge select;
 * renders nothing until (and unless) history arrives — additive UI only. */
function HistorySparkline({ gaugeId, color }: { gaugeId: number; color: string }) {
  const { t, num } = useI18n();
  const [history, setHistory] = useState<GaugeHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setHistory(null);
    fetch(`/api/gauge-history?id=${gaugeId}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: GaugeHistory | null) => setHistory(data))
      .catch(() => setHistory(null))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [gaugeId]);

  if (loading) {
    return (
      <div className="mt-4">
        <p className="text-[12px] text-ob-muted font-medium">{t('insp.history')}</p>
        <div className="mt-1.5 h-14 animate-pulse rounded-lg bg-ob-bg2/60" />
      </div>
    );
  }
  if (!history || history.points.length < 2) return null;

  const { points, floodLevel } = history;
  const levels = points.map((p) => p.level);
  let min = Math.min(...levels);
  let max = Math.max(...levels);
  // Include flood stage in scale only when it's near the data, so a gauge
  // sitting 30 ft below flood still shows visible movement.
  const floodInRange =
    floodLevel != null && floodLevel <= max + (max - min) * 0.75 + 0.5;
  if (floodInRange && floodLevel != null) max = Math.max(max, floodLevel);
  const span = Math.max(max - min, 0.5);
  min -= span * 0.08;
  max += span * 0.08;

  const W = 240;
  const H = 56;
  const x = (i: number) => (i / (points.length - 1)) * W;
  const y = (v: number) => H - ((v - min) / (max - min)) * H;
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.level).toFixed(1)}`)
    .join(' ');
  const area = `${path} L${W},${H} L0,${H} Z`;
  const last = points[points.length - 1];

  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-baseline justify-between text-xs">
        <span className="text-[12px] text-ob-muted font-medium">{t('insp.history')}</span>
        <span className="font-mono tabular text-ob-muted">
          {t('insp.historyNow', { ft: num(last.level, 2) })}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-14 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={t('insp.historyAria', { ft: num(last.level, 1) })}
      >
        <path d={area} fill={color} opacity={0.12} />
        {floodInRange && floodLevel != null && (
          <line
            x1={0}
            x2={W}
            y1={y(floodLevel)}
            y2={y(floodLevel)}
            stroke={TIER_COLOR.CRITICAL}
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.7}
          />
        )}
        <path d={path} fill="none" stroke={color} strokeWidth={1.5} />
        <circle cx={x(points.length - 1)} cy={y(last.level)} r={2.5} fill={color} />
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-ob-muted">
        <span>-48h</span>
        {floodInRange && floodLevel != null && (
          <span style={{ color: TIER_INK.CRITICAL }}>
            {t('insp.floodLine', { ft: num(floodLevel, 1) })}
          </span>
        )}
        <span>{t('common.now')}</span>
      </div>
    </div>
  );
}

function FillBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-ob-bg2">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${Math.min(100, Math.max(0, pct))}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}

interface Props {
  selection: GraphSelection | null;
  snapshot: HomeSnapshot | null;
  dataSource: DataSource;
  center: { lat: number; lng: number } | null;
  switchLabel: string;
  onSwitch: () => void;
  onClose: () => void;
}

export default function InspectorPanel({
  selection,
  snapshot,
  dataSource,
  center,
  switchLabel,
  onSwitch,
  onClose,
}: Props) {
  const { t, num, time } = useI18n();
  // ── Gauge node ───────────────────────────────────────────────────────────
  if (selection?.kind === 'gauge' && selection.gauge) {
    const g = selection.gauge;
    const fillPct = g.flood > 0 ? (g.current / g.flood) * 100 : 0;
    const dist = center
      ? haversineMiles(center.lat, center.lng, g.lat, g.lng)
      : null;
    return (
      <PanelShell onClose={onClose} onSwitch={onSwitch} switchLabel={switchLabel}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] text-ob-muted font-medium">
              {t('insp.floodGauge')}{g.county ? ` · ${t('insp.network', { county: g.county })}` : ''}
            </p>
            <h2 className="text-lg font-semibold leading-snug text-ob-text">{g.name}</h2>
            {g.trend != null && (
              <div className="mt-1">
                <TrendArrow trend={g.trend} />
              </div>
            )}
          </div>
          <TierBadge tier={g.tier} />
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <span className="text-ob-muted">{t('insp.levelVsFlood')}</span>
            <span className="font-mono tabular text-ob-text">
              {fillPct.toFixed(0)}%
            </span>
          </div>
          <FillBar pct={fillPct} color={TIER_COLOR[g.tier]} />
        </div>

        <HistorySparkline gaugeId={g.id} color="rgb(var(--ob-water-rgb))" />

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Metric label={t('insp.current')} value={num(g.current, 1)} unit={t('common.ft')} />
          <Metric label={t('insp.floodStage')} value={num(g.flood, 1)} unit={t('common.ft')} />
          <Metric label={t('insp.headroom')} value={num(g.buffer, 1)} unit={t('common.ft')} />
          {dist != null ? (
            <Metric label={t('insp.fromYou')} value={num(dist, 1)} unit={t('common.mi')} />
          ) : (
            <Metric label={t('insp.tier')} value={t(`tier.${g.tier}`)} />
          )}
          {g.rainfall != null && g.rainfall > 0 && (
            <Metric label={t('insp.rainAtSite')} value={num(g.rainfall, 2)} unit="in" />
          )}
        </div>

        <p className="mt-4 font-mono text-[11px] leading-relaxed text-ob-muted">
          {g.lat.toFixed(4)}, {g.lng.toFixed(4)}
          {g.readAt ? ` · ${t('insp.readAt', { time: time(g.readAt) })}` : ''}
        </p>
      </PanelShell>
    );
  }

  // ── Address node ──────────────────────────────────────────────────────────
  if (!snapshot) return null;
  const { risk, weather, drive, bayous, rain, outlook } = snapshot;
  return (
    <PanelShell onClose={onClose} onSwitch={onSwitch} switchLabel={switchLabel}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[12px] text-ob-muted font-medium">{t('insp.yourLocation')}</p>
          <h2 className="truncate text-xl font-semibold tracking-tight text-ob-text" title={risk.address}>
            {risk.address}
          </h2>
        </div>
        <TierBadge tier={risk.tier} />
      </div>

      <div className="mt-4 flex items-end gap-3">
        <span
          className="font-mono text-5xl leading-none tabular"
          style={{ color: TIER_INK[risk.tier], transition: 'color 600ms ease-out' }}
        >
          {risk.score}
        </span>
        <span className="pb-1 text-sm text-ob-muted">{t('insp.scoreOf')}</span>
      </div>
      <p className="mt-1 text-[12px] font-medium text-ob-muted">{t(`riskSource.${risk.source}`)}</p>
      <p className="mt-3 text-sm leading-relaxed text-ob-muted" title={risk.backendMessage}>
        {riskSentence(risk, t, num)}
      </p>

      {outlook && <OutlookCard outlook={outlook} />}

      {weather && (
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Metric label={t('insp.temp')} value={weather.tempF} unit="°F" />
          <Metric label={t('insp.conditions')} value={weatherLabel(weather.code, t)} />
          <Metric label={t('insp.wind')} value={weather.windMph} unit={t('common.mph')} />
          <Metric label={t('insp.humidity')} value={weather.humidity} unit="%" />
        </div>
      )}

      <div
        className="mt-3 rounded-xl border p-3"
        style={{ borderColor: DRIVE_COLOR[drive.state], backgroundColor: TIER_TINT[risk.tier] }}
      >
        <p className="text-[12px] text-ob-muted font-medium">{t('insp.roads')}</p>
        <p className="mt-0.5 font-semibold" style={{ color: DRIVE_COLOR[drive.state] }}>
          {t(`drive.${drive.state}`)}
        </p>
        <p className="mt-0.5 text-xs text-ob-muted">{t(`drive.${drive.state}.msg`)}</p>
      </div>

      {rain && <RainBars rain={rain} />}

      <div className="mt-4">
        <p className="mb-2 text-[12px] text-ob-muted font-medium">{t('insp.nearest')}</p>
        <ul className="flex flex-col gap-2.5">
          {bayous.map((b) => {
            const pct = b.flood > 0 ? Math.min(100, (b.stage / b.flood) * 100) : 0;
            const color =
              pct >= 90 ? TIER_COLOR.CRITICAL : pct >= 70 ? TIER_COLOR.HIGH : pct >= 45 ? TIER_COLOR.MEDIUM : TIER_COLOR.LOW;
            return (
              <li key={b.id}>
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-ob-text">{b.name}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    {b.trend != null && <TrendArrow trend={b.trend} />}
                    <span className="font-mono tabular text-ob-muted">
                      {num(b.stage, 1)} / {num(b.flood, 1)} {t('common.ft')}
                    </span>
                  </span>
                </div>
                <FillBar pct={pct} color={color} />
              </li>
            );
          })}
        </ul>
      </div>

      <p className="mt-4 text-[11px] leading-snug text-ob-muted">
        {t(`footer.${dataSource}`)} {t('footer.disclaimer')}
      </p>
    </PanelShell>
  );
}

function PanelShell({
  children,
  onClose,
  onSwitch,
  switchLabel,
}: {
  children: React.ReactNode;
  onClose: () => void;
  onSwitch: () => void;
  switchLabel: string;
}) {
  const { t } = useI18n();
  return (
    <div className="ob-panel ob-float reveal flex max-h-full flex-col rounded-xl">
      <div className="thin-scroll overflow-y-auto p-5">{children}</div>
      <div className="flex items-center gap-2 border-t border-ob-border p-3">
        <button
          type="button"
          onClick={onSwitch}
          className="h-11 flex-1 rounded-lg border border-ob-border bg-ob-surface px-3 text-sm font-semibold text-ob-accent transition-colors hover:bg-ob-bg"
        >
          {switchLabel}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('insp.close')}
          className="h-11 rounded-lg border border-ob-border px-4 text-sm text-ob-muted transition-colors hover:text-ob-text"
        >
          {t('common.close')}
        </button>
      </div>
    </div>
  );
}
