# Deploying SkillMatch AI to Render (free tier)

Moved off localtunnel because tunnels die whenever the dev laptop sleeps
or loses network - this deploys all 3 services to Render's free tier
instead, which stays up independent of any local machine. MongoDB stays
on Atlas (already set up - no change).

This is a manual process done in the GitHub and Render dashboards. This
file is the reference; CLAUDE_LOG.md has the reasoning/history behind
each decision.

## 0. One-time prep (done in this session)

- [x] `git init` at the project root
- [x] Root `.gitignore` added - confirmed via `git add -A --dry-run`
      that no `.env` files, `node_modules/`, `venv/`, `__pycache__/`,
      `dist/`, or log files would be committed
- [x] `ai-service/main.py` docstring updated with the production
      (`--host 0.0.0.0 --port $PORT`) run command
- [x] Confirmed `backend/server.js` already reads `process.env.PORT`
      (falls back to 5000 locally) - no change needed
- [x] Confirmed `frontend/src/api/client.js` already reads
      `VITE_API_BASE_URL` at build time - no change needed
- [x] Confirmed `ai-service/requirements.txt` already pins the spaCy
      model as a direct wheel URL, so `pip install -r requirements.txt`
      alone is enough - no separate `spacy download` build step needed

**Still to do (your side):** push this repo to GitHub, then create the
3 services in Render by following the steps below.

## 1. Push to GitHub

```bash
git add -A
git commit -m "Initial commit: SkillMatch AI (AI service, backend, frontend)"
```

Create a new **empty** repo on GitHub (no README/license - this repo
already has content), then:

```bash
git remote add origin <your-repo-url>
git branch -M main
git push -u origin main
```

## 2. Decide your 3 service names now (before deploying anything)

Render gives every service a URL of the form
`https://<service-name>.onrender.com`, and that URL is fixed as soon as
you pick the name - you don't have to wait for a successful deploy to
know it. This matters because the backend needs the frontend's URL
(CORS) and the frontend needs the backend's URL (API calls), and the
backend needs the AI service's URL - all before any of them are live.
Picking names upfront breaks that chicken-and-egg problem.

Suggested names (adjust if taken):
- `skillmatch-ai` -> `https://skillmatch-ai.onrender.com`
- `skillmatch-backend` -> `https://skillmatch-backend.onrender.com`
- `skillmatch-frontend` -> `https://skillmatch-frontend.onrender.com`

Write down whatever you actually pick - you'll paste these into env
vars in later steps.

## 3. Deploy order (dependency chain)

**AI service -> Backend -> Frontend.** Each step needs the previous
one's real URL.

---

### Step 1: AI service (Python Web Service)

In Render: **New +** -> **Web Service** -> connect your GitHub repo.

| Setting | Value |
|---|---|
| Root Directory | `ai-service` |
| Runtime | Python 3 |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Instance Type | Free |

Environment variables to add:
| Key | Value |
|---|---|
| `PYTHON_VERSION` | `3.11.10` |

**Why `PYTHON_VERSION` matters here:** this project was developed
against Python 3.14 locally, simply because that was the only Python
installed on the dev machine - not a deliberate choice. Render's
current default for new Python services is 3.11.10, and it's not
confirmed that 3.14 is even available as a selectable Render runtime
yet (it's a very new release). Setting `PYTHON_VERSION=3.11.10`
explicitly targets Render's well-supported default. All of this
project's dependencies (FastAPI, spaCy, scikit-learn, etc.) are
mainstream and support 3.11 fine, but **the first deploy here is the
one part of this whole plan that hasn't been tested end-to-end** -
watch the build logs on first deploy in case a pinned package version
in `requirements.txt` needs loosening for 3.11. If the build fails on a
specific package, that package's exact pinned version (from `pip
freeze` on 3.14) is the most likely cause - relaxing that one pin
(e.g. `package>=X` instead of `package==X`) is the fix.

No secrets needed for this service - it has no database connection and
no auth. Deploy, wait for it to go live, then confirm:
```
https://skillmatch-ai.onrender.com/health
```
returns `{"status":"ok"}` before moving on.

---

### Step 2: Backend (Node Web Service)

**New +** -> **Web Service** -> same repo.

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | Free |

Environment variables to add (paste your actual values - not shown
here):
| Key | Value |
|---|---|
| `MONGODB_URI` | Your MongoDB Atlas connection string (same one from `backend/.env`) |
| `JWT_SECRET` | A long random string. Recommend generating a **new** one for production rather than reusing the local dev secret |
| `JWT_EXPIRES_IN` | `1d` |
| `AI_SERVICE_URL` | The AI service's real Render URL from Step 1, e.g. `https://skillmatch-ai.onrender.com` (no trailing slash) |
| `CORS_ORIGINS` | The frontend's *planned* Render URL from Section 2, e.g. `https://skillmatch-frontend.onrender.com` (the frontend doesn't need to be deployed yet - you already know its URL from the name you picked) |

Do **not** set `PORT` manually - Render injects it automatically and
`server.js` already reads `process.env.PORT`.

**MongoDB Atlas check:** confirm Network Access in Atlas still allows
`0.0.0.0/0` (set during initial local setup) - Render's servers don't
have a fixed outbound IP, so this must stay open, not restricted to
your laptop's IP.

Deploy, wait for it to go live, then confirm:
```
https://skillmatch-backend.onrender.com/api/health
```
returns `{"status":"ok"}`, and:
```
https://skillmatch-backend.onrender.com/api/roles
```
returns the full role dataset (proves it can reach the AI service).

---

### Step 3: Frontend (Static Site)

**New +** -> **Static Site** -> same repo.

| Setting | Value |
|---|---|
| Root Directory | `frontend` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |

Environment variables to add:
| Key | Value |
|---|---|
| `VITE_API_BASE_URL` | The backend's real Render URL from Step 2 + `/api`, e.g. `https://skillmatch-backend.onrender.com/api` |

**Important:** `VITE_API_BASE_URL` is a *build-time* variable - Vite
bakes it into the static JS bundle when `npm run build` runs. If you
ever change this value later, you must trigger a new deploy (Render
does this automatically on a new commit, or you can manually redeploy)
- just changing the env var alone does nothing until the next build.

Deploy, then visit `https://skillmatch-frontend.onrender.com` and walk
through register -> login -> paste CV -> analyze to confirm the whole
chain works.

## 4. Free-tier behaviour to expect

- Free Render web services (the AI service and backend) **spin down
  after 15 minutes of no traffic** and take roughly 30-50 seconds to
  cold-start on the next request. Static sites (the frontend) don't
  have this issue - they're just served files.
- **Before a testing session**, hit both of these once each to wake
  them up ahead of time, so your first real tester doesn't wait on a
  cold start:
  ```
  https://skillmatch-ai.onrender.com/health
  https://skillmatch-backend.onrender.com/api/health
  ```
- Unlike the localtunnel setup, none of this depends on your laptop
  staying awake or a terminal window staying open - once deployed,
  Render keeps these services (spun down or not) independent of your
  machine.
