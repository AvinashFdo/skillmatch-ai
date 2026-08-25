# SkillMatch AI — Backend (Node.js/Express)

Handles auth (JWT) and proxies CV analysis / role data requests to the
Python AI service. The frontend only ever talks to this backend, never
directly to the Python service.

## Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:
- `MONGODB_URI` - your MongoDB Atlas connection string (or a local
  `mongodb://localhost:27017/skillmatch` if running MongoDB locally)
- `JWT_SECRET` - any long random string
- `AI_SERVICE_URL` - defaults to `http://localhost:8000`, matching the
  Python FastAPI service

## Running

Make sure the Python AI service is running first (see `../ai-service/README.md`),
then:

```bash
npm start        # node server.js
# or, for auto-reload during development:
npm run dev       # nodemon server.js
```

## Endpoints

| Method | Path                 | Auth required | Description                                      |
|--------|----------------------|----------------|---------------------------------------------------|
| GET    | `/api/health`        | No             | Liveness check                                     |
| POST   | `/api/auth/register` | No             | Create a user (`name`, `email`, `password`)        |
| POST   | `/api/auth/login`    | No             | Verify credentials, returns `{ token, user }`      |
| POST   | `/api/cv/analyze`    | Yes (Bearer)   | Proxies `{ cv_text }` to the AI service `/analyze` |
| GET    | `/api/roles`         | No             | Proxies to the AI service `/roles`                 |

### Auth flow example

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"testpass123"}'

curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
# -> { "token": "...", "user": {...} }

curl -X POST http://localhost:5000/api/cv/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token from login>" \
  -d '{"cv_text": "..."}'
```

## Project structure

```
backend/
  server.js               # entry point: Express app, middleware, route mounting
  src/
    config/db.js           # mongoose connection
    models/User.js         # User schema (name, email, hashed password, createdAt)
    middleware/auth.js      # JWT verification middleware
    routes/
      auth.js               # /api/auth/register, /api/auth/login
      cv.js                 # /api/cv/analyze (protected, proxies to AI service)
      roles.js              # /api/roles (proxies to AI service)
  .env.example
  package.json
```

## Notes

- Passwords are hashed with bcrypt (10 salt rounds) before storage -
  plaintext passwords are never persisted.
- `/api/cv/analyze` and `/api/roles` return `503` if the Python AI
  service is unreachable, rather than a generic 500.

## Remote user testing (temporary public access)

For a short remote testing session (e.g. ethics-approved user testing
with a few friends), expose the backend and frontend via
[localtunnel](https://github.com/localtunnel/localtunnel) (`npm install
-g localtunnel` once, then the `lt` command). The AI service stays
local-only - only the backend calls it directly.

**Order matters.** Do this every time (tunnel URLs change on every run
unless you pay for a reserved domain):

1. **Start the AI service** (from `ai-service/`):
   ```bash
   source venv/Scripts/activate
   uvicorn main:app --port 8000
   ```

2. **Set backend CORS to allow any origin** (only for this session) -
   in `backend/.env`, set:
   ```
   CORS_ORIGINS=*
   ```

3. **Start the backend** (from `backend/`):
   ```bash
   node server.js
   ```

4. **Tunnel the backend** and note its public URL:
   ```bash
   lt --port 5000
   # "your url is: https://<random-name>.loca.lt"
   ```

5. **Point the frontend at that backend tunnel URL** - in
   `frontend/.env`:
   ```
   VITE_API_BASE_URL=https://<random-name>.loca.lt/api
   ```

6. **Build and preview the frontend** (from `frontend/`) - use a
   production build, not `npm run dev`. The dev server's HMR websocket
   and large number of per-module requests were unreliable over a free
   tunnel; a single bundled build is not:
   ```bash
   npm run build
   npm run preview
   ```

7. **Tunnel the frontend** and get the link to share with testers:
   ```bash
   lt --port 4173
   # "your url is: https://<another-random-name>.loca.lt"
   ```

8. **Share that frontend URL** with your test participants. The first
   time each person visits, localtunnel shows a one-time "friendly
   reminder" interstitial page (proves you're not a bot) - they just
   click **Continue**, then land on the real app.

**Known limitation:** localtunnel's free relay is best-effort and can
occasionally return a timeout or a blank page under load. If a tester
hits this, the fix is just to refresh - it's not an app bug. Worth
mentioning to testers up front so it doesn't derail the session.

**When the testing session is done**, revert all of the above:
- Stop both `lt` processes.
- Set `CORS_ORIGINS` in `backend/.env` back to
  `http://localhost:3000,http://localhost:5173` and restart the backend.
- Set `VITE_API_BASE_URL` in `frontend/.env` back to
  `http://localhost:5000/api` (or remove the line).
- Go back to `npm run dev` for frontend development - `npm run preview`
  only serves whatever was last built and won't reflect new edits.
