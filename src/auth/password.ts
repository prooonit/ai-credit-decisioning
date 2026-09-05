import bcrypt from 'bcryptjs';

const PASSWORD_HASH_ROUNDS = 12;

export const hashPassword = (password: string) => bcrypt.hash(password, PASSWORD_HASH_ROUNDS);

export const verifyPassword = (password: string, passwordHash: string) =>
  bcrypt.compare(password, passwordHash);
