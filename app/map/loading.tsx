'use client';

/* Shown while /map's data loads. Arriving from the landing, it holds the
 * zoomed-in dot frame the landing ended on, so the hand-off doesn't blink;
 * arriving any other way, it's a quiet cream screen. */

import { useLayoutEffect, useState } from 'react';
import FrozenField from '@/components/FrozenField';
import { readHandoff, type Handoff } from '@/lib/dotField';
import { useI18n } from '@/lib/i18n';

export default function MapLoading() {
  const { t } = useI18n();
  const [handoff, setHandoff] = useState<Handoff | null>(null);

  useLayoutEffect(() => {
    setHandoff(readHandoff(false));
  }, []);

  return (
    <div className="fixed inset-0 bg-ob-bg" role="status" aria-label={t('map.loading')}>
      {handoff && <FrozenField handoff={handoff} />}
      <p className="fade-in-late absolute inset-x-0 bottom-8 text-center text-[12px] text-ob-muted">
        {t('map.readingGauges')}
      </p>
    </div>
  );
}
