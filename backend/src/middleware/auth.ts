import { Request, Response, NextFunction } from 'express';
import { UserService, OrganizationService } from '../services/firestore.js';
import type { User, Organization } from '../types/models.js';

// Request型を拡張
declare global {
  namespace Express {
    interface Request {
      user?: User;
      organization?: Organization;
    }
  }
}

/**
 * 認証必須ミドルウェア
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const user = await UserService.getById(req.session.userId);

    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'User not found' });
    }

    const organization = await OrganizationService.getById(user.organizationId);

    if (!organization) {
      return res.status(403).json({ error: 'Organization not found' });
    }

    req.user = user;
    req.organization = organization;

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * 管理者権限必須ミドルウェア
 * owner, admin、または組織のadminEmailと一致するユーザーを許可
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.log('requireAdmin check:', {
    user: req.user ? { id: req.user.id, email: req.user.email, role: req.user.role } : null,
    organization: req.organization ? { id: req.organization.id, adminEmail: req.organization.adminEmail } : null,
  });

  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // owner または admin ロールを持っている場合は許可
  if (req.user.role === 'owner' || req.user.role === 'admin') {
    console.log('Admin check passed: user has owner/admin role');
    return next();
  }

  // 組織のadminEmailと一致する場合も許可（ロールが正しく設定されていない場合の救済）
  if (req.organization && req.user.email === req.organization.adminEmail) {
    console.log('Admin check passed: user email matches adminEmail, upgrading role');
    // ロールを自動的にownerに修正
    await UserService.updateRole(req.user.id, 'owner');
    req.user.role = 'owner';
    return next();
  }

  console.log('Admin check FAILED');
  return res.status(403).json({ error: 'Admin permission required' });
}

/**
 * オーナー権限必須ミドルウェア
 */
export async function requireOwner(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Owner permission required' });
  }

  next();
}

/**
 * プラン制限チェックミドルウェア
 */
export function requirePlan(allowedPlans: Organization['plan'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.organization) {
      return res.status(401).json({ error: 'Organization not found' });
    }

    if (!allowedPlans.includes(req.organization.plan)) {
      return res.status(403).json({
        error: 'Plan upgrade required',
        currentPlan: req.organization.plan,
        requiredPlans: allowedPlans,
      });
    }

    next();
  };
}
