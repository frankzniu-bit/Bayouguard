/* Everything the landing page draws, assembled server-side in one pass:
 * every gauge as a dot, the four stat cards, and the freshness line.
 *
 * Statewide dots are real (USGS, keyless). Harris County dots are the
 * backend's when it answers and the placeholder set when it doesn't — the
 * `sample` flag travels with them so the page can say which. */

import { getUsgsGauges } from './usgs';
import { getRainForecast } from './weather';
import { loadGauges, normalizeTier } from './api';
import type { Tier } from './types';
import type { MsgKey } from './i18n/en';

/** One dot on the landing map. `tier` is null for statewide gauges, which carry no flood stage. */
export interface LandingDot {
  lat: number;
  lng: number;
  tier: Tier | null;
}

export interface LandingStat {
  value: string;
  label: MsgKey;
  /** Short, true detail under the number — what the number is made of. */
  detail: MsgKey;
  params?: Record<string, string | number>;
}

export interface LandingData {
  dots: LandingDot[];
  stats: LandingStat[];
  /** ISO time of the newest reading anywhere in the set, or null. */
  latestReading: string | null;
  sample: boolean;
}

const HOUSTON = { lat: 29.7604, lng: -95.3698 };

export async function getLandingData(): Promise<LandingData> {
  const [usgs, harris, rain] = await Promise.all([
    getUsgsGauges(),
    loadGauges(4000),
    getRainForecast(HOUSTON.lat, HOUSTON.lng),
  ]);

  const harrisDots: LandingDot[] = harris.gauges.map((g) => ({
    lat: g.latitude,
    lng: g.longitude,
    tier: normalizeTier(g.risk_tier),
  }));
  const statewideDots: LandingDot[] = usgs.map((g) => ({ lat: g.lat, lng: g.lng, tier: null }));

  const nearFlood = harrisDots.filter((d) => d.tier === 'HIGH' || d.tier === 'CRITICAL').length;
  const total = usgs.length + harrisDots.length;

  const latestReading = usgs.reduce<string | null>(
    (best, g) => (!best || g.readAt > best ? g.readAt : best),
    null,
  );

  const rainIn = rain ? rain.totalNext12h : null;

  const stats: LandingStat[] = [
    {
      value: total.toLocaleString('en-US'),
      label: 'stat.gauges',
      detail: 'stat.gauges.detail',
      params: { statewide: usgs.length.toLocaleString('en-US'), houston: harrisDots.length },
    },
    {
      value: String(nearFlood),
      label: 'stat.near',
      detail: harris.source === 'demo' ? 'stat.near.demo' : 'stat.near.detail',
    },
    {
      value: rainIn === null ? '—' : `${rainIn.toFixed(2)}″`,
      label: 'stat.rain',
      detail: 'stat.rain.detail',
    },
    {
      value: '5 min',
      label: 'stat.cadence',
      detail: 'stat.cadence.detail',
    },
  ];

  return {
    dots: [...statewideDots, ...harrisDots],
    stats,
    latestReading,
    sample: harris.source === 'demo',
  };
}
