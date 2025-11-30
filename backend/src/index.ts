// dotenvを最初に読み込む（ESモジュールではimport文が先に評価されるため）
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';

// Routes
import authRoutes from './routes/auth.js';
import scanRoutes from './routes/scan.js';
import organizationRoutes from './routes/organization.js';
import stripeRoutes from './routes/stripe.js';
import auditLogRoutes from './routes/auditLogs.js';
import reportRoutes from './routes/reports.js';
import notificationRoutes from './routes/notifications.js';
import delegationRoutes from './routes/delegation.js';

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Stripe Webhook needs raw body (must be before express.json())
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.get('/api', (req, res) => {
  res.json({
    message: 'Workspace守り番 API',
    version: '0.1.0',
  });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Scan routes
app.use('/api/scan', scanRoutes);

// Organization routes
app.use('/api/organization', organizationRoutes);

// Stripe routes (Webhook needs raw body, so we handle it specially)
// For webhook, use express.raw() middleware in the route itself
app.use('/api/stripe', stripeRoutes);

// Audit log routes
app.use('/api/audit-logs', auditLogRoutes);

// Report routes (ISMS/Pマーク対応)
app.use('/api/reports', reportRoutes);

// Notification routes
app.use('/api/notifications', notificationRoutes);

// Domain-Wide Delegation routes
app.use('/api/delegation', delegationRoutes);

app.listen(PORT, () => {
  console.log(`🛡️ Workspace守り番 Backend running on port ${PORT}`);
});

export default app;
