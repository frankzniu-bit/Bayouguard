'use client';

/* The map screen. One persistent chrome layer over a swappable background:
 *   map   — real Leaflet map, gauges plotted at their true coordinates
 *   graph — abstract force-directed watershed node network
 * Chrome: the top bar (brand, destinations, search, view controls), the left
 * rail (network counts that double as risk filters, layers, reservoirs) and
 * legend, the right column (the gauges closest to flooding, replaced by the
 * inspector when something is picked), map tools (locate me, report flooding),
 * and a first-visit welcome card and tour. On phones the inspector, layers
 * and report form are bottom sheets above the tab bar. */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type L from 'leaflet';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import TopBar, { type ViewMode } from './TopBar';
import WatershedGraph, { type GraphSelection } from './WatershedGraph';
import AddressSearch from './AddressSearch';
import TexasLocator from './TexasLocator';
import InspectorPanel from './InspectorPanel';
import MapRail from './MapRail';
import RiskBoard from './RiskBoard';
import Tour from './Tour';
import StaleBanner from './StaleBanner';
import MapIntro from './MapIntro';
import MapLegend from './MapLegend';
import BottomSheet from './BottomSheet';
import BottomTabs from './nav/BottomTabs';
import ReportForm from './ReportForm';
import WelcomeCard, { LocateIcon } from './WelcomeCard';
import LayerControl, { DEFAULT_LAYERS, type MapLayers } from './LayerControl';
import { useTheme } from '@/lib/useTheme';
import { useFloodData } from '@/lib/useFloodData';
import { useEndpoint } from '@/lib/useEndpoint';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { useI18n, type MsgKey } from '@/lib/i18n';
import { writeLastSearch } from '@/lib/savedAddress';
import type { FloodView, GaugePoint, Tier } from '@/lib/types';
import type { CommunityReport, Reservoir, RoadCollection, Shelter } from '@/lib/contract';
import { readHandoff, type Handoff } from '@/lib/dotField';

// Leaflet touches window — load the map background client-only.
const FloodMap = dynamic(() => import('./FloodMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-ob-bg2" />,
});

/* checking — deciding (first client frame) whether we came from the landing
 * playing   — MapIntro is melting the landing's dots into the map
 * done      — chrome slides in; normal use */
type IntroState = 'checking' | 'playing' | 'done';
type LocalNotice = 'locationDenied' | 'locationUnavailable' | 'reportShared' | 'reportLocal' | null;

const ADDRESS_SELECTION: GraphSelection = { id: 'address', kind: 'address' };
// Floating controls clear the 56px tab bar and the home indicator on phones.
const ABOVE_TABS = 'calc(56px + env(safe-area-inset-bottom) + 12px)';

export default function HomeExperience({
  initial,
  initialAddress,
  initialCoords,
}: {
  initial: FloodView;
  /** Set when arriving from the landing page's address box. */
  initialAddress?: string;
  initialCoords?: { lat: number; lng: number };
}) {
  const { t, time } = useI18n();
  const { view, loading, wake, notice, search } = useFloodData(initial, initialAddress, initialCoords);
  const [mode, setMode] = useState<ViewMode>('map');
  const { mode: theme, toggle: toggleTheme, setMode: setTheme } = useTheme();
  const [selection, setSelection] = useState<GraphSelection | null>(
    initialAddress && initial.snapshot ? ADDRESS_SELECTION : null,
  );
  const [focus, setFocus] = useState<GaugePoint | null>(null);
  const [layers, setLayers] = useState<MapLayers>(DEFAULT_LAYERS);
  const [hiddenTiers, setHiddenTiers] = useState<ReadonlySet<Tier>>(new Set());
  const [searched, setSearched] = useState(Boolean(initialAddress && initial.center));
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [intro, setIntro] = useState<IntroState>('checking');
  const [liveMap, setLiveMap] = useState<L.Map | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const onMap = useCallback((m: L.Map) => {
    mapRef.current = m;
  }, []);

  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isWide = useMediaQuery('(min-width: 768px)');
  const [layersOpen, setLayersOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportAt, setReportAt] = useState<{ lat: number; lng: number; mine: boolean } | null>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [localNotice, setLocalNotice] = useState<LocalNotice>(null);
  const [localReports, setLocalReports] = useState<CommunityReport[]>([]);

  // Before paint, so the landing's last frame is covered from the first frame.
  // Once only: reading consumes the hand-off, and React's dev double-run of
  // effects would otherwise find it gone and skip the intro.
  const checked = useRef(false);
  useLayoutEffect(() => {
    if (checked.current) return;
    checked.current = true;
    const h = readHandoff(true);
    if (h) {
      setHandoff(h);
      setIntro('playing');
      return;
    }
    // A direct visit: let one frame paint with the chrome off-stage, so its
    // slide-in actually transitions.
    requestAnimationFrame(() => setIntro('done'));
  }, []);

  // Memoized so the map's per-gauge ripple icons survive unrelated re-renders.
  const visible = useMemo(
    () => view.gauges.filter((g) => !hiddenTiers.has(g.tier)),
    [view.gauges, hiddenTiers],
  );

  // Overlays load the first time their layer is switched on.
  const shelters = useEndpoint<Shelter[]>(layers.shelters ? '/api/shelters' : null);
  const roads = useEndpoint<RoadCollection>(layers.roads ? '/api/roads' : null);
  const reports = useEndpoint<CommunityReport[]>(layers.reports ? '/api/reports' : null);
  const reservoirs = useEndpoint<Reservoir[]>(layers.reservoirs ? '/api/reservoirs' : null);
  const overlays = useMemo(
    () => ({
      shelters: shelters.data,
      roads: roads.data,
      reports: [...(reports.data ?? []), ...localReports],
      reservoirs: reservoirs.data,
    }),
    [shelters.data, roads.data, reports.data, localReports, reservoirs.data],
  );
  const demoOverlays = useMemo(() => {
    const s = new Set<keyof MapLayers>();
    if (shelters.source === 'demo') s.add('shelters');
    if (roads.source === 'demo') s.add('roads');
    if (reports.source === 'demo' || localReports.length > 0) s.add('reports');
    if (reservoirs.source === 'demo') s.add('reservoirs');
    return s;
  }, [shelters.source, roads.source, reports.source, localReports.length, reservoirs.source]);

  const toggleTier = (tier: Tier) =>
    setHiddenTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier);
      else next.add(tier);
      return next;
    });

  const remember = (v: FloodView | null) => {
    if (v?.center && v.address && !v.outOfArea) writeLastSearch({ label: v.address, ...v.center });
  };

  // When the server render couldn't wait for the backend, the client's first
  // live view is the answer to the address the visitor came in with.
  const awaitingInitial = useRef(Boolean(initialAddress && (initial.pending || !initial.center)));
  useEffect(() => {
    if (!awaitingInitial.current || view.pending || loading) return;
    awaitingInitial.current = false;
    if (view.center) {
      setSearched(true);
      if (view.snapshot) setSelection(ADDRESS_SELECTION);
    }
  }, [view, loading]);
  useEffect(() => {
    if (initialAddress) remember(initial);
    // Once, for an address that arrived in the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastSearch = useRef<{ address: string; coords?: { lat: number; lng: number } } | null>(null);
  const onSearch = async (
    address: string,
    submitted: boolean,
    coords?: { lat: number; lng: number },
  ) => {
    lastSearch.current = { address, coords };
    setLocalNotice(null);
    const next = await search(address, coords);
    remember(next);
    if (submitted && next?.center) {
      setSearched(true);
      if (next.snapshot) setSelection(ADDRESS_SELECTION);
    }
  };
  const retry = () => {
    const last = lastSearch.current;
    if (last) void onSearch(last.address, true, last.coords);
    else void search(undefined, undefined);
  };

  const locate = () => {
    setLocalNotice(null);
    if (!('geolocation' in navigator)) {
      setLocalNotice('locationUnavailable');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLoc(coords);
        let label: string | null = null;
        try {
          const res = await fetch(`/api/reverse?lat=${coords.lat}&lng=${coords.lng}`);
          if (res.ok) label = (await res.json()).label;
        } catch {
          // Fall back to a generic label below.
        }
        setLocating(false);
        await onSearch(label ?? t('locate.yourLocation'), true, coords);
      },
      (err) => {
        setLocating(false);
        setLocalNotice(err.code === err.PERMISSION_DENIED ? 'locationDenied' : 'locationUnavailable');
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  const openReport = () => {
    const c = mapRef.current?.getCenter();
    const at = userLoc
      ? { ...userLoc, mine: true }
      : c
        ? { lat: c.lat, lng: c.lng, mine: false }
        : view.center
          ? { ...view.center, mine: false }
          : null;
    if (!at) return;
    setReportAt(at);
    setReportOpen(true);
    setLayersOpen(false);
  };
  const reportDone = (report: CommunityReport, shared: boolean) => {
    setReportOpen(false);
    setLayers((l) => ({ ...l, reports: true }));
    if (shared) reports.retry();
    else setLocalReports((r) => [...r, report]);
    setLocalNotice(shared ? 'reportShared' : 'reportLocal');
  };

  const pickGauge = (g: GaugePoint) => {
    setSelection({ id: `g${g.id}`, kind: 'gauge', gauge: g });
    setFocus(g);
  };
  const closeInspector = () => {
    setSelection(null);
    setFocus(null);
  };

  const otherMode: ViewMode = mode === 'map' ? 'graph' : 'map';
  const sample = view.dataSource !== 'live';
  // An address selection needs a scored snapshot to show.
  const shown = selection?.kind === 'address' && !view.snapshot ? null : selection;
  const showWelcome = intro === 'done' && !view.address && !loading && !shown;

  const noticeKey: MsgKey | null =
    localNotice === 'locationDenied'
      ? 'locate.denied'
      : localNotice === 'locationUnavailable'
        ? 'locate.unavailable'
        : localNotice === 'reportShared'
          ? 'report.shared'
          : localNotice === 'reportLocal'
            ? 'report.local'
            : notice === 'notFound'
              ? 'error.notFound'
              : notice === 'outOfArea'
                ? 'error.outOfArea'
                : notice === 'unreachable'
                  ? 'error.unreachable'
                  : wake === 'failed'
                    ? 'wake.failed'
                    : null;
  const canRetry = !localNotice && (notice === 'unreachable' || wake === 'failed');

  const inspector = shown && (
    <InspectorPanel
      selection={shown}
      snapshot={view.snapshot}
      dataSource={view.dataSource}
      center={view.center}
      address={view.address}
      switchLabel={t(otherMode === 'map' ? 'map.viewOnMap' : 'map.viewAsGraph')}
      onSwitch={() => setMode(otherMode)}
      onClose={closeInspector}
      bare={!isWide}
    />
  );

  const reportForm = reportOpen && reportAt && (
    <ReportForm
      where={reportAt}
      whereLabel={t(reportAt.mine ? 'report.atYou' : 'report.atCenter')}
      onDone={reportDone}
      onCancel={() => setReportOpen(false)}
    />
  );

  const toolBtn =
    'ob-panel ob-float flex h-11 items-center justify-center gap-2 rounded-full text-[13px] font-semibold text-ob-accent transition-colors hover:bg-ob-bg';

  return (
    <div className="fixed inset-0 overflow-hidden bg-ob-bg" data-chrome={intro === 'done' ? 'in' : 'out'}>
      {/* ── BACKGROUND (swappable) ──
          z-0 establishes a stacking context so Leaflet's internal panes
          (z-index 400-700) stay trapped below the chrome layers above. On
          phones it stops at the tab bar. */}
      <div className="absolute inset-x-0 top-0 z-0 bottom-[calc(56px+env(safe-area-inset-bottom))] lg:bottom-0">
        {intro === 'checking' ? null : mode === 'map' ? (
          <FloodMap
            center={view.center}
            gauges={visible}
            address={view.address ?? undefined}
            mode={theme}
            zoomToCenter={searched}
            selectedId={selection?.id ?? null}
            onSelect={setSelection}
            layers={layers}
            focusGauge={focus}
            initialView={handoff ? { lat: handoff.lat, lng: handoff.lng, zoom: handoff.zoom } : null}
            onReady={intro === 'playing' ? setLiveMap : undefined}
            overlays={overlays}
            onMap={onMap}
          />
        ) : (
          <WatershedGraph
            gauges={visible}
            center={view.center}
            address={view.address ?? undefined}
            mode={theme}
            active={mode === 'graph'}
            selectedId={selection?.id ?? null}
            onSelect={setSelection}
            onSwitchToMap={() => setMode('map')}
          />
        )}
      </div>

      {/* ── CHROME (shared across both backgrounds) ── */}
      <TopBar
        mode={mode}
        onMode={setMode}
        theme={theme}
        onToggleTheme={toggleTheme}
        onTheme={setTheme}
        dataSource={view.dataSource}
        waking={wake === 'waking'}
        search={
          <AddressSearch
            onSearch={onSearch}
            initialValue={initialAddress}
            syncValue={view.address ?? undefined}
            busy={loading}
            waking={wake === 'waking'}
          />
        }
        className="chrome chrome-top"
      />

      {/* Search status, data warnings and the welcome card, under the bar */}
      <div className="pointer-events-none absolute inset-x-0 top-[116px] z-[60] mx-auto flex max-w-md flex-col items-center gap-2 px-3 md:top-[68px]">
        {view.offline ? (
          <p
            role="status"
            className="pointer-events-auto rounded-lg border border-ob-border bg-ob-surface px-3 py-1.5 text-[12px] font-medium text-ob-text"
          >
            {t('offline.banner', { time: time(view.fetchedAt) })}
          </p>
        ) : (
          <StaleBanner gauges={view.gauges} />
        )}
        {loading && (
          <span
            role="status"
            className="ob-panel ob-float inline-flex max-w-md items-center gap-2 rounded-full px-3 py-1.5 text-[12px] text-ob-text"
          >
            <span className="spin h-3 w-3 shrink-0 rounded-full border-2 border-ob-accent border-t-transparent" />
            {wake === 'waking' ? t('wake.message') : t('search.reading')}
          </span>
        )}
        {!loading && noticeKey && (
          <span
            role="alert"
            className="ob-panel ob-float pointer-events-auto inline-flex max-w-md items-center gap-3 rounded-xl px-3 py-2 text-[13px] text-ob-text"
          >
            {t(noticeKey)}
            {canRetry && (
              <button type="button" onClick={retry} className="shrink-0 font-semibold text-ob-accent hover:underline">
                {t('action.retry')}
              </button>
            )}
            {localNotice && (
              <button
                type="button"
                onClick={() => setLocalNotice(null)}
                aria-label={t('common.close')}
                className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ob-muted hover:text-ob-text"
              >
                ×
              </button>
            )}
          </span>
        )}
        {showWelcome && (
          <WelcomeCard onPick={(q, c) => void onSearch(q, true, c)} onLocate={locate} locating={locating} />
        )}
      </div>

      {/* Left column (desktop): network, filters, layers, reservoirs; legend below */}
      <div className="chrome chrome-left chrome-d1 pointer-events-none absolute bottom-4 left-4 top-[76px] z-40 hidden flex-col justify-between gap-3 lg:flex">
        <div className="pointer-events-auto min-h-0 shrink">
          <MapRail
            gauges={view.gauges}
            sample={sample}
            hidden={hiddenTiers}
            onToggleTier={toggleTier}
            layers={layers}
            onLayers={setLayers}
            showLayers={mode === 'map'}
          />
        </div>
        {isDesktop && (
          <div className="pointer-events-auto shrink-0">
            <MapLegend gauges={view.gauges} layers={mode === 'map' ? layers : DEFAULT_LAYERS} demoOverlays={demoOverlays} />
          </div>
        )}
      </div>

      {/* Legend (below lg), collapsed so it doesn't cover the map */}
      {!shown && !isDesktop && (
        <div
          className="chrome chrome-bottom chrome-d2 pointer-events-none absolute left-3 z-40"
          style={{ bottom: ABOVE_TABS, maxWidth: 'calc(100vw - 136px)' }}
        >
          <div className="pointer-events-auto">
            <MapLegend
              gauges={view.gauges}
              layers={mode === 'map' ? layers : DEFAULT_LAYERS}
              demoOverlays={demoOverlays}
              defaultOpen={false}
            />
          </div>
        </div>
      )}

      {/* Map tools (below lg): layers, locate me, report flooding */}
      {!shown && !reportOpen && (
        <div
          className="chrome chrome-bottom chrome-d2 pointer-events-none absolute right-3 z-40 flex flex-col gap-2 lg:hidden"
          style={{ bottom: ABOVE_TABS }}
        >
          {mode === 'map' && (
            <button type="button" onClick={() => setLayersOpen(true)} className={`${toolBtn} pointer-events-auto px-4`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="m12 3 9 5-9 5-9-5 9-5zM3 13l9 5 9-5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
              {t('layers.button')}
            </button>
          )}
          <button
            type="button"
            onClick={locate}
            disabled={locating}
            aria-label={t('locate.me')}
            className={`${toolBtn} pointer-events-auto w-11 self-end disabled:opacity-60`}
          >
            <LocateIcon className="h-5 w-5" />
          </button>
          {mode === 'map' && (
            <button
              type="button"
              onClick={openReport}
              aria-label={t('report.open')}
              className={`${toolBtn} pointer-events-auto px-4`}
            >
              {t('report.short')}
            </button>
          )}
        </div>
      )}

      {/* Right column: leaderboard until something is picked */}
      {!shown && (
        <div className="chrome chrome-right chrome-d2 pointer-events-none absolute right-4 top-[76px] z-40 hidden lg:block">
          <div className="pointer-events-auto">
            <RiskBoard gauges={visible} onPick={pickGauge} />
          </div>
        </div>
      )}

      {/* Texas locator — only the graph needs telling where it is */}
      {mode === 'graph' && !shown && (
        <div className="pointer-events-none absolute bottom-20 right-4 z-40 hidden lg:block">
          <TexasLocator />
        </div>
      )}

      {/* Desktop tools + hint (bottom centre) */}
      <div className="chrome chrome-bottom chrome-d3 pointer-events-none absolute inset-x-0 bottom-4 z-30 hidden flex-col items-center gap-2 px-4 lg:flex">
        {reportOpen && isDesktop && (
          <div className="ob-panel ob-float pointer-events-auto w-[360px] rounded-xl p-4">{reportForm}</div>
        )}
        <div className="pointer-events-auto flex gap-2">
          <button type="button" onClick={locate} disabled={locating} className={`${toolBtn} px-4 disabled:opacity-60`}>
            <LocateIcon />
            {locating ? t('locate.finding') : t('locate.me')}
          </button>
          {mode === 'map' && !reportOpen && (
            <button type="button" onClick={openReport} className={`${toolBtn} px-4`}>
              {t('report.open')}
            </button>
          )}
        </div>
        {!shown && (
          <p className="ob-panel rounded-full px-4 py-1.5 text-center text-[12px] text-ob-muted">
            {t(mode === 'map' ? 'map.hint.map' : 'map.hint.graph')}
          </p>
        )}
      </div>

      {/* Inspector: right column from md up, a bottom sheet on phones */}
      <AnimatePresence>
        {shown && intro === 'done' && isWide && (
          <motion.aside
            key="inspector"
            aria-label={t('map.inspector')}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-[calc(56px+env(safe-area-inset-bottom)+16px)] right-4 top-[76px] z-[80] w-[380px] lg:bottom-4"
          >
            {inspector}
          </motion.aside>
        )}
        {shown && intro === 'done' && !isWide && (
          <BottomSheet key={`sheet-${shown.id}`} label={t('map.inspector')} onClose={closeInspector}>
            {inspector}
          </BottomSheet>
        )}
        {layersOpen && !isDesktop && (
          <BottomSheet key="layers" label={t('layers.title')} onClose={() => setLayersOpen(false)} peek={0.6} full={0.6}>
            <div className="px-3 pb-4">
              <LayerControl layers={layers} onChange={setLayers} />
            </div>
          </BottomSheet>
        )}
        {reportOpen && !isDesktop && (
          <BottomSheet key="report" label={t('report.title')} onClose={() => setReportOpen(false)} peek={0.7} full={0.7}>
            <div className="px-4 pb-4">{reportForm}</div>
          </BottomSheet>
        )}
      </AnimatePresence>

      <BottomTabs />

      {/* Covers the first client frame while we decide; then the intro or nothing. */}
      {intro === 'checking' && <div className="fixed inset-0 z-[90] bg-ob-bg" aria-hidden="true" />}
      {intro === 'playing' && handoff && (
        <MapIntro handoff={handoff} map={liveMap} mode={theme} onDone={() => setIntro('done')} />
      )}

      <Tour ready={intro === 'done'} />
    </div>
  );
}
