import { Router } from 'express';
import { getMe, getMyCard } from '../services/profile.service';
import { authenticate, uid } from '../middleware/auth';

export const meRouter = Router();

meRouter.get('/api/me', authenticate, async (req, res) => {
  res.json(await getMe(uid(req)));
});

meRouter.get('/api/me/card', authenticate, async (req, res) => {
  res.json(await getMyCard(uid(req)));
});