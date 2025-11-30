import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';

// Import routes
import stripeRoutes from './stripe.js';
import authRoutes from './auth.js';

// Create test app with session support
function createTestApp() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  // Add session middleware for testing
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  }));

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API root
  app.get('/api', (_req, res) => {
    res.json({
      message: 'Workspace守り番 API',
      version: '0.1.0',
    });
  });

  // Routes
  app.use('/api/stripe', stripeRoutes);
  app.use('/api/auth', authRoutes);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}

describe('API Integration Tests', () => {
  const app = createTestApp();

  describe('Health Check', () => {
    it('GET /health returns ok status', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('API Root', () => {
    it('GET /api returns API info', async () => {
      const response = await request(app)
        .get('/api')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.message).toBe('Workspace守り番 API');
      expect(response.body.version).toBe('0.1.0');
    });
  });

  describe('Stripe Routes', () => {
    describe('GET /api/stripe/plans', () => {
      it('returns all available plans', async () => {
        const response = await request(app)
          .get('/api/stripe/plans')
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body.plans).toBeInstanceOf(Array);
        expect(response.body.plans).toHaveLength(4);

        const planIds = response.body.plans.map((p: { id: string }) => p.id);
        expect(planIds).toContain('free');
        expect(planIds).toContain('basic');
        expect(planIds).toContain('pro');
        expect(planIds).toContain('enterprise');
      });

      it('free plan has correct structure', async () => {
        const response = await request(app)
          .get('/api/stripe/plans')
          .expect(200);

        const freePlan = response.body.plans.find((p: { id: string }) => p.id === 'free');
        expect(freePlan).toBeDefined();
        expect(freePlan.name).toBe('無料');
        expect(freePlan.price).toBe(0);
        expect(freePlan.maxUsers).toBe(5);
        expect(freePlan.maxScansPerMonth).toBe(2);
        expect(freePlan.features).toBeInstanceOf(Array);
      });

      it('basic plan has correct pricing', async () => {
        const response = await request(app)
          .get('/api/stripe/plans')
          .expect(200);

        const basicPlan = response.body.plans.find((p: { id: string }) => p.id === 'basic');
        expect(basicPlan).toBeDefined();
        expect(basicPlan.name).toBe('ベーシック');
        expect(basicPlan.price).toBe(200);
        expect(basicPlan.maxUsers).toBe(20);
        expect(basicPlan.maxScansPerMonth).toBe(10);
      });

      it('pro plan has unlimited scans', async () => {
        const response = await request(app)
          .get('/api/stripe/plans')
          .expect(200);

        const proPlan = response.body.plans.find((p: { id: string }) => p.id === 'pro');
        expect(proPlan).toBeDefined();
        expect(proPlan.maxScansPerMonth).toBe(-1);
      });

      it('enterprise plan has custom pricing', async () => {
        const response = await request(app)
          .get('/api/stripe/plans')
          .expect(200);

        const enterprisePlan = response.body.plans.find((p: { id: string }) => p.id === 'enterprise');
        expect(enterprisePlan).toBeDefined();
        expect(enterprisePlan.price).toBe(-1); // Custom pricing
        expect(enterprisePlan.maxUsers).toBe(-1); // Unlimited
      });
    });

    describe('GET /api/stripe/subscription', () => {
      it('returns 401 without authentication', async () => {
        const response = await request(app)
          .get('/api/stripe/subscription')
          .expect(401);

        expect(response.body.error).toBe('Authentication required');
      });
    });

    describe('POST /api/stripe/checkout', () => {
      it('returns 401 without authentication', async () => {
        const response = await request(app)
          .post('/api/stripe/checkout')
          .send({ plan: 'basic' })
          .expect(401);

        expect(response.body.error).toBe('Authentication required');
      });
    });

    describe('POST /api/stripe/portal', () => {
      it('returns 401 without authentication', async () => {
        const response = await request(app)
          .post('/api/stripe/portal')
          .expect(401);

        expect(response.body.error).toBe('Authentication required');
      });
    });
  });

  describe('Auth Routes', () => {
    describe('GET /api/auth/login', () => {
      it('redirects to Google OAuth', async () => {
        const response = await request(app)
          .get('/api/auth/login')
          .expect(302);

        expect(response.headers.location).toContain('accounts.google.com');
        expect(response.headers.location).toContain('oauth2');
      });
    });

    describe('GET /api/auth/me', () => {
      it('returns 401 without authentication', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .expect(401);

        expect(response.body.error).toBe('Not authenticated');
      });
    });

    describe('POST /api/auth/logout', () => {
      it('returns success for logout', async () => {
        const response = await request(app)
          .post('/api/auth/logout')
          .expect(200);

        expect(response.body.message).toBe('Logged out successfully');
      });
    });
  });
});

describe('API Error Handling', () => {
  const app = createTestApp();

  it('returns 404 for unknown routes', async () => {
    const response = await request(app)
      .get('/api/unknown-endpoint')
      .expect(404);

    expect(response.body.error).toBe('Not found');
  });
});

describe('API Security', () => {
  const app = createTestApp();

  it('has security headers from helmet', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    // Helmet adds various security headers
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('accepts requests with JSON content type', async () => {
    const response = await request(app)
      .post('/api/stripe/checkout')
      .set('Content-Type', 'application/json')
      .send({ plan: 'basic' })
      .expect(401); // Unauthorized but request was processed

    expect(response.body.error).toBeDefined();
  });
});

describe('Stripe Plan Details', () => {
  const app = createTestApp();

  it('all plans have required fields', async () => {
    const response = await request(app)
      .get('/api/stripe/plans')
      .expect(200);

    for (const plan of response.body.plans) {
      expect(plan).toHaveProperty('id');
      expect(plan).toHaveProperty('name');
      expect(plan).toHaveProperty('price');
      expect(plan).toHaveProperty('maxUsers');
      expect(plan).toHaveProperty('maxScansPerMonth');
      expect(plan).toHaveProperty('features');
      expect(plan.features).toBeInstanceOf(Array);
      expect(plan.features.length).toBeGreaterThan(0);
    }
  });

  it('plans are in correct order', async () => {
    const response = await request(app)
      .get('/api/stripe/plans')
      .expect(200);

    const planIds = response.body.plans.map((p: { id: string }) => p.id);
    expect(planIds).toEqual(['free', 'basic', 'pro', 'enterprise']);
  });
});
