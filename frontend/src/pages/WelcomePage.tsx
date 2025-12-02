import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function WelcomePage() {
  const { user } = useAuth();
  const domain = user?.email.split('@')[1] || '';

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-gray-800">Workspace</span>
              <span className="text-xl text-blue-600 font-bold">守り番<sup className="text-xs">™</sup></span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <Link to="/privacy" className="hover:text-blue-600 transition-colors">プライバシー</Link>
            <Link to="/terms" className="hover:text-blue-600 transition-colors">利用規約</Link>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-6 pb-20">
        <div className="max-w-[500px] w-full">
          {/* Welcome message */}
          <div className="text-center mb-10">
            <h1 className="text-[28px] text-[#202124] font-normal mb-2">
              ようこそ、{user?.displayName}さん
            </h1>
            <p className="text-[16px] text-[#5f6368]">
              {domain} の管理を始めましょう
            </p>
          </div>

          {/* Setup card */}
          <div className="border border-[#dadce0] rounded-lg overflow-hidden">
            {/* Organization section */}
            <div className="p-6 border-b border-[#dadce0]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#e8f0fe] flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#1a73e8]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] text-[#5f6368]">組織</p>
                  <p className="text-[16px] text-[#202124] font-medium">{domain}</p>
                </div>
              </div>
            </div>

            {/* Features list */}
            <div className="p-6">
              <p className="text-[14px] text-[#5f6368] mb-4">守り番でできること</p>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <svg className="w-5 h-5 text-[#1a73e8] mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                  </svg>
                  <div>
                    <p className="text-[14px] text-[#202124]">共有設定のスキャン</p>
                    <p className="text-[12px] text-[#5f6368]">Google Driveのファイル共有状況を自動で検出</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <svg className="w-5 h-5 text-[#1a73e8] mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
                  </svg>
                  <div>
                    <p className="text-[14px] text-[#202124]">リスクの可視化</p>
                    <p className="text-[12px] text-[#5f6368]">情報漏洩リスクをダッシュボードで一目で確認</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <svg className="w-5 h-5 text-[#1a73e8] mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 17H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2zM3 22l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2v20z" />
                  </svg>
                  <div>
                    <p className="text-[14px] text-[#202124]">レポート出力</p>
                    <p className="text-[12px] text-[#5f6368]">ISMS・Pマーク対応のセキュリティレポート</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Plan info */}
            <div className="px-6 pb-6">
              <div className="bg-[#e6f4ea] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-[#137333]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  <span className="text-[14px] font-medium text-[#137333]">無料プランで開始</span>
                </div>
                <p className="text-[12px] text-[#137333] ml-7">
                  月2回のスキャン・最大5ユーザー・基本レポート
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Link
              to="/dashboard"
              className="order-2 sm:order-1 px-6 py-2.5 text-[14px] font-medium text-[#1a73e8] hover:bg-[#f8f9fa] rounded-md transition-colors text-center"
            >
              スキップ
            </Link>
            <Link
              to="/scan"
              className="order-1 sm:order-2 px-6 py-2.5 text-[14px] font-medium text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-md transition-colors text-center"
            >
              スキャンを開始
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-white font-bold">Workspace守り番<sup className="text-xs">™</sup></span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link to="/privacy" className="hover:text-white transition-colors">プライバシーポリシー</Link>
              <Link to="/terms" className="hover:text-white transition-colors">利用規約</Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm">
            <p className="mb-2">&copy; 2025 株式会社ハルニコ</p>
            <p className="text-xs text-gray-500">
              Google Workspace、Google Drive、Gmail は Google LLC の商標です。本サービスは Google LLC が提供・承認するものではありません。
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
