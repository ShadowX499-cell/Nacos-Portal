# NACOS-AIFUE School Management System

## Project Overview
Full-stack web platform for the Computer Science Department of Aifue University.
Digitizes student management, academic results, biometric exam attendance, departmental elections, and payments.

## Monorepo Structure
```
nacos-portal/
├── backend/           # Node.js 20 + Express 4 + TypeScript 5 API
│   ├── prisma/        # Prisma schema and migrations
│   ├── src/
│   │   ├── config/    # env, redis, prisma singletons
│   │   ├── middleware/ # auth, error, rate-limit, validate
│   │   ├── modules/   # feature modules (auth, admin, student, grades, …)
│   │   └── utils/     # jwt, email, id-generator, response helpers
│   └── tests/         # Jest unit tests (mocked Prisma + Redis)
├── frontend/          # React 18 + Vite 5 + Tailwind CSS 3
│   └── src/
│       ├── api/       # Axios client with interceptors
│       ├── context/   # AuthContext
│       ├── pages/     # auth/, admin/, student/
│       └── types/     # shared TypeScript interfaces
├── docker-compose.yml # postgres + redis (dev); full stack (prod profile)
└── CLAUDE.md
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript 5, Vite 5, Tailwind CSS 3, React Router v6 |
| Backend | Node.js 20, Express 4, TypeScript 5 |
| ORM | Prisma 5 (PostgreSQL 15) |
| Cache/Sessions | Redis 7, ioredis |
| Auth | JWT (jsonwebtoken) + bcryptjs + Redis refresh tokens |
| Real-time | Socket.io (Phase 3) |
| Email | Nodemailer (SMTP / SendGrid) |
| Payment | Paystack (Phase 3) |
| File Storage | AWS S3 (Phase 2+) |
| Testing | Jest + ts-jest + Supertest (backend); Vitest + RTL (frontend) |

## Module List
| # | Module | Phase | Status |
|---|--------|-------|--------|
| 1 | Auth | 1 | ✅ Implemented |
| 2 | Admin User Management | 1 | ✅ Implemented |
| 3 | Landing Page | 1 | ✅ Implemented |
| 4 | Grade & Results | 2 | Pending |
| 5 | Result Subscription Payment | 2 | Pending |
| 6 | Notification System | 3 | Pending |
| 7 | Elections & Voting | 3 | Pending |
| 8 | NACOS Dues Payment | 3 | Pending |
| 9 | Biometric Attendance | 4 | Pending |
| 10 | Analytics & Multi-Admin | 5 | Pending |

## API Conventions
- **Base URL:** `/api/v1`
- **Auth header:** `Authorization: Bearer <access_token>`
- **Success:** `{ success: true, data: {...}, message: "...", meta?: {...} }`
- **Error:** `{ success: false, error: { code: "...", message: "...", details?: [...] } }`

## Auth Flow
- **Access token:** JWT, 15-min TTL, returned in response body, stored in React state
- **Refresh token:** 64-char random hex, 7-day TTL, stored in Redis at `refresh:<token>`,
  sent/received as `refreshToken` HttpOnly cookie
- **Password reset:** 64-char random hex, 30-min TTL, stored in Redis at `reset:<token>`
- **Logout:** deletes Redis refresh token immediately

## User ID Format
```
NACOS/[PROGRAM]/[YEAR]/[SEQUENCE]
e.g. NACOS/CSC/2024/001  NACOS/ICT/2024/042  NACOS/CRE/2023/007
```

## Grading Scale (default)
| Score | Grade | Points |
|-------|-------|--------|
| 70–100 | A | 5.0 |
| 60–69 | B | 4.0 |
| 50–59 | C | 3.0 |
| 45–49 | D | 2.0 |
| 40–44 | E | 1.0 |
| 0–39 | F | 0.0 |

## Development Setup
```bash
# 1. Start PostgreSQL + Redis
npm run docker:up

# 2. Backend
cd backend
cp .env.example .env          # fill in values
npm install
npx prisma migrate dev --name init
npm run dev                   # http://localhost:5000

# 3. Frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev                   # http://localhost:3000
```

## Running Tests
```bash
cd backend && npm test
cd backend && npm run test:coverage
```

## Key Environment Variables
See `backend/.env.example` and `frontend/.env.example`

## Code Conventions
- TypeScript strict mode throughout
- **Services** contain all business logic; **controllers** only parse HTTP and call services
- Every mutating operation creates an entry in `audit_logs`
- `prisma` is a singleton exported from `src/config/prisma.ts`
- `redis` is a singleton exported from `src/config/redis.ts`
- Error codes match PRD §18 (e.g. `AUTH_INVALID_CREDENTIALS`, `VALIDATION_ERROR`)
- All route handlers wrapped in `asyncHandler` to forward errors to express error middleware
- Rate limiting applied per-route; strictest on auth endpoints (5 req / 15 min)

## Prisma Notes
- Run `npx prisma generate` after any schema change
- Run `npx prisma migrate dev` in development; `npx prisma migrate deploy` in production
- Enums prefixed with capital letter; mapped to lowercase PostgreSQL values with `@map`
- `total` score in `student_grades` is computed at the service layer (not a DB-generated column)
