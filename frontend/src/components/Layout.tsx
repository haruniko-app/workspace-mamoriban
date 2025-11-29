import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'ダッシュボード', href: '/dashboard', icon: HomeIcon },
  { name: 'スキャン', href: '/scan', icon: SecurityIcon },
  { name: '監査ログ', href: '/audit-logs', icon: AuditIcon },
  { name: '組織管理', href: '/organization', icon: OrganizationIcon },
  { name: '設定', href: '/settings', icon: SettingsIcon },
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

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Google Drive style header */}
      <header className="h-16 bg-white border-b border-[#dadce0] flex items-center px-2 sticky top-0 z-50">
        {/* Left section - Logo */}
        <div className="flex items-center min-w-[200px]">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-3 rounded-full hover:bg-[#f1f3f4] transition-colors mr-1"
            aria-label="メニュー"
          >
            <MenuIcon className="w-6 h-6 text-[#5f6368]" />
          </button>

          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2">
            <svg className="w-10 h-10" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="8" fill="#1a73e8" />
              <path
                d="M24 8L12 15v13c0 8.4 5.1 16.3 12 18.5 6.9-2.2 12-10.1 12-18.5V15l-12-7z"
                fill="white"
              />
              <path
                d="M20 24l3 3 6-6"
                stroke="#1a73e8"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-[22px] text-[#5f6368] hidden sm:block">
              Workspace守り番
            </span>
          </Link>
        </div>

        {/* Center - Search bar (Google Drive style) */}
        <div className="flex-1 max-w-[720px] mx-4 hidden md:block">
          <div className="relative">
            <div className="flex items-center h-12 bg-[#f1f3f4] rounded-full hover:bg-[#e8eaed] hover:shadow-sm focus-within:bg-white focus-within:shadow-md transition-all">
              <div className="pl-4 pr-2 flex items-center">
                <svg className="w-5 h-5 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="ファイルを検索"
                className="flex-1 h-full bg-transparent border-0 text-[16px] text-[#202124] placeholder-[#5f6368] outline-none"
              />
              <button className="p-2 mr-2 rounded-full hover:bg-[#dadce0] transition-colors" title="検索オプション">
                <svg className="w-6 h-6 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Right section - Icons (Google Drive order: check, help, settings, apps, avatar) */}
        <div className="flex items-center gap-1">
          {/* Status check icon */}
          <button className="p-3 rounded-full hover:bg-[#f1f3f4] transition-colors hidden sm:flex" title="ステータス">
            <svg className="w-6 h-6 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </button>

          {/* Help icon */}
          <button className="p-3 rounded-full hover:bg-[#f1f3f4] transition-colors hidden sm:flex" title="ヘルプ">
            <svg className="w-6 h-6 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z" />
            </svg>
          </button>

          {/* Settings icon */}
          <button
            onClick={() => navigate('/settings')}
            className="p-3 rounded-full hover:bg-[#f1f3f4] transition-colors hidden sm:flex"
            title="設定"
          >
            <svg className="w-6 h-6 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
            </svg>
          </button>

          {/* Apps grid icon */}
          <button className="p-3 rounded-full hover:bg-[#f1f3f4] transition-colors" title="Google アプリ">
            <svg className="w-6 h-6 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6 12c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-6 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0-6c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-4c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-12c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>

          {/* User avatar - rightmost */}
          {user && (
            <div className="relative ml-2">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="rounded-full hover:shadow-md transition-shadow"
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
                  <div className="absolute right-0 mt-2 w-[360px] bg-[#e8f0fe] rounded-3xl shadow-lg border border-[#dadce0] overflow-hidden z-50">
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
                  <svg className="w-10 h-10" viewBox="0 0 48 48" fill="none">
                    <rect width="48" height="48" rx="8" fill="#1a73e8" />
                    <path
                      d="M24 8L12 15v13c0 8.4 5.1 16.3 12 18.5 6.9-2.2 12-10.1 12-18.5V15l-12-7z"
                      fill="white"
                    />
                    <path
                      d="M20 24l3 3 6-6"
                      stroke="#1a73e8"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-[18px] text-[#5f6368]">Workspace守り番</span>
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
