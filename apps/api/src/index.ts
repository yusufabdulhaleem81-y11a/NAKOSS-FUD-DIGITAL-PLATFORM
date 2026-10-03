import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { env } from './config/env';
import { ApiError } from './lib/supabase';
import { generalLimiter } from './middleware/auth';
import { meRouter } from './routes/me.routes';
import { authRouter } from './routes/auth.routes';
import { publicRouter } from './routes/public.routes';
import { membersRouter } from './routes/members.routes';
import { invitesRouter } from './routes/invites.routes';
import { adminRouter } from './routes/admin.routes';
import { tasksRouter } from './routes/tasks.routes';
import { approvalsRouter } from './routes/approvals.routes';
import { contentRouter } from './routes/content.routes';
import { resourcesRouter } from './routes/resources.routes';
import { galleryRouter } from './routes/gallery.routes';
import { submissionsRouter } from './routes/submissions.routes';
import { notificationsRouter } from './routes/notifications.routes';
import { analyticsRouter } from './routes/analytics.routes';

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()), credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(generalLimiter);

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'nakoss-api' }));

app.use(meRouter);
app.use(authRouter);
app.use(publicRouter);
app.use(membersRouter);
app.use(invitesRouter);
app.use(adminRouter);
app.use(tasksRouter);
app.use(approvalsRouter);
app.use(contentRouter);
app.use(resourcesRouter);
app.use(galleryRouter);
app.use(submissionsRouter);
app.use(notificationsRouter);
app.use(analyticsRouter);

app.use((_req, res) => res.status(404).json({ message: 'Not found' }));

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ message: err.message, code: err.code });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ message: 'Invalid input', code: 'VALIDATION_ERROR', details: err.issues });
  }
  if ((err as any)?.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Malformed JSON body' });
  }
  if ((err as any)?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large', code: 'FILE_TOO_LARGE' });
  }
  console.error('[api] unhandled error:', err);
  return res.status(500).json({ message: 'Internal server error' });
});

app.listen(env.PORT, () => {
  console.log(`✅ NAKOSS API running on http://localhost:${env.PORT}`);
});