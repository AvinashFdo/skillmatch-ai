# SkillMatch AI — Frontend (React + Vite)

React app for CV upload, role-fit results, and roadmap display. Talks
only to the Node/Express backend (`http://localhost:5000/api`) — never
directly to the Python AI service.

## Setup

```bash
cd frontend
npm install
```

## Running

Start the AI service and backend first (see their READMEs), then:

```bash
npm run dev
```

Opens at `http://localhost:5173`.

## Pages

| Route         | Access    | Description                                          |
|---------------|-----------|-------------------------------------------------------|
| `/register`   | Public    | Name/email/password form -> `POST /api/auth/register` |
| `/login`      | Public    | Email/password form -> `POST /api/auth/login`, stores JWT |
| `/dashboard`  | Protected | CV textarea + Analyze button + results display        |

Unauthenticated visits to `/dashboard` redirect to `/login`.

## Auth

`AuthContext` (`src/context/AuthContext.jsx`) holds the JWT and user
object, persisted to `localStorage` so a page refresh doesn't log the
student out mid-demo. If a protected API call returns `401` (e.g. an
expired token), the dashboard logs the user out and redirects to
`/login`.

## Project structure

```
frontend/
  src/
    api/client.js              # axios instance, base URL http://localhost:5000/api
    context/AuthContext.jsx     # auth state + register/login/logout
    components/
      ProtectedRoute.jsx         # redirects to /login if not authenticated
      AnalysisResults.jsx        # renders extracted skills, role-fit bars, roadmap
    pages/
      RegisterPage.jsx
      LoginPage.jsx
      DashboardPage.jsx
    App.jsx                     # routes
    main.jsx
    index.css                   # all app styling
```

## Manual test flow

1. Go to `/register`, create an account.
2. Log in at `/login`.
3. On `/dashboard`, paste CV text (e.g. `ai-service/data/sample_cv_1.txt`)
   into the textarea and click **Analyze**.
4. Confirm extracted skills, role-fit bars (sorted best-first), and the
   top role's roadmap (learning order, resources, projects) all render.
