import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout';
import { organizationApi, stripeApi, type PlanInfo } from '../lib/api';

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-[#f1f3f4] text-[#5f6368]',
  basic: 'bg-[#e8f0fe] text-[#1a73e8]',
  pro: 'bg-[#fce8e6] text-[#c5221f]',
  enterprise: 'bg-[#fef7e0] text-[#e37400]',
};

const PLAN_PRICES: Record<string, string> = {
  free: '¥0',
  basic: '¥200/月',
  pro: '¥500/月',
  enterprise: '要相談',
};

export function SettingsPage() {
  const { user, reauthorize } = useAuth();
  const [searchParams] = useSearchParams();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'pro' | 'enterprise' | null>(null);
  const [checkoutMessage, setCheckoutMessage] = useState<{ type: 'success' | 'cancelled' | null; message: string }>({ type: null, message: '' });

  // Check for checkout result from URL params
  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (checkout === 'success') {
      setCheckoutMessage({ type: 'success', message: 'お支払いが完了しました。プランがアップグレードされました。' });
    } else if (checkout === 'cancelled') {
      setCheckoutMessage({ type: 'cancelled', message: 'お支払いがキャンセルされました。' });
    }
  }, [searchParams]);

  // Get organization info
  const { data: orgData } = useQuery({
    queryKey: ['organization'],
    queryFn: organizationApi.get,
  });

  // Get subscription info
  const { data: subscriptionData, isError: subscriptionError } = useQuery({
    queryKey: ['subscription'],
    queryFn: stripeApi.getSubscription,
    retry: false,
  });

  // Get plans
  const { data: plansData } = useQuery({
    queryKey: ['plans'],
    queryFn: stripeApi.getPlans,
  });

  // Create checkout session
  const checkoutMutation = useMutation({
    mutationFn: (plan: 'basic' | 'pro' | 'enterprise') => stripeApi.createCheckout(plan),
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      console.error('Checkout error:', error);
      setCheckoutMessage({
        type: 'cancelled',
        message: error instanceof Error ? error.message : 'チェックアウトの作成に失敗しました',
      });
      setShowUpgradeModal(false);
    },
  });

  // Create portal session
  const portalMutation = useMutation({
    mutationFn: stripeApi.createPortalSession,
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });

  const organization = orgData?.organization;
  const subscription = subscriptionData;
  const plans = plansData?.plans || [];
  const currentPlan = subscription?.plan || 'free';
  const isAdmin = user?.role === 'owner' || user?.role === 'admin';

  const handleUpgrade = (plan: 'basic' | 'pro' | 'enterprise') => {
    setSelectedPlan(plan);
    setShowUpgradeModal(true);
  };

  const confirmUpgrade = () => {
    if (selectedPlan) {
      checkoutMutation.mutate(selectedPlan);
    }
  };

  const handleManageSubscription = () => {
    portalMutation.mutate();
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Checkout message */}
        {checkoutMessage.type && (
          <div
            className={`p-4 rounded-xl flex items-center gap-3 ${
              checkoutMessage.type === 'success'
                ? 'bg-[#e6f4ea] text-[#137333]'
                : 'bg-[#fef7e0] text-[#e37400]'
            }`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              {checkoutMessage.type === 'success' ? (
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              ) : (
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              )}
            </svg>
            <span className="text-sm font-medium">{checkoutMessage.message}</span>
            <button
              onClick={() => setCheckoutMessage({ type: null, message: '' })}
              className="ml-auto p-1 rounded-full hover:bg-black/10"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
        )}

        {/* Header */}
        <div>
          <h1 className="text-2xl font-normal text-[#202124]">設定</h1>
          <p className="text-sm text-[#5f6368] mt-1">
            アカウントと組織の設定を管理
          </p>
        </div>

        {/* User Info */}
        <div className="bg-white rounded-2xl border border-[#dadce0]">
          <div className="px-6 py-4 border-b border-[#e8eaed] flex items-center gap-3">
            <svg className="w-5 h-5 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            <h2 className="text-base font-medium text-[#202124]">
              アカウント情報
            </h2>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-4">
              {user?.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt={user.displayName}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#1a73e8] flex items-center justify-center">
                  <span className="text-2xl font-medium text-white">
                    {user?.displayName[0]}
                  </span>
                </div>
              )}
              <div className="flex-1">
                <p className="text-lg font-medium text-[#202124]">
                  {user?.displayName}
                </p>
                <p className="text-sm text-[#5f6368]">{user?.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#e8f0fe] text-[#1a73e8] font-medium">
                    {user?.role === 'owner'
                      ? 'オーナー'
                      : user?.role === 'admin'
                      ? '管理者'
                      : 'メンバー'}
                  </span>
                </div>
              </div>
              <a
                href="https://myaccount.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-google-secondary"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
                </svg>
                Google アカウント
              </a>
            </div>
          </div>
        </div>

        {/* Organization Info */}
        <div className="bg-white rounded-2xl border border-[#dadce0]">
          <div className="px-6 py-4 border-b border-[#e8eaed] flex items-center gap-3">
            <svg className="w-5 h-5 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
            </svg>
            <h2 className="text-base font-medium text-[#202124]">組織情報</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-[#5f6368] mb-1">組織名</p>
                <p className="text-sm font-medium text-[#202124]">
                  {organization?.name || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#5f6368] mb-1">ドメイン</p>
                <p className="text-sm font-medium text-[#202124]">
                  {organization?.domain || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#5f6368] mb-1">総スキャン回数</p>
                <p className="text-sm font-medium text-[#202124]">
                  {organization?.totalScans || 0}回
                </p>
              </div>
              <div>
                <p className="text-xs text-[#5f6368] mb-1">スキャンしたファイル数</p>
                <p className="text-sm font-medium text-[#202124]">
                  {(organization?.totalFilesScanned || 0).toLocaleString()}件
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Plan Info */}
        <div className="bg-white rounded-2xl border border-[#dadce0]">
          <div className="px-6 py-4 border-b border-[#e8eaed] flex items-center gap-3">
            <svg className="w-5 h-5 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
            </svg>
            <h2 className="text-base font-medium text-[#202124]">
              プラン・お支払い
            </h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${PLAN_COLORS[currentPlan]}`}>
                  {subscription?.planInfo?.name || '無料プラン'}
                </span>
                <p className="text-2xl font-medium text-[#202124]">
                  {PLAN_PRICES[currentPlan]}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {isAdmin && currentPlan !== 'free' && subscription?.subscription && (
                  <button
                    onClick={handleManageSubscription}
                    disabled={portalMutation.isPending}
                    className="btn-google-secondary"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
                    </svg>
                    プラン管理
                  </button>
                )}
                {isAdmin && (currentPlan === 'free' || subscriptionError) && (
                  <button
                    onClick={() => handleUpgrade('basic')}
                    className="btn-google-primary"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                    アップグレード
                  </button>
                )}
              </div>
            </div>

            {/* Subscription status */}
            {subscription?.subscription && (
              <div className="mb-6 p-4 bg-[#f8f9fa] rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#5f6368]">次回更新日</p>
                    <p className="text-sm font-medium text-[#202124]">
                      {new Date(subscription.subscription.currentPeriodEnd).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  {subscription.subscription.cancelAtPeriodEnd && (
                    <span className="px-2 py-1 text-xs font-medium text-[#e37400] bg-[#fef7e0] rounded">
                      期間終了時にキャンセル予定
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Usage limits */}
            {subscription?.limits && (
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#f8f9fa] rounded-xl">
                  <p className="text-xs text-[#5f6368] mb-1">ユーザー数</p>
                  <p className="text-lg font-medium text-[#202124]">
                    {subscription.limits.usersRemaining === -1
                      ? '無制限'
                      : `残り ${subscription.limits.usersRemaining} 人`}
                  </p>
                </div>
                <div className="p-4 bg-[#f8f9fa] rounded-xl">
                  <p className="text-xs text-[#5f6368] mb-1">月間スキャン回数</p>
                  <p className="text-lg font-medium text-[#202124]">
                    {subscription.limits.scansRemaining === -1
                      ? '無制限'
                      : `残り ${subscription.limits.scansRemaining} 回`}
                  </p>
                </div>
              </div>
            )}

            {/* Plan Comparison */}
            <div className="border-t border-[#e8eaed] pt-6">
              <h3 className="text-sm font-medium text-[#202124] mb-4">
                プラン比較
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {plans.map((plan: PlanInfo) => (
                  <div
                    key={plan.id}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      plan.id === currentPlan
                        ? 'border-[#1a73e8] bg-[#f8f9fa]'
                        : 'border-[#dadce0] hover:border-[#9aa0a6]'
                    }`}
                  >
                    <p className="text-sm font-medium text-[#202124]">{plan.name}</p>
                    <p className="text-lg font-medium text-[#202124] mt-1">
                      {plan.price === 0 ? '¥0' : plan.price === -1 ? '要相談' : `¥${plan.price}/月`}
                    </p>
                    <ul className="mt-3 space-y-2 text-xs text-[#5f6368]">
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-[#1e8e3e]" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                        {plan.maxUsers === -1 ? '無制限ユーザー' : `${plan.maxUsers}ユーザーまで`}
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-[#1e8e3e]" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                        {plan.maxScansPerMonth === -1 ? '無制限スキャン' : `月${plan.maxScansPerMonth}回スキャン`}
                      </li>
                      {plan.features.slice(0, 2).map((feature, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-[#1e8e3e]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    {(() => {
                      const planOrder = ['free', 'basic', 'pro', 'enterprise'];
                      const currentIndex = planOrder.indexOf(currentPlan);
                      const planIndex = planOrder.indexOf(plan.id);

                      if (plan.id === currentPlan) {
                        return (
                          <div className="mt-3 text-xs text-[#1a73e8] font-medium">
                            現在のプラン
                          </div>
                        );
                      } else if (isAdmin && planIndex > currentIndex && plan.id !== 'free') {
                        return (
                          <button
                            onClick={() => handleUpgrade(plan.id as 'basic' | 'pro' | 'enterprise')}
                            className="mt-3 w-full py-2 text-xs font-medium text-[#1a73e8] bg-[#e8f0fe] rounded-lg hover:bg-[#d2e3fc] transition-colors"
                          >
                            アップグレード
                          </button>
                        );
                      }
                      return null;
                    })()}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Google Permissions */}
        <div className="bg-white rounded-2xl border border-[#dadce0]">
          <div className="px-6 py-4 border-b border-[#e8eaed] flex items-center gap-3">
            <svg className="w-5 h-5 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
            </svg>
            <h2 className="text-base font-medium text-[#202124]">Google権限</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#202124]">Google Driveアクセス権限</p>
                <p className="text-xs text-[#5f6368] mt-0.5">
                  ファイルの共有設定を変更するには、追加の権限が必要です。
                  「権限を変更できない」エラーが発生した場合は、再認証してください。
                </p>
              </div>
              <button
                onClick={reauthorize}
                className="btn-google-secondary"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                </svg>
                Google権限を再認証
              </button>
            </div>
            <div className="mt-4 p-3 bg-[#f8f9fa] rounded-lg">
              <p className="text-xs text-[#5f6368]">
                <strong>現在の権限:</strong> ファイルの読み取り・共有設定の変更
              </p>
              <ul className="mt-2 text-xs text-[#5f6368] space-y-1">
                <li>- Google Driveファイルのメタデータ閲覧</li>
                <li>- ファイル共有設定の閲覧・変更</li>
                <li>- ユーザーディレクトリ情報の閲覧</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl border border-[#dadce0]">
          <div className="px-6 py-4 border-b border-[#e8eaed] flex items-center gap-3">
            <svg className="w-5 h-5 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
            </svg>
            <h2 className="text-base font-medium text-[#202124]">通知設定</h2>
          </div>
          <div className="p-6 space-y-4">
            <label className="flex items-center justify-between p-4 rounded-xl hover:bg-[#f8f9fa] cursor-pointer transition-colors">
              <div>
                <p className="text-sm font-medium text-[#202124]">緊急リスクアラート</p>
                <p className="text-xs text-[#5f6368] mt-0.5">
                  緊急リスクが検出された場合にメールで通知
                </p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  defaultChecked
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#dadce0] peer-checked:bg-[#1a73e8] rounded-full peer-focus:ring-2 peer-focus:ring-[#1a73e8] peer-focus:ring-offset-2 transition-colors"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform"></div>
              </div>
            </label>
            <label className="flex items-center justify-between p-4 rounded-xl hover:bg-[#f8f9fa] cursor-pointer transition-colors">
              <div>
                <p className="text-sm font-medium text-[#202124]">週次レポート</p>
                <p className="text-xs text-[#5f6368] mt-0.5">
                  毎週月曜日にセキュリティレポートを送信
                </p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#dadce0] peer-checked:bg-[#1a73e8] rounded-full peer-focus:ring-2 peer-focus:ring-[#1a73e8] peer-focus:ring-offset-2 transition-colors"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform"></div>
              </div>
            </label>
            <label className="flex items-center justify-between p-4 rounded-xl hover:bg-[#f8f9fa] cursor-pointer transition-colors">
              <div>
                <p className="text-sm font-medium text-[#202124]">スキャン完了通知</p>
                <p className="text-xs text-[#5f6368] mt-0.5">
                  スキャンが完了したときにメールで通知
                </p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  defaultChecked
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#dadce0] peer-checked:bg-[#1a73e8] rounded-full peer-focus:ring-2 peer-focus:ring-[#1a73e8] peer-focus:ring-offset-2 transition-colors"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform"></div>
              </div>
            </label>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl border border-[#dadce0]">
          <div className="px-6 py-4 border-b border-[#e8eaed] flex items-center gap-3">
            <svg className="w-5 h-5 text-[#d93025]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            <h2 className="text-base font-medium text-[#d93025]">危険な操作</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#202124]">組織を削除</p>
                <p className="text-xs text-[#5f6368] mt-0.5">
                  すべてのデータが削除され、元に戻すことはできません
                </p>
              </div>
              <button className="px-4 py-2 text-sm font-medium text-[#d93025] border border-[#d93025] rounded-md hover:bg-[#fce8e6] transition-colors">
                組織を削除
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-[#202124] mb-4">
              プランをアップグレード
            </h3>
            <p className="text-sm text-[#5f6368] mb-6">
              {selectedPlan === 'basic' && 'ベーシックプラン（¥200/月）にアップグレードします。'}
              {selectedPlan === 'pro' && 'プロプラン（¥500/月）にアップグレードします。'}
              {selectedPlan === 'enterprise' && 'エンタープライズプランについてお問い合わせください。'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="px-4 py-2 text-sm font-medium text-[#5f6368] hover:bg-[#f1f3f4] rounded-lg"
              >
                キャンセル
              </button>
              <button
                onClick={confirmUpgrade}
                disabled={checkoutMutation.isPending}
                className="btn-google-primary"
              >
                {checkoutMutation.isPending ? '処理中...' : 'Stripeで支払う'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
