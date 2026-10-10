# BayouGuard

Hyperlocal flood risk for Houston. Type an address and BayouGuard reads the
nearest Harris County flood gauges, scores the risk with a random-forest model,
and tells you whether it's safe to drive — in English, Spanish, or Vietnamese.

Built for the Congressional App Challenge 2026 (TX-07).

## Run it locally

```bash
npm install
NEXT_PUBLIC_API_BASE_URL=https://bayouguard-backend-qibd.onrender.com npm run dev
```

Or put that one line in `.env.local` (no trailing slash) and run `npm run dev`.
Without the variable the app still runs: gauges come straight from the Harris
County feed, or from labelled demo data, and the status pill says so.

## Deploying on Vercel

1. Vercel → Project → Settings → Environment Variables → add
   `NEXT_PUBLIC_API_BASE_URL` = `https://bayouguard-backend-qibd.onrender.com`
   for **Production** and **Preview**.
2. **Redeploy.** `NEXT_PUBLIC_` values are baked in at build time, so adding the
   variable does nothing until the next build.

## Keeping the backend awake

The backend runs on Render's free tier, which sleeps after 15 minutes without
traffic and takes about a minute to wake. The app handles this — it shows
"Waking up the flood model" and keeps trying for 70 seconds — but a judge
shouldn't have to wait.

`/api/keepalive` pings the backend's `/gauges` and returns `{ ok, ms }`. Point a
free uptime monitor at it every 10 minutes during demo recording and the judging
window (Oct 28 – Nov 23):

- **UptimeRobot**: New monitor → HTTP(s) → `https://bayouguard.vercel.app/api/keepalive` → interval 10 min.
- **cron-job.org**: New cronjob → same URL → every 10 minutes.

Render's free tier gives 750 instance hours a month — enough for one service
running all month. A second free service in the same Render workspace shares
those hours, so keeping two awake around the clock would run out.
