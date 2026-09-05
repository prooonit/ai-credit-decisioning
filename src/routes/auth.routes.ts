import type { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { authService } from '../auth/auth.service.js';
import { signAccessToken } from '../auth/jwt.js';
import { AppError } from '../lib/errors.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateRequest } from '../middleware/validate-request.js';

const registerSchema = z.object({
  email: z
    .string()
    .email()
    .transform((value) => value.trim().toLowerCase()),
  name: z.string().trim().min(1).max(200),
  password: z.string().min(12).max(200),
  tenantName: z.string().trim().min(1).max(200),
  tenantSlug: z
    .string()
    .trim()
    .min(3)
    .max(63)
    .regex(/^[a-z0-9-]+$/)
    .transform((value) => value.toLowerCase()),
});

const loginSchema = z.object({
  email: z
    .string()
    .email()
    .transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1).max(200),
});

export const createAuthRouter = (prisma: PrismaClient) => {
  const router = Router();

  router.post('/register', validateRequest(registerSchema), async (req, res, next) => {
    try {
      const { user, tenant } = await authService.register(
        prisma,
        req.body as z.infer<typeof registerSchema>,
      );
      console.log('User registered:', req.body);
      const accessToken = await signAccessToken(user.id);
      res.status(201).json({
        accessToken,
        user: { id: user.id, email: user.email, name: user.name },
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/login', validateRequest(loginSchema), async (req, res, next) => {
    try {
      const { email, password } = req.body as z.infer<typeof loginSchema>;
      const user = await authService.login(prisma, email, password);
      res.status(200).json({ accessToken: await signAccessToken(user.id) });
    } catch (error) {
      next(error);
    }
  });

  router.get('/me', authenticate, async (req, res, next) => {
    try {
      const user = await authService.getUser(prisma, req.auth!.userId);
      if (!user) throw new AppError('Authenticated user no longer exists', 401, 'UNAUTHENTICATED');
      res.status(200).json({ user: { id: user.id, email: user.email, name: user.name } });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
