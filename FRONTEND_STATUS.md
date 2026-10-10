# Frontend status

Branch `frontend-finalization`, one commit per phase. Checked on 2026-10-09
against the live Render backend.

## Done

| Phase | What shipped |
| --- | --- |
| 1. Fix what's broken | Render backend connected; the server render waits at most 4 s, then the client keeps trying for up to 70 s with a "Waking up the flood model" state (tested against a real cold start); `/api/keepalive`; warm-up ping on page load; keyless Esri basemap in `lib/theme.ts`; real gauge names; honest status pill (Live / Partial data / Demo data) and score source label; out-of-area guard; Census fallback for type-ahead; graph empty state; `animejs`, `gsap` removed. |
| 2. Clear Sky | Light by default, navy dark theme, theme-aware tier colours, flat panels, sentence-case labels, DM Serif wordmark, water-coloured pin, sparklines and rain. |
| 3. Three languages | Every string in `lib/i18n/{en,es,vi}.ts` (es and vi are type-checked against en). Persisted to `bayouguard_lang`; sets `<html lang>`; settings button on phones. |
| 4. Backend-ready data layer | `lib/contract.ts` (LIVE + PLANNED), one fetcher and one Next route per endpoint (`lib/endpoints.ts`, `app/api/*`), health probe, stale-reading strip, README "Connecting the backend". |
| 5. Core screens | Nav + bottom tabs; address card in urgency order (drive verdict, arc gauge, outlook + hourly chart, rain, nearest gauges, flood memory, reservoirs, weather, actions, disclaimer); shelter/road/report/reservoir layers; legend; Locate me; Report flooding; bottom sheets on phones; welcome card. |
| 6. Pages | `/shelters`, `/alerts`, `/about`. |
| 7. Share + PWA | 1200×630 share card (html2canvas) with native share or PNG download; Open Graph cards for shared links; manifest, generated icons; small service worker with an offline banner. |
| 8. Polish | Skeletons, retry on every failed fetch, motion audit, contrast audit (both themes), lazy map/graph/chart, responsive pass at 375 / 768 / 1024 / 1280 / 1600. |

## Running on fallbacks, and what turns each one live

Nothing below needs a frontend change. Once the backend ships the endpoint with the shape in `lib/contract.ts`, the feature goes live on the next request.

| Feature | Today | Turns live when the backend adds |
| --- | --- | --- |
| Hourly risk chart | Demo bars drifting from the current score, labelled "Demo" | `GET /forecast?lat&lng&hours=6` |
| Shelters page and map layer | Real venues with **sample** statuses; every card says "Sample status" | `GET /shelters` |
| Road closures layer | Four sample segments, marked demo in the legend | `GET /roads` |
| Community reports | Two sample pins; new reports stay on the reporter's device and say so | `GET` / `POST /reports` |
| Flood alerts sign-up | Says plainly that nothing was saved | `POST /subscribe` |
| Reservoirs (Addicks, Barker) | **Real** pool elevation and trend from the HCFWS dam gauges; capacity and outflow show "not available yet" | `GET /reservoirs` |
| Flood memory | **Real** NFIP claims from OpenFEMA v3 (free, keyless) | `GET /flood-history?zip` (optional; FEMA already works) |
| Health | A good `/gauges` counts as healthy | `GET /health` |

When `/gauges` itself is down, the map uses the Harris County feed's own readings ("Partial data"), then demo fixtures at real HCFWS sites ("Demo data").

**Suggestion for the backend:** add a five-line `/health` route returning `{ status, modelLoaded, modelVersion, lastGaugeRefresh }`. The status pill could then tell "model down" apart from "gauges down".

## Not finished, or needs you

- **`npm run lint` doesn't run yet.** The repo has no ESLint config, and `next lint` asks to install `eslint` and `eslint-config-next`. `npm run build` and `npx tsc --noEmit` are clean.
- **Lighthouse not measured.** Lighthouse isn't installed here. `/map` first load is 184 kB of JS; Leaflet, the graph and recharts load on demand; the USGS layer is off by default.
- **No `.env.local` or `.env.example`.** My setup isn't allowed to create `.env*` files. For local dev, put `NEXT_PUBLIC_API_BASE_URL=https://bayouguard-backend-qibd.onrender.com` in `.env.local`. For production, set it in Vercel and redeploy (see README).
- **`{{SCHOOL}}`** placeholder on `/about` (`components/pages/AboutView.tsx`).
- **Design direction.** Clear Sky replaces the "paper and ink" redesign picked from `docs/boards/2026-10-08-redesign-board.jpg` a day earlier. Worth a quick check with Matthew.
- **Landing motion kept.** The motion audit list didn't mention the landing page's dot-field assembly and zoom hand-off, so I kept them (they respect reduced motion) and removed only the infinite stat-card bob.
- **Harvey peak pools** on the reservoir card (Addicks 109.1 ft, Barker 101.6 ft) are the USACE-reported records as I know them; confirm before the video.
- **Share on a real phone** hasn't been tried. The card renders and captures correctly in headless Chrome, but the native share sheet only exists on devices.
