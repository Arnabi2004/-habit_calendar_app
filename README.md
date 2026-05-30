# Daily Rhythm Habit Tracker

A Netlify-ready full-stack habit tracker for one person.

## Features

- Today-only editing
- Wake Up can be ticked only from 6:00 AM to 7:00 AM
- Sleep can be ticked only from 11:00 PM to 11:59 PM
- Meditation can be ticked any time today
- Monthly read-only summary table
- Phone-friendly responsive UI

The deployed app stores progress in Netlify Blobs through Netlify Functions. Reads use strong consistency so ticks appear immediately after saving. The frontend script is versioned as `app-v4.js` to avoid old browser/Netlify cache behavior. Local development uses `.netlify/local-habits.json` as a fallback.

## Run Locally

```powershell
npm install
npm run dev
```

Then open the local Netlify URL shown in the terminal.

## Deploy To Netlify

1. Push this folder to GitHub.
2. Create a new Netlify site from that repository.
3. Use these settings:

```text
Build command: npm run build
Publish directory: public
Functions directory: netlify/functions
```

`netlify.toml` already contains these settings.

## API

- `GET /api/month?year=2026&month=5`
- `POST /api/habit`

Netlify redirects those routes to the serverless functions in `netlify/functions`.

## Deploy To Render

Render runs this app as a normal Node.js web service with `server.mjs`.

Use these settings:

```text
Service type: Web Service
Runtime: Node
Build command: npm install
Start command: npm start
```

The app automatically uses Render's `PORT` environment variable.

For persistent habit data, add a Render persistent disk:

```text
Mount path: /opt/render/project/src/storage
Size: 1 GB
```

Then add this environment variable:

```text
DATA_DIR=/opt/render/project/src/storage
```

The Render server stores progress in:

```text
storage/habits.json
```

Important: Render's filesystem is ephemeral without a persistent disk, so habit data can disappear after redeploys or restarts if you skip the disk.
