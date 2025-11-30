import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  createCheckoutSession,
  createPortalSession,
  getActiveSubscription,
  constructWebhookEvent,
  getPlanInfo,
  checkPlanLimits,
  PLAN_CONFIG,
  type PlanType,
} from '../services/stripe.js';
import { OrganizationService, UserService, ScanService } from '../services/firestore.js';

const router = Router();

/**
 * GET /api/stripe/plans
 * 利用可能な料金プランを取得
 */
router.get('/plans', (_req: Request, res: Response) => {
  const plans = Object.entries(PLAN_CONFIG).map(([key, config]) => ({
    id: key,
    name: config.name,
    price: config.price,
    maxUsers: config.maxUsers,
    maxScansPerMonth: config.maxScansPerMonth,
    features: config.features,
  }));

  res.json({ plans });
});

/**
 * GET /api/stripe/subscription
 * 現在のサブスクリプション情報を取得
 */
router.get('/subscription', requireAuth, async (req: Request, res: Response) => {
  try {
    const organization = await OrganizationService.getById(req.user!.organizationId);
    if (!organization) {
      return res.status(404).json({ error: '組織が見つかりません' });
    }

    const subscription = await getActiveSubscription(organization);
    const planInfo = getPlanInfo(organization.plan);

    // 今月のスキャン回数を計算
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const recentScans = await ScanService.getByOrganization(organization.id, 100);
    const monthlyScans = recentScans.filter(
      (scan) => new Date(scan.createdAt) >= thisMonth
    );

    const users = await UserService.getByOrganization(organization.id);
    const limits = checkPlanLimits(organization.plan, users.length, monthlyScans.length);

    res.json({
      plan: organization.plan,
      planInfo,
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          }
        : null,
      limits,
    });
  } catch (error) {
    console.error('Error getting subscription:', error);
    res.status(500).json({ error: 'サブスクリプション情報の取得に失敗しました' });
  }
});

/**
 * POST /api/stripe/checkout
 * Checkoutセッションを作成（プラン購入）
 */
router.post('/checkout', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { plan } = req.body as { plan: 'basic' | 'pro' | 'enterprise' };

    if (!plan || !['basic', 'pro', 'enterprise'].includes(plan)) {
      return res.status(400).json({ error: '有効なプランを指定してください' });
    }

    const organization = await OrganizationService.getById(req.user!.organizationId);
    if (!organization) {
      return res.status(404).json({ error: '組織が見つかりません' });
    }

    // プランの順序を確認（上位プランへのアップグレードのみ許可）
    const planOrder = ['free', 'basic', 'pro', 'enterprise'];
    const currentPlanIndex = planOrder.indexOf(organization.plan);
    const targetPlanIndex = planOrder.indexOf(plan);

    if (targetPlanIndex <= currentPlanIndex) {
      return res.status(400).json({
        error: '現在のプランと同じか下位のプランにはチェックアウトできません。プラン変更はカスタマーポータルから行ってください。',
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const session = await createCheckoutSession(
      organization,
      plan,
      `${frontendUrl}/settings?checkout=success`,
      `${frontendUrl}/settings?checkout=cancelled`
    );

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'チェックアウトセッションの作成に失敗しました' });
  }
});

/**
 * POST /api/stripe/portal
 * カスタマーポータルセッションを作成（プラン管理）
 */
router.post('/portal', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const organization = await OrganizationService.getById(req.user!.organizationId);
    if (!organization) {
      return res.status(404).json({ error: '組織が見つかりません' });
    }

    if (!organization.stripeCustomerId) {
      return res.status(400).json({ error: 'Stripe顧客IDがありません' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const session = await createPortalSession(organization, `${frontendUrl}/settings`);

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: 'ポータルセッションの作成に失敗しました' });
  }
});

/**
 * POST /api/stripe/webhook
 * Stripe Webhookを処理
 */
router.post(
  '/webhook',
  // Webhookはraw bodyが必要なので、express.json()を使わない
  async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      return res.status(400).json({ error: 'No signature' });
    }

    try {
      const event = constructWebhookEvent(req.body, signature);

      console.log(`Stripe webhook received: ${event.type}`);

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          const organizationId = session.metadata?.organizationId;
          const plan = session.metadata?.plan as PlanType;

          if (organizationId && plan) {
            const subscriptionId =
              typeof session.subscription === 'string'
                ? session.subscription
                : session.subscription?.id;

            await OrganizationService.updatePlan(
              organizationId,
              plan,
              subscriptionId || null,
              null // 期限は subscription.updated で設定
            );
            console.log(`Organization ${organizationId} upgraded to ${plan}`);
          }
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object;
          const organizationId = subscription.metadata?.organizationId;

          if (organizationId) {
            const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

            // ステータスに応じてプランを更新
            if (subscription.status === 'active') {
              await OrganizationService.update(organizationId, {
                stripeSubscriptionId: subscription.id,
                planExpiresAt: currentPeriodEnd,
              });
            } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
              // キャンセルまたは未払いの場合は無料プランに戻す
              await OrganizationService.updatePlan(organizationId, 'free', null, null);
              console.log(`Organization ${organizationId} downgraded to free`);
            }
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          const organizationId = subscription.metadata?.organizationId;

          if (organizationId) {
            await OrganizationService.updatePlan(organizationId, 'free', null, null);
            console.log(`Organization ${organizationId} subscription deleted, downgraded to free`);
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          const customerId = invoice.customer as string;

          // 顧客IDから組織を取得
          const organization = await OrganizationService.getByStripeCustomerId(customerId);
          if (organization) {
            // TODO: 支払い失敗通知を送信
            console.log(`Payment failed for organization ${organization.id}`);
          }
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(400).json({ error: 'Webhook処理に失敗しました' });
    }
  }
);

export default router;
