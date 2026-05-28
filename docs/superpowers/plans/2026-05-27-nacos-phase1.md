# NACOS-AIFUE SMS Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a full-stack npm-workspace monorepo and implement Phase 1 of the NACOS-AIFUE School Management System — Auth (validate, login, refresh, logout, password-reset) plus Admin user management (create profile, auto-generate NACOS ID, send email).

**Architecture:** `backend/` — Node.js 20 + Express 4 + TypeScript 5 + Prisma 5 + PostgreSQL 15 + Redis 7; `frontend/` — React 18 + Vite 5 + Tailwind CSS 3 + React Router v6. JWT access tokens (15 min, memory) + Redis-backed refresh tokens (7 day, HttpOnly cookie). Admin creates a user profile → system generates `NACOS/PROG/YEAR/SEQ` ID → emails it via Nodemailer.

**Tech Stack:** TypeScript 5, Express 4, Prisma ORM 5, PostgreSQL 15, Redis 7, ioredis, jsonwebtoken, bcryptjs, nodemailer, express-validator, helmet, cors, express-rate-limit, Jest, ts-jest, supertest, jest-mock-extended | React 18, Vite 5, Tailwind CSS 3, React Router v6, Axios, React Hook Form

---

## Task 1 — Root Monorepo Scaffold

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `docker-compose.yml`
- Create: `CLAUDE.md`

### Steps (see executing agent for code — all files fully written)

---

## Task 2 — Backend Project Setup

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/jest.config.ts`
- Create: `backend/src/app.ts`
- Create: `backend/src/server.ts`

---

## Task 3 — Backend Config & Utilities

**Files:**
- Create: `backend/.env.example`
- Create: `backend/src/config/env.ts`
- Create: `backend/src/config/redis.ts`
- Create: `backend/src/config/prisma.ts`
- Create: `backend/src/types/index.ts`
- Create: `backend/src/utils/response.ts`
- Create: `backend/src/utils/jwt.ts`
- Create: `backend/src/utils/id-generator.ts`
- Create: `backend/src/utils/email.ts`

---

## Task 4 — Prisma Schema

**Files:**
- Create: `backend/prisma/schema.prisma` (all 16 tables)

---

## Task 5 — Middleware

**Files:**
- Create: `backend/src/middleware/auth.middleware.ts`
- Create: `backend/src/middleware/error.middleware.ts`
- Create: `backend/src/middleware/rate-limit.middleware.ts`
- Create: `backend/src/middleware/validate.middleware.ts`

---

## Task 6 — Auth Module (TDD)

**Files:**
- Create: `backend/src/modules/auth/auth.validation.ts`
- Create: `backend/src/modules/auth/auth.service.ts`
- Create: `backend/src/modules/auth/auth.controller.ts`
- Create: `backend/src/modules/auth/auth.routes.ts`
- Create: `backend/tests/auth/auth.test.ts`

---

## Task 7 — Admin Module (TDD)

**Files:**
- Create: `backend/src/modules/admin/admin.validation.ts`
- Create: `backend/src/modules/admin/admin.service.ts`
- Create: `backend/src/modules/admin/admin.controller.ts`
- Create: `backend/src/modules/admin/admin.routes.ts`
- Create: `backend/tests/admin/admin.test.ts`

---

## Task 8 — Frontend Project Setup

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.js`
- Create: `frontend/index.html`
- Create: `frontend/.env.example`
- Create: `frontend/src/index.css`

---

## Task 9 — Frontend Core

**Files:**
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/context/AuthContext.tsx`
- Create: `frontend/src/components/ProtectedRoute.tsx`

---

## Task 10 — Frontend Auth Pages

**Files:**
- Create: `frontend/src/pages/auth/LoginPage.tsx`
- Create: `frontend/src/pages/auth/ValidatePage.tsx`
- Create: `frontend/src/pages/auth/ForgotPasswordPage.tsx`
- Create: `frontend/src/pages/auth/ResetPasswordPage.tsx`

---

## Task 11 — Frontend Admin Pages

**Files:**
- Create: `frontend/src/pages/admin/AdminDashboard.tsx`
- Create: `frontend/src/pages/admin/CreateUserPage.tsx`
- Create: `frontend/src/pages/admin/UserListPage.tsx`

---

## Task 12 — Frontend Landing Page

**Files:**
- Create: `frontend/src/pages/LandingPage.tsx`

---

## Task 13 — Final Wiring & Startup Guide

**Files:**
- Modify: `backend/src/app.ts` (mount all routes)
- Create: `README.md`
