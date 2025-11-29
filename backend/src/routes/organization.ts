import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { OrganizationService, UserService } from '../services/firestore.js';
import {
  createAdminClient,
  listWorkspaceUsers,
  getCustomerInfo,
  getActiveUserCount,
} from '../services/admin.js';

const router = Router();

// 認証必須
router.use(requireAuth);

/**
 * GET /api/organization
 * 現在の組織情報を取得
 */
router.get('/', async (req: Request, res: Response) => {
  const organization = req.organization!;

  res.json({
    organization: {
      id: organization.id,
      name: organization.name,
      domain: organization.domain,
      adminEmail: organization.adminEmail,
      plan: organization.plan,
      planExpiresAt: organization.planExpiresAt,
      totalScans: organization.totalScans,
      totalFilesScanned: organization.totalFilesScanned,
      lastScanAt: organization.lastScanAt,
      createdAt: organization.createdAt,
    },
  });
});

/**
 * PUT /api/organization
 * 組織情報を更新（管理者のみ）
 */
router.put('/', requireAdmin, async (req: Request, res: Response) => {
  const organization = req.organization!;
  const { name } = req.body;

  try {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const updated = await OrganizationService.update(organization.id, {
      name: name.trim(),
    });

    res.json({
      organization: updated,
      message: '組織名を更新しました',
    });
  } catch (err) {
    console.error('Update organization error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/organization/members
 * 組織のメンバー一覧を取得（アプリに登録済みのユーザー）
 */
router.get('/members', async (req: Request, res: Response) => {
  const organization = req.organization!;

  try {
    const users = await UserService.getByOrganization(organization.id);

    res.json({
      members: users.map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        photoUrl: u.photoUrl,
        role: u.role,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
      })),
      total: users.length,
    });
  } catch (err) {
    console.error('Get members error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/organization/workspace-users
 * Google Workspaceのユーザー一覧を取得（管理者のみ）
 */
router.get('/workspace-users', requireAdmin, async (req: Request, res: Response) => {
  const organization = req.organization!;
  const accessToken = req.session.accessToken;

  if (!accessToken) {
    return res.status(401).json({ error: 'Access token not available' });
  }

  try {
    const admin = createAdminClient(accessToken);
    const pageToken = req.query.pageToken as string | undefined;

    const result = await listWorkspaceUsers(admin, organization.domain, {
      maxResults: 50,
      pageToken,
    });

    res.json({
      users: result.users,
      nextPageToken: result.nextPageToken,
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error('Get workspace users error:', err);

    if (error.message?.includes('Admin API access denied')) {
      return res.status(403).json({
        error: 'Admin privileges required',
        message:
          'この機能はGoogle Workspace管理者のみ利用できます。通常のユーザーはメンバー一覧をご確認ください。',
      });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/organization/workspace-info
 * Google Workspaceの組織情報を取得（管理者のみ）
 */
router.get('/workspace-info', requireAdmin, async (req: Request, res: Response) => {
  const accessToken = req.session.accessToken;

  if (!accessToken) {
    return res.status(401).json({ error: 'Access token not available' });
  }

  try {
    const admin = createAdminClient(accessToken);
    const info = await getCustomerInfo(admin);

    if (!info) {
      return res.status(403).json({
        error: 'Admin privileges required',
        message: 'この機能はGoogle Workspace管理者のみ利用できます。',
      });
    }

    res.json({ workspaceInfo: info });
  } catch (err) {
    console.error('Get workspace info error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/organization/members/:userId/role
 * メンバーの役割を変更（管理者のみ）
 */
router.put('/members/:userId/role', requireAdmin, async (req: Request, res: Response) => {
  const organization = req.organization!;
  const currentUser = req.user!;
  const { userId } = req.params;
  const { role } = req.body;

  try {
    // 自分自身の役割は変更できない
    if (userId === currentUser.id) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    // 有効な役割かチェック
    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin or member.' });
    }

    // 対象ユーザーが同じ組織か確認
    const targetUser = await UserService.getById(userId);
    if (!targetUser || targetUser.organizationId !== organization.id) {
      return res.status(404).json({ error: 'User not found' });
    }

    // ownerの役割は変更できない
    if (targetUser.role === 'owner') {
      return res.status(400).json({ error: 'Cannot change owner role' });
    }

    await UserService.updateRole(userId, role);

    res.json({
      message: 'ユーザーの役割を更新しました',
      userId,
      newRole: role,
    });
  } catch (err) {
    console.error('Update member role error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/organization/members/:userId
 * メンバーを組織から削除（管理者のみ）
 */
router.delete('/members/:userId', requireAdmin, async (req: Request, res: Response) => {
  const organization = req.organization!;
  const currentUser = req.user!;
  const { userId } = req.params;

  try {
    // 自分自身は削除できない
    if (userId === currentUser.id) {
      return res.status(400).json({ error: 'Cannot remove yourself' });
    }

    // 対象ユーザーが同じ組織か確認
    const targetUser = await UserService.getById(userId);
    if (!targetUser || targetUser.organizationId !== organization.id) {
      return res.status(404).json({ error: 'User not found' });
    }

    // ownerは削除できない
    if (targetUser.role === 'owner') {
      return res.status(400).json({ error: 'Cannot remove organization owner' });
    }

    await UserService.delete(userId);

    res.json({
      message: 'メンバーを削除しました',
      userId,
    });
  } catch (err) {
    console.error('Delete member error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
