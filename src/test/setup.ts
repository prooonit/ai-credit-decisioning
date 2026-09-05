process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5432/credit_decisioning_test?schema=public';
process.env.JWT_SECRET = 'test-only-secret-that-is-longer-than-thirty-two-characters';
