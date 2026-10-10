'use client';

/* The whole network in one line of words — "338 gauges · 13 high · 1
 * critical" — for screens too narrow for the rail. */

import type { GaugePoint } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

export default function NetworkStats({ gauges }: { gauges: GaugePoint[] }) {
  const { t } = useI18n();
  let high = 0;
  let critical = 0;
  for (const g of gauges) {
    if (g.tier === 'HIGH') high += 1;
    else if (g.tier === 'CRITICAL') critical += 1;
  }
  return (
    <p className="ob-panel ob-float pointer-events-auto rounded-xl px-3 py-2 text-[13px] font-medium text-ob-text tabular">
      {t('network.summary', { total: gauges.length, high, critical })}
    </p>
  );
}
