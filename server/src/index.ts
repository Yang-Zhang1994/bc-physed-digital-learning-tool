import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/db';
import { ENV } from './utils/env';
import authRoutes from './routes/authRoutes';
import petRoutes from './routes/petRoutes';
import progressRoutes from "./routes/progressRoutes";
import contentRoutes from './routes/contentRoutes';
import teacherRoutes from './routes/teacherRoutes';


async function bootstrap() {
  await connectDB();

  try {
    const { Module } = await import('./models/module');
    const count = await Module.countDocuments();
    if (count === 0 && process.env.AUTO_SEED !== 'false') {
      console.log('📦 Empty Module collection — running content seed…');
      const { runSeed } = await import('./database/seed');
      await runSeed({ disconnect: false });
    }
  } catch (e) {
    console.warn('Auto-seed skipped:', e);
  }

  const app = express();

  console.log("✅ Loaded CLIENT_ORIGIN:", ENV.CLIENT_ORIGIN);
  console.log("✅ Cookie secure:", ENV.COOKIE_SECURE, "| access TTL:", ENV.ACCESS_TOKEN_TTL);

  const corsOptions = {
    origin: ENV.CLIENT_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };

  app.use(cors(corsOptions));
  app.options(/.*/, cors(corsOptions));

  app.use((req, res, next) => {
    console.log("🌐 Incoming Origin:", req.headers.origin, req.method, req.path);
    next();
  });

  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes);
  app.use("/api/pet", petRoutes);
  app.use("/api/progress", progressRoutes);
  app.use('/api/content', contentRoutes);
  app.use('/api/teacher', teacherRoutes);

  app.listen(ENV.PORT, () => console.log(`🚀 Server on http://localhost:${ENV.PORT}`));
}


bootstrap();
