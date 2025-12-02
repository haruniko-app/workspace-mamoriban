import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

// 基本ナビゲーション（全ユーザー共通）
const baseNavigation = [
  { name: 'ダッシュボード', href: '/dashboard', icon: HomeIcon },
  { name: 'スキャン', href: '/scan', icon: SecurityIcon },
  { name: '監査ログ', href: '/audit-logs', icon: AuditIcon },
  { name: '組織管理', href: '/organization', icon: OrganizationIcon },
  { name: '設定', href: '/settings', icon: SettingsIcon },
];

// 管理者専用ナビゲーション
const adminNavigation = [
  { name: '管理者ダッシュボード', href: '/admin', icon: AdminIcon },
  { name: 'ISMS/Pマークレポート', href: '/reports', icon: ReportIcon },
  { name: '通知設定', href: '/notifications', icon: NotificationIcon },
  { name: '統合スキャン設定', href: '/delegation', icon: DelegationIcon },
];

// Google Material Icons style
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  );
}

function SecurityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    </svg>
  );
}

function OrganizationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
    </svg>
  );
}

function AuditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
    </svg>
  );
}

function AdminIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    </svg>
  );
}

function ReportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
    </svg>
  );
}

function NotificationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
    </svg>
  );
}

function DelegationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 5.9c1.16 0 2.1.94 2.1 2.1s-.94 2.1-2.1 2.1S9.9 9.16 9.9 8s.94-2.1 2.1-2.1m0 9c2.97 0 6.1 1.46 6.1 2.1v1.1H5.9V17c0-.64 3.13-2.1 6.1-2.1M12 4C9.79 4 8 5.79 8 8s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 9c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  );
}

// 検索可能な機能リスト
const searchableFeatures = [
  { name: 'ダッシュボード', description: 'セキュリティ状況の概要', href: '/dashboard', keywords: ['ダッシュボード', 'ホーム', '概要', 'dashboard'] },
  { name: '新規スキャン', description: 'Google Driveをスキャン', href: '/scan', keywords: ['スキャン', '検査', 'scan', '実行'] },
  { name: 'ファイル一覧', description: 'スキャン結果のファイル', href: '/scan', keywords: ['ファイル', 'リスク', 'file', '結果'] },
  { name: '監査ログ', description: 'アクティビティログ', href: '/audit-logs', keywords: ['監査', 'ログ', 'audit', '履歴'] },
  { name: '組織管理', description: 'メンバー・権限管理', href: '/organization', keywords: ['組織', 'メンバー', 'organization', 'チーム'] },
  { name: '設定', description: 'アカウント設定', href: '/settings', keywords: ['設定', 'アカウント', 'settings', '環境'] },
  { name: '管理者ダッシュボード', description: '管理者向け統計', href: '/admin', keywords: ['管理者', 'admin', '統計', '分析'], admin: true },
  { name: 'ISMS/Pマークレポート', description: '監査対応レポート出力', href: '/reports', keywords: ['レポート', 'ISMS', 'Pマーク', 'PDF', '出力'], admin: true },
  { name: '通知設定', description: 'アラート・通知管理', href: '/notifications', keywords: ['通知', 'アラート', 'notification', 'メール'], admin: true },
  { name: '統合スキャン設定', description: '組織全体のスキャン', href: '/delegation', keywords: ['統合', 'delegation', '委任', '全体'], admin: true },
];

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // ユーザーのロールに応じてナビゲーションを構築
  const isAdmin = user?.role === 'admin' || user?.role === 'owner';
  const navigation = isAdmin ? [...baseNavigation, ...adminNavigation] : baseNavigation;

  // 検索結果のフィルタリング
  const filteredFeatures = searchQuery.trim()
    ? searchableFeatures
        .filter((feature) => {
          if (feature.admin && !isAdmin) return false;
          const query = searchQuery.toLowerCase();
          return (
            feature.name.toLowerCase().includes(query) ||
            feature.description.toLowerCase().includes(query) ||
            feature.keywords.some((k) => k.toLowerCase().includes(query))
          );
        })
        .slice(0, 6)
    : [];

  const handleFeatureClick = (href: string) => {
    navigate(href);
    setSearchQuery('');
    setSearchFocused(false);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Google Drive style header - 64px height, exact Google styling */}
      <header className="h-16 bg-white border-b border-[#dadce0] flex items-center sticky top-0 z-50">
        {/* Left section - Menu + Logo (padding-left: 8px like Google) */}
        <div className="flex items-center pl-2">
          {/* Mobile menu button - 48x48 touch target */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden w-12 h-12 flex items-center justify-center rounded-full hover:bg-[#f1f3f4] transition-colors"
            aria-label="メニュー"
          >
            <MenuIcon className="w-6 h-6 text-[#5f6368]" />
          </button>

          {/* Logo - Google uses 40x40 product icon + 22px product name */}
          <Link to="/dashboard" className="flex items-center gap-2 pl-2 pr-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="hidden sm:flex items-baseline gap-1">
              <span className="text-xl font-bold text-gray-800">Workspace</span>
              <span className="text-xl text-blue-600 font-bold">守り番<sup className="text-xs">™</sup></span>
            </div>
          </Link>
        </div>

        {/* Center - Feature Search bar */}
        <div className="flex-1 max-w-[720px] mx-auto px-4 hidden md:block">
          <div className="relative">
            <div className={`flex items-center h-[46px] bg-[#f1f3f4] rounded-full hover:bg-white hover:shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)] transition-all ${searchFocused ? 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)] rounded-b-none rounded-t-2xl' : ''}`}>
              <div className="pl-3 pr-1 flex items-center">
                <svg className="w-6 h-6 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                placeholder="機能を検索..."
                className="flex-1 h-full bg-transparent border-0 text-[16px] text-[#202124] placeholder-[#5f6368] outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#e8eaed] transition-colors"
                  title="クリア"
                >
                  <svg className="w-5 h-5 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                </button>
              )}
            </div>

            {/* Search Suggestions Dropdown */}
            {searchFocused && (
              <div className="absolute top-[46px] left-0 right-0 bg-white rounded-b-2xl shadow-[0_4px_8px_rgba(0,0,0,0.16)] border-t border-[#e8eaed] z-50 overflow-hidden">
                {filteredFeatures.length > 0 ? (
                  <div className="py-2">
                    {filteredFeatures.map((feature) => (
                      <button
                        key={feature.href + feature.name}
                        onClick={() => handleFeatureClick(feature.href)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#f1f3f4] transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-[#e8f0fe] flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-[#1a73e8]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#202124] truncate">{feature.name}</p>
                          <p className="text-xs text-[#5f6368] truncate">{feature.description}</p>
                        </div>
                        {feature.admin && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-[#fef7e0] text-[#b06000] rounded font-medium">
                            管理者
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : searchQuery.trim() ? (
                  <div className="py-6 text-center">
                    <p className="text-sm text-[#5f6368]">「{searchQuery}」に一致する機能がありません</p>
                  </div>
                ) : (
                  <div className="py-2">
                    <p className="px-4 py-2 text-xs text-[#5f6368] font-medium">よく使う機能</p>
                    {searchableFeatures
                      .filter((f) => !f.admin || isAdmin)
                      .slice(0, 4)
                      .map((feature) => (
                        <button
                          key={feature.href + feature.name}
                          onClick={() => handleFeatureClick(feature.href)}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#f1f3f4] transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-full bg-[#f1f3f4] flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#202124] truncate">{feature.name}</p>
                            <p className="text-xs text-[#5f6368] truncate">{feature.description}</p>
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right section - Icons (Google: 48x48 touch target, 16-20px right padding) */}
        <div className="flex items-center pr-4 ml-auto">
          {/* Help icon - Google has this */}
          <button
            className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-[#f1f3f4] transition-colors"
            title="ヘルプ"
          >
            <svg className="w-6 h-6 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z" />
            </svg>
          </button>

          {/* Settings icon */}
          <button
            onClick={() => navigate('/settings')}
            className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-[#f1f3f4] transition-colors"
            title="設定"
          >
            <svg className="w-6 h-6 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
            </svg>
          </button>

          {/* User avatar - 48x48 touch target with 32x32 avatar inside (Google style) */}
          {user && (
            <div className="relative flex items-center">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-[#f1f3f4] transition-colors"
                title={user.email}
              >
                {user.photoUrl ? (
                  <img
                    src={user.photoUrl}
                    alt={user.displayName}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#1a73e8] flex items-center justify-center text-white text-sm font-medium">
                    {user.displayName[0]}
                  </div>
                )}
              </button>

              {/* User dropdown - Google Account style */}
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-[360px] bg-[#e8f0fe] rounded-3xl shadow-lg border border-[#dadce0] overflow-hidden z-50">
                    <div className="bg-white m-2 rounded-2xl">
                      <div className="p-4 text-center border-b border-[#e8eaed]">
                        {user.photoUrl ? (
                          <img
                            src={user.photoUrl}
                            alt={user.displayName}
                            className="w-20 h-20 rounded-full mx-auto mb-3"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-[#1a73e8] flex items-center justify-center text-white text-3xl font-medium mx-auto mb-3">
                            {user.displayName[0]}
                          </div>
                        )}
                        <p className="text-lg font-medium text-[#202124]">{user.displayName}</p>
                        <p className="text-sm text-[#5f6368]">{user.email}</p>
                        <a
                          href="https://myaccount.google.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-3 px-6 py-2 text-sm font-medium text-[#1a73e8] border border-[#dadce0] rounded-full hover:bg-[#f8f9fa] transition-colors"
                        >
                          Google アカウントを管理
                        </a>
                      </div>
                      <div className="p-2">
                        <button
                          onClick={logout}
                          className="w-full px-4 py-3 text-left text-sm text-[#202124] hover:bg-[#f1f3f4] rounded-xl transition-colors flex items-center gap-3"
                        >
                          <svg className="w-5 h-5 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                          </svg>
                          ログアウト
                        </button>
                      </div>
                    </div>
                    <div className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2 text-xs text-[#5f6368]">
                        <a href="#" className="hover:text-[#202124]">プライバシーポリシー</a>
                        <span>•</span>
                        <a href="#" className="hover:text-[#202124]">利用規約</a>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop (Google Drive style) */}
        <aside className="hidden lg:block w-[256px] h-[calc(100vh-64px)] sticky top-16 bg-white border-r border-[#dadce0]">
          <nav className="py-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-4 mx-3 px-4 py-3 rounded-full text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#e8f0fe] text-[#1967d2]'
                      : 'text-[#5f6368] hover:bg-[#f1f3f4]'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-[#1967d2]' : 'text-[#5f6368]'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Storage indicator (Google Drive style) */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#e8eaed]">
            <div className="flex items-center gap-3 text-sm text-[#5f6368]">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z" />
              </svg>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span>使用状況</span>
                  <span className="text-xs">無料プラン</span>
                </div>
                <div className="h-1 bg-[#e8eaed] rounded-full overflow-hidden">
                  <div className="h-full bg-[#1a73e8] w-[10%]"></div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile sidebar */}
        {mobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="fixed left-0 top-0 w-[280px] h-full bg-white z-50 lg:hidden shadow-2xl">
              <div className="flex items-center justify-between h-16 px-4 border-b border-[#dadce0]">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-gray-800">Workspace</span>
                    <span className="text-lg text-blue-600 font-bold">守り番<sup className="text-xs">™</sup></span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-full hover:bg-[#f1f3f4]"
                >
                  <CloseIcon className="w-5 h-5 text-[#5f6368]" />
                </button>
              </div>
              <nav className="py-2">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-4 mx-2 px-4 py-3 rounded-full text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-[#e8f0fe] text-[#1967d2]'
                          : 'text-[#5f6368] hover:bg-[#f1f3f4]'
                      }`}
                    >
                      <item.icon className={`w-5 h-5 ${isActive ? 'text-[#1967d2]' : 'text-[#5f6368]'}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </>
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-64px)]">
          <div className="max-w-[1280px] mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </div>
          {/* Trademark Attribution */}
          <footer className="mt-8 pb-6 text-center">
            <p className="text-xs text-[#9aa0a6]">
              Google Workspace、Google Drive は Google LLC の商標です。本サービスは Google LLC が提供・承認するものではありません。
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
