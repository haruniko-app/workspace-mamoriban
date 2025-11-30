import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  getDriveAuditLogs,
  getLoginAuditLogs,
  getAdminAuditLogs,
  getSharingChangeAuditLogs,
  getExternalSharingAuditLogs,
  getSuspiciousLoginLogs,
  getAuditLogSummary,
} from '../services/reports.js';
import { OrganizationService, ActionLogService } from '../services/firestore.js';
import type { ActionLog } from '../types/models.js';

const router = Router();

/**
 * GET /api/audit-logs/summary
 * 監査ログのサマリーを取得
 */
router.get('/summary', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const organization = await OrganizationService.getById(req.user!.organizationId);

    if (!organization) {
      return res.status(404).json({ error: '組織が見つかりません' });
    }

    const accessToken = req.session?.accessToken;
    if (!accessToken) {
      return res.status(401).json({ error: 'アクセストークンがありません' });
    }

    const summary = await getAuditLogSummary(accessToken, organization.domain, days);

    res.json({ summary, period: { days } });
  } catch (error: unknown) {
    console.error('Error getting audit log summary:', error);

    // 権限エラーの場合
    if (error instanceof Error && error.message?.includes('403')) {
      return res.status(403).json({
        error: '監査ログへのアクセス権限がありません。Google Workspace管理者権限が必要です。',
      });
    }

    res.status(500).json({ error: '監査ログサマリーの取得に失敗しました' });
  }
});

/**
 * GET /api/audit-logs/drive
 * Drive監査ログを取得
 */
router.get('/drive', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startTime, endTime, userKey, eventName, maxResults, pageToken } = req.query;

    const accessToken = req.session?.accessToken;
    if (!accessToken) {
      return res.status(401).json({ error: 'アクセストークンがありません' });
    }

    const result = await getDriveAuditLogs(accessToken, {
      startTime: startTime as string,
      endTime: endTime as string,
      userKey: userKey as string,
      eventName: eventName as string,
      maxResults: maxResults ? parseInt(maxResults as string) : undefined,
      pageToken: pageToken as string,
    });

    res.json(result);
  } catch (error: unknown) {
    console.error('Error getting drive audit logs:', error);

    if (error instanceof Error && error.message?.includes('403')) {
      return res.status(403).json({
        error: '監査ログへのアクセス権限がありません。',
      });
    }

    res.status(500).json({ error: 'Drive監査ログの取得に失敗しました' });
  }
});

/**
 * GET /api/audit-logs/login
 * ログイン監査ログを取得
 */
router.get('/login', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startTime, endTime, userKey, eventName, maxResults, pageToken } = req.query;

    const accessToken = req.session?.accessToken;
    if (!accessToken) {
      return res.status(401).json({ error: 'アクセストークンがありません' });
    }

    const result = await getLoginAuditLogs(accessToken, {
      startTime: startTime as string,
      endTime: endTime as string,
      userKey: userKey as string,
      eventName: eventName as string,
      maxResults: maxResults ? parseInt(maxResults as string) : undefined,
      pageToken: pageToken as string,
    });

    res.json(result);
  } catch (error: unknown) {
    console.error('Error getting login audit logs:', error);

    if (error instanceof Error && error.message?.includes('403')) {
      return res.status(403).json({
        error: '監査ログへのアクセス権限がありません。',
      });
    }

    res.status(500).json({ error: 'ログイン監査ログの取得に失敗しました' });
  }
});

/**
 * GET /api/audit-logs/admin
 * 管理者監査ログを取得
 */
router.get('/admin', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startTime, endTime, userKey, eventName, maxResults, pageToken } = req.query;

    const accessToken = req.session?.accessToken;
    if (!accessToken) {
      return res.status(401).json({ error: 'アクセストークンがありません' });
    }

    const result = await getAdminAuditLogs(accessToken, {
      startTime: startTime as string,
      endTime: endTime as string,
      userKey: userKey as string,
      eventName: eventName as string,
      maxResults: maxResults ? parseInt(maxResults as string) : undefined,
      pageToken: pageToken as string,
    });

    res.json(result);
  } catch (error: unknown) {
    console.error('Error getting admin audit logs:', error);

    if (error instanceof Error && error.message?.includes('403')) {
      return res.status(403).json({
        error: '監査ログへのアクセス権限がありません。',
      });
    }

    res.status(500).json({ error: '管理者監査ログの取得に失敗しました' });
  }
});

/**
 * GET /api/audit-logs/sharing-changes
 * 共有設定変更の監査ログを取得
 */
router.get('/sharing-changes', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startTime, endTime, maxResults, pageToken } = req.query;

    const accessToken = req.session?.accessToken;
    if (!accessToken) {
      return res.status(401).json({ error: 'アクセストークンがありません' });
    }

    const result = await getSharingChangeAuditLogs(accessToken, {
      startTime: startTime as string,
      endTime: endTime as string,
      maxResults: maxResults ? parseInt(maxResults as string) : undefined,
      pageToken: pageToken as string,
    });

    res.json(result);
  } catch (error: unknown) {
    console.error('Error getting sharing change audit logs:', error);

    if (error instanceof Error && error.message?.includes('403')) {
      return res.status(403).json({
        error: '監査ログへのアクセス権限がありません。',
      });
    }

    res.status(500).json({ error: '共有設定変更ログの取得に失敗しました' });
  }
});

/**
 * GET /api/audit-logs/external-sharing
 * 外部共有の監査ログを取得
 */
router.get('/external-sharing', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startTime, endTime, maxResults } = req.query;

    const organization = await OrganizationService.getById(req.user!.organizationId);
    if (!organization) {
      return res.status(404).json({ error: '組織が見つかりません' });
    }

    const accessToken = req.session?.accessToken;
    if (!accessToken) {
      return res.status(401).json({ error: 'アクセストークンがありません' });
    }

    const logs = await getExternalSharingAuditLogs(accessToken, organization.domain, {
      startTime: startTime as string,
      endTime: endTime as string,
      maxResults: maxResults ? parseInt(maxResults as string) : undefined,
    });

    res.json({ logs });
  } catch (error: unknown) {
    console.error('Error getting external sharing audit logs:', error);

    if (error instanceof Error && error.message?.includes('403')) {
      return res.status(403).json({
        error: '監査ログへのアクセス権限がありません。',
      });
    }

    res.status(500).json({ error: '外部共有ログの取得に失敗しました' });
  }
});

/**
 * GET /api/audit-logs/suspicious-logins
 * 不審なログインの監査ログを取得
 */
router.get('/suspicious-logins', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startTime, endTime, maxResults } = req.query;

    const accessToken = req.session?.accessToken;
    if (!accessToken) {
      return res.status(401).json({ error: 'アクセストークンがありません' });
    }

    const logs = await getSuspiciousLoginLogs(accessToken, {
      startTime: startTime as string,
      endTime: endTime as string,
      maxResults: maxResults ? parseInt(maxResults as string) : undefined,
    });

    res.json({ logs });
  } catch (error: unknown) {
    console.error('Error getting suspicious login audit logs:', error);

    if (error instanceof Error && error.message?.includes('403')) {
      return res.status(403).json({
        error: '監査ログへのアクセス権限がありません。',
      });
    }

    res.status(500).json({ error: '不審なログインログの取得に失敗しました' });
  }
});

/**
 * GET /api/audit-logs/actions
 * アプリ内アクションログ（権限変更など）を取得
 */
router.get('/actions', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const organization = req.organization!;
    const { limit, offset, actionType, startTime, endTime } = req.query;

    const options: {
      limit?: number;
      offset?: number;
      actionType?: ActionLog['actionType'];
      startDate?: Date;
      endDate?: Date;
    } = {};

    if (limit) options.limit = parseInt(limit as string);
    if (offset) options.offset = parseInt(offset as string);
    if (actionType) options.actionType = actionType as ActionLog['actionType'];
    if (startTime) options.startDate = new Date(startTime as string);
    if (endTime) options.endDate = new Date(endTime as string);

    const { logs, total } = await ActionLogService.getByOrganization(organization.id, options);

    res.json({
      logs,
      pagination: {
        total,
        limit: options.limit || 20,
        offset: options.offset || 0,
        hasMore: (options.offset || 0) + logs.length < total,
      },
    });
  } catch (error: unknown) {
    console.error('Error getting action logs:', error);
    res.status(500).json({ error: 'アクションログの取得に失敗しました' });
  }
});

export default router;
