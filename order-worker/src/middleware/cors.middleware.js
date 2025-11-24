import { cors } from 'hono/cors';
import { ALLOWED_ORIGINS } from '../config/origins.config.js';

export default cors({
  origin: (origin) => {
    if (!origin) return 'http://localhost:5173';
    return ALLOWED_ORIGINS.includes(origin) ? origin : 'http://localhost:5173';
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Guest-Session-Id'],
  credentials: true,
  maxAge: 86400,
});

