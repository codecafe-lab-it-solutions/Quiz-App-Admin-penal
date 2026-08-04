# Quiz & Attendance Management System

A Next.js (App Router) + MySQL + Prisma application providing a full Admin Panel and the complete
Authentication / Admin / Faculty / Student REST API surface for a quiz-based attendance system.
Faculty and Student web/mobile clients are out of scope for this pass — only their APIs are built.

## Tech stack

- Next.js 14 (App Router) + TypeScript
- MySQL via Prisma ORM
- JWT auth (access + refresh) with custom middleware — no NextAuth
- Tailwind CSS + shadcn/ui-style components
- Zod for request and form validation
- SheetJS (`xlsx`) for bulk upload parsing and Excel export
- `jspdf` + `jspdf-autotable` for PDF export
- Recharts-ready dashboard (KPI cards, live tracking board)
- bcryptjs for password hashing

## Getting started

```bash
npm install
cp .env.example .env      # then edit DATABASE_URL and JWT secrets
npx prisma migrate dev    # creates the MySQL schema
npx prisma db seed        # creates the super-admin login
npm run dev
```

The app runs at `http://localhost:3000`. The admin panel is at `/login` → `/admin/dashboard`.

### Seed admin login

`prisma/seed.ts` creates one super-admin account using `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
from your `.env` (defaults to `admin@example.com` / `ChangeMe123!` if unset). Change the password
after first login — there's no self-service reset flow in this pass, use Settings → Admin Users,
or another super-admin account, to rotate it.

## Environment variables

See `.env.example`:

- `DATABASE_URL` — MySQL connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — sign/verify secrets, use long random values in production
- `JWT_ACCESS_EXPIRY` / `JWT_REFRESH_EXPIRY` — token lifetimes (default 15m / 7d)
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — used only by the seed script
- `NEXT_PUBLIC_APP_URL` — base URL, reserved for future use in generated report links

## Project layout

```
prisma/               schema.prisma, seed.ts
src/app/(auth)/login   Single login page (admin-only redirect for now)
src/app/admin/         Admin panel screens (dashboard, faculty, students, mapping,
                        master-data, reports, settings)
src/app/api/auth/      Login/refresh/logout for admin, faculty, student
src/app/api/admin/     Admin REST API (CRUD, bulk upload, mapping, reports)
src/app/api/faculty/   Faculty REST API (quiz lifecycle, questions, allotment, results)
src/app/api/student/   Student REST API (quiz discovery, geofence, attempt, anti-cheat, results)
src/components/ui/     shadcn-style primitives (button, dialog, table, select, ...)
src/components/admin/  Admin-panel-specific composites (DataTable, BulkUploadPanel, MapPicker, ...)
src/lib/                db client, auth/JWT helpers, geofence math, excel/pdf builders,
                        zod validators, standard API response wrapper
src/middleware.ts       Edge-safe JWT verification gating /admin/*, /api/admin/*, /api/faculty/*,
                        /api/student/*
postman_collection.json Importable Postman collection covering every endpoint below
```

## Authentication model

- Access tokens (15m) and refresh tokens (7d) are signed JWTs carrying `{ sub, role, email, name }`
  (`adminRole` too for admins). Passwords are hashed with bcrypt (cost 10).
- On login, the refresh token is also stored **hashed** against the account row so `logout` can
  invalidate it and `refresh` can verify the presented token still matches the latest issued one.
- Login/refresh responses return both tokens in the JSON body (for mobile/API clients that attach
  `Authorization: Bearer <token>`) **and** set them as httpOnly cookies (so the web admin panel
  works via `credentials: 'include'` without manual token plumbing). Either channel is accepted by
  every protected route.
- `middleware.ts` runs on the Edge runtime (via `jose`, since `jsonwebtoken` needs Node crypto) and
  gates `/admin/*` pages plus `/api/admin/*`, `/api/faculty/*`, `/api/student/*` routes by role
  prefix, redirecting unauthenticated page requests to `/login` and returning 401/403 JSON for API
  requests. Every API route additionally re-verifies the token itself via `lib/auth.ts` — the
  middleware check is defense-in-depth, not the only enforcement layer.

## Business rules implemented

1. **Geofencing** — `lib/geofence.ts` computes haversine distance. `geofence-check` logs every
   check to `geofence_logs`. `start-attempt` **independently re-verifies** distance server-side
   (never trusts a prior client-reported "within range" result) and rejects if outside the
   building's `radiusMeters`.
2. **Randomized question order** — persisted once per attempt as a JSON array on
   `quiz_attempts.questionOrder` at `start-attempt` time, so refetching `GET
   /api/student/attempt/:id/questions` always returns the same order for that attempt.
3. **Anti-cheat** — `anti-cheat-event` logs the violation to `anti_cheat_events` and responds with
   an explicit `{ action: "force_submit", autoSubmitReason }` instruction; the client is expected
   to immediately call `submit` with `autoSubmitted: true`.
4. **Scoring** — computed at `submit` time: MCQ compares `selectedOptionId` against the option
   flagged `isCorrect`; formula compares `|answerValue - correctValue| <= tolerance`. Negative
   marking applies `negativeMarks` only when the quiz has it enabled and the answer was attempted
   and wrong; skipped/unanswered questions always score 0. `declare-result` aggregates the
   already-scored `student_answers` into `results`; `publish-result` flips `declared → published`.
5. **Attendance auto-marking** — `submit` upserts an `attendance` row as `present` for that
   student/course/quiz/date. `stop` (when a faculty ends a live quiz) backfills `absent` rows for
   every allotted student who never started an attempt.

## Design decisions / assumptions (not fully specified in the brief)

- **IDs**: auto-incrementing integers throughout, for simplicity and readable Postman variables.
- **Soft delete for people**: Faculty/Student `DELETE` deactivates (`status: inactive`) instead of
  hard-deleting, since quizzes/attempts/attendance hold FKs to them. Admin Users and master data
  (departments/courses/sessions/sections/buildings) are hard-deleted since nothing depends on an
  empty one; Prisma will surface a 409/400 if you try to delete a referenced row.
- **Dashboard summary endpoint**: added `GET /api/admin/dashboard/summary` (not explicitly listed
  in the spec) to serve the four KPI cards efficiently via aggregate queries instead of pulling
  full paginated lists client-side.
- **Faculty quiz creation is scoped** to course/section pairs the faculty is actually mapped to
  (via `faculty_course_section_map`), returning 403 otherwise.
- **Building geofence picker**: no external maps/tiles provider is wired in (would need an API key
  and outbound network access); `MapPicker` is a self-contained SVG lat/long + draggable-radius
  widget as allowed by the brief ("can be stubbed with an interactive lat/long input").
- **Bulk upload**: unmatched department names, duplicate emails/codes (against DB and within the
  same file) are collected as per-row failures; valid rows are inserted in one transaction. Rows
  without a password get a random one generated server-side (there's no first-login "set password"
  flow yet — an admin can reset it from the edit screen).

## API documentation

Import `postman_collection.json` into Postman. It covers every endpoint in the brief (Auth, Admin,
Faculty, Student) with example bodies and `{{baseUrl}}` / `{{accessToken}}` variables — set
`accessToken` after calling a login request (Postman won't auto-read httpOnly cookies, so for
Postman testing pass the token explicitly as a Bearer header; the collection's collection-level
auth already does this from the `accessToken` variable).

## Scripts

- `npm run dev` — start the dev server
- `npm run build` / `npm start` — production build/serve
- `npm run db:migrate` — `prisma migrate dev`
- `npm run db:seed` — `prisma db seed`
- `npm run db:studio` — Prisma Studio
