import { Router, Request, Response } from 'express';
import { NotificationSettingsService, NotificationLogService } from '../services/firestore.js';
import type { NotificationSettings } from '../types/models.js';

const router = Router();

/**
 * GET /api/notifications/settings
 * 組織の通知設定を取得
 */
router.get('/settings', async (req: Request, res: Response) => {
  const organization = req.organization!;

  try {
    const settings = await NotificationSettingsService.getByOrganization(organization.id);
    res.json({ settings });
  } catch (err) {
    console.error('Get notification settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/notifications/settings
 * 組織の通知設定を更新
 */
router.put('/settings', async (req: Request, res: Response) => {
  const organization = req.organization!;
  const user = req.user!;
  const { emailNotifications, slackNotifications } = req.body as Partial<NotificationSettings>;

  // admin/ownerのみ設定変更可能
  if (user.role !== 'admin' && user.role !== 'owner') {
    return res.status(403).json({ error: '通知設定の変更は管理者のみ実行できます' });
  }

  try {
    const updates: Partial<{
      emailNotifications: NotificationSettings['emailNotifications'];
      slackNotifications: NotificationSettings['slackNotifications'];
    }> = {};

    if (emailNotifications) {
      // バリデーション
      if (emailNotifications.enabled && (!emailNotifications.recipients || emailNotifications.recipients.length === 0)) {
        return res.status(400).json({ error: 'メール通知を有効にするには、受信者を1人以上設定してください' });
      }
      updates.emailNotifications = emailNotifications;
    }

    if (slackNotifications) {
      updates.slackNotifications = slackNotifications;
    }

    const settings = await NotificationSettingsService.update(organization.id, updates);
    res.json({ settings, message: '通知設定を更新しました' });
  } catch (err) {
    console.error('Update notification settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/notifications/settings/recipients
 * メール受信者を追加
 */
router.post('/settings/recipients', async (req: Request, res: Response) => {
  const organization = req.organization!;
  const user = req.user!;
  const { email } = req.body as { email: string };

  // admin/ownerのみ設定変更可能
  if (user.role !== 'admin' && user.role !== 'owner') {
    return res.status(403).json({ error: '通知設定の変更は管理者のみ実行できます' });
  }

  // バリデーション
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: '有効なメールアドレスを入力してください' });
  }

  try {
    await NotificationSettingsService.addRecipient(organization.id, email);
    const settings = await NotificationSettingsService.getByOrganization(organization.id);
    res.json({ settings, message: `${email} を通知受信者に追加しました` });
  } catch (err) {
    console.error('Add recipient error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/notifications/settings/recipients/:email
 * メール受信者を削除
 */
router.delete('/settings/recipients/:email', async (req: Request, res: Response) => {
  const organization = req.organization!;
  const user = req.user!;
  const { email } = req.params;

  // admin/ownerのみ設定変更可能
  if (user.role !== 'admin' && user.role !== 'owner') {
    return res.status(403).json({ error: '通知設定の変更は管理者のみ実行できます' });
  }

  try {
    await NotificationSettingsService.removeRecipient(organization.id, email);
    const settings = await NotificationSettingsService.getByOrganization(organization.id);
    res.json({ settings, message: `${email} を通知受信者から削除しました` });
  } catch (err) {
    console.error('Remove recipient error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/notifications/logs
 * 通知履歴を取得
 */
router.get('/logs', async (req: Request, res: Response) => {
  const organization = req.organization!;
  const { limit = '20', offset = '0', type } = req.query as {
    limit?: string;
    offset?: string;
    type?: 'scan_completed' | 'critical_risk' | 'high_risk' | 'weekly_report';
  };

  try {
    const { logs, total } = await NotificationLogService.getByOrganization(organization.id, {
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      type,
    });

    res.json({
      logs,
      pagination: {
        total,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        hasMore: parseInt(offset, 10) + parseInt(limit, 10) < total,
      },
    });
  } catch (err) {
    console.error('Get notification logs error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/notifications/test
 * テスト通知を送信
 */
router.post('/test', async (req: Request, res: Response) => {
  const organization = req.organization!;
  const user = req.user!;

  // admin/ownerのみテスト通知可能
  if (user.role !== 'admin' && user.role !== 'owner') {
    return res.status(403).json({ error: 'テスト通知は管理者のみ実行できます' });
  }

  try {
    const settings = await NotificationSettingsService.getByOrganization(organization.id);

    if (!settings.emailNotifications.enabled) {
      return res.status(400).json({ error: 'メール通知が無効になっています。先に通知設定を有効にしてください。' });
    }

    if (settings.emailNotifications.recipients.length === 0) {
      return res.status(400).json({ error: '通知受信者が設定されていません。' });
    }

    // テスト通知のログを記録
    await NotificationLogService.create({
      organizationId: organization.id,
      type: 'scan_completed',
      channel: 'email',
      recipients: settings.emailNotifications.recipients,
      subject: '【テスト】Workspace守り番 - 通知テスト',
      summary: 'これはテスト通知です。通知設定が正しく機能しています。',
      success: true,
    });

    res.json({
      success: true,
      message: `${settings.emailNotifications.recipients.length}件のメールアドレスにテスト通知を送信しました`,
      recipients: settings.emailNotifications.recipients,
    });
  } catch (err) {
    console.error('Test notification error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
