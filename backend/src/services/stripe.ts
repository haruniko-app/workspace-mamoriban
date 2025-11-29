import Stripe from 'stripe';
import { OrganizationService } from './firestore.js';
import type { Organization } from '../types/models.js';

// Stripe初期化
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// 料金プラン設定
export const PLAN_CONFIG = {
  free: {
    name: '無料',
    price: 0,
    maxUsers: 5,
    maxScansPerMonth: 2,
    features: ['基本スキャン', 'リスクスコア表示'],
  },
  basic: {
    name: 'ベーシック',
    price: 200,
    maxUsers: 20,
    maxScansPerMonth: 10,
    features: ['週次レポート', 'メールアラート', '履歴保存（3ヶ月）'],
    stripePriceId: process.env.STRIPE_BASIC_PRICE_ID,
  },
  pro: {
    name: 'プロ',
    price: 500,
    maxUsers: 100,
    maxScansPerMonth: -1, // 無制限
    features: ['ISMS/Pマークレポート', 'API連携', '履歴保存（1年）', '優先サポート'],
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
  },
  enterprise: {
    name: 'エンタープライズ',
    price: -1, // 要相談
    maxUsers: -1, // 無制限
    maxScansPerMonth: -1, // 無制限
    features: ['カスタムレポート', '専任サポート', 'SLA保証', 'オンプレミス対応'],
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
  },
} as const;

export type PlanType = keyof typeof PLAN_CONFIG;

/**
 * Stripe顧客を作成
 */
export async function createCustomer(
  organizationId: string,
  email: string,
  name: string
): Promise<Stripe.Customer> {
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      organizationId,
    },
  });

  // Firestoreに顧客IDを保存
  await OrganizationService.update(organizationId, {
    stripeCustomerId: customer.id,
  });

  return customer;
}

/**
 * Stripe顧客を取得または作成
 */
export async function getOrCreateCustomer(
  organization: Organization
): Promise<Stripe.Customer> {
  if (organization.stripeCustomerId) {
    try {
      return await stripe.customers.retrieve(organization.stripeCustomerId) as Stripe.Customer;
    } catch {
      // 顧客が見つからない場合は新規作成
    }
  }

  return createCustomer(organization.id, organization.adminEmail, organization.name);
}

/**
 * Checkout Sessionを作成（サブスクリプション開始）
 */
export async function createCheckoutSession(
  organization: Organization,
  plan: 'basic' | 'pro' | 'enterprise',
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  const customer = await getOrCreateCustomer(organization);
  const priceId = PLAN_CONFIG[plan].stripePriceId;

  if (!priceId) {
    throw new Error(`Price ID not configured for plan: ${plan}`);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      organizationId: organization.id,
      plan,
    },
    subscription_data: {
      metadata: {
        organizationId: organization.id,
        plan,
      },
    },
    // 日本語ロケール
    locale: 'ja',
    // 請求先住所収集
    billing_address_collection: 'required',
  });

  return session;
}

/**
 * カスタマーポータルセッションを作成（プラン管理・解約）
 */
export async function createPortalSession(
  organization: Organization,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  if (!organization.stripeCustomerId) {
    throw new Error('Organization does not have a Stripe customer ID');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: organization.stripeCustomerId,
    return_url: returnUrl,
  });

  return session;
}

/**
 * サブスクリプション情報を取得
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch {
    return null;
  }
}

/**
 * 組織のアクティブなサブスクリプションを取得
 */
export async function getActiveSubscription(
  organization: Organization
): Promise<Stripe.Subscription | null> {
  if (!organization.stripeSubscriptionId) {
    return null;
  }

  const subscription = await getSubscription(organization.stripeSubscriptionId);
  if (!subscription || subscription.status !== 'active') {
    return null;
  }

  return subscription;
}

/**
 * サブスクリプションをキャンセル
 */
export async function cancelSubscription(
  subscriptionId: string,
  immediately = false
): Promise<Stripe.Subscription> {
  if (immediately) {
    return stripe.subscriptions.cancel(subscriptionId);
  }

  // 期間終了時にキャンセル
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Webhook署名を検証
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * プラン制限チェック
 */
export function checkPlanLimits(
  plan: PlanType,
  currentUsers: number,
  currentScansThisMonth: number
): {
  canAddUser: boolean;
  canScan: boolean;
  usersRemaining: number;
  scansRemaining: number;
} {
  const config = PLAN_CONFIG[plan];
  const maxUsers = config.maxUsers;
  const maxScans = config.maxScansPerMonth;

  const canAddUser = maxUsers === -1 || currentUsers < maxUsers;
  const canScan = maxScans === -1 || currentScansThisMonth < maxScans;

  return {
    canAddUser,
    canScan,
    usersRemaining: maxUsers === -1 ? -1 : Math.max(0, maxUsers - currentUsers),
    scansRemaining: maxScans === -1 ? -1 : Math.max(0, maxScans - currentScansThisMonth),
  };
}

/**
 * プラン情報を取得
 */
export function getPlanInfo(plan: PlanType) {
  return PLAN_CONFIG[plan];
}

export { stripe };
