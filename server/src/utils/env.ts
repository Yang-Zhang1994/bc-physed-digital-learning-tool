import 'dotenv/config';

export const ENV = {
  PORT: process.env.PORT || '5000',
  MONGO_URI: process.env.MONGO_URI ?? '',
  JWT_SECRET: process.env.JWT_SECRET ?? '',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173'
};

if (!ENV.MONGO_URI || !ENV.JWT_SECRET) {
  throw new Error('Missing env vars: MONGO_URI or JWT_SECRET');
}
