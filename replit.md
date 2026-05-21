# Team Task Manager

A full-stack team task management web app with JWT auth, project/task CRUD, and a real-time activity feed.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/task-app run dev` — run the React frontend (port 23220)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env: `MONGODB_URI` — MongoDB Atlas connection string
- Required env: `JWT_SECRET` — secret for signing JWT tokens
- Required env: `SESSION_SECRET` — legacy (unused, can be any string)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + wouter + TanStack Query
- Backend: Express 5
- DB: MongoDB Atlas + Mongoose
- Auth: JWT (jsonwebtoken) + bcrypt password hashing
- Validation: Zod (`zod/v4`)
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/api-client-react/src/generated/` — generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — generated Zod schemas (do not edit)
- `artifacts/api-server/src/models/` — Mongoose models (User, Project, Task, Activity)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/middleware/auth.ts` — JWT auth middleware
- `artifacts/api-server/src/lib/mongodb.ts` — MongoDB connection
- `artifacts/task-app/src/` — React frontend pages and components

## Architecture decisions

- MongoDB Atlas used instead of Replit's built-in PostgreSQL (user requirement)
- JWT stored in localStorage, sent as `Authorization: Bearer <token>` header
- Atlas requires `tlsAllowInvalidCertificates: true` from Replit's sandboxed environment
- No refresh tokens — JWT expires in 7 days
- Activity log is append-only; populated on task/project create, status change, assignment

## Product

- Register/login with JWT auth + bcrypt password hashing
- Dashboard: summary stats (total/completed/in-progress/overdue tasks, completion rate) + recent activity feed
- Projects: create/edit/delete projects with task counts
- Tasks: full CRUD with status (todo/in_progress/in_review/done), priority, assignee, due date, tags
- Team: all registered users visible as potential task assignees
- Protected routes — unauthenticated users redirected to /login

## User preferences

- MongoDB Atlas for database (not Replit PostgreSQL)
- JWT + bcrypt for auth (not Clerk/Replit Auth)

## Gotchas

- MongoDB Atlas Network Access must allow `0.0.0.0/0` for Replit's dynamic IPs
- Always run `pnpm --filter @workspace/api-spec run codegen` after editing `openapi.yaml`
- The `@workspace/db` (Drizzle/PostgreSQL) package is NOT used — backend uses Mongoose directly
- `tlsAllowInvalidCertificates: true` is required in the Mongoose connection options for Atlas from Replit

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
