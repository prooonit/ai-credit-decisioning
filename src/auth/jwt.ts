import { SignJWT, jwtVerify } from 'jose';

import { env } from '../config/env.js';

const jwtSecret = new TextEncoder().encode(env.JWT_SECRET);
const JWT_ALGORITHM = 'HS256';

export const signAccessToken = (userId: string) =>
  new SignJWT({})
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(jwtSecret);

export const verifyAccessToken = async (token: string) => {
  const { payload } = await jwtVerify(token, jwtSecret, { algorithms: [JWT_ALGORITHM] });

  if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
    throw new Error('JWT subject is missing');
  }

  return { userId: payload.sub };
};
