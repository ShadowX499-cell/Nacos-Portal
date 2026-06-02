# Admin Portal Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add timestamps + activity history page to the admin dashboard, a pending-count badge on the Registrations sidebar item, image upload to the notification composer, full audit log coverage across all admin actions, audit logs visible to all admins, and admin credentials in README.

**Architecture:** Backend gains three new endpoints (pending count, paginated activity feed, notification image upload) and audit `logAudit()` calls in six service files. Frontend gains a new `ActivityLogPage`, a polling hook for the badge, and UI updates to dashboard, sidebar, and notification composer. One Prisma migration adds `imageUrl` to `Notification`.

**Tech Stack:** Node.js 20 / Express 4 / Prisma 5 / TypeScript 5 (backend); React 18 / Vite 5 / Tailwind CSS 3 (frontend); AWS S3 / local fallback (file upload); multer (multipart handling).

---

## Task 1: Prisma — add imageUrl to Notification

**Files:**
- Modify: `backend/prisma/schema.prisma` (Notification model, around line 423)

- [ ] **Step 1: Add the field to schema.prisma**

In the `Notification` model, add `imageUrl` after the `createdById` line (currently line 434):

```prisma
  imageUrl     String?            @map("image_url") @db.VarChar(500)
```

The model should look like:
```prisma
model Notification {
  id           String             @id @default(uuid())
  departmentId String             @map("department_id")
  title        String             @db.VarChar(200)
  body         String
  type         NotificationType
  target       NotificationTarget
  targetLevel  Level?             @map("target_level")
  targetUserId String?            @map("target_user_id")
  isSent       Boolean            @default(false) @map("is_sent")
  sentAt       DateTime?          @map("sent_at")
  createdById  String             @map("created_by")
  imageUrl     String?            @map("image_url") @db.VarChar(500)
  createdAt    DateTime           @default(now()) @map("created_at")
  ...
}
```

- [ ] **Step 2: Create and run the migration**

```bash
cd backend
npx prisma migrate dev --name add_notification_image_url
```

Expected output: `✅  Your database is now in sync with your schema.`

- [ ] **Step 3: Regenerate Prisma client**

```bash
npx prisma generate
```

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(db): add imageUrl to Notification model"
```

---

## Task 2: Backend — registration pending count endpoint

**Files:**
- Modify: `backend/src/modules/registration/registration.service.ts`
- Modify: `backend/src/modules/registration/registration.controller.ts`
- Modify: `backend/src/modules/registration/registration.routes.ts`

- [ ] **Step 1: Add `getPendingCount` to RegistrationService**

In `registration.service.ts`, add this method after `listAllForAdmin` (before `private toPublic`):

```typescript
async getPendingCount(departmentId: string): Promise<number> {
  return this.db.courseRegistration.count({
    where: {
      user: { departmentId },
      status: RegistrationStatus.pending,
    },
  });
}
```

- [ ] **Step 2: Add the controller handler**

In `registration.controller.ts`, add after `listAllRegistrations`:

```typescript
/** GET /api/v1/registration/admin/pending-count */
export const getPendingCount = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  const count = await registrationService.getPendingCount(departmentId);
  sendSuccess(res, { count }, 'Pending count retrieved');
});
```

Also add `getPendingCount` to the imports at the top of the file.

- [ ] **Step 3: Add the route**

In `registration.routes.ts`, add before the `router.get('/admin', ...)` line:

```typescript
/** GET /api/v1/registration/admin/pending-count */
router.get('/admin/pending-count', authenticate, requireAdmin, apiRateLimit, getPendingCount);
```

Also add `getPendingCount` to the import from `./registration.controller`.

- [ ] **Step 4: Test the endpoint**

```bash
# With backend running (npm run dev in backend/)
curl -H "Authorization: Bearer <admin_token>" \
  http://localhost:5000/api/v1/registration/admin/pending-count
```

Expected: `{"success":true,"data":{"count":0},"message":"Pending count retrieved"}`

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/registration/
git commit -m "feat(registration): add pending count endpoint"
```

---

## Task 3: Backend — paginated activity feed endpoint

**Files:**
- Modify: `backend/src/modules/admin/admin.service.ts`
- Modify: `backend/src/modules/admin/admin.controller.ts`
- Modify: `backend/src/modules/admin/admin.routes.ts`

- [ ] **Step 1: Add `getActivityFeed` to AdminService**

In `admin.service.ts`, add this method after `getDashboardStats` (around line 380):

```typescript
async getActivityFeed(
  departmentId: string,
  query: { page?: number; limit?: number; type?: string; from?: string; to?: string }
): Promise<{
  data: { type: string; label: string; time: string }[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}> {
  const page = query.page ?? 1;
  const limit = Math.min(query.limit ?? 20, 100);
  const fromDate = query.from ? new Date(query.from) : undefined;
  const toDate = query.to ? new Date(query.to) : undefined;

  const dateFilter = fromDate || toDate
    ? { gte: fromDate, lte: toDate }
    : undefined;

  const fetchUsers  = !query.type || query.type === 'registered' || query.type === 'activated';
  const fetchPayments = !query.type || query.type === 'payment';
  const fetchResults  = !query.type || query.type === 'result_published';

  const [recentUsers, recentPayments, recentGradebooks] = await Promise.all([
    fetchUsers
      ? this.db.user.findMany({
          where: {
            departmentId,
            role: UserRole.student,
            ...(dateFilter ? { createdAt: dateFilter } : {}),
          },
          orderBy: { createdAt: 'desc' },
          take: 200,
          select: { name: true, status: true, createdAt: true, updatedAt: true },
        })
      : Promise.resolve([]),
    fetchPayments
      ? this.db.payment.findMany({
          where: {
            status: 'success',
            user: { departmentId },
            ...(dateFilter ? { paidAt: dateFilter } : {}),
          },
          orderBy: { paidAt: 'desc' },
          take: 200,
          include: { user: { select: { name: true } } },
        })
      : Promise.resolve([]),
    fetchResults
      ? this.db.gradebook.findMany({
          where: {
            departmentId,
            status: 'published',
            ...(dateFilter ? { publishedAt: dateFilter } : {}),
          },
          orderBy: { publishedAt: 'desc' },
          take: 200,
          select: { name: true, publishedAt: true },
        })
      : Promise.resolve([]),
  ]);

  const activities: { type: string; label: string; time: string }[] = [
    ...(recentUsers as Array<{ name: string; status: string; createdAt: Date; updatedAt: Date }>).map((u) => ({
      type: u.status === UserStatus.validated ? 'activated' : 'registered',
      label: u.status === UserStatus.validated ? `${u.name} account activated` : `${u.name} registered`,
      time: (u.status === UserStatus.validated ? u.updatedAt : u.createdAt).toISOString(),
    })),
    ...(recentPayments as Array<{ amount: unknown; user: { name: string }; paidAt: Date | null; createdAt: Date }>).map((p) => ({
      type: 'payment',
      label: `₦${Number(p.amount).toLocaleString()} payment — ${p.user.name}`,
      time: (p.paidAt ?? p.createdAt).toISOString(),
    })),
    ...(recentGradebooks as Array<{ name: string; publishedAt: Date | null }>).map((g) => ({
      type: 'result_published',
      label: `${g.name} result published`,
      time: (g.publishedAt ?? new Date()).toISOString(),
    })),
  ]
    .filter((a) => !query.type || a.type === query.type)
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const total = activities.length;
  const paged = activities.slice((page - 1) * limit, page * limit);

  return {
    data: paged,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
```

- [ ] **Step 2: Add the controller handler**

In `admin.controller.ts`, add after the `getDashboard` handler:

```typescript
export const getActivityFeed = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  const result = await adminService.getActivityFeed(departmentId, {
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    type: req.query.type as string | undefined,
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
  });
  sendSuccess(res, result.data, 'Activity feed retrieved', 200, result.meta);
});
```

Add `getActivityFeed` to the imports in the controller file.

- [ ] **Step 3: Add the route**

In `admin.routes.ts`, after the `GET /dashboard` route (line 42), add:

```typescript
/** GET /api/v1/admin/dashboard/activity */
router.get('/dashboard/activity', getActivityFeed);
```

Add `getActivityFeed` to the imports at the top of `admin.routes.ts`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/admin/
git commit -m "feat(admin): add paginated activity feed endpoint"
```

---

## Task 4: Backend — notification image upload

**Files:**
- Modify: `backend/src/modules/notifications/notifications-admin.service.ts`
- Modify: `backend/src/modules/notifications/notifications-admin.controller.ts`
- Modify: `backend/src/modules/notifications/notifications-admin.validation.ts`
- Modify: `backend/src/modules/admin/admin.routes.ts`

- [ ] **Step 1: Update AdminNotification type and CreateNotificationDto**

In `notifications-admin.service.ts`, update the interfaces:

```typescript
export interface AdminNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  target: string;
  targetLevel: string | null;
  imageUrl: string | null;          // ← add this
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
  imageUrl?: string;                // ← add this
}
```

- [ ] **Step 2: Update createNotification to accept imageUrl**

In `notifications-admin.service.ts`, update the `create` call inside `createNotification`:

```typescript
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
    imageUrl: dto.imageUrl ?? null,   // ← add this
  },
});
```

- [ ] **Step 3: Update toPublic to include imageUrl**

In `notifications-admin.service.ts`, update the `toPublic` private method signature and body:

```typescript
private toPublic(
  n: {
    id: string; title: string; body: string; type: NotificationType;
    target: NotificationTarget; targetLevel: Level | null;
    imageUrl: string | null;         // ← add this
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
    imageUrl: n.imageUrl,            // ← add this
    isSent: n.isSent,
    recipientCount,
    createdAt: n.createdAt.toISOString(),
    sentAt: n.sentAt ? n.sentAt.toISOString() : null,
  };
}
```

- [ ] **Step 4: Update the controller to handle multipart upload**

Replace the entire `notifications-admin.controller.ts` with:

```typescript
import { Request, Response } from 'express';
import multer from 'multer';
import { adminNotificationsService } from './notifications-admin.service';
import { uploadToS3 } from '../../utils/s3';
import { sendSuccess, asyncHandler } from '../../utils/response';
import { AuthRequest } from '../../types';
import { NotificationType, NotificationTarget, Level } from '@prisma/client';

export const notifImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG and PNG images are allowed'));
    }
  },
});

export const createNotification = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;

  let imageUrl: string | undefined;
  if (req.file) {
    imageUrl = await uploadToS3(req.file, 'notifications');
  }

  const notification = await adminNotificationsService.createNotification(
    {
      title: req.body.title as string,
      body: req.body.body as string,
      type: req.body.type as NotificationType,
      target: req.body.target as NotificationTarget,
      targetLevel: req.body.targetLevel as Level | undefined,
      send: req.body.send === 'true' || req.body.send === true,
      imageUrl,
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

- [ ] **Step 5: Update validation to accept string booleans from multipart**

In `notifications-admin.validation.ts`, update the `send` validation:

```typescript
body('send')
  .custom((v) => v === true || v === false || v === 'true' || v === 'false')
  .withMessage('send must be a boolean'),
```

- [ ] **Step 6: Update admin.routes.ts to add multer middleware**

In `admin.routes.ts`, update the import at the top to include `notifImageUpload`:

```typescript
import {
  createNotification,
  listNotifications,
  sendNotification,
  deleteNotification,
  notifImageUpload,
} from '../notifications/notifications-admin.controller';
```

Update the notifications POST route:

```typescript
/** POST /api/v1/admin/notifications */
router.post('/notifications', notifImageUpload.single('image'), validate(createNotificationRules), createNotification);
```

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/notifications/ backend/src/modules/admin/admin.routes.ts
git commit -m "feat(notifications): add image/flyer upload support"
```

---

## Task 5: Backend — audit events for registration

**Files:**
- Modify: `backend/src/modules/registration/registration.service.ts`

The `RegistrationService` needs access to `prisma` for `auditLog.create`. It already has `this.db` which is the Prisma client.

- [ ] **Step 1: Add audit imports**

At the top of `registration.service.ts`, add to the imports:

```typescript
import { Prisma } from '@prisma/client';
```

- [ ] **Step 2: Add audit call to submitRegistration**

At the end of `submitRegistration`, after the `return this.toPublic(...)` statements, add the audit call to both branches. Replace the method with:

```typescript
async submitRegistration(
  userId: string,
  session: string,
  semester: string,
  fileUrl: string,
  type: RegistrationType = RegistrationType.course_form
): Promise<RegistrationPublic> {
  const existing = await this.db.courseRegistration.findFirst({
    where: { userId, session, semester: semester as Semester, type },
  });

  if (existing?.status === RegistrationStatus.verified) {
    throw new AppError(409, 'REGISTRATION_ALREADY_VERIFIED', 'This submission is already verified and cannot be replaced');
  }

  let reg;
  if (existing) {
    reg = await this.db.courseRegistration.update({
      where: { id: existing.id },
      data: { fileUrl, status: RegistrationStatus.pending, reviewNote: null, reviewedById: null, reviewedAt: null },
    });
  } else {
    reg = await this.db.courseRegistration.create({
      data: { userId, session, semester: semester as Semester, type, fileUrl, status: RegistrationStatus.pending },
    });
  }

  this.db.auditLog.create({
    data: {
      actorId: userId,
      action: 'REGISTRATION_SUBMITTED',
      entityType: 'registration',
      entityId: reg.id,
      newValue: { type, session, semester, status: 'pending' } as Prisma.InputJsonValue,
    },
  }).catch((e: unknown) => console.error('[RegistrationService] Audit log failed:', e));

  return this.toPublic(reg);
}
```

- [ ] **Step 3: Add audit call to reviewRegistration**

Replace the `reviewRegistration` method with:

```typescript
async reviewRegistration(
  id: string,
  departmentId: string,
  reviewerId: string,
  status: 'verified' | 'rejected',
  reviewNote: string | null
): Promise<RegistrationPublic> {
  const reg = await this.db.courseRegistration.findUnique({
    where: { id },
    include: { user: { select: { departmentId: true } } },
  });
  if (!reg) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Registration not found');
  if (reg.user.departmentId !== departmentId) {
    throw new AppError(403, 'AUTH_FORBIDDEN', 'Registration does not belong to your department');
  }

  const updated = await this.db.courseRegistration.update({
    where: { id },
    data: { status: status as RegistrationStatus, reviewedById: reviewerId, reviewNote: reviewNote ?? null, reviewedAt: new Date() },
  });

  const action = status === 'verified' ? 'REGISTRATION_APPROVED' : 'REGISTRATION_REJECTED';
  this.db.auditLog.create({
    data: {
      actorId: reviewerId,
      action,
      entityType: 'registration',
      entityId: id,
      newValue: { status, reviewNote } as Prisma.InputJsonValue,
    },
  }).catch((e: unknown) => console.error('[RegistrationService] Audit log failed:', e));

  return this.toPublic(updated);
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/registration/registration.service.ts
git commit -m "feat(audit): log registration submission and review events"
```

---

## Task 6: Backend — audit events for notifications and gradebooks

**Files:**
- Modify: `backend/src/modules/notifications/notifications-admin.service.ts`
- Modify: `backend/src/modules/gradebooks/gradebook.service.ts`

- [ ] **Step 1: Add audit imports to notifications service**

At the top of `notifications-admin.service.ts`, add:

```typescript
import { Prisma } from '@prisma/client';
```

- [ ] **Step 2: Add audit calls in createNotification**

At the end of `createNotification`, after `return this.toPublic(...)`, add before the return:

```typescript
this.db.auditLog.create({
  data: {
    actorId: adminId,
    action: dto.send ? 'NOTIFICATION_SENT' : 'NOTIFICATION_CREATED',
    entityType: 'notification',
    entityId: notification.id,
    newValue: { title: dto.title, type: dto.type, target: dto.target, sent: dto.send } as Prisma.InputJsonValue,
  },
}).catch((e: unknown) => console.error('[NotificationsService] Audit log failed:', e));
```

- [ ] **Step 3: Add audit call in sendNotification**

In `sendNotification`, after `return this.toPublic(updated, recipientCount)`, add before the return:

```typescript
this.db.auditLog.create({
  data: {
    actorId: updated.createdById,
    action: 'NOTIFICATION_SENT',
    entityType: 'notification',
    entityId: id,
    newValue: { sentAt: updated.sentAt?.toISOString() } as Prisma.InputJsonValue,
  },
}).catch((e: unknown) => console.error('[NotificationsService] Audit log failed:', e));
```

Note: `sendNotification` doesn't receive `adminId` from the caller. Update the method signature to accept it:

```typescript
async sendNotification(id: string, departmentId: string, adminId: string): Promise<AdminNotification>
```

Update the controller call in `notifications-admin.controller.ts`:

```typescript
export const sendNotification = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;
  const notification = await adminNotificationsService.sendNotification(req.params.id, departmentId, sub);
  sendSuccess(res, notification, 'Notification sent');
});
```

- [ ] **Step 4: Add audit call in deleteNotification**

In `deleteNotification`, update the signature and add audit before the delete:

```typescript
async deleteNotification(id: string, departmentId: string, adminId: string): Promise<void> {
  const notification = await this.db.notification.findFirst({ where: { id, departmentId } });
  if (!notification) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Notification not found');
  if (notification.isSent) throw new AppError(400, 'NOTIFICATION_SENT', 'Cannot delete a sent notification');

  this.db.auditLog.create({
    data: {
      actorId: adminId,
      action: 'NOTIFICATION_DELETED',
      entityType: 'notification',
      entityId: id,
      newValue: { title: notification.title } as Prisma.InputJsonValue,
    },
  }).catch((e: unknown) => console.error('[NotificationsService] Audit log failed:', e));

  await this.db.notification.delete({ where: { id } });
}
```

Update controller:

```typescript
export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;
  await adminNotificationsService.deleteNotification(req.params.id, departmentId, sub);
  sendSuccess(res, null, 'Draft deleted');
});
```

- [ ] **Step 5: Add audit calls to GradebookService.createGradebook**

In `gradebook.service.ts`, add `Prisma` import if not already there:

```typescript
import { Prisma } from '@prisma/client';
```

In `createGradebook`, after the `return this.toPublicGradebook(gradebook)` line, add before the return:

```typescript
this.db.auditLog.create({
  data: {
    actorId,
    action: 'GRADEBOOK_CREATED',
    entityType: 'gradebook',
    entityId: gradebook.id,
    newValue: { name: gradebook.name, level: gradebook.level, session: gradebook.session, semester: gradebook.semester } as Prisma.InputJsonValue,
  },
}).catch((e: unknown) => console.error('[GradebookService] Audit log failed:', e));
```

- [ ] **Step 6: Add audit call to gradebook deletion (if a deleteGradebook method exists)**

Search for a delete method in `gradebook.service.ts`:

```bash
grep -n "delete" backend/src/modules/gradebooks/gradebook.service.ts
```

If a `deleteGradebook` method exists, add after the delete operation:

```typescript
this.db.auditLog.create({
  data: {
    actorId,
    action: 'GRADEBOOK_DELETED',
    entityType: 'gradebook',
    entityId: id,
    newValue: { name: gradebook.name } as Prisma.InputJsonValue,
  },
}).catch((e: unknown) => console.error('[GradebookService] Audit log failed:', e));
```

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/notifications/ backend/src/modules/gradebooks/gradebook.service.ts
git commit -m "feat(audit): log notification and gradebook events"
```

---

## Task 7: Backend — audit events for elections and auth

**Files:**
- Modify: `backend/src/modules/elections/elections.service.ts`
- Modify: `backend/src/modules/auth/auth.service.ts`

- [ ] **Step 1: Find the election creation method**

```bash
grep -n "async create\|async update" backend/src/modules/elections/elections.service.ts | head -20
```

- [ ] **Step 2: Add audit in election create**

In `elections.service.ts`, add `Prisma` import and after the `createElection` DB call, add:

```typescript
this.db.auditLog.create({
  data: {
    actorId: dto.createdById,          // adjust field name to match the actual DTO
    action: 'ELECTION_CREATED',
    entityType: 'election',
    entityId: election.id,
    newValue: { title: election.title, status: election.status } as Prisma.InputJsonValue,
  },
}).catch((e: unknown) => console.error('[ElectionsService] Audit log failed:', e));
```

- [ ] **Step 3: Add audit for election status changes**

In the method that changes election status (look for `activate`, `close`, or `updateStatus`), after the update, add:

```typescript
this.db.auditLog.create({
  data: {
    actorId: adminId,                  // adjust to the actual parameter name
    action: newStatus === 'active' ? 'ELECTION_OPENED' : 'ELECTION_CLOSED',
    entityType: 'election',
    entityId: id,
    newValue: { status: newStatus } as Prisma.InputJsonValue,
  },
}).catch((e: unknown) => console.error('[ElectionsService] Audit log failed:', e));
```

- [ ] **Step 4: Add ADMIN_LOGIN audit to auth.service.ts**

Update the `login` method signature to accept optional ip/ua:

```typescript
async login(
  dto: LoginDto,
  ipAddress?: string,
  userAgent?: string
): Promise<{ user: UserPublic } & TokenPair>
```

After `const tokens = await this.issueTokens(user);`, add:

```typescript
// Audit admin logins only
if (user.role !== UserStatus.pending) {
  this.db.auditLog.create({
    data: {
      actorId: user.id,
      action: 'ADMIN_LOGIN',
      entityType: 'auth',
      entityId: user.id,
      newValue: { userId: user.userId, role: user.role } as import('@prisma/client').Prisma.InputJsonValue,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    },
  }).catch((e: unknown) => console.error('[AuthService] Audit log failed:', e));
}
```

**Note:** Only log for super_admin role to avoid flooding audit log with student logins:

```typescript
if (user.role === 'super_admin') {
  this.db.auditLog.create({ ... }).catch(...);
}
```

- [ ] **Step 5: Pass ip/ua from the auth controller**

In `backend/src/modules/auth/auth.controller.ts`, find the `login` handler and update the service call:

```typescript
const result = await authService.login(
  dto,
  req.ip ?? req.socket.remoteAddress,
  req.headers['user-agent']
);
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/elections/ backend/src/modules/auth/
git commit -m "feat(audit): log election status changes and admin logins"
```

---

## Task 8: Frontend — update types and api/client

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/api/client.ts`

- [ ] **Step 1: Update AdminNotification type in types/index.ts**

Find the `AdminNotification` interface in `frontend/src/types/index.ts` and add `imageUrl`:

```typescript
export interface AdminNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  target: string;
  targetLevel: string | null;
  imageUrl: string | null;       // ← add this
  isSent: boolean;
  recipientCount: number;
  createdAt: string;
  sentAt: string | null;
}
```

- [ ] **Step 2: Update CreateAdminNotificationForm in types/index.ts**

Find `CreateAdminNotificationForm` and add the optional image field:

```typescript
export interface CreateAdminNotificationForm {
  title: string;
  body: string;
  type: 'general' | 'result' | 'election' | 'payment' | 'system';
  target: 'all' | 'level';
  targetLevel?: string;
  send: boolean;
  image?: File;                  // ← add this
}
```

- [ ] **Step 3: Add ActivityItem type**

Add a new type in `types/index.ts`:

```typescript
export interface ActivityItem {
  type: 'registered' | 'activated' | 'payment' | 'result_published';
  label: string;
  time: string;
}
```

- [ ] **Step 4: Update adminNotificationsApi.create to support FormData**

In `frontend/src/api/client.ts`, update the `create` function in `adminNotificationsApi`:

```typescript
create: (body: import('../types').CreateAdminNotificationForm) => {
  if (body.image) {
    const form = new FormData();
    form.append('title', body.title);
    form.append('body', body.body);
    form.append('type', body.type);
    form.append('target', body.target);
    if (body.targetLevel) form.append('targetLevel', body.targetLevel);
    form.append('send', String(body.send));
    form.append('image', body.image);
    return api.post<{ success: true; data: import('../types').AdminNotification }>(
      '/admin/notifications',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  }
  return api.post<{ success: true; data: import('../types').AdminNotification }>(
    '/admin/notifications',
    body
  );
},
```

- [ ] **Step 5: Add activity feed API call**

In `api/client.ts`, add to `adminApi`:

```typescript
getActivityFeed: (params?: { page?: number; limit?: number; type?: string; from?: string; to?: string }) =>
  api.get<{ success: true; data: import('../types').ActivityItem[]; meta: import('../types').PaginationMeta }>(
    '/admin/dashboard/activity',
    { params }
  ),
```

- [ ] **Step 6: Add pending registration count API call**

Add a new `adminRegistrationApi` entry (or update existing):

```typescript
export const adminRegistrationApi = {
  // existing entries...
  getPendingCount: () =>
    api.get<{ success: true; data: { count: number } }>('/registration/admin/pending-count'),
};
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/api/client.ts
git commit -m "feat(frontend): update types and api client for new endpoints"
```

---

## Task 9: Frontend — audit logs visible to all admins

**Files:**
- Modify: `frontend/src/components/AdminLayout.tsx`
- Modify: `frontend/src/pages/admin/AuditLogsPage.tsx`

- [ ] **Step 1: Remove hodOnly from Audit Logs sidebar item**

In `AdminLayout.tsx`, line 45, change:

```typescript
{ icon: ClipboardList, label: 'Audit Logs', to: '/admin/audit-logs', phase: null, hodOnly: true },
```

to:

```typescript
{ icon: ClipboardList, label: 'Audit Logs', to: '/admin/audit-logs', phase: null },
```

- [ ] **Step 2: Add PAGE_TITLES entry for audit-logs**

In `AdminLayout.tsx`, in the `PAGE_TITLES` object (around line 52), add:

```typescript
'/admin/audit-logs': 'Audit Logs',
'/admin/activity':   'Activity Feed',
```

- [ ] **Step 3: Update AuditLogsPage to check role**

In `frontend/src/pages/admin/AuditLogsPage.tsx`, find where the API is called (likely `auditLogsApi.list()`). Update to call the correct endpoint based on role:

```typescript
import { useAuth } from '../../context/AuthContext';
// ...inside the component:
const { user } = useAuth();
const isHod = user?.superAdminType === 'hod';

// In the fetch call:
const fetchLogs = isHod ? auditLogsApi.list : auditLogsApi.listOwn;
```

Replace the existing API call with:

```typescript
fetchLogs(params)
  .then((r) => { /* existing handler */ })
  .catch(/* existing handler */);
```

Also update the page title/subtitle to say "Your Activity Trail" when non-HOD and "All Admin Activity" when HOD.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/AdminLayout.tsx frontend/src/pages/admin/AuditLogsPage.tsx
git commit -m "feat(audit): make audit logs accessible to all admin roles"
```

---

## Task 10: Frontend — sidebar registration badge

**Files:**
- Create: `frontend/src/hooks/usePendingRegistrations.ts`
- Modify: `frontend/src/components/AdminLayout.tsx`

- [ ] **Step 1: Create the polling hook**

Create `frontend/src/hooks/usePendingRegistrations.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { adminRegistrationApi } from '../api/client';

export function usePendingRegistrations(): number {
  const [count, setCount] = useState(0);
  const location = useLocation();

  const fetch = useCallback(() => {
    adminRegistrationApi.getPendingCount()
      .then((r) => setCount(r.data.data.count))
      .catch(() => { /* fail silently — badge disappears */ });
  }, []);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, 60_000);
    return () => clearInterval(id);
  }, [fetch]);

  // Re-fetch when navigating to registrations page
  useEffect(() => {
    if (location.pathname === '/admin/registrations') fetch();
  }, [location.pathname, fetch]);

  return count;
}
```

- [ ] **Step 2: Use the hook in AdminLayout**

In `AdminLayout.tsx`:

1. Import the hook at the top:
```typescript
import { usePendingRegistrations } from '../hooks/usePendingRegistrations';
```

2. Inside `AdminLayout()` (not inside `SidebarContent`), add:
```typescript
const pendingRegistrations = usePendingRegistrations();
```

3. Pass it to `SidebarContent` — since `SidebarContent` is defined as a closure inside `AdminLayout`, it already has access to `pendingRegistrations` via closure.

4. Update the Registrations nav item render in the `map` loop. Find the `NavLink` render (around line 114) and add a badge for the Registrations item:

```typescript
<NavLink
  key={item.to}
  to={item.to}
  end={item.to === '/admin/dashboard'}
  onClick={() => setSidebarOpen(false)}
  className={({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-0.5 transition-all ${
      isActive
        ? 'bg-white/15 text-white font-semibold ring-1 ring-white/10'
        : 'text-white/65 hover:bg-white/8 hover:text-white'
    }`
  }
>
  <item.icon className="w-4 h-4 flex-shrink-0" />
  <span className="flex-1 truncate">{item.label}</span>
  {item.to === '/admin/registrations' && pendingRegistrations > 0 && (
    <span className="flex-shrink-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
      {pendingRegistrations > 99 ? '99+' : pendingRegistrations}
    </span>
  )}
  {item.phase && (
    <span className="flex items-center gap-1 text-[9px] font-bold text-white/30 bg-white/8 px-1.5 py-0.5 rounded-full flex-shrink-0">
      <Lock className="w-2.5 h-2.5" />
      {item.phase}
    </span>
  )}
</NavLink>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/usePendingRegistrations.ts frontend/src/components/AdminLayout.tsx
git commit -m "feat(sidebar): add pending registration count badge"
```

---

## Task 11: Frontend — dashboard timestamps + "View All Activity" button

**Files:**
- Modify: `frontend/src/pages/admin/AdminDashboard.tsx`

The dashboard already has a `timeAgo` helper and the `time` field in the activity data. We need to:
1. Show absolute date below the relative time.
2. Add a "View All Activity →" footer button.

- [ ] **Step 1: Add absolute date formatter**

In `AdminDashboard.tsx`, after the existing `timeAgo` function (around line 21), add:

```typescript
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NG', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}
```

- [ ] **Step 2: Update each activity row to show timestamp**

In the activity map (around line 418–430), replace the existing row render:

```tsx
stats.recentActivity.map((event, i) => (
  <div key={i} className="flex items-start gap-3 px-5 py-3">
    <span className="text-base flex-shrink-0 mt-0.5">
      {ACTIVITY_ICONS[event.type] ?? '📌'}
    </span>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-gray-800 truncate">{event.label}</p>
      <p className="text-[10px] text-gray-400 mt-0.5">
        {timeAgo(event.time)} · {formatDate(event.time)}
      </p>
    </div>
  </div>
))
```

- [ ] **Step 3: Add "View All Activity" footer to the activity card**

The activity card ends around line 431 with `</motion.div>`. Before the closing tag of the card, add a footer:

Replace (around line 429–431):
```tsx
          )}
        </div>
      </motion.div>
```

With:
```tsx
          )}
        </div>
        <div className="px-5 py-3 border-t border-gray-100">
          <Link
            to="/admin/activity"
            className="text-xs font-semibold text-brand-700 hover:text-brand-900 flex items-center gap-1"
          >
            View All Activity <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </motion.div>
```

`ArrowRight` is already imported at line 7.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/admin/AdminDashboard.tsx
git commit -m "feat(dashboard): add timestamps and View All Activity button"
```

---

## Task 12: Frontend — ActivityLogPage (new page)

**Files:**
- Create: `frontend/src/pages/admin/ActivityLogPage.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create ActivityLogPage.tsx**

Create `frontend/src/pages/admin/ActivityLogPage.tsx`:

```tsx
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { adminApi, extractApiError } from '../../api/client';
import type { ActivityItem, PaginationMeta } from '../../types';

const ACTIVITY_ICONS: Record<string, string> = {
  registered: '👤', activated: '✅', payment: '💳', result_published: '📋',
};

const TYPE_LABELS: Record<string, string> = {
  registered: 'Registered', activated: 'Activated',
  payment: 'Payment', result_published: 'Result Published',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ActivityLogPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.getActivityFeed({
      page,
      limit: 20,
      ...(typeFilter ? { type: typeFilter } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    })
      .then((r) => {
        setItems(r.data.data);
        setMeta(r.data.meta ?? null);
      })
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, [page, typeFilter, from, to]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link to="/admin/dashboard" className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Feed</h1>
          <p className="text-sm text-gray-500 mt-0.5">All department activity</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All types</option>
          <option value="registered">Registered</option>
          <option value="activated">Activated</option>
          <option value="payment">Payment</option>
          <option value="result_published">Result Published</option>
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => { setFrom(e.target.value); setPage(1); }}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="From"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => { setTo(e.target.value); setPage(1); }}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="To"
        />
        {(typeFilter || from || to) && (
          <button
            onClick={() => { setTypeFilter(''); setFrom(''); setTo(''); setPage(1); }}
            className="text-xs text-gray-500 hover:text-gray-700 px-3 py-2 rounded-xl border border-gray-200 bg-white"
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm mb-4">{error}</div>
      )}

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-700 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500">No activity found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map((event, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3 border-l-2 border-transparent hover:border-brand-400 hover:bg-brand-50/30 transition-all">
                <span className="text-base flex-shrink-0 mt-0.5">{ACTIVITY_ICONS[event.type] ?? '📌'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{event.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(event.time)} · {formatDate(event.time)}</p>
                </div>
                <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0 self-center">
                  {TYPE_LABELS[event.type] ?? event.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="text-sm font-medium text-brand-700 disabled:text-gray-300 hover:text-brand-900 px-3 py-1.5 rounded-lg hover:bg-brand-50 disabled:bg-transparent transition-colors"
          >
            ← Prev
          </button>
          <span className="text-xs text-gray-500">Page {page} of {meta.totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            disabled={page >= meta.totalPages}
            className="text-sm font-medium text-brand-700 disabled:text-gray-300 hover:text-brand-900 px-3 py-1.5 rounded-lg hover:bg-brand-50 disabled:bg-transparent transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add route in App.tsx**

In `frontend/src/App.tsx`, find where the admin routes are defined. Add the new route inside the admin routes section:

```tsx
import ActivityLogPage from './pages/admin/ActivityLogPage';
// ...
<Route path="activity" element={<ActivityLogPage />} />
```

This goes inside the admin `<Route>` that wraps `AdminLayout`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/ActivityLogPage.tsx frontend/src/App.tsx
git commit -m "feat(dashboard): add full activity log page at /admin/activity"
```

---

## Task 13: Frontend — notification image upload

**Files:**
- Modify: `frontend/src/pages/admin/AdminNotificationsPage.tsx`

- [ ] **Step 1: Add image state to the component**

In `AdminNotificationsPage.tsx`, add state for the flyer image:

```typescript
const [flyerFile, setFlyerFile] = useState<File | null>(null);
const [flyerPreview, setFlyerPreview] = useState<string | null>(null);
```

Add a reset function that includes the file:

Update the reset to also clear the file:
```typescript
// Where EMPTY_FORM is used for reset:
setForm(EMPTY_FORM);
setFlyerFile(null);
setFlyerPreview(null);
```

Also update `handleSubmit` to include the image in the form:

```typescript
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
    await adminNotificationsApi.create({ ...form, send, image: flyerFile ?? undefined });
    setForm(EMPTY_FORM);
    setFlyerFile(null);
    setFlyerPreview(null);
    setComposing(false);
    setTab(send ? 'sent' : 'draft');
    load();
  } catch (err) {
    setFormError(extractApiError(err));
  } finally {
    setSubmitting(false);
  }
};
```

- [ ] **Step 2: Add the dropzone below the message textarea**

In the compose panel, after the `<textarea>` block (around line 156), add the dropzone:

```tsx
{/* Flyer upload */}
<div>
  <label className="block text-xs font-semibold text-brand-900 mb-1">
    Attach Flyer <span className="font-normal text-gray-400">(optional)</span>
  </label>
  {flyerPreview ? (
    <div className="flex items-center gap-3 border border-brand-200 rounded-xl p-3 bg-white">
      <img src={flyerPreview} alt="Flyer preview" className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
      <span className="text-xs text-gray-700 flex-1 truncate">{flyerFile?.name}</span>
      <button
        type="button"
        onClick={() => { setFlyerFile(null); setFlyerPreview(null); }}
        className="text-xs text-red-500 hover:text-red-700 font-semibold flex-shrink-0"
      >
        ✕ Remove
      </button>
    </div>
  ) : (
    <label className="block border-2 border-dashed border-brand-200 rounded-xl p-4 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/50 transition-colors">
      <input
        type="file"
        accept="image/jpeg,image/png"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setFlyerFile(file);
            setFlyerPreview(URL.createObjectURL(file));
          }
        }}
      />
      <div className="text-xl mb-1">🖼️</div>
      <p className="text-xs text-gray-500">Click to upload image</p>
      <p className="text-[10px] text-gray-400 mt-0.5">JPG, PNG — max 5 MB</p>
    </label>
  )}
</div>
```

- [ ] **Step 3: Show image thumbnail in notification list items**

In the notification list item render (around line 264), update to show the thumbnail when `imageUrl` is present:

```tsx
<div key={n.id} className="flex items-start gap-3 px-5 py-4">
  <span className="text-xl flex-shrink-0 mt-0.5">{TYPE_EMOJIS[n.type] ?? '📣'}</span>
  <div className="flex-1 min-w-0">
    <p className="text-sm font-semibold text-gray-900 truncate">{n.title}</p>
    <p className="text-xs text-gray-400 mt-0.5">
      {timeAgo(n.createdAt)} · {n.targetLevel ? `Level ${n.targetLevel.replace('L', '')}` : TARGET_LABELS[n.target]} · {n.recipientCount} recipients
    </p>
    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{n.body}</p>
  </div>
  {n.imageUrl && (
    <img
      src={n.imageUrl}
      alt="Flyer"
      className="w-10 h-10 object-cover rounded-lg flex-shrink-0 border border-gray-100"
    />
  )}
  <div className="flex items-center gap-2 flex-shrink-0">
    {/* existing sent/draft actions */}
  </div>
</div>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/admin/AdminNotificationsPage.tsx
git commit -m "feat(notifications): add image/flyer upload to compose form"
```

---

## Task 14: README — admin credentials

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add Default Admin Credentials section to README.md**

Open `README.md` and add this section (append after the Running Tests section):

```markdown
## Default Admin Credentials

These accounts are created by `npx prisma db seed` (runs `backend/prisma/seed.ts`).

> ⚠️ Change all passwords immediately after first login in production.

| Role | Name | User ID | Password |
|------|------|---------|----------|
| System Admin | System Administrator | `NACOS/ADMIN/2024/001` | `Admin@12345` |
| HOD | Head of Department | `NACOS/ADMIN/2024/002` | `Hod@Nacos2026` |
| Examinations Officer | Examinations Officer | `NACOS/ADMIN/2024/003` | `Exams@Nacos2026` |
| Test Student | John Adebayo Okonkwo | `NACOS/CSC/2024/001` | `Student@12345` |

**Login URL:** `http://localhost:3000/auth/login`

Course Adviser accounts are created via the Super Admins panel (HOD only) or by running:
```bash
cd backend
npx ts-node prisma/seed-hod.ts --email <admin-email>
```
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add default admin credentials to README"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| Dashboard timestamps | Task 11 |
| Dashboard "View All Activity" button | Task 11 |
| Activity history page with filters + pagination | Task 12 |
| Registration sidebar pending badge | Tasks 2, 10 |
| Notification image upload (schema) | Task 1 |
| Notification image upload (backend) | Task 4 |
| Notification image upload (frontend) | Tasks 8, 13 |
| Audit log - registration events | Task 5 |
| Audit log - notification events | Task 6 |
| Audit log - gradebook events | Task 6 |
| Audit log - election events | Task 7 |
| Audit log - auth events | Task 7 |
| Audit log - all admin roles can see | Task 9 |
| README credentials | Task 14 |
| Types + API client updates | Task 8 |

All spec requirements are covered.

**Type consistency check:**

- `ActivityItem` defined in Task 8 step 3, used in `ActivityLogPage` (Task 12) and `adminApi.getActivityFeed` return type. ✓
- `AdminNotification.imageUrl` added in Task 8 step 1, used in Task 13 thumbnail render. ✓
- `getPendingCount` method added to both service (Task 2 step 1) and `adminRegistrationApi` (Task 8 step 6). ✓
- `getActivityFeed` added to `adminApi` (Task 8 step 5), called in `ActivityLogPage` (Task 12). ✓
- `notifImageUpload` exported from controller (Task 4 step 4), imported in routes (Task 4 step 6). ✓
- `sendNotification(id, departmentId, adminId)` — updated signature in Task 6 step 3, controller updated in same step. ✓
- `deleteNotification(id, departmentId, adminId)` — updated in Task 6 step 4, controller updated in same step. ✓
