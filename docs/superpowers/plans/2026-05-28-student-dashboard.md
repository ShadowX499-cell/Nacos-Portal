# Student Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete university student portal with shared sidebar shell, 8 content pages, and backend support for profile lookup, notifications, course registration, and school fees.

**Architecture:** `StudentLayout` component uses React Router `<Outlet>` as the shared shell — all student routes nest inside it so the sidebar never remounts. Three new backend modules (notifications, registration, school-fees additions) follow the existing service/controller/routes pattern. One new Prisma model (`CourseRegistration`) requires a migration.

**Tech Stack:** React 18, React Router v6, Tailwind CSS 3, TypeScript 5, Express 4, Prisma 5, Vitest, AWS S3 (`@aws-sdk/client-s3`), Paystack

---

## Group A — Backend Foundation

### Task 1: Prisma schema — CourseRegistration model

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add enum + model to schema**

Open `backend/prisma/schema.prisma`. After the existing `CsvJobStatus` enum, add:

```prisma
enum RegistrationStatus {
  pending
  verified
  rejected
}
```

After the `CsvUploadJob` model, add:

```prisma
model CourseRegistration {
  id           String             @id @default(uuid())
  userId       String             @map("user_id")
  session      String             @db.VarChar(20)
  semester     Semester
  fileUrl      String?            @map("file_url") @db.VarChar(500)
  status       RegistrationStatus @default(pending)
  reviewedById String?            @map("reviewed_by")
  reviewNote   String?            @map("review_note") @db.VarChar(500)
  submittedAt  DateTime           @default(now()) @map("submitted_at")
  reviewedAt   DateTime?          @map("reviewed_at")

  user       User  @relation("UserRegistrations", fields: [userId], references: [id])
  reviewedBy User? @relation("ReviewedRegistrations", fields: [reviewedById], references: [id])

  @@unique([userId, session, semester])
  @@map("course_registrations")
}
```

In the `User` model, inside the reverse relations block, add:

```prisma
  courseRegistrations   CourseRegistration[] @relation("UserRegistrations")
  reviewedRegistrations CourseRegistration[] @relation("ReviewedRegistrations")
```

- [ ] **Step 2: Run migration**

```bash
cd backend
npx prisma migrate dev --name add_course_registration
npx prisma generate
```

Expected: `✔  Generated Prisma Client` with no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat: add CourseRegistration model with RegistrationStatus enum"
```

---

### Task 2: Backend — env + S3 utility + packages

**Files:**
- Modify: `backend/src/config/env.ts`
- Modify: `backend/.env.example`
- Modify: `backend/tests/setup.ts`
- Create: `backend/src/utils/s3.ts`

- [ ] **Step 1: Install AWS SDK**

```bash
cd backend && npm install @aws-sdk/client-s3
```

Expected: `added N packages` with no errors.

- [ ] **Step 2: Add env vars**

In `backend/src/config/env.ts`, add inside the `env` object after `RESULT_SUBSCRIPTION_AMOUNT_KOBO`:

```typescript
  SCHOOL_FEES_AMOUNT_KOBO: getEnvInt('SCHOOL_FEES_AMOUNT_KOBO', 150000),
```

- [ ] **Step 3: Add to .env.example**

In `backend/.env.example`, after the Paystack block add:

```
# ── Fees ──────────────────────────────────────────────────────────────────────
SCHOOL_FEES_AMOUNT_KOBO=150000
```

- [ ] **Step 4: Add to test setup**

In `backend/tests/setup.ts`, add:

```typescript
process.env.SCHOOL_FEES_AMOUNT_KOBO = '150000';
```

- [ ] **Step 5: Create S3 utility**

Create `backend/src/utils/s3.ts`:

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_BYTES = 5 * 1024 * 1024;

export function validateUpload(file: Express.Multer.File): void {
  if (file.size > MAX_BYTES) {
    throw Object.assign(new Error('File exceeds 5 MB'), { code: 'FILE_TOO_LARGE', status: 413 });
  }
  if (!ALLOWED_MIME.includes(file.mimetype)) {
    throw Object.assign(new Error('Only PDF, JPG, or PNG files are allowed'), {
      code: 'INVALID_FILE_TYPE',
      status: 400,
    });
  }
}

export async function uploadToS3(file: Express.Multer.File, folder: string): Promise<string> {
  validateUpload(file);
  const ext = file.originalname.split('.').pop() ?? 'bin';
  const key = `${folder}/${uuidv4()}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  return `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
}
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/config/env.ts backend/.env.example backend/tests/setup.ts backend/src/utils/s3.ts backend/package.json backend/package-lock.json
git commit -m "feat: add SCHOOL_FEES env var, S3 upload utility, AWS SDK"
```

---

### Task 3: Backend — auth/me endpoint (TDD)

**Files:**
- Modify: `backend/src/modules/auth/auth.service.ts`
- Modify: `backend/src/modules/auth/auth.controller.ts`
- Modify: `backend/src/modules/auth/auth.routes.ts`
- Modify: `backend/tests/auth/auth.test.ts`

- [ ] **Step 1: Write failing test**

In `backend/tests/auth/auth.test.ts`, add after the last `describe` block:

```typescript
describe('AuthService.getMe', () => {
  it('returns the full user profile for a valid user UUID', async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser);
    const result = await service.getMe('user-uuid-1');
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-uuid-1' } });
    expect(result.id).toBe('user-uuid-1');
    expect(result.email).toBe('ada@test.com');
    expect(result.name).toBe('Ada Lovelace');
  });

  it('throws 404 when user UUID does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(service.getMe('nonexistent')).rejects.toMatchObject({
      statusCode: 404,
      code: 'RESOURCE_NOT_FOUND',
    });
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
cd backend && npm test -- --reporter=verbose 2>&1 | grep -A3 "getMe"
```

Expected: `getMe is not a function` or similar failure.

- [ ] **Step 3: Implement getMe in AuthService**

In `backend/src/modules/auth/auth.service.ts`, add after the `resetPassword` method:

```typescript
async getMe(userId: string): Promise<UserPublic> {
  const user = await this.db.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'User not found');
  return {
    id: user.id,
    userId: user.userId,
    name: user.name,
    email: user.email,
    phone: user.phone,
    program: user.program,
    level: user.level,
    role: user.role,
    status: user.status,
    departmentId: user.departmentId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
```

- [ ] **Step 4: Add controller handler**

In `backend/src/modules/auth/auth.controller.ts`, add at the bottom:

```typescript
/** GET /api/v1/auth/me */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const { sub } = (req as import('../../types').AuthRequest).user;
  const user = await authService.getMe(sub);
  sendSuccess(res, user, 'Profile retrieved');
});
```

Also add `getMe` to the imports at the top of the file if they are named exports.

- [ ] **Step 5: Add route**

In `backend/src/modules/auth/auth.routes.ts`, add after the existing routes but before `export default`:

```typescript
/** GET /api/v1/auth/me */
router.get('/me', authenticate, getMe);
```

Add `getMe` to the import from `./auth.controller`.

- [ ] **Step 6: Run tests — expect pass**

```bash
cd backend && npm test 2>&1 | tail -8
```

Expected: `29 passed` (27 existing + 2 new).

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/auth/ backend/tests/auth/auth.test.ts
git commit -m "feat: add GET /auth/me endpoint for student profile"
```

---

### Task 4: Backend — notifications module (TDD)

**Files:**
- Create: `backend/src/modules/notifications/notifications.service.ts`
- Create: `backend/src/modules/notifications/notifications.controller.ts`
- Create: `backend/src/modules/notifications/notifications.routes.ts`
- Create: `backend/tests/notifications/notifications.test.ts`
- Modify: `backend/src/app.ts`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/notifications/notifications.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { AppError } from '../../src/utils/response';

const mockNotif1 = {
  id: 'notif-1', departmentId: 'dept-1', title: 'Result Published',
  body: 'Your 2024/25 S1 result is ready.', type: 'result' as const,
  target: 'all' as const, targetLevel: null, targetUserId: null,
  isSent: true, sentAt: new Date(), createdById: 'admin-1', createdAt: new Date(),
};
const mockNotif2 = {
  id: 'notif-2', departmentId: 'dept-1', title: 'Election Notice',
  body: 'Elections open tomorrow.', type: 'election' as const,
  target: 'all' as const, targetLevel: null, targetUserId: null,
  isSent: true, sentAt: new Date(), createdById: 'admin-1', createdAt: new Date(),
};

const prismaMock = {
  notificationRead: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn(),
  },
  notification: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
  },
};

let service: NotificationsService;

beforeEach(() => {
  vi.clearAllMocks();
  service = new NotificationsService(prismaMock as unknown as import('@prisma/client').PrismaClient);
});

describe('NotificationsService.listNotifications', () => {
  it('attaches isRead:true for already-read notifications', async () => {
    prismaMock.notificationRead.findMany.mockResolvedValue([{ notificationId: 'notif-1' }]);
    prismaMock.notification.findMany.mockResolvedValue([mockNotif1, mockNotif2]);

    const result = await service.listNotifications('user-1', 'dept-1', 'L200');
    expect(result[0].isRead).toBe(true);
    expect(result[1].isRead).toBe(false);
  });

  it('returns empty array when no notifications exist', async () => {
    prismaMock.notificationRead.findMany.mockResolvedValue([]);
    prismaMock.notification.findMany.mockResolvedValue([]);
    const result = await service.listNotifications('user-1', 'dept-1', 'L200');
    expect(result).toEqual([]);
  });
});

describe('NotificationsService.markRead', () => {
  it('upserts a NotificationRead record', async () => {
    prismaMock.notificationRead.upsert.mockResolvedValue({});
    await service.markRead('notif-1', 'user-1');
    expect(prismaMock.notificationRead.upsert).toHaveBeenCalledWith({
      where: { notificationId_userId: { notificationId: 'notif-1', userId: 'user-1' } },
      create: { notificationId: 'notif-1', userId: 'user-1' },
      update: {},
    });
  });
});

describe('NotificationsService.getUnreadCount', () => {
  it('returns total minus read count', async () => {
    prismaMock.notification.count.mockResolvedValue(5);
    prismaMock.notificationRead.count.mockResolvedValue(2);
    const result = await service.getUnreadCount('user-1', 'dept-1', 'L200');
    expect(result.count).toBe(3);
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
cd backend && npm test 2>&1 | grep "notifications"
```

Expected: `Cannot find module`.

- [ ] **Step 3: Implement NotificationsService**

Create `backend/src/modules/notifications/notifications.service.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { prisma as defaultPrisma } from '../../config/prisma';

export interface NotificationPublic {
  id: string;
  title: string;
  body: string;
  type: string;
  target: string;
  isRead: boolean;
  createdAt: Date;
}

export class NotificationsService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async listNotifications(
    userId: string,
    departmentId: string,
    level: string
  ): Promise<NotificationPublic[]> {
    const reads = await this.db.notificationRead.findMany({
      where: { userId },
      select: { notificationId: true },
    });
    const readIds = new Set(reads.map((r) => r.notificationId));

    const notifications = await this.db.notification.findMany({
      where: {
        departmentId,
        isSent: true,
        OR: [
          { target: 'all' },
          { target: 'level', targetLevel: level as import('@prisma/client').Level },
          { target: 'individual', targetUserId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return notifications.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      type: n.type,
      target: n.target,
      isRead: readIds.has(n.id),
      createdAt: n.createdAt,
    }));
  }

  async markRead(notificationId: string, userId: string): Promise<void> {
    await this.db.notificationRead.upsert({
      where: { notificationId_userId: { notificationId, userId } },
      create: { notificationId, userId },
      update: {},
    });
  }

  async markAllRead(userId: string, departmentId: string, level: string): Promise<void> {
    const notifications = await this.db.notification.findMany({
      where: {
        departmentId,
        isSent: true,
        OR: [
          { target: 'all' },
          { target: 'level', targetLevel: level as import('@prisma/client').Level },
          { target: 'individual', targetUserId: userId },
        ],
      },
      select: { id: true },
    });

    await this.db.$transaction(
      notifications.map((n) =>
        this.db.notificationRead.upsert({
          where: { notificationId_userId: { notificationId: n.id, userId } },
          create: { notificationId: n.id, userId },
          update: {},
        })
      )
    );
  }

  async getUnreadCount(
    userId: string,
    departmentId: string,
    level: string
  ): Promise<{ count: number }> {
    const total = await this.db.notification.count({
      where: {
        departmentId,
        isSent: true,
        OR: [
          { target: 'all' },
          { target: 'level', targetLevel: level as import('@prisma/client').Level },
          { target: 'individual', targetUserId: userId },
        ],
      },
    });

    const readCount = await this.db.notificationRead.count({ where: { userId } });
    return { count: Math.max(0, total - readCount) };
  }
}

export const notificationsService = new NotificationsService();
```

- [ ] **Step 4: Create controller**

Create `backend/src/modules/notifications/notifications.controller.ts`:

```typescript
import { Request, Response } from 'express';
import { notificationsService } from './notifications.service';
import { sendSuccess, asyncHandler } from '../../utils/response';
import { AuthRequest } from '../../types';
import { prisma } from '../../config/prisma';

async function getStudentLevel(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { level: true } });
  return user?.level ?? 'L100';
}

/** GET /api/v1/notifications */
export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;
  const level = await getStudentLevel(sub);
  const notifications = await notificationsService.listNotifications(sub, departmentId, level);
  sendSuccess(res, notifications, 'Notifications retrieved');
});

/** POST /api/v1/notifications/:id/read */
export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const { sub } = (req as AuthRequest).user;
  await notificationsService.markRead(req.params.id, sub);
  sendSuccess(res, null, 'Marked as read');
});

/** POST /api/v1/notifications/read-all */
export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;
  const level = await getStudentLevel(sub);
  await notificationsService.markAllRead(sub, departmentId, level);
  sendSuccess(res, null, 'All notifications marked as read');
});

/** GET /api/v1/notifications/unread-count */
export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;
  const level = await getStudentLevel(sub);
  const result = await notificationsService.getUnreadCount(sub, departmentId, level);
  sendSuccess(res, result, 'Unread count retrieved');
});
```

- [ ] **Step 5: Create routes**

Create `backend/src/modules/notifications/notifications.routes.ts`:

```typescript
import { Router } from 'express';
import { authenticate, requireStudent } from '../../middleware/auth.middleware';
import { apiRateLimit } from '../../middleware/rate-limit.middleware';
import { listNotifications, markRead, markAllRead, getUnreadCount } from './notifications.controller';

const router = Router();
router.use(authenticate, requireStudent, apiRateLimit);

/** GET  /api/v1/notifications/unread-count — BEFORE /:id */
router.get('/unread-count', getUnreadCount);

/** GET  /api/v1/notifications */
router.get('/', listNotifications);

/** POST /api/v1/notifications/read-all */
router.post('/read-all', markAllRead);

/** POST /api/v1/notifications/:id/read */
router.post('/:id/read', markRead);

export default router;
```

- [ ] **Step 6: Register in app.ts**

In `backend/src/app.ts`, add import:

```typescript
import notificationsRoutes from './modules/notifications/notifications.routes';
```

And in the API routes section:

```typescript
app.use('/api/v1/notifications', notificationsRoutes);
```

- [ ] **Step 7: Run tests — expect pass**

```bash
cd backend && npm test 2>&1 | tail -8
```

Expected: `32 passed` (29 + 3 new notification tests).

- [ ] **Step 8: Commit**

```bash
git add backend/src/modules/notifications/ backend/tests/notifications/ backend/src/app.ts
git commit -m "feat: add notifications module (list, mark-read, unread-count)"
```

---

### Task 5: Backend — registration module (TDD)

**Files:**
- Create: `backend/src/modules/registration/registration.service.ts`
- Create: `backend/src/modules/registration/registration.controller.ts`
- Create: `backend/src/modules/registration/registration.routes.ts`
- Create: `backend/tests/registration/registration.test.ts`
- Modify: `backend/src/app.ts`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/registration/registration.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegistrationService } from '../../src/modules/registration/registration.service';
import { AppError } from '../../src/utils/response';
import { RegistrationStatus, Semester } from '@prisma/client';

const mockReg = {
  id: 'reg-1', userId: 'user-1', session: '2024/2025',
  semester: Semester.first, fileUrl: 'https://s3.url/file.pdf',
  status: RegistrationStatus.pending, reviewedById: null, reviewNote: null,
  submittedAt: new Date(), reviewedAt: null,
};

const prismaMock = {
  courseRegistration: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

let service: RegistrationService;

beforeEach(() => {
  vi.clearAllMocks();
  service = new RegistrationService(prismaMock as unknown as import('@prisma/client').PrismaClient);
});

describe('RegistrationService.submitRegistration', () => {
  it('creates a new registration when none exists', async () => {
    prismaMock.courseRegistration.findUnique.mockResolvedValue(null);
    prismaMock.courseRegistration.create.mockResolvedValue(mockReg);

    const result = await service.submitRegistration('user-1', '2024/2025', 'first', 'https://s3.url/file.pdf');
    expect(prismaMock.courseRegistration.create).toHaveBeenCalled();
    expect(result.status).toBe('pending');
  });

  it('updates an existing pending registration (re-upload)', async () => {
    prismaMock.courseRegistration.findUnique.mockResolvedValue(mockReg);
    prismaMock.courseRegistration.update.mockResolvedValue({ ...mockReg, fileUrl: 'https://new.url/file.pdf' });

    const result = await service.submitRegistration('user-1', '2024/2025', 'first', 'https://new.url/file.pdf');
    expect(prismaMock.courseRegistration.update).toHaveBeenCalled();
    expect(prismaMock.courseRegistration.create).not.toHaveBeenCalled();
  });

  it('throws 409 when replacing a verified registration', async () => {
    prismaMock.courseRegistration.findUnique.mockResolvedValue({ ...mockReg, status: RegistrationStatus.verified });
    await expect(
      service.submitRegistration('user-1', '2024/2025', 'first', 'https://new.url/file.pdf')
    ).rejects.toMatchObject({ statusCode: 409, code: 'REGISTRATION_ALREADY_VERIFIED' });
  });
});

describe('RegistrationService.reviewRegistration', () => {
  it('marks a registration as verified', async () => {
    prismaMock.courseRegistration.findUnique.mockResolvedValue(mockReg);
    prismaMock.courseRegistration.update.mockResolvedValue({ ...mockReg, status: RegistrationStatus.verified });

    const result = await service.reviewRegistration('reg-1', 'dept-1', 'admin-1', 'verified', null);
    expect(result.status).toBe('verified');
  });

  it('marks a registration as rejected with a note', async () => {
    prismaMock.courseRegistration.findUnique.mockResolvedValue(mockReg);
    prismaMock.courseRegistration.update.mockResolvedValue({
      ...mockReg, status: RegistrationStatus.rejected, reviewNote: 'Wrong form',
    });

    const result = await service.reviewRegistration('reg-1', 'dept-1', 'admin-1', 'rejected', 'Wrong form');
    expect(result.status).toBe('rejected');
    expect(result.reviewNote).toBe('Wrong form');
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
cd backend && npm test 2>&1 | grep "registration"
```

Expected: `Cannot find module`.

- [ ] **Step 3: Implement RegistrationService**

Create `backend/src/modules/registration/registration.service.ts`:

```typescript
import { PrismaClient, RegistrationStatus, Semester } from '@prisma/client';
import { prisma as defaultPrisma } from '../../config/prisma';
import { AppError } from '../../utils/response';

export interface RegistrationPublic {
  id: string;
  userId: string;
  session: string;
  semester: string;
  fileUrl: string | null;
  status: string;
  reviewNote: string | null;
  submittedAt: Date;
  reviewedAt: Date | null;
}

export class RegistrationService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async listRegistrations(userId: string): Promise<RegistrationPublic[]> {
    const regs = await this.db.courseRegistration.findMany({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
    });
    return regs.map(this.toPublic);
  }

  async submitRegistration(
    userId: string,
    session: string,
    semester: string,
    fileUrl: string
  ): Promise<RegistrationPublic> {
    const existing = await this.db.courseRegistration.findUnique({
      where: { userId_session_semester: { userId, session, semester: semester as Semester } },
    });

    if (existing?.status === RegistrationStatus.verified) {
      throw new AppError(409, 'REGISTRATION_ALREADY_VERIFIED', 'Your course form is already verified and cannot be replaced');
    }

    if (existing) {
      const updated = await this.db.courseRegistration.update({
        where: { id: existing.id },
        data: {
          fileUrl,
          status: RegistrationStatus.pending,
          reviewNote: null,
          reviewedById: null,
          reviewedAt: null,
        },
      });
      return this.toPublic(updated);
    }

    const reg = await this.db.courseRegistration.create({
      data: { userId, session, semester: semester as Semester, fileUrl, status: RegistrationStatus.pending },
    });
    return this.toPublic(reg);
  }

  async reviewRegistration(
    id: string,
    departmentId: string,
    reviewerId: string,
    status: 'verified' | 'rejected',
    reviewNote: string | null
  ): Promise<RegistrationPublic> {
    const reg = await this.db.courseRegistration.findUnique({ where: { id } });
    if (!reg) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Registration not found');

    const updated = await this.db.courseRegistration.update({
      where: { id },
      data: {
        status: status as RegistrationStatus,
        reviewedById: reviewerId,
        reviewNote: reviewNote ?? null,
        reviewedAt: new Date(),
      },
    });
    return this.toPublic(updated);
  }

  async listAllForAdmin(
    departmentId: string,
    filters: { status?: string; session?: string; semester?: string }
  ): Promise<(RegistrationPublic & { studentUserId: string; studentName: string })[]> {
    const regs = await this.db.courseRegistration.findMany({
      where: {
        user: { departmentId },
        ...(filters.status ? { status: filters.status as RegistrationStatus } : {}),
        ...(filters.session ? { session: filters.session } : {}),
        ...(filters.semester ? { semester: filters.semester as Semester } : {}),
      },
      include: { user: { select: { userId: true, name: true } } },
      orderBy: { submittedAt: 'desc' },
    });
    return regs.map((r) => ({
      ...this.toPublic(r),
      studentUserId: r.user.userId,
      studentName: r.user.name,
    }));
  }

  private toPublic(r: {
    id: string; userId: string; session: string; semester: Semester;
    fileUrl: string | null; status: RegistrationStatus; reviewNote: string | null;
    submittedAt: Date; reviewedAt: Date | null;
  }): RegistrationPublic {
    return {
      id: r.id, userId: r.userId, session: r.session, semester: r.semester,
      fileUrl: r.fileUrl, status: r.status, reviewNote: r.reviewNote,
      submittedAt: r.submittedAt, reviewedAt: r.reviewedAt,
    };
  }
}

export const registrationService = new RegistrationService();
```

- [ ] **Step 4: Create controller**

Create `backend/src/modules/registration/registration.controller.ts`:

```typescript
import { Request, Response } from 'express';
import { registrationService } from './registration.service';
import { uploadToS3 } from '../../utils/s3';
import { sendSuccess, asyncHandler, AppError } from '../../utils/response';
import { AuthRequest } from '../../types';
import multer from 'multer';

export const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

/** GET /api/v1/registration */
export const listRegistrations = asyncHandler(async (req: Request, res: Response) => {
  const { sub } = (req as AuthRequest).user;
  const regs = await registrationService.listRegistrations(sub);
  sendSuccess(res, regs, 'Registrations retrieved');
});

/** POST /api/v1/registration */
export const submitRegistration = asyncHandler(async (req: Request, res: Response) => {
  const { sub } = (req as AuthRequest).user;
  const { session, semester } = req.body as { session: string; semester: string };

  if (!req.file) {
    res.status(400).json({ success: false, error: { code: 'FILE_MISSING', message: 'Course form file is required' } });
    return;
  }

  let fileUrl: string;
  try {
    fileUrl = await uploadToS3(req.file, 'course-registrations');
  } catch (err: unknown) {
    const e = err as { code?: string; status?: number; message: string };
    res.status(e.status ?? 500).json({ success: false, error: { code: e.code ?? 'UPLOAD_ERROR', message: e.message } });
    return;
  }

  const reg = await registrationService.submitRegistration(sub, session, semester, fileUrl);
  sendSuccess(res, reg, 'Course registration form submitted', 201);
});

/** GET /api/v1/admin/registrations */
export const listAllRegistrations = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = (req as AuthRequest).user;
  const { status, session, semester } = req.query as Record<string, string>;
  const regs = await registrationService.listAllForAdmin(departmentId, { status, session, semester });
  sendSuccess(res, regs, 'Registrations retrieved');
});

/** PATCH /api/v1/admin/registrations/:id/review */
export const reviewRegistration = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;
  const { status, reviewNote } = req.body as { status: 'verified' | 'rejected'; reviewNote?: string };
  const reg = await registrationService.reviewRegistration(req.params.id, departmentId, sub, status, reviewNote ?? null);
  sendSuccess(res, reg, `Registration ${status}`);
});
```

- [ ] **Step 5: Create routes**

Create `backend/src/modules/registration/registration.routes.ts`:

```typescript
import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, requireStudent, requireAdmin } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { apiRateLimit } from '../../middleware/rate-limit.middleware';
import { Semester } from '@prisma/client';
import { upload, listRegistrations, submitRegistration, listAllRegistrations, reviewRegistration } from './registration.controller';

const router = Router();

/** Student routes */
router.get('/', authenticate, requireStudent, apiRateLimit, listRegistrations);
router.post(
  '/',
  authenticate,
  requireStudent,
  apiRateLimit,
  upload.single('file'),
  validate([
    body('session').matches(/^\d{4}\/\d{4}$/).withMessage('Session must be YYYY/YYYY'),
    body('semester').isIn(Object.values(Semester)).withMessage('Invalid semester'),
  ]),
  submitRegistration
);

/** Admin routes */
router.get('/admin', authenticate, requireAdmin, apiRateLimit, listAllRegistrations);
router.patch(
  '/admin/:id/review',
  authenticate,
  requireAdmin,
  apiRateLimit,
  validate([
    body('status').isIn(['verified', 'rejected']).withMessage('Status must be verified or rejected'),
    body('reviewNote').optional().isString().isLength({ max: 500 }),
  ]),
  reviewRegistration
);

export default router;
```

- [ ] **Step 6: Register in app.ts**

In `backend/src/app.ts`, add import:

```typescript
import registrationRoutes from './modules/registration/registration.routes';
```

And in the API routes section:

```typescript
app.use('/api/v1/registration', registrationRoutes);
```

- [ ] **Step 7: Run tests — expect pass**

```bash
cd backend && npm test 2>&1 | tail -8
```

Expected: `37 passed` (32 + 5 new registration tests).

- [ ] **Step 8: Type-check**

```bash
cd backend && npx tsc --noEmit 2>&1
```

Expected: no output (clean).

- [ ] **Step 9: Commit**

```bash
git add backend/src/modules/registration/ backend/tests/registration/ backend/src/app.ts
git commit -m "feat: add registration module (student upload, admin review)"
```

---

### Task 6: Backend — school fees endpoints (TDD)

**Files:**
- Modify: `backend/src/modules/payments/payments.service.ts`
- Modify: `backend/src/modules/payments/payments.controller.ts`
- Modify: `backend/src/modules/payments/payments.routes.ts`
- Create: `backend/tests/payments/payments.test.ts`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/payments/payments.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentsService } from '../../src/modules/payments/payments.service';
import { AppError } from '../../src/utils/response';
import { PaymentType, PaymentStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

const mockPayment = {
  id: 'pay-1', userId: 'user-1', type: PaymentType.school_fees,
  amount: new Prisma.Decimal(1500), currency: 'NGN',
  reference: 'ref123', gatewayRef: null,
  status: PaymentStatus.success, sessionYear: '2024/2025',
  semester: null, receiptUrl: null,
  paidAt: new Date(), createdAt: new Date(),
};

const prismaMock = {
  payment: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findMany: vi.fn() },
  gradebook: { findFirst: vi.fn() },
};

vi.mock('../../src/config/env', () => ({
  env: {
    PAYSTACK_SECRET_KEY: 'sk_test_dummy',
    SCHOOL_FEES_AMOUNT_KOBO: 150000,
    RESULT_SUBSCRIPTION_AMOUNT_KOBO: 50000,
    FRONTEND_URL: 'http://localhost:3000',
  },
}));

let service: PaymentsService;

beforeEach(() => {
  vi.clearAllMocks();
  service = new PaymentsService(prismaMock as unknown as import('@prisma/client').PrismaClient);
});

describe('PaymentsService.initiateSchoolFees', () => {
  it('throws 409 when school fees already paid for the session', async () => {
    prismaMock.payment.findFirst.mockResolvedValue(mockPayment);
    await expect(
      service.initiateSchoolFees('user-1', 'ada@test.com', '2024/2025', 'dept-1')
    ).rejects.toMatchObject({ statusCode: 409, code: 'SCHOOL_FEES_ALREADY_PAID' });
  });
});

describe('PaymentsService.getSchoolFeesStatus', () => {
  it('returns status and session from latest published gradebook', async () => {
    prismaMock.gradebook.findFirst.mockResolvedValue({ session: '2024/2025', status: 'published' });
    prismaMock.payment.findFirst.mockResolvedValue(mockPayment);

    const result = await service.getSchoolFeesStatus('user-1', 'dept-1');
    expect(result.currentSession).toBe('2024/2025');
    expect(result.status).toBe('success');
  });

  it('falls back to calendar year when no gradebook exists', async () => {
    prismaMock.gradebook.findFirst.mockResolvedValue(null);
    prismaMock.payment.findFirst.mockResolvedValue(null);

    const result = await service.getSchoolFeesStatus('user-1', 'dept-1');
    expect(result.currentSession).toMatch(/^\d{4}\/\d{4}$/);
    expect(result.status).toBe('not_initiated');
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
cd backend && npm test 2>&1 | grep "payments"
```

Expected: `Cannot find module` or method not found.

- [ ] **Step 3: Add methods to PaymentsService**

In `backend/src/modules/payments/payments.service.ts`, add these two methods before the private `verifySignature` method:

```typescript
async initiateSchoolFees(
  studentId: string,
  studentEmail: string,
  sessionYear: string,
  departmentId: string
): Promise<{ authorization_url: string; reference: string }> {
  const existing = await this.db.payment.findFirst({
    where: { userId: studentId, type: PaymentType.school_fees, status: PaymentStatus.success, sessionYear },
  });
  if (existing) throw new AppError(409, 'SCHOOL_FEES_ALREADY_PAID', 'School fees already paid for this session');

  const reference = uuidv4().replace(/-/g, '');

  await this.db.payment.create({
    data: {
      userId: studentId,
      type: PaymentType.school_fees,
      amount: new Prisma.Decimal(env.SCHOOL_FEES_AMOUNT_KOBO / 100),
      currency: 'NGN',
      reference,
      status: PaymentStatus.pending,
      sessionYear,
    },
  });

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: studentEmail,
      amount: env.SCHOOL_FEES_AMOUNT_KOBO,
      reference,
      metadata: { type: 'school_fees', studentId, sessionYear },
      callback_url: `${env.FRONTEND_URL}/student/school-fees/verify?reference=${reference}`,
    }),
  });

  const data = (await response.json()) as PaystackInitResponse;
  if (!data.status) {
    await this.db.payment.update({ where: { reference }, data: { status: PaymentStatus.failed } });
    throw new AppError(502, 'PAYMENT_GATEWAY_ERROR', data.message ?? 'Payment initialization failed');
  }

  return { authorization_url: data.data.authorization_url, reference };
}

async getSchoolFeesStatus(
  studentId: string,
  departmentId: string
): Promise<{ currentSession: string; status: string; amount: number; paidAt: Date | null; reference: string | null }> {
  const latestGradebook = await this.db.gradebook.findFirst({
    where: { departmentId, status: 'published' },
    orderBy: { session: 'desc' },
  });

  const year = new Date().getFullYear();
  const currentSession = latestGradebook?.session ?? `${year}/${year + 1}`;

  const payment = await this.db.payment.findFirst({
    where: { userId: studentId, type: PaymentType.school_fees, sessionYear: currentSession },
    orderBy: { createdAt: 'desc' },
  });

  return {
    currentSession,
    status: payment?.status ?? 'not_initiated',
    amount: env.SCHOOL_FEES_AMOUNT_KOBO / 100,
    paidAt: payment?.paidAt ?? null,
    reference: payment?.reference ?? null,
  };
}
```

- [ ] **Step 4: Add controller handlers**

In `backend/src/modules/payments/payments.controller.ts`, add:

```typescript
/** POST /api/v1/payments/school-fees/initiate */
export const initiateSchoolFees = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;
  const { sessionYear } = req.body as { sessionYear: string };

  const { prisma } = await import('../../config/prisma');
  const user = await prisma.user.findUnique({ where: { id: sub } });
  if (!user) { res.status(404).json({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'User not found' } }); return; }

  const result = await paymentsService.initiateSchoolFees(sub, user.email, sessionYear, departmentId);
  sendSuccess(res, result, 'School fees payment initiated', 201);
});

/** GET /api/v1/payments/school-fees/status */
export const getSchoolFeesStatus = asyncHandler(async (req: Request, res: Response) => {
  const { sub, departmentId } = (req as AuthRequest).user;
  const result = await paymentsService.getSchoolFeesStatus(sub, departmentId);
  sendSuccess(res, result, 'School fees status retrieved');
});
```

- [ ] **Step 5: Add routes**

In `backend/src/modules/payments/payments.routes.ts`, add before the webhook route:

```typescript
import { initiateSchoolFees, getSchoolFeesStatus } from './payments.controller';
```

And add routes inside the student-auth section:

```typescript
/** POST /api/v1/payments/school-fees/initiate */
router.post('/school-fees/initiate',
  validate([body('sessionYear').matches(/^\d{4}\/\d{4}$/).withMessage('sessionYear must be YYYY/YYYY')]),
  initiateSchoolFees
);

/** GET /api/v1/payments/school-fees/status */
router.get('/school-fees/status', getSchoolFeesStatus);
```

- [ ] **Step 6: Run all tests — expect pass**

```bash
cd backend && npm test 2>&1 | tail -8
```

Expected: `39 passed`.

- [ ] **Step 7: Type-check**

```bash
cd backend && npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add backend/src/modules/payments/ backend/tests/payments/
git commit -m "feat: add school fees payment initiation and status endpoints"
```

---

## Group B — Frontend Foundation

### Task 7: Frontend types + API client additions

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/api/client.ts`

- [ ] **Step 1: Add types**

In `frontend/src/types/index.ts`, append at the end:

```typescript
// ── Notifications ─────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'general' | 'result' | 'election' | 'payment' | 'system';
  target: string;
  isRead: boolean;
  createdAt: string;
}

// ── Registration ──────────────────────────────────────────────────────────────

export type RegistrationStatus = 'pending' | 'verified' | 'rejected';

export interface Registration {
  id: string;
  userId: string;
  session: string;
  semester: string;
  fileUrl: string | null;
  status: RegistrationStatus;
  reviewNote: string | null;
  submittedAt: string;
  reviewedAt: string | null;
}

// ── School Fees ───────────────────────────────────────────────────────────────

export interface SchoolFeesStatus {
  currentSession: string;
  status: 'not_initiated' | 'pending' | 'success' | 'failed';
  amount: number;
  paidAt: string | null;
  reference: string | null;
}
```

- [ ] **Step 2: Add API client methods**

In `frontend/src/api/client.ts`, append after the `paymentsApi` block:

```typescript
// ── Notifications API ─────────────────────────────────────────────────────────

export const notificationsApi = {
  list: () =>
    api.get<{ success: true; data: import('../types').Notification[] }>('/notifications'),

  markRead: (id: string) =>
    api.post(`/notifications/${id}/read`),

  markAllRead: () =>
    api.post('/notifications/read-all'),

  getUnreadCount: () =>
    api.get<{ success: true; data: { count: number } }>('/notifications/unread-count'),
};

// ── Registration API ──────────────────────────────────────────────────────────

export const registrationApi = {
  list: () =>
    api.get<{ success: true; data: import('../types').Registration[] }>('/registration'),

  submit: (session: string, semester: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    form.append('session', session);
    form.append('semester', semester);
    return api.post<{ success: true; data: import('../types').Registration }>('/registration', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ── School Fees API ───────────────────────────────────────────────────────────

export const schoolFeesApi = {
  getStatus: () =>
    api.get<{ success: true; data: import('../types').SchoolFeesStatus }>('/payments/school-fees/status'),

  initiate: (sessionYear: string) =>
    api.post<{ success: true; data: { authorization_url: string; reference: string } }>(
      '/payments/school-fees/initiate', { sessionYear }
    ),
};

// ── Auth /me ──────────────────────────────────────────────────────────────────

export const profileApi = {
  getMe: () =>
    api.get<{ success: true; data: import('../types').User }>('/auth/me'),
};
```

- [ ] **Step 3: Type-check**

```bash
cd frontend && npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/api/client.ts
git commit -m "feat: add frontend types and API clients for notifications, registration, school fees"
```

---

### Task 8: StudentLayout shell

**Files:**
- Create: `frontend/src/components/StudentLayout.tsx`

- [ ] **Step 1: Create StudentLayout**

Create `frontend/src/components/StudentLayout.tsx`:

```tsx
import { NavLink, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { notificationsApi } from '../api/client';

export default function StudentLayout() {
  const { user, logout } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    notificationsApi.getUnreadCount()
      .then((r) => setUnread(r.data.data.count))
      .catch(() => {});
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : (user?.userId?.slice(0, 2).toUpperCase() ?? 'ST');

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="w-56 bg-brand-800 flex flex-col flex-shrink-0 overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-white/10">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-bold text-sm text-brand-800 flex-shrink-0">
            N
          </div>
          <div>
            <p className="font-semibold text-white text-sm leading-tight">NACOS Portal</p>
            <p className="text-white/40 text-xs">Student</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3">
          <Section label="Main">
            <Item icon="🏠" label="Dashboard" to="/student/dashboard" />
            <Item icon="📋" label="My Results" to="/student/results" />
            <Item icon="📈" label="Transcript" to="/student/transcript" />
          </Section>

          <Section label="Finance">
            <Item icon="🏫" label="School Fees" to="/student/school-fees" />
            <Item icon="💳" label="Payments" to="/student/payments" />
          </Section>

          <Section label="Academic">
            <Item icon="📝" label="Registration" to="/student/registration" />
            <Item icon="🗳️" label="Elections" to="/student/elections" />
          </Section>

          <Section label="Account">
            <Item icon="🔔" label="Notifications" to="/student/notifications" badge={unread > 0 ? unread : undefined} />
            <Item icon="👤" label="Profile" to="/student/profile" />
          </Section>
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-white/10">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user?.name || 'Student'}</p>
              <p className="text-white/40 text-xs truncate">{user?.userId}</p>
            </div>
          </div>
          <button
            onClick={() => void logout()}
            className="w-full mt-1 text-left px-3 py-1.5 text-white/50 hover:text-white text-xs rounded-lg hover:bg-white/10 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main area ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <p className="text-sm text-gray-500">
            NACOS Portal <span className="text-gray-300 mx-1">›</span>
            <span className="font-semibold text-gray-900">Student</span>
          </p>
          <div className="flex items-center gap-3">
            {user?.level && (
              <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
                {user.level} · {user.program}
              </span>
            )}
            {unread > 0 && (
              <NavLink to="/student/notifications" className="relative text-lg leading-none">
                🔔
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              </NavLink>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="px-2 mb-1 text-white/35 text-xs font-bold uppercase tracking-widest">{label}</p>
      {children}
    </div>
  );
}

function Item({ icon, label, to, badge }: { icon: string; label: string; to: string; badge?: number }) {
  return (
    <NavLink
      to={to}
      end={to === '/student/dashboard'}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium mb-0.5 transition-colors ${
          isActive ? 'bg-white/15 text-white font-semibold' : 'text-white/65 hover:bg-white/10 hover:text-white'
        }`
      }
    >
      <span className="text-sm w-4 text-center flex-shrink-0">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge !== undefined && (
        <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </NavLink>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd frontend && npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/StudentLayout.tsx
git commit -m "feat: add StudentLayout shell with sidebar and topbar"
```

---

### Task 9: App.tsx restructure + PaymentVerifyPage update

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/student/PaymentVerifyPage.tsx`
- Modify: `frontend/src/pages/student/ResultsHomePage.tsx`
- Modify: `frontend/src/pages/student/ResultDetailPage.tsx`

- [ ] **Step 1: Update App.tsx**

Replace the student route block in `frontend/src/App.tsx` with:

```tsx
import StudentLayout from './components/StudentLayout';
import StudentDashboard from './pages/student/StudentDashboard';
import TranscriptPage from './pages/student/TranscriptPage';
import SchoolFeesPage from './pages/student/SchoolFeesPage';
import PaymentsPage from './pages/student/PaymentsPage';
import RegistrationPage from './pages/student/RegistrationPage';
import ElectionsPage from './pages/student/ElectionsPage';
import NotificationsPage from './pages/student/NotificationsPage';
import ProfilePage from './pages/student/ProfilePage';
```

Replace the student `<Route>` block:

```tsx
{/* ── Student ─────────────────────────────────────────────────────── */}
<Route element={<ProtectedRoute roles={['student']} />}>
  <Route element={<StudentLayout />}>
    <Route path="/student/dashboard"           element={<StudentDashboard />} />
    <Route path="/student/results"             element={<ResultsHomePage />} />
    <Route path="/student/results/:gradebookId" element={<ResultDetailPage />} />
    <Route path="/student/transcript"          element={<TranscriptPage />} />
    <Route path="/student/school-fees"         element={<SchoolFeesPage />} />
    <Route path="/student/payments"            element={<PaymentsPage />} />
    <Route path="/student/registration"        element={<RegistrationPage />} />
    <Route path="/student/elections"           element={<ElectionsPage />} />
    <Route path="/student/notifications"       element={<NotificationsPage />} />
    <Route path="/student/profile"             element={<ProfilePage />} />
  </Route>
  {/* Full-screen — no shell */}
  <Route path="/student/results/verify"        element={<PaymentVerifyPage />} />
  <Route path="/student/school-fees/verify"    element={<PaymentVerifyPage />} />
</Route>
```

- [ ] **Step 2: Update PaymentVerifyPage to support returnTo**

Replace the full contents of `frontend/src/pages/student/PaymentVerifyPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { paymentsApi } from '../../api/client';

export default function PaymentVerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');

  const reference = searchParams.get('reference');
  const returnTo = searchParams.get('returnTo') ?? '/student/results';

  useEffect(() => {
    if (!reference) { setStatus('failed'); return; }

    paymentsApi.verify(reference)
      .then((res) => {
        if (res.data.data.status === 'success') {
          setStatus('success');
          setTimeout(() => navigate(returnTo, { replace: true }), 2000);
        } else {
          setStatus('failed');
        }
      })
      .catch(() => setStatus('failed'));
  }, [reference, navigate, returnTo]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="card p-10 text-center max-w-sm w-full">
        {status === 'verifying' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-800 mx-auto mb-4" />
            <p className="text-gray-700 font-medium">Verifying your payment…</p>
            <p className="text-sm text-gray-400 mt-1">Please wait</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <p className="text-gray-900 font-semibold text-lg">Payment successful!</p>
            <p className="text-sm text-gray-500 mt-1">Redirecting you…</p>
          </>
        )}
        {status === 'failed' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <p className="text-gray-900 font-semibold text-lg">Could not verify payment</p>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              If you completed payment, your access will be unlocked shortly.
            </p>
            <Link to={returnTo} className="btn-primary">Go back</Link>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Remove nav from ResultsHomePage**

In `frontend/src/pages/student/ResultsHomePage.tsx`, delete the entire `<nav>` block (lines starting with `<nav className="bg-brand-800...">` through its closing `</nav>`) and the wrapping `<div className="min-h-screen bg-gray-50">` + `</div>`. Replace the outer wrapper with just `<div className="p-6 max-w-3xl mx-auto">` ... `</div>`.

The file should now start with:

```tsx
export default function ResultsHomePage() {
  // ... existing state/hooks unchanged ...

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Results</h1>
        <p className="text-sm text-gray-500 mt-0.5">View and download your semester results</p>
      </div>
      {/* rest of content unchanged */}
    </div>
  );
}
```

Remove `useAuth` and `useNavigate` imports if no longer used in the file.

- [ ] **Step 4: Remove nav from ResultDetailPage**

In `frontend/src/pages/student/ResultDetailPage.tsx`, remove the `<nav>` block. Change the outer wrapper to:

```tsx
return (
  <div className="p-6 max-w-4xl mx-auto">
    {/* rest of content unchanged — header, stat cards, table */}
  </div>
);
```

Remove the `← My Results` nav link (the layout provides navigation now). Remove `useAuth` import if no longer used.

- [ ] **Step 5: Type-check**

```bash
cd frontend && npx tsc --noEmit 2>&1
```

Expected: no output. If new pages are missing, the compiler will error — create stub files for them now (empty default exports) and fix later in Group C.

Create stubs for any missing pages:

```bash
for page in StudentDashboard TranscriptPage SchoolFeesPage PaymentsPage RegistrationPage ElectionsPage NotificationsPage ProfilePage; do
  echo "export default function ${page}() { return <div className=\"p-6\"><h1>${page}</h1></div>; }" > "frontend/src/pages/student/${page}.tsx"
done
```

Re-run type-check — expected: clean.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/App.tsx frontend/src/pages/student/ frontend/src/components/
git commit -m "feat: restructure student routes under StudentLayout shell"
```

---

## Group C — Content Pages

### Task 10: StudentDashboard

**Files:**
- Modify: `frontend/src/pages/student/StudentDashboard.tsx`

- [ ] **Step 1: Implement StudentDashboard**

Replace stub with:

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { profileApi, resultsApi, notificationsApi, registrationApi, paymentsApi, extractApiError } from '../../api/client';
import type { User, ResultListItem, Registration } from '../../types';

export default function StudentDashboard() {
  const [profile, setProfile] = useState<User | null>(null);
  const [results, setResults] = useState<ResultListItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [latestReg, setLatestReg] = useState<Registration | null>(null);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [gpa, setGpa] = useState<{ cgpa: number; totalCreditsEarned: number; semesters: unknown[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      profileApi.getMe().then((r) => setProfile(r.data.data)),
      resultsApi.list().then((r) => setResults(r.data.data)),
      resultsApi.getGpa().then((r) => setGpa(r.data.data)),
      notificationsApi.getUnreadCount().then((r) => setUnread(r.data.data.count)),
      registrationApi.list().then((r) => setLatestReg(r.data.data[0] ?? null)),
      paymentsApi.history().then((r) => setPendingPayments(r.data.data.filter((p) => p.status === 'pending').length)),
    ]).finally(() => setLoading(false));
  }, []);

  const paidResults = results.filter((r) => r.hasPaid);
  const unpaidResults = results.filter((r) => !r.hasPaid);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const actions: { icon: string; label: string; note: string; href: string; urgent?: boolean }[] = [];
  if (unpaidResults.length > 0) {
    actions.push({ icon: '💳', label: 'Pay for result', note: `${unpaidResults.length} unpaid`, href: '/student/results', urgent: true });
  }
  if (pendingPayments > 0) {
    actions.push({ icon: '⏳', label: 'Pending payment', note: 'Awaiting verification', href: '/student/payments', urgent: true });
  }
  if (paidResults.length > 0) {
    actions.push({ icon: '📋', label: `${paidResults[0].gradebookName} available`, note: 'New result published', href: `/student/results/${paidResults[0].gradebookId}` });
  }
  if (latestReg?.status === 'rejected') {
    actions.push({ icon: '📝', label: 'Registration rejected', note: latestReg.reviewNote ?? 'Please re-upload', href: '/student/registration', urgent: true });
  }
  if (unread > 0) {
    actions.push({ icon: '🔔', label: `${unread} unread notification${unread > 1 ? 's' : ''}`, note: 'View all', href: '/student/notifications' });
  }

  const GRADE_COLORS = ['gpa-green', 'gpa-blue', 'gpa-gray'];

  if (loading) return <div className="p-6 text-center text-gray-400">Loading dashboard…</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}, {profile?.name?.split(' ')[0] ?? 'Student'} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {profile?.program ?? '—'} · {profile?.level ?? '—'} · NACOS Portal
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon="🎓" value={gpa?.cgpa.toFixed(2) ?? '—'} label="Cumulative GPA" color="text-brand-800" sub={gpa && gpa.cgpa > 0 ? '↑ Keep it up!' : undefined} />
        <StatCard icon="📚" value={String(gpa?.totalCreditsEarned ?? 0)} label="Credits Earned" color="text-green-700" sub={`${gpa?.semesters.length ?? 0} semesters`} />
        <StatCard icon="📅" value={profile?.level ?? '—'} label="Current Level" color="text-yellow-700" sub={profile?.program} />
        <StatCard icon="📊" value={String(gpa?.semesters.length ?? 0)} label="Semesters Done" color="text-purple-700" sub={results.length > 0 ? `${unpaidResults.length} result pending` : undefined} />
      </div>

      {/* Two panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Recent Results */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">📋 Recent Results</h2>
            <Link to="/student/results" className="text-xs text-brand-800 font-medium hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {paidResults.length === 0 && (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">No results available yet.</p>
            )}
            {paidResults.slice(0, 3).map((r, i) => (
              <div key={r.gradebookId} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{r.gradebookName}</p>
                  <p className="text-xs text-gray-400">{r.level} · {r.session} · <span className="capitalize">{r.semester}</span> Sem</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/student/results/${r.gradebookId}`} className="text-xs text-brand-800 font-medium hover:underline">View →</Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Required */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">⚡ Action Required</h2>
            {actions.some((a) => a.urgent) && (
              <span className="badge badge-yellow">{actions.filter((a) => a.urgent).length} pending</span>
            )}
          </div>
          <div className="divide-y divide-gray-50">
            {actions.length === 0 && (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">You're all caught up! ✅</p>
            )}
            {actions.map((action, i) => (
              <Link key={i} to={action.href} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors block">
                <span className="text-base mt-0.5">{action.icon}</span>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${action.urgent ? 'text-gray-900' : 'text-gray-700'}`}>{action.label}</p>
                  <p className="text-xs text-gray-400">{action.note}</p>
                </div>
                {action.urgent && <span className="w-2 h-2 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-5 gap-3">
          {[
            { icon: '📋', label: 'My Results', to: '/student/results' },
            { icon: '🏫', label: 'School Fees', to: '/student/school-fees' },
            { icon: '📈', label: 'Transcript', to: '/student/transcript' },
            { icon: '🗳️', label: 'Elections', to: '/student/elections' },
            { icon: '👤', label: 'Profile', to: '/student/profile' },
          ].map((qa) => (
            <Link
              key={qa.to}
              to={qa.to}
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-gray-200 hover:border-brand-300 hover:bg-blue-50 transition-all text-center"
            >
              <span className="text-xl">{qa.icon}</span>
              <span className="text-xs font-medium text-gray-700 leading-tight">{qa.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, color, sub }: { icon: string; value: string; label: string; color: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xl mb-1">{icon}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd frontend && npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/student/StudentDashboard.tsx
git commit -m "feat: implement StudentDashboard with stat cards, results panel, action alerts"
```

---

### Task 11: TranscriptPage + ProfilePage + ElectionsPage

**Files:**
- Modify: `frontend/src/pages/student/TranscriptPage.tsx`
- Modify: `frontend/src/pages/student/ProfilePage.tsx`
- Modify: `frontend/src/pages/student/ElectionsPage.tsx`

- [ ] **Step 1: Implement TranscriptPage**

Replace stub in `frontend/src/pages/student/TranscriptPage.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { resultsApi, profileApi, extractApiError } from '../../api/client';
import type { GpaSummary, User } from '../../types';

export default function TranscriptPage() {
  const [gpa, setGpa] = useState<GpaSummary | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([resultsApi.getGpa(), profileApi.getMe()])
      .then(([gpaRes, profileRes]) => {
        setGpa(gpaRes.data.data);
        setProfile(profileRes.data.data);
      })
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  const handlePrint = () => window.print();

  if (loading) return <div className="p-6 text-center text-gray-400">Loading transcript…</div>;
  if (error) return <div className="p-6 text-center text-red-600">{error}</div>;

  const sorted = [...(gpa?.semesters ?? [])].sort((a, b) =>
    a.session.localeCompare(b.session) || a.semester.localeCompare(b.semester)
  );

  // Running CGPA calculation
  let runningWeighted = 0;
  let runningCredits = 0;
  const rows = sorted.map((sem) => {
    runningWeighted += sem.sgpa * sem.totalCredits;
    runningCredits += sem.totalCredits;
    return { ...sem, runningCgpa: runningCredits > 0 ? runningWeighted / runningCredits : 0 };
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Academic Transcript</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {profile?.name} · {profile?.userId} · {profile?.program}
          </p>
        </div>
        <button onClick={handlePrint} className="btn-secondary print:hidden">
          🖨️ Print / Export
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6 print:hidden">
        <div className="card p-4 text-center border-blue-100 bg-blue-50">
          <div className="text-2xl font-bold text-brand-800">{gpa?.cgpa.toFixed(2) ?? '—'}</div>
          <div className="text-xs text-gray-500 mt-1">Overall CGPA</div>
        </div>
        <div className="card p-4 text-center border-green-100 bg-green-50">
          <div className="text-2xl font-bold text-green-700">{gpa?.totalCreditsEarned ?? 0}</div>
          <div className="text-xs text-gray-500 mt-1">Total Credits Earned</div>
        </div>
        <div className="card p-4 text-center border-yellow-100 bg-yellow-50">
          <div className="text-2xl font-bold text-yellow-700">{gpa?.semesters.length ?? 0}</div>
          <div className="text-xs text-gray-500 mt-1">Semesters Completed</div>
        </div>
      </div>

      {/* Transcript table */}
      <div className="card overflow-hidden" ref={printRef}>
        {/* Print header */}
        <div className="hidden print:block px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold">NACOS-AIFUE Academic Transcript</h2>
          <p className="text-sm text-gray-600">{profile?.name} · {profile?.userId} · {profile?.program} · {profile?.level}</p>
        </div>

        {rows.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p>No transcript data available.</p>
            <p className="text-sm mt-1">Results appear here after you pay for them.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Session</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Semester</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Credits</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">SGPA</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Running CGPA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={`${row.session}-${row.semester}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-800">{row.session}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{row.semester}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{row.totalCredits}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold ${row.sgpa >= 3.5 ? 'text-green-700' : row.sgpa >= 2.5 ? 'text-blue-700' : 'text-red-600'}`}>
                      {row.sgpa.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-brand-800">
                    {row.runningCgpa.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-gray-700">Overall</td>
                <td className="px-4 py-3 text-center font-bold">{gpa?.totalCreditsEarned}</td>
                <td className="px-4 py-3 text-center text-gray-400">—</td>
                <td className="px-4 py-3 text-center font-bold text-brand-800">{gpa?.cgpa.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement ProfilePage**

Replace stub in `frontend/src/pages/student/ProfilePage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { profileApi, extractApiError } from '../../api/client';
import type { User } from '../../types';

const LEVEL_LABELS: Record<string, string> = { L100: '100 Level', L200: '200 Level', L300: '300 Level', L400: '400 Level' };
const PROGRAM_LABELS: Record<string, string> = { CSC: 'Computer Science', ICT: 'Information Technology', CRE: 'Computer & Robotics Engineering' };

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    profileApi.getMe()
      .then((r) => setUser(r.data.data))
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-center text-gray-400">Loading profile…</div>;
  if (error || !user) return <div className="p-6 text-center text-red-600">{error || 'Profile not found'}</div>;

  const initials = user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

      <div className="card p-6 mb-4">
        {/* Avatar + name */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
          <div className="w-16 h-16 rounded-full bg-brand-800 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {initials}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
            <p className="text-sm text-gray-500">{user.userId}</p>
            <span className={`badge mt-1 ${user.status === 'validated' ? 'badge-green' : 'badge-yellow'}`}>
              {user.status}
            </span>
          </div>
        </div>

        {/* Info rows */}
        <div className="space-y-4">
          <InfoRow label="Full Name" value={user.name} />
          <InfoRow label="Student ID" value={user.userId} mono />
          <InfoRow label="Email Address" value={user.email} />
          <InfoRow label="Phone Number" value={user.phone ?? '—'} />
          <InfoRow label="Programme" value={PROGRAM_LABELS[user.program] ?? user.program} />
          <InfoRow label="Current Level" value={LEVEL_LABELS[user.level] ?? user.level} />
        </div>
      </div>

      {/* Account actions */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Account</h3>
        <Link
          to="/auth/forgot-password"
          className="text-sm text-brand-800 font-medium hover:underline"
        >
          Change Password →
        </Link>
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

- [ ] **Step 3: Implement ElectionsPage**

Replace stub in `frontend/src/pages/student/ElectionsPage.tsx`:

```tsx
export default function ElectionsPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Departmental Elections</h1>
      <p className="text-sm text-gray-500 mb-8">Vote for your student union representatives</p>

      <div className="card p-12 text-center">
        <div className="text-6xl mb-4">🗳️</div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">No Active Elections</h2>
        <p className="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
          There are no departmental elections running at the moment. When the department
          opens an election, it will appear here and you will receive a notification.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Type-check**

```bash
cd frontend && npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/student/TranscriptPage.tsx frontend/src/pages/student/ProfilePage.tsx frontend/src/pages/student/ElectionsPage.tsx
git commit -m "feat: add TranscriptPage, ProfilePage, ElectionsPage"
```

---

### Task 12: PaymentsPage + SchoolFeesPage

**Files:**
- Modify: `frontend/src/pages/student/PaymentsPage.tsx`
- Modify: `frontend/src/pages/student/SchoolFeesPage.tsx`

- [ ] **Step 1: Implement PaymentsPage**

Replace stub in `frontend/src/pages/student/PaymentsPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { paymentsApi, extractApiError } from '../../api/client';
import type { Payment } from '../../types';

const STATUS_BADGE: Record<string, string> = {
  success: 'badge-green',
  pending: 'badge-yellow',
  failed: 'badge-red',
  refunded: 'badge-blue',
};

const TYPE_LABELS: Record<string, string> = {
  result_subscription: 'Result Subscription',
  school_fees: 'School Fees',
  nacos_dues: 'NACOS Dues',
  other: 'Other',
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    paymentsApi.history()
      .then((r) => setPayments(r.data.data))
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Payment History</h1>
      <p className="text-sm text-gray-500 mb-6">All your result subscription payments</p>

      {error && <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm mb-4">{error}</div>}

      {loading ? (
        <div className="card p-8 text-center text-gray-400">Loading…</div>
      ) : payments.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">💳</div>
          <p className="text-gray-500">No payments yet.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Period</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Amount</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Reference</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-gray-800">{TYPE_LABELS[p.type] ?? p.type}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {p.sessionYear ?? '—'}{p.semester ? ` · ${p.semester}` : ''}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    ₦{p.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{p.reference.slice(0, 12)}…</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`badge ${STATUS_BADGE[p.status] ?? 'badge-blue'}`}>{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Implement SchoolFeesPage**

Replace stub in `frontend/src/pages/student/SchoolFeesPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { schoolFeesApi, extractApiError } from '../../api/client';
import type { SchoolFeesStatus } from '../../types';

export default function SchoolFeesPage() {
  const [feesStatus, setFeesStatus] = useState<SchoolFeesStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    schoolFeesApi.getStatus()
      .then((r) => setFeesStatus(r.data.data))
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  const handlePay = async () => {
    if (!feesStatus) return;
    setPaying(true);
    try {
      const res = await schoolFeesApi.initiate(feesStatus.currentSession);
      window.location.href = res.data.data.authorization_url;
    } catch (err) {
      setError(extractApiError(err));
      setPaying(false);
    }
  };

  const isPaid = feesStatus?.status === 'success';

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">School Fees</h1>
      <p className="text-sm text-gray-500 mb-6">Pay and manage your tuition fees</p>

      {error && <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm mb-4">{error}</div>}

      {loading ? (
        <div className="card p-8 text-center text-gray-400">Loading…</div>
      ) : feesStatus ? (
        <>
          {/* Current session card */}
          <div className={`card p-6 mb-4 border-l-4 ${isPaid ? 'border-green-500' : 'border-orange-400'}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Current Session</p>
                <p className="text-lg font-bold text-gray-900">{feesStatus.currentSession}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  Amount: <span className="font-semibold text-gray-900">₦{feesStatus.amount.toLocaleString()}</span>
                </p>
              </div>
              <span className={`badge text-sm px-3 py-1 ${isPaid ? 'badge-green' : 'badge-yellow'}`}>
                {isPaid ? '✅ Paid' : '⚠️ Unpaid'}
              </span>
            </div>

            {isPaid && feesStatus.paidAt && (
              <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600">
                <p>Paid on: <strong>{new Date(feesStatus.paidAt).toLocaleDateString()}</strong></p>
                <p className="font-mono text-xs text-gray-400 mt-0.5">Ref: {feesStatus.reference}</p>
              </div>
            )}

            {!isPaid && (
              <button
                onClick={() => void handlePay()}
                disabled={paying}
                className="btn-primary mt-4 w-full disabled:opacity-60"
              >
                {paying ? 'Redirecting to payment…' : `Pay ₦${feesStatus.amount.toLocaleString()} Now`}
              </button>
            )}
          </div>

          <div className="card p-4">
            <p className="text-xs text-gray-400 leading-relaxed">
              School fees payments are processed securely via Paystack. After payment, your receipt will be
              available on this page. For queries, contact the department office.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
cd frontend && npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/student/PaymentsPage.tsx frontend/src/pages/student/SchoolFeesPage.tsx
git commit -m "feat: add PaymentsPage and SchoolFeesPage"
```

---

### Task 13: RegistrationPage + NotificationsPage

**Files:**
- Modify: `frontend/src/pages/student/RegistrationPage.tsx`
- Modify: `frontend/src/pages/student/NotificationsPage.tsx`

- [ ] **Step 1: Implement RegistrationPage**

Replace stub in `frontend/src/pages/student/RegistrationPage.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { registrationApi, extractApiError } from '../../api/client';
import type { Registration } from '../../types';

const SEMESTERS = [
  { value: 'first', label: 'First Semester' },
  { value: 'second', label: 'Second Semester' },
];

const STATUS_STYLES: Record<string, string> = {
  pending: 'badge-yellow',
  verified: 'badge-green',
  rejected: 'badge-red',
};

const STATUS_ICONS: Record<string, string> = { pending: '⏳', verified: '✅', rejected: '❌' };

export default function RegistrationPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [session, setSession] = useState('');
  const [semester, setSemester] = useState('first');
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    registrationApi.list()
      .then((r) => setRegistrations(r.data.data))
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const latestVerified = registrations.find((r) => r.status === 'verified');
  const latestReg = registrations[0] ?? null;

  const handleSubmit = async () => {
    if (!file || !session.match(/^\d{4}\/\d{4}$/)) {
      setError('Please enter a valid session (YYYY/YYYY) and select a file.');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccessMsg('');
    try {
      await registrationApi.submit(session, semester, file);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setSuccessMsg('Course registration form submitted successfully. Awaiting admin review.');
      load();
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Course Registration</h1>
      <p className="text-sm text-gray-500 mb-6">Upload your course registration form for admin verification</p>

      {error && <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm mb-4">{error}</div>}
      {successMsg && <div className="bg-green-50 border border-green-200 rounded p-3 text-green-700 text-sm mb-4">{successMsg}</div>}

      {/* Latest status card */}
      {latestReg && (
        <div className={`card p-4 mb-4 border-l-4 ${latestReg.status === 'verified' ? 'border-green-500' : latestReg.status === 'rejected' ? 'border-red-400' : 'border-yellow-400'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">{latestReg.session} — <span className="capitalize">{latestReg.semester}</span> Semester</p>
              <p className="text-xs text-gray-500 mt-0.5">Submitted {new Date(latestReg.submittedAt).toLocaleDateString()}</p>
            </div>
            <span className={`badge ${STATUS_STYLES[latestReg.status]}`}>
              {STATUS_ICONS[latestReg.status]} {latestReg.status}
            </span>
          </div>
          {latestReg.status === 'rejected' && latestReg.reviewNote && (
            <div className="mt-3 p-3 bg-red-50 rounded text-sm text-red-700">
              <strong>Rejection reason:</strong> {latestReg.reviewNote}
            </div>
          )}
          {latestReg.fileUrl && (
            <a href={latestReg.fileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-brand-800 hover:underline">
              View uploaded form →
            </a>
          )}
        </div>
      )}

      {/* Upload form */}
      {latestReg?.status !== 'verified' && (
        <div className="card p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            {latestReg ? 'Re-upload Course Form' : 'Upload Course Registration Form'}
          </h3>
          <p className="text-xs text-gray-400 mb-4">Accepted: PDF, JPG, PNG · Max 5 MB</p>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Session</label>
                <input
                  type="text"
                  placeholder="e.g. 2024/2025"
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  className="input text-sm"
                />
              </div>
              <div>
                <label className="label text-xs">Semester</label>
                <select value={semester} onChange={(e) => setSemester(e.target.value)} className="input text-sm">
                  {SEMESTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label text-xs">Course Form File</label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block text-sm text-gray-600"
              />
            </div>
            <button
              onClick={() => void handleSubmit()}
              disabled={submitting || !file}
              className="btn-primary w-full disabled:opacity-60"
            >
              {submitting ? 'Uploading…' : 'Submit Registration Form'}
            </button>
          </div>
        </div>
      )}

      {/* History */}
      {registrations.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-700">
            Submission History
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Session</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Semester</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Submitted</th>
                <th className="text-center px-4 py-2 text-xs font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {registrations.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-800">{r.session}</td>
                  <td className="px-4 py-2 text-gray-600 capitalize">{r.semester}</td>
                  <td className="px-4 py-2 text-gray-400 text-xs">{new Date(r.submittedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`badge ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Implement NotificationsPage**

Replace stub in `frontend/src/pages/student/NotificationsPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { notificationsApi, extractApiError } from '../../api/client';
import type { Notification } from '../../types';

const TYPE_ICONS: Record<string, string> = {
  result: '📋',
  payment: '💳',
  election: '🗳️',
  system: '⚙️',
  general: '📣',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    notificationsApi.list()
      .then((r) => setNotifications(r.data.data))
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleMarkRead = async (id: string) => {
    await notificationsApi.markRead(id).catch(() => {});
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleMarkAll = async () => {
    await notificationsApi.markAllRead().catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">Department announcements and alerts</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={() => void handleMarkAll()} className="btn-secondary btn-sm">
            Mark all as read
          </button>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm mb-4">{error}</div>}

      {loading ? (
        <div className="card p-8 text-center text-gray-400">Loading…</div>
      ) : notifications.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">🔔</div>
          <p className="text-gray-500">No notifications yet.</p>
          <p className="text-sm text-gray-400 mt-1">Department announcements will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => void handleMarkRead(n.id)}
              className={`card p-4 cursor-pointer transition-colors hover:shadow-md border-l-4 ${
                n.isRead ? 'bg-gray-50 border-gray-200' : 'bg-white border-blue-400'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">{TYPE_ICONS[n.type] ?? '📣'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`text-sm ${n.isRead ? 'font-medium text-gray-700' : 'font-semibold text-gray-900'}`}>
                      {n.title}
                    </h3>
                    <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{n.body}</p>
                </div>
                {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
cd frontend && npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 4: Run all backend tests**

```bash
cd backend && npm test 2>&1 | tail -8
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/student/RegistrationPage.tsx frontend/src/pages/student/NotificationsPage.tsx
git commit -m "feat: add RegistrationPage and NotificationsPage"
```

---

## Final Verification

- [ ] **Backend type-check**

```bash
cd backend && npx tsc --noEmit && echo "BACKEND OK"
```

Expected: `BACKEND OK`

- [ ] **Frontend type-check**

```bash
cd frontend && npx tsc --noEmit && echo "FRONTEND OK"
```

Expected: `FRONTEND OK`

- [ ] **All backend tests pass**

```bash
cd backend && npm test 2>&1 | tail -5
```

Expected: `39 passed`

- [ ] **Final commit**

```bash
git add -A
git commit -m "feat: complete student dashboard portal (shell, 8 pages, backend modules)"
```
