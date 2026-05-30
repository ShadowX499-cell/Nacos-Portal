# Admin Notifications, Settings & Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build three missing admin pages — Notifications (inline compose + list), Settings (Department tab + Preferences tab), and Profile (view-only) — completing every active nav link in the admin sidebar.

**Architecture:** Schema migration adds two nullable columns to `Department`. Four new admin notification endpoints live in a new `notifications-admin.*` module. Two settings endpoints extend the existing `admin.*` module. All three frontend pages follow the established pattern (Tailwind + Lucide + motion/react). Admin Profile reuses the existing `profileApi.getMe()` — zero backend changes needed for it.

**Tech Stack:** React 18, TypeScript 5, Tailwind CSS 3, Lucide React, motion/react (frontend); Express 4, Prisma 5, express-validator (backend)

---

## File Map

| File | Action |
|---|---|
| `backend/prisma/schema.prisma` | Add `currentSession String?` + `currentSemester Semester?` to `Department` |
| `backend/prisma/migrations/` | New migration: `add_department_session_fields` |
| `backend/src/modules/notifications/notifications-admin.validation.ts` | **Create** |
| `backend/src/modules/notifications/notifications-admin.service.ts` | **Create** |
| `backend/src/modules/notifications/notifications-admin.controller.ts` | **Create** |
| `backend/src/modules/admin/admin.routes.ts` | Add 6 routes (4 notification + 2 settings) |
| `backend/src/modules/admin/admin.service.ts` | Add `getDepartmentSettings` + `updateDepartmentSettings` |
| `backend/src/modules/admin/admin.controller.ts` | Add `getDepartmentSettings` + `updateDepartmentSettings` handlers |
| `frontend/src/types/index.ts` | Append `AdminNotification` + `DepartmentSettings` types |
| `frontend/src/api/client.ts` | Append `adminNotificationsApi` + `adminSettingsApi` |
| `frontend/src/pages/admin/AdminProfilePage.tsx` | **Create** |
| `frontend/src/pages/admin/AdminNotificationsPage.tsx` | **Create** |
| `frontend/src/pages/admin/AdminSettingsPage.tsx` | **Create** |
| `frontend/src/components/AdminLayout.tsx` | Wrap sidebar footer avatar+name in `<Link to="/admin/profile">` |
| `frontend/src/App.tsx` | Add 2 new routes + connect `/admin/notifications` + `/admin/settings` |

---

## Task 1: Schema migration — Department session fields

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add two fields to the Department model**

In `backend/prisma/schema.prisma`, find the `model Department` block and add after `isActive`:

```prisma
model Department {
  id              String    @id @default(uuid())
  name            String    @db.VarChar(100)
  code            String    @unique @db.VarChar(20)
  faculty         String?   @db.VarChar(100)
  isActive        Boolean   @default(true) @map("is_active")
  currentSession  String?   @map("current_session") @db.VarChar(20)
  currentSemester Semester? @map("current_semester")
  createdAt       DateTime  @default(now()) @map("created_at")

  users              User[]
  gradebooks         Gradebook[]
  elections          Election[]
  attendanceSessions AttendanceSession[]
  notifications      Notification[]

  @@map("departments")
}
```

- [ ] **Step 2: Run migration**

```bash
cd backend && npx prisma migrate dev --name add_department_session_fields
```

Expected: `✔  Your database is now in sync with your schema.`

- [ ] **Step 3: Verify TypeScript regenerated**

```bash
cd backend && npx tsc --noEmit
```

Expected: no output (zero errors).

---

## Task 2: Admin notifications backend

**Files:**
- Create: `backend/src/modules/notifications/notifications-admin.validation.ts`
- Create: `backend/src/modules/notifications/notifications-admin.service.ts`
- Create: `backend/src/modules/notifications/notifications-admin.controller.ts`

- [ ] **Step 1: Create `notifications-admin.validation.ts`**

```typescript
import { body, param, query } from 'express-validator';

export const createNotificationRules = [
  body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Title must be 3–200 characters'),
  body('body').trim().isLength({ min: 10, max: 2000 }).withMessage('Message must be 10–2000 characters'),
  body('type')
    .isIn(['general', 'result', 'election', 'payment', 'system'])
    .withMessage('type must be general, result, election, payment, or system'),
  body('target')
    .isIn(['all', 'level'])
    .withMessage('target must be all or level'),
  body('targetLevel')
    .if(body('target').equals('level'))
    .isIn(['L100', 'L200', 'L300', 'L400'])
    .withMessage('targetLevel must be L100, L200, L300, or L400 when target is level'),
  body('send').isBoolean().withMessage('send must be a boolean'),
];

export const listNotificationsRules = [
  query('status').optional().isIn(['sent', 'draft']).withMessage('status must be sent or draft'),
];

export const notificationIdRule = [param('id').isUUID()];
```

- [ ] **Step 2: Create `notifications-admin.service.ts`**

```typescript
import { PrismaClient, NotificationType, NotificationTarget, Level } from '@prisma/client';
import { prisma as defaultPrisma } from '../../config/prisma';
import { AppError } from '../../utils/response';

export interface AdminNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  target: string;
  targetLevel: string | null;
  isSent: boolean;
  recipientCount: number;
  createdAt: string;
  sentAt: string | null;
}

export interface CreateNotificationDto {
  title: string;
  body: string;
  type: NotificationType;
  target: NotificationTarget;
  targetLevel?: Level;
  send: boolean;
}

export class AdminNotificationsService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async createNotification(
    dto: CreateNotificationDto,
    adminId: string,
    departmentId: string
  ): Promise<AdminNotification> {
    const notification = await this.db.notification.create({
      data: {
        departmentId,
        title: dto.title,
        body: dto.body,
        type: dto.type,
        target: dto.target,
        targetLevel: dto.targetLevel ?? null,
        isSent: dto.send,
        sentAt: dto.send ? new Date() : null,
        createdById: adminId,
      },
    });

    const recipientCount = await this.countRecipients(departmentId, dto.target, dto.targetLevel);
    return this.toPublic(notification, recipientCount);
  }

  async listNotifications(
    departmentId: string,
    status?: 'sent' | 'draft'
  ): Promise<AdminNotification[]> {
    const where: Parameters<typeof this.db.notification.findMany>[0]['where'] = {
      departmentId,
      ...(status === 'sent' ? { isSent: true } : status === 'draft' ? { isSent: false } : {}),
    };

    const notifications = await this.db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      notifications.map(async (n) => {
        const recipientCount = await this.countRecipients(
          departmentId,
          n.target,
          n.targetLevel ?? undefined
        );
        return this.toPublic(n, recipientCount);
      })
    );
  }

  async sendNotification(id: string, departmentId: string): Promise<AdminNotification> {
    const notification = await this.db.notification.findFirst({
      where: { id, departmentId },
    });
    if (!notification) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Notification not found');
    if (notification.isSent) throw new AppError(400, 'ALREADY_SENT', 'Notification already sent');

    const updated = await this.db.notification.update({
      where: { id },
      data: { isSent: true, sentAt: new Date() },
    });

    const recipientCount = await this.countRecipients(
      departmentId,
      updated.target,
      updated.targetLevel ?? undefined
    );
    return this.toPublic(updated, recipientCount);
  }

  async deleteNotification(id: string, departmentId: string): Promise<void> {
    const notification = await this.db.notification.findFirst({
      where: { id, departmentId },
    });
    if (!notification) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Notification not found');
    if (notification.isSent) throw new AppError(400, 'NOTIFICATION_SENT', 'Cannot delete a sent notification');
    await this.db.notification.delete({ where: { id } });
  }

  private async countRecipients(
    departmentId: string,
    target: NotificationTarget,
    targetLevel?: Level
  ): Promise<number> {
    if (target === 'all') {
      return this.db.user.count({ where: { departmentId, role: 'student' } });
    }
    if (target === 'level' && targetLevel) {
      return this.db.user.count({ where: { departmentId, role: 'student', level: targetLevel } });
    }
    return 0;
  }

  private toPublic(
    n: {
      id: string; title: string; body: string; type: NotificationType;
      target: NotificationTarget; targetLevel: Level | null;
      isSent: boolean; sentAt: Date | null; createdAt: Date;
    },
    recipientCount: number
  ): AdminNotification {
    return {
      id: n.id,
      title: n.title,
      body: n.body,
      type: n.type,
      target: n.target,
      targetLevel: n.targetLevel,
      isSent: n.isSent,
      recipientCount,
      createdAt: n.createdAt.toISOString(),
      sentAt: n.sentAt ? n.sentAt.toISOString() : null,
    };
  }
}

export const adminNotificationsService = new AdminNotificationsService();
```

- [ ] **Step 3: Create `notifications-admin.controller.ts`**

```typescript
import { Request, Response } from 'express';
import { adminNotificationsService } from './notifications-admin.service';
import { sendSuccess, asyncHandler } from '../../utils/response';
import { AuthRequest } from '../../types';
import { NotificationType, NotificationTarget, Level } from '@prisma/client';

export const createNotification = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;
  const notification = await adminNotificationsService.createNotification(
    {
      title: req.body.title as string,
      body: req.body.body as string,
      type: req.body.type as NotificationType,
      target: req.body.target as NotificationTarget,
      targetLevel: req.body.targetLevel as Level | undefined,
      send: Boolean(req.body.send),
    },
    sub,
    departmentId
  );
  sendSuccess(res, notification, notification.isSent ? 'Notification sent' : 'Draft saved', 201);
});

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  const status = req.query.status as 'sent' | 'draft' | undefined;
  const notifications = await adminNotificationsService.listNotifications(departmentId, status);
  sendSuccess(res, notifications, 'Notifications retrieved');
});

export const sendNotification = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  const notification = await adminNotificationsService.sendNotification(req.params.id, departmentId);
  sendSuccess(res, notification, 'Notification sent');
});

export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  await adminNotificationsService.deleteNotification(req.params.id, departmentId);
  sendSuccess(res, null, 'Draft deleted');
});
```

- [ ] **Step 4: Typecheck**

```bash
cd backend && npx tsc --noEmit
```

Expected: no output.

---

## Task 3: Admin settings backend

**Files:**
- Modify: `backend/src/modules/admin/admin.service.ts`
- Modify: `backend/src/modules/admin/admin.controller.ts`

- [ ] **Step 1: Add two methods to `AdminService` in `admin.service.ts`**

Add after the `getDashboardStats` method and before the private `toPublic` method:

```typescript
// ── Department settings ──────────────────────────────────────────────────

async getDepartmentSettings(departmentId: string): Promise<{
  id: string;
  name: string;
  code: string;
  faculty: string | null;
  currentSession: string | null;
  currentSemester: string | null;
}> {
  const dept = await this.db.department.findUnique({ where: { id: departmentId } });
  if (!dept) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Department not found');
  return {
    id: dept.id,
    name: dept.name,
    code: dept.code,
    faculty: dept.faculty,
    currentSession: dept.currentSession,
    currentSemester: dept.currentSemester,
  };
}

async updateDepartmentSettings(
  departmentId: string,
  updates: { currentSession?: string; currentSemester?: 'first' | 'second' }
): Promise<{ id: string; name: string; code: string; faculty: string | null; currentSession: string | null; currentSemester: string | null }> {
  const dept = await this.db.department.findUnique({ where: { id: departmentId } });
  if (!dept) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Department not found');

  const updated = await this.db.department.update({
    where: { id: departmentId },
    data: {
      ...(updates.currentSession !== undefined ? { currentSession: updates.currentSession } : {}),
      ...(updates.currentSemester !== undefined ? { currentSemester: updates.currentSemester as import('@prisma/client').Semester } : {}),
    },
  });
  return {
    id: updated.id,
    name: updated.name,
    code: updated.code,
    faculty: updated.faculty,
    currentSession: updated.currentSession,
    currentSemester: updated.currentSemester,
  };
}
```

- [ ] **Step 2: Add two handlers to `admin.controller.ts`**

Append at the end of the file:

```typescript
/** GET /api/v1/admin/settings/department */
export const getDepartmentSettings = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  const settings = await adminService.getDepartmentSettings(departmentId);
  sendSuccess(res, settings, 'Department settings retrieved');
});

/** PATCH /api/v1/admin/settings/department */
export const updateDepartmentSettings = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  const settings = await adminService.updateDepartmentSettings(departmentId, {
    currentSession: req.body.currentSession as string | undefined,
    currentSemester: req.body.currentSemester as 'first' | 'second' | undefined,
  });
  sendSuccess(res, settings, 'Department settings updated');
});
```

- [ ] **Step 3: Typecheck**

```bash
cd backend && npx tsc --noEmit
```

Expected: no output.

---

## Task 4: Wire backend routes

**Files:**
- Modify: `backend/src/modules/admin/admin.routes.ts`

- [ ] **Step 1: Replace `admin.routes.ts` with the updated version**

```typescript
import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { apiRateLimit } from '../../middleware/rate-limit.middleware';
import { createUserRules, listUsersRules, updateUserRules } from './admin.validation';
import {
  getDashboard,
  createUser,
  listUsers,
  getUserById,
  updateUser,
  getDepartmentSettings,
  updateDepartmentSettings,
} from './admin.controller';
import {
  createNotificationRules,
  listNotificationsRules,
  notificationIdRule,
} from '../notifications/notifications-admin.validation';
import {
  createNotification,
  listNotifications,
  sendNotification,
  deleteNotification,
} from '../notifications/notifications-admin.controller';
import { body } from 'express-validator';

const router = Router();

// All admin routes require authentication + admin/super_admin role
router.use(authenticate, requireAdmin, apiRateLimit);

/** GET  /api/v1/admin/dashboard */
router.get('/dashboard', getDashboard);

/** POST /api/v1/admin/users */
router.post('/users', validate(createUserRules), createUser);

/** GET  /api/v1/admin/users */
router.get('/users', validate(listUsersRules), listUsers);

/** GET  /api/v1/admin/users/:id */
router.get('/users/:id', getUserById);

/** PATCH /api/v1/admin/users/:id */
router.patch('/users/:id', validate(updateUserRules), updateUser);

// ── Notifications ─────────────────────────────────────────────────────────────

/** POST /api/v1/admin/notifications */
router.post('/notifications', validate(createNotificationRules), createNotification);

/** GET  /api/v1/admin/notifications */
router.get('/notifications', validate(listNotificationsRules), listNotifications);

/** PATCH /api/v1/admin/notifications/:id/send */
router.patch('/notifications/:id/send', validate(notificationIdRule), sendNotification);

/** DELETE /api/v1/admin/notifications/:id */
router.delete('/notifications/:id', validate(notificationIdRule), deleteNotification);

// ── Settings ──────────────────────────────────────────────────────────────────

/** GET  /api/v1/admin/settings/department */
router.get('/settings/department', getDepartmentSettings);

/** PATCH /api/v1/admin/settings/department */
router.patch(
  '/settings/department',
  validate([
    body('currentSession')
      .optional()
      .matches(/^\d{4}\/\d{4}$/)
      .withMessage('currentSession must be in format YYYY/YYYY'),
    body('currentSemester')
      .optional()
      .isIn(['first', 'second'])
      .withMessage('currentSemester must be first or second'),
  ]),
  updateDepartmentSettings
);

export default router;
```

- [ ] **Step 2: Full backend typecheck + commit**

```bash
cd backend && npx tsc --noEmit
```

Expected: no output.

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations \
        backend/src/modules/notifications/notifications-admin.validation.ts \
        backend/src/modules/notifications/notifications-admin.service.ts \
        backend/src/modules/notifications/notifications-admin.controller.ts \
        backend/src/modules/admin/admin.routes.ts \
        backend/src/modules/admin/admin.service.ts \
        backend/src/modules/admin/admin.controller.ts
git commit -m "feat: admin notifications + settings backend — CRUD, send, dept settings"
```

---

## Task 5: Frontend types + API client

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/api/client.ts`

- [ ] **Step 1: Append types to `frontend/src/types/index.ts`**

```typescript
// ── Admin Notifications ───────────────────────────────────────────────────────

export interface AdminNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  target: string;
  targetLevel: string | null;
  isSent: boolean;
  recipientCount: number;
  createdAt: string;
  sentAt: string | null;
}

export interface CreateAdminNotificationForm {
  title: string;
  body: string;
  type: 'general' | 'result' | 'election' | 'payment' | 'system';
  target: 'all' | 'level';
  targetLevel?: string;
  send: boolean;
}

// ── Department Settings ───────────────────────────────────────────────────────

export interface DepartmentSettings {
  id: string;
  name: string;
  code: string;
  faculty: string | null;
  currentSession: string | null;
  currentSemester: string | null;
}
```

- [ ] **Step 2: Append API objects to `frontend/src/api/client.ts`**

```typescript
// ── Admin Notifications API ───────────────────────────────────────────────────

export const adminNotificationsApi = {
  list: (status?: 'sent' | 'draft') =>
    api.get<{ success: true; data: import('../types').AdminNotification[] }>(
      '/admin/notifications',
      { params: status ? { status } : {} }
    ),

  create: (body: import('../types').CreateAdminNotificationForm) =>
    api.post<{ success: true; data: import('../types').AdminNotification }>(
      '/admin/notifications',
      body
    ),

  send: (id: string) =>
    api.patch<{ success: true; data: import('../types').AdminNotification }>(
      `/admin/notifications/${id}/send`
    ),

  delete: (id: string) =>
    api.delete(`/admin/notifications/${id}`),
};

// ── Admin Settings API ────────────────────────────────────────────────────────

export const adminSettingsApi = {
  getDepartment: () =>
    api.get<{ success: true; data: import('../types').DepartmentSettings }>(
      '/admin/settings/department'
    ),

  updateDepartment: (body: { currentSession?: string; currentSemester?: string }) =>
    api.patch<{ success: true; data: import('../types').DepartmentSettings }>(
      '/admin/settings/department',
      body
    ),
};
```

- [ ] **Step 3: Frontend typecheck**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no output.

---

## Task 6: AdminProfilePage

**Files:**
- Create: `frontend/src/pages/admin/AdminProfilePage.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { profileApi, extractApiError } from '../../api/client';
import type { User } from '../../types';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  super_admin: 'Super Administrator',
};

const PROGRAM_LABELS: Record<string, string> = {
  CSC: 'Computer Science',
  ICT: 'Information Technology',
  CRE: 'Computer & Robotics Engineering',
};

export default function AdminProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    profileApi.getMe()
      .then((r) => setUser(r.data.data))
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-64">
      <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-700 animate-spin" />
    </div>
  );

  if (error || !user) return (
    <div className="p-6 text-center text-red-600">{error || 'Profile not found'}</div>
  );

  const initials = user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
        {/* Avatar + name */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-md">
            {initials}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
            <p className="text-sm text-gray-500 font-mono">{user.userId}</p>
            <span className="inline-block mt-1 bg-brand-100 text-brand-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          </div>
        </div>

        {/* Info rows */}
        <div className="space-y-4">
          <InfoRow label="Full Name" value={user.name} />
          <InfoRow label="Admin ID" value={user.userId} mono />
          <InfoRow label="Email Address" value={user.email} />
          {user.phone && <InfoRow label="Phone Number" value={user.phone} />}
          <InfoRow label="Role" value={ROLE_LABELS[user.role] ?? user.role} />
        </div>
      </div>

      {/* Account card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Account</h3>
        <Link to="/auth/forgot-password" className="text-sm text-brand-700 font-semibold hover:underline">
          Change Password →
        </Link>
        <p className="text-xs text-gray-400 mt-1">You'll be redirected to the password reset flow.</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-gray-500 w-32 flex-shrink-0">{label}</span>
      <span className={`text-sm font-medium text-gray-900 text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no output.

---

## Task 7: AdminNotificationsPage

**Files:**
- Create: `frontend/src/pages/admin/AdminNotificationsPage.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { useEffect, useState, useCallback } from 'react';
import { adminNotificationsApi, extractApiError } from '../../api/client';
import type { AdminNotification, CreateAdminNotificationForm } from '../../types';
import { Bell, Plus, Send, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const TYPE_EMOJIS: Record<string, string> = {
  general: '📣', result: '📋', election: '🗳️', payment: '💳', system: '⚙️',
};

const TARGET_LABELS: Record<string, string> = {
  all: 'All students', level: 'Level target',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const EMPTY_FORM: CreateAdminNotificationForm = {
  title: '', body: '', type: 'general', target: 'all', send: false,
};

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'sent' | 'draft'>('sent');
  const [composing, setComposing] = useState(false);
  const [form, setForm] = useState<CreateAdminNotificationForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(() => {
    adminNotificationsApi.list()
      .then((r) => setNotifications(r.data.data))
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (send: boolean) => {
    if (!form.title.trim() || !form.body.trim()) {
      setFormError('Title and message are required.');
      return;
    }
    if (form.target === 'level' && !form.targetLevel) {
      setFormError('Select a level when targeting by level.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await adminNotificationsApi.create({ ...form, send });
      setForm(EMPTY_FORM);
      setComposing(false);
      setTab(send ? 'sent' : 'draft');
      load();
    } catch (err) {
      setFormError(extractApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendDraft = async (id: string) => {
    try {
      await adminNotificationsApi.send(id);
      setTab('sent');
      load();
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this draft?')) return;
    try {
      await adminNotificationsApi.delete(id);
      load();
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  const sent = notifications.filter((n) => n.isSent);
  const drafts = notifications.filter((n) => !n.isSent);
  const visible = tab === 'sent' ? sent : drafts;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">Send announcements to students</p>
        </div>
        <button
          onClick={() => { setComposing((c) => !c); setFormError(''); }}
          className="flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          {composing ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {composing ? 'Cancel' : 'New Notification'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm mb-4">{error}</div>
      )}

      {/* Compose panel */}
      <AnimatePresence>
        {composing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-5"
          >
            <div className="bg-brand-50 border border-brand-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 flex items-center gap-2"
                style={{ background: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)' }}>
                <Bell className="w-4 h-4 text-brand-300" />
                <p className="text-white font-bold text-sm">Compose Notification</p>
              </div>

              <div className="p-5 space-y-4">
                {formError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-xs">{formError}</div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-brand-900 mb-1">Title *</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. NACOS Week — Important Announcement"
                    className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-900 mb-1">Message *</label>
                  <textarea
                    value={form.body}
                    onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                    rows={4}
                    placeholder="Write your announcement here…"
                    className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-brand-900 mb-1">Type</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CreateAdminNotificationForm['type'] }))}
                      className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="general">📣 General</option>
                      <option value="result">📋 Result</option>
                      <option value="election">🗳️ Election</option>
                      <option value="payment">💳 Payment</option>
                      <option value="system">⚙️ System</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-brand-900 mb-1">Target Audience</label>
                    <select
                      value={form.target}
                      onChange={(e) => setForm((f) => ({ ...f, target: e.target.value as 'all' | 'level', targetLevel: undefined }))}
                      className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="all">All Students</option>
                      <option value="level">By Level</option>
                    </select>
                  </div>
                </div>

                {form.target === 'level' && (
                  <div>
                    <label className="block text-xs font-semibold text-brand-900 mb-1">Select Level *</label>
                    <select
                      value={form.targetLevel ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, targetLevel: e.target.value }))}
                      className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">Choose level…</option>
                      <option value="L100">100 Level</option>
                      <option value="L200">200 Level</option>
                      <option value="L300">300 Level</option>
                      <option value="L400">400 Level</option>
                    </select>
                  </div>
                )}

                <div className="flex gap-3 justify-end pt-1">
                  <button
                    onClick={() => void handleSubmit(false)}
                    disabled={submitting}
                    className="border border-brand-300 text-brand-800 font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-brand-100 transition-colors disabled:opacity-60"
                  >
                    Save Draft
                  </button>
                  <button
                    onClick={() => void handleSubmit(true)}
                    disabled={submitting}
                    className="flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {submitting ? 'Sending…' : 'Send Now'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        {(['sent', 'draft'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t ? 'border-b-2 border-brand-700 text-brand-800' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t === 'sent' ? 'Sent' : 'Drafts'}
            <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              t === 'sent' ? 'bg-brand-100 text-brand-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {t === 'sent' ? sent.length : drafts.length}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-700 animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="py-12 text-center">
            <Bell className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-600">
              {tab === 'sent' ? 'No sent notifications yet' : 'No drafts saved'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {tab === 'sent' ? 'Compose and send your first announcement.' : 'Save a draft to see it here.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {visible.map((n) => (
              <div key={n.id} className="flex items-start gap-3 px-5 py-4">
                <span className="text-xl flex-shrink-0 mt-0.5">{TYPE_EMOJIS[n.type] ?? '📣'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{n.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {timeAgo(n.createdAt)} · {n.targetLevel ? `Level ${n.targetLevel.replace('L', '')}` : TARGET_LABELS[n.target]} · {n.recipientCount} recipients
                  </p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">{n.body}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {n.isSent ? (
                    <span className="text-[10px] font-bold bg-brand-100 text-brand-700 px-2.5 py-1 rounded-full">Sent</span>
                  ) : (
                    <>
                      <button
                        onClick={() => void handleSendDraft(n.id)}
                        className="flex items-center gap-1 text-xs font-bold text-brand-700 border border-brand-200 hover:bg-brand-50 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <Send className="w-3 h-3" /> Send
                      </button>
                      <button
                        onClick={() => void handleDelete(n.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no output.

---

## Task 8: AdminSettingsPage

**Files:**
- Create: `frontend/src/pages/admin/AdminSettingsPage.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { useEffect, useState } from 'react';
import { adminSettingsApi, extractApiError } from '../../api/client';
import type { DepartmentSettings } from '../../types';

type Tab = 'department' | 'preferences';

const PREF_KEY = 'nacos_admin_prefs';

interface Prefs {
  emailOnRegistration: boolean;
  emailOnPayment: boolean;
  emailOnNomination: boolean;
  emailOnGrade: boolean;
}

const DEFAULT_PREFS: Prefs = {
  emailOnRegistration: true,
  emailOnPayment: false,
  emailOnNomination: true,
  emailOnGrade: false,
};

function loadPrefs(): Prefs {
  try {
    const stored = localStorage.getItem(PREF_KEY);
    return stored ? { ...DEFAULT_PREFS, ...(JSON.parse(stored) as Partial<Prefs>) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
        checked ? 'bg-brand-700' : 'bg-gray-200'
      }`}
    >
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
        checked ? 'left-5' : 'left-0.5'
      }`} />
    </button>
  );
}

export default function AdminSettingsPage() {
  const [tab, setTab] = useState<Tab>('department');
  const [settings, setSettings] = useState<DepartmentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [session, setSession] = useState('');
  const [semester, setSemester] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);

  useEffect(() => {
    adminSettingsApi.getDepartment()
      .then((r) => {
        setSettings(r.data.data);
        setSession(r.data.data.currentSession ?? '');
        setSemester(r.data.data.currentSemester ?? '');
      })
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const updated = await adminSettingsApi.updateDepartment({
        ...(session ? { currentSession: session } : {}),
        ...(semester ? { currentSemester: semester } : {}),
      });
      setSettings(updated.data.data);
      setSaveMsg('Settings saved.');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) {
      setSaveMsg(extractApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const togglePref = (key: keyof Prefs) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(PREF_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {(['department', 'preferences'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t ? 'border-b-2 border-brand-700 text-brand-800' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t === 'department' ? 'Department' : 'Preferences'}
          </button>
        ))}
      </div>

      {/* Department tab */}
      {tab === 'department' && (
        <div className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">{error}</div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-700 animate-spin" />
            </div>
          ) : settings ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Department Info</p>
                <div className="space-y-3">
                  <InfoRow label="Department Name" value={settings.name} />
                  <InfoRow label="Code" value={settings.code} mono />
                  <InfoRow label="Faculty" value={settings.faculty ?? '—'} />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Academic Session</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Current Session</label>
                    <input
                      value={session}
                      onChange={(e) => setSession(e.target.value)}
                      placeholder="e.g. 2024/2025"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Format: YYYY/YYYY</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Semester</label>
                    <select
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">Not set</option>
                      <option value="first">First Semester</option>
                      <option value="second">Second Semester</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                {saveMsg && (
                  <p className={`text-xs font-semibold ${saveMsg === 'Settings saved.' ? 'text-brand-700' : 'text-red-600'}`}>
                    {saveMsg}
                  </p>
                )}
                <div className="ml-auto">
                  <button
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className="bg-brand-700 hover:bg-brand-800 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Preferences tab */}
      {tab === 'preferences' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Notification Emails</p>
            <p className="text-xs text-gray-400 mt-0.5">Receive email alerts for these events (email delivery is Phase 3 — stored for future use).</p>
          </div>
          <div className="divide-y divide-gray-50">
            {(
              [
                { key: 'emailOnRegistration', label: 'New student registration', desc: 'When a new student account is created' },
                { key: 'emailOnPayment', label: 'Payment received', desc: 'When a student completes a payment' },
                { key: 'emailOnNomination', label: 'New election nomination', desc: 'When a student submits a candidacy' },
                { key: 'emailOnGrade', label: 'Grade published', desc: 'When a gradebook is published' },
              ] as { key: keyof Prefs; label: string; desc: string }[]
            ).map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between px-6 py-4 gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>
                <Toggle checked={prefs[key]} onChange={() => togglePref(key)} />
              </div>
            ))}
          </div>
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
            <p className="text-[10px] text-gray-400">Preferences are saved to this browser only.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-gray-500 w-36 flex-shrink-0">{label}</span>
      <span className={`text-sm font-medium text-gray-900 text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no output.

---

## Task 9: Wire routes + AdminLayout + final commit

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/AdminLayout.tsx`

- [ ] **Step 1: Add imports and routes to `App.tsx`**

Add three imports after the existing admin page imports:

```typescript
import AdminProfilePage from './pages/admin/AdminProfilePage';
import AdminNotificationsPage from './pages/admin/AdminNotificationsPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
```

Add three routes inside the `<Route element={<AdminLayout />}>` block (after the elections routes):

```tsx
<Route path="/admin/profile"        element={<AdminProfilePage />} />
<Route path="/admin/notifications"  element={<AdminNotificationsPage />} />
<Route path="/admin/settings"       element={<AdminSettingsPage />} />
```

- [ ] **Step 2: Wrap sidebar footer in `AdminLayout.tsx`**

In `frontend/src/components/AdminLayout.tsx`, add `Link` to the imports at the top:

The `NavLink` import already comes from `react-router-dom` — add `Link` to that same import:

```typescript
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
```

Then find the sidebar footer block (the `div` containing the avatar initials and admin name) and wrap just the avatar+name `div` in a `<Link>`:

Replace:
```tsx
<div className="flex items-center gap-2 px-2 py-2 rounded-xl bg-white/5 mb-1">
  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-md">
    {initials}
  </div>
  <div className="min-w-0">
    <p className="text-white text-sm font-semibold truncate">{user?.name || 'Admin'}</p>
    <p className="text-white/50 text-xs truncate">{user?.userId}</p>
  </div>
</div>
```

With:
```tsx
<Link to="/admin/profile" onClick={() => setSidebarOpen(false)}
  className="flex items-center gap-2 px-2 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors mb-1">
  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-md">
    {initials}
  </div>
  <div className="min-w-0">
    <p className="text-white text-sm font-semibold truncate">{user?.name || 'Admin'}</p>
    <p className="text-white/50 text-xs truncate">{user?.userId}</p>
  </div>
</Link>
```

- [ ] **Step 3: Full typecheck (both)**

```bash
cd frontend && npx tsc --noEmit && cd ../backend && npx tsc --noEmit
```

Expected: no output from either.

- [ ] **Step 4: Commit frontend**

```bash
git add frontend/src/types/index.ts \
        frontend/src/api/client.ts \
        frontend/src/pages/admin/AdminProfilePage.tsx \
        frontend/src/pages/admin/AdminNotificationsPage.tsx \
        frontend/src/pages/admin/AdminSettingsPage.tsx \
        frontend/src/components/AdminLayout.tsx \
        frontend/src/App.tsx
git commit -m "feat: admin profile, notifications composer, and settings pages"
```

---

## Self-Review

**Spec coverage:**
- ✅ Admin Profile: `AdminProfilePage` reads via `profileApi.getMe()`, no backend changes, avatar link in `AdminLayout`
- ✅ Admin Notifications: 4 endpoints (POST/GET/PATCH send/DELETE), inline compose with AnimatePresence, Sent/Drafts tabs, Send/Delete on drafts
- ✅ Target `all` and `level` (individual deferred per spec) — validation enforces this
- ✅ Admin Settings Department tab: GET + PATCH endpoints, `currentSession`/`currentSemester` editable, name/code/faculty read-only
- ✅ Admin Settings Preferences tab: 4 toggles, `localStorage` under `nacos_admin_prefs`, no backend
- ✅ Schema migration: `currentSession String?` + `currentSemester Semester?` on `Department`
- ✅ `AdminLayout` sidebar footer wrapped in `<Link to="/admin/profile">`
- ✅ Routes registered in `App.tsx`

**Placeholder scan:** No TBDs or TODOs. All code blocks are complete.

**Type consistency:**
- `AdminNotification` defined in Task 5 types → used in Task 7 page ✓
- `CreateAdminNotificationForm` defined in Task 5 types → used in Task 7 compose form ✓
- `DepartmentSettings` defined in Task 5 types → used in Task 8 settings page ✓
- `adminNotificationsApi.create(body)` — body is `CreateAdminNotificationForm` with `send: boolean` → matches backend `CreateNotificationDto` ✓
- `adminSettingsApi.updateDepartment` sends `currentSession`/`currentSemester` strings → backend accepts and casts `currentSemester` to `Semester` enum ✓
- `notifications-admin.service.ts` uses `NotificationType`, `NotificationTarget`, `Level` from `@prisma/client` — all exist in schema ✓
