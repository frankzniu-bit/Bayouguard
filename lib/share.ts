'use client';

/* Share a risk reading: the native share sheet with a link where supported,
 * otherwise copy the link. (Phase 7 upgrades this to an image card.) */

import type { HomeSnapshot } from './types';
import type { Lang, MsgKey, Params } from './i18n';

export type ShareResult = 'shared' | 'copied' | 'downloaded' | 'cancelled' | 'failed';

export function shareUrl(snapshot: HomeSnapshot, center: { lat: number; lng: number } | null): string {
  const params = new URLSearchParams({ address: snapshot.risk.address });
  if (center) {
    params.set('lat', center.lat.toFixed(5));
    params.set('lng', center.lng.toFixed(5));
  }
  return `${window.location.origin}/map?${params.toString()}`;
}

export async function shareRisk(
  snapshot: HomeSnapshot,
  center: { lat: number; lng: number } | null,
  t: (key: MsgKey, params?: Params) => string,
  _lang: Lang,
): Promise<ShareResult> {
  const url = shareUrl(snapshot, center);
  const text = t('share.text', {
    address: snapshot.risk.address,
    tier: t(`tier.${snapshot.risk.tier}`),
    score: snapshot.risk.score,
    drive: t(`drive.${snapshot.drive.state}`),
  });
  if (navigator.share) {
    try {
      await navigator.share({ title: 'BayouGuard', text, url });
      return 'shared';
    } catch (err) {
      if ((err as Error).name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}
