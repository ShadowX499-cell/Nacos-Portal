# NACOS-AIFUE School Management System

Full-stack web portal for the Computer Science Department of Aifue University.

## Prerequisites

- **Node.js** 20+
- **Docker Desktop** (for PostgreSQL + Redis)
- **npm** 9+

---

## 🚀 Quick Start — Development

### Step 1 — Install root tooling

```bash
cd nacos-portal
npm install
```

### Step 2 — Start PostgreSQL + Redis via Docker

```bash
npm run docker:up
```

Verify they're running:

```bash
docker ps
# Should show: nacos_postgres (5432) and nacos_redis (6379)
```

### Step 3 — Configure the backend

```bash
cd backend
copy .env.example .env
```

Edit `backend/.env` and set at minimum:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql://nacos_user:nacos_pass@localhost:5432/nacos_db` |
| `REDIS_URL` | `redis://localhost:6379` |
| `JWT_SECRET` | Any 32+ char random string |
| `SMTP_HOST/USER/PASS` | Mailtrap creds (free at mailtrap.io) |

Generate a JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 4 — Run Prisma migrations and seed

```bash
# Still inside backend/
npx prisma migrate dev --name init
npx prisma db seed
```

Expected output:
```
✅ PostgreSQL migrated
✅ Department: Computer Science (CSC)
✅ Super admin: admin@nacos-aifue.edu.ng (password: Admin@12345)
```

### Step 5 — Start the backend

```bash
npm run dev
# → Server running on http://localhost:5000
```

### Step 6 — Configure and start the frontend

```bash
cd ../frontend
copy .env.example .env
npm install
npm run dev
# → App running on http://localhost:3000
```

---

## 🧪 Running Tests

```bash
cd backend
npm test
# or with coverage:
npm run test:coverage
```

All tests are unit tests — no database or Redis required (mocked).

---

## 📁 Project Structure

```
nacos-portal/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Full 16-table schema
│   │   └── seed.ts             # Default department + super-admin
│   └── src/
│       ├── app.ts              # Express app with all middleware
│       ├── server.ts           # Entry point
│       ├── config/             # env, redis, prisma singletons
│       ├── middleware/         # auth, error, rate-limit, validate
│       ├── modules/
│       │   ├── auth/           # validate, login, refresh, logout, reset
│       │   └── admin/          # create/list/get/update users
│       └── utils/              # jwt, email, id-generator, response
├── frontend/
│   └── src/
│       ├── App.tsx             # Route definitions
│       ├── context/            # AuthContext
│       ├── api/client.ts       # Axios + auto-refresh interceptor
│       ├── pages/
│       │   ├── LandingPage.tsx
│       │   ├── auth/           # Login, Validate, ForgotPw, ResetPw
│       │   └── admin/          # Dashboard, CreateUser, UserList
│       └── types/              # Shared TypeScript types
├── docker-compose.yml
├── CLAUDE.md                   # Architecture & conventions
└── README.md
```

---

## 🔑 Default Credentials (after seed)

| Field | Value |
|-------|-------|
| User ID | `NACOS/ADMIN/2024/001` |
| Password | `Admin@12345` |

**⚠️ Change the password immediately after first login!**

---

## 📡 Key API Endpoints (Phase 1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/validate` | Activate student account |
| `POST` | `/api/v1/auth/login` | Login |
| `POST` | `/api/v1/auth/refresh` | Refresh access token |
| `POST` | `/api/v1/auth/logout` | Logout |
| `POST` | `/api/v1/auth/forgot-password` | Send reset email |
| `POST` | `/api/v1/auth/reset-password` | Reset password |
| `GET`  | `/api/v1/admin/dashboard` | Summary stats (admin) |
| `POST` | `/api/v1/admin/users` | Create student profile |
| `GET`  | `/api/v1/admin/users` | List students (filterable) |
| `GET`  | `/api/v1/admin/users/:id` | Get student profile |
| `PATCH`| `/api/v1/admin/users/:id` | Update student profile |

---

## 🛡️ Security Notes

- Access tokens expire in **15 minutes**
- Refresh tokens expire in **7 days** (stored in Redis, sent as HttpOnly cookie)
- Password reset tokens expire in **30 minutes** (one-time use)
- Account locked for **30 minutes** after 5 failed login attempts
- All auth endpoints rate-limited: **5 requests / 15 minutes** per IP
- Biometric templates encrypted at rest (AES-256) — Phase 4

---

## 🗺️ Roadmap

| Phase | Features | Status |
|-------|----------|--------|
| 1 | Auth + Admin User Management + Landing Page | ✅ Complete |
| 2 | Gradebooks, Grade Entry, Result Publication, PDF Slips | 🔜 Next |
| 3 | Elections, Voting, NACOS Dues, Notifications | 🔜 |
| 4 | Biometric Attendance (Electron Desktop) | 🔜 |
| 5 | Analytics, Multi-Admin Roles, PWA | 🔜 |
