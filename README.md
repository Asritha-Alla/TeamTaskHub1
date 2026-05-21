# TaskMaster

A full-stack team task management application built with React, Node.js, Express, and MongoDB Atlas.

## Features

- **Authentication** — Register/login with JWT tokens and bcrypt password hashing
- **Projects** — Create and manage projects with role-based access (admin/member)
- **Tasks** — Full CRUD with status, priority, assignee, due date, and tags
- **Team** — Add/remove members, change roles per project
- **Dashboard** — Analytics charts (task status, priority, assignee breakdown) + overdue tasks
- **Dark/Light mode** — System-aware theme toggle
- **Responsive** — Works on mobile, tablet, and desktop

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS v4, shadcn/ui, TanStack Query, wouter |
| Backend | Node.js 24, Express 5, TypeScript 5 |
| Database | MongoDB Atlas + Mongoose |
| Auth | JWT (jsonwebtoken) + bcrypt |
| API Contract | OpenAPI 3.0 → Orval codegen |
| Charts | Recharts |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (free tier works)

### 1. Clone and install

```bash
git clone <repo-url>
cd taskmaster
pnpm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-here
SESSION_SECRET=any-string
```

### 3. Run in development

Start both apps together from the repository root:

```bash
pnpm run dev
```

This launches the API server on [http://localhost:8080](http://localhost:8080) and the React frontend on [http://localhost:3000](http://localhost:3000). If one of those ports is already in use, the launcher automatically falls back to the next free port.

## Building for Production

```bash
# 1. Build the frontend
BASE_PATH=/ PORT=3000 pnpm --filter @workspace/task-app run build

# 2. Build the API server
pnpm --filter @workspace/api-server run build

# 3. Start the server (serves API + frontend on the same port)
PORT=8080 pnpm --filter @workspace/api-server run start
```

The Express server automatically serves the built frontend from `artifacts/task-app/dist/public` in production mode.

## Deploying to Railway

### One-click deploy

1. Push your repo to GitHub
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub Repo**
3. Select your repository
4. Railway auto-detects the `railway.json` config — no manual setup needed
5. Add the required environment variables in the Railway dashboard:

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Random secret string (use `openssl rand -base64 32`) |
| `SESSION_SECRET` | Any string (legacy, unused) |

6. Deploy — Railway runs the build and start commands automatically

### Manual Railway CLI

```bash
npm install -g @railway/cli
railway login
railway link
railway up
```

## Project Structure

```
├── artifacts/
│   ├── api-server/          # Express API server
│   │   └── src/
│   │       ├── models/      # Mongoose models (User, Project, Task, Activity)
│   │       ├── routes/      # Express route handlers
│   │       └── middleware/  # JWT auth middleware
│   └── task-app/            # React frontend
│       └── src/
│           ├── pages/       # Route-level page components
│           └── components/  # Shared UI components
├── lib/
│   ├── api-spec/            # OpenAPI spec (source of truth)
│   ├── api-client-react/    # Generated React Query hooks (do not edit)
│   └── api-zod/             # Generated Zod schemas (do not edit)
└── railway.json             # Railway deployment config
```

## API Reference

The API contract lives in `lib/api-spec/openapi.yaml`. After editing it, regenerate the client:

```bash
pnpm --filter @workspace/api-spec run codegen
```

Key endpoints:

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login and receive JWT |
| `GET` | `/api/auth/me` | Get current user |
| `GET` | `/api/projects` | List user's projects |
| `POST` | `/api/projects` | Create a project |
| `GET` | `/api/tasks` | List tasks |
| `POST` | `/api/tasks` | Create a task |
| `PATCH` | `/api/tasks/:id/status` | Update task status |
| `GET` | `/api/dashboard/analytics` | Dashboard chart data |

## Role-Based Access

Within each project:

| Action | Admin | Member |
|---|---|---|
| Create/edit/delete tasks | ✅ | ❌ |
| Update task status | ✅ | Own tasks only |
| Add/remove members | ✅ | ❌ |
| Change member roles | ✅ | ❌ |
| View all tasks | ✅ | Own tasks only |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `JWT_SECRET` | ✅ | Secret for signing JWT tokens |
| `SESSION_SECRET` | ✅ | Legacy — any string works |
| `PORT` | ✅ (at runtime) | Server port |
| `NODE_ENV` | — | Set to `production` for static file serving |

## Notes

- MongoDB Atlas requires **Network Access** → **Allow from anywhere** (`0.0.0.0/0`) for Replit/Railway IPs
- JWTs are stored in `localStorage` and sent as `Authorization: Bearer <token>`
- JWTs expire after **7 days** — no refresh token flow
- The `@workspace/db` (Drizzle/PostgreSQL) package is **not used** — backend uses Mongoose directly
