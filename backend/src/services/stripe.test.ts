import { describe, it, expect } from 'vitest';
import { PLAN_CONFIG, checkPlanLimits, getPlanInfo, type PlanType } from './stripe.js';

describe('PLAN_CONFIG', () => {
  it('has all expected plans', () => {
    expect(PLAN_CONFIG).toHaveProperty('free');
    expect(PLAN_CONFIG).toHaveProperty('basic');
    expect(PLAN_CONFIG).toHaveProperty('pro');
    expect(PLAN_CONFIG).toHaveProperty('enterprise');
  });

  it('free plan has correct limits', () => {
    expect(PLAN_CONFIG.free.price).toBe(0);
    expect(PLAN_CONFIG.free.maxUsers).toBe(5);
    expect(PLAN_CONFIG.free.maxScansPerMonth).toBe(2);
  });

  it('basic plan has correct limits', () => {
    expect(PLAN_CONFIG.basic.price).toBe(200);
    expect(PLAN_CONFIG.basic.maxUsers).toBe(20);
    expect(PLAN_CONFIG.basic.maxScansPerMonth).toBe(10);
  });

  it('pro plan has unlimited scans', () => {
    expect(PLAN_CONFIG.pro.price).toBe(500);
    expect(PLAN_CONFIG.pro.maxUsers).toBe(100);
    expect(PLAN_CONFIG.pro.maxScansPerMonth).toBe(-1); // unlimited
  });

  it('enterprise plan has unlimited everything', () => {
    expect(PLAN_CONFIG.enterprise.price).toBe(-1); // custom pricing
    expect(PLAN_CONFIG.enterprise.maxUsers).toBe(-1); // unlimited
    expect(PLAN_CONFIG.enterprise.maxScansPerMonth).toBe(-1); // unlimited
  });
});

describe('checkPlanLimits', () => {
  describe('free plan', () => {
    const plan: PlanType = 'free';

    it('can add user when under limit', () => {
      const result = checkPlanLimits(plan, 3, 0);
      expect(result.canAddUser).toBe(true);
      expect(result.usersRemaining).toBe(2);
    });

    it('cannot add user when at limit', () => {
      const result = checkPlanLimits(plan, 5, 0);
      expect(result.canAddUser).toBe(false);
      expect(result.usersRemaining).toBe(0);
    });

    it('can scan when under limit', () => {
      const result = checkPlanLimits(plan, 0, 1);
      expect(result.canScan).toBe(true);
      expect(result.scansRemaining).toBe(1);
    });

    it('cannot scan when at limit', () => {
      const result = checkPlanLimits(plan, 0, 2);
      expect(result.canScan).toBe(false);
      expect(result.scansRemaining).toBe(0);
    });
  });

  describe('basic plan', () => {
    const plan: PlanType = 'basic';

    it('allows up to 20 users', () => {
      const result = checkPlanLimits(plan, 19, 0);
      expect(result.canAddUser).toBe(true);
      expect(result.usersRemaining).toBe(1);
    });

    it('allows up to 10 scans', () => {
      const result = checkPlanLimits(plan, 0, 9);
      expect(result.canScan).toBe(true);
      expect(result.scansRemaining).toBe(1);
    });
  });

  describe('pro plan', () => {
    const plan: PlanType = 'pro';

    it('allows up to 100 users', () => {
      const result = checkPlanLimits(plan, 99, 0);
      expect(result.canAddUser).toBe(true);
      expect(result.usersRemaining).toBe(1);
    });

    it('allows unlimited scans', () => {
      const result = checkPlanLimits(plan, 0, 1000);
      expect(result.canScan).toBe(true);
      expect(result.scansRemaining).toBe(-1); // unlimited
    });
  });

  describe('enterprise plan', () => {
    const plan: PlanType = 'enterprise';

    it('allows unlimited users', () => {
      const result = checkPlanLimits(plan, 10000, 0);
      expect(result.canAddUser).toBe(true);
      expect(result.usersRemaining).toBe(-1); // unlimited
    });

    it('allows unlimited scans', () => {
      const result = checkPlanLimits(plan, 0, 100000);
      expect(result.canScan).toBe(true);
      expect(result.scansRemaining).toBe(-1); // unlimited
    });
  });
});

describe('getPlanInfo', () => {
  it('returns correct info for free plan', () => {
    const info = getPlanInfo('free');
    expect(info.name).toBe('無料');
    expect(info.price).toBe(0);
    expect(info.features).toContain('基本スキャン');
  });

  it('returns correct info for basic plan', () => {
    const info = getPlanInfo('basic');
    expect(info.name).toBe('ベーシック');
    expect(info.price).toBe(200);
    expect(info.features).toContain('週次レポート');
  });

  it('returns correct info for pro plan', () => {
    const info = getPlanInfo('pro');
    expect(info.name).toBe('プロ');
    expect(info.price).toBe(500);
    expect(info.features).toContain('ISMS/Pマークレポート');
  });

  it('returns correct info for enterprise plan', () => {
    const info = getPlanInfo('enterprise');
    expect(info.name).toBe('エンタープライズ');
    expect(info.features).toContain('カスタムレポート');
    expect(info.features).toContain('専任サポート');
  });
});
