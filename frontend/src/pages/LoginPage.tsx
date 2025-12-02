import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

const features = [
  'Google Drive™ の共有設定を自動スキャン',
  '情報漏洩リスクを0-100点で可視化',
  '外部共有・公開リンクを即座に検出',
  '改善提案を日本語でわかりやすく表示',
];

export function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error');

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600 text-sm">読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          {/* Google-style product icon */}
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[22px] text-gray-700">Workspace</span>
            <span className="text-[22px] text-gray-700 font-normal">守り番</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex">
        {/* Left side - Hero */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 to-slate-800 items-center justify-center p-12">
          <div className="max-w-lg">
            {/* Risk Appeal Headline */}
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              その共有設定、
              <br />
              <span className="text-red-400">本当に大丈夫ですか？</span>
            </h1>
            <p className="text-lg text-slate-300 mb-8">
              今この瞬間、あなたの組織の Google Drive™ で
              <span className="text-red-400 font-medium">「リンクを知っている全員」</span>に
              公開された機密ファイルがあるかもしれません。
            </p>

            {/* Risk Statistics */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="text-3xl font-bold text-red-400 mb-1">4億円</div>
                <div className="text-xs text-slate-400">情報漏洩の<br/>平均被害額</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="text-3xl font-bold text-orange-400 mb-1">62%</div>
                <div className="text-xs text-slate-400">中小企業の<br/>セキュリティ未対策率</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="text-3xl font-bold text-yellow-400 mb-1">280日</div>
                <div className="text-xs text-slate-400">漏洩発覚まで<br/>の平均日数</div>
              </div>
            </div>

            {/* Risk Scenarios */}
            <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700 mb-6">
              <div className="text-sm font-medium text-slate-300 mb-3">こんなリスク、放置していませんか？</div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>退職者がまだ機密ファイルにアクセス可能</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>「全員に公開」のまま放置されたファイル</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>外部パートナーに渡したファイルが編集可能</span>
                </div>
              </div>
            </div>

            {/* Privacy Guarantee - Strong emphasis */}
            <div className="bg-emerald-900/30 rounded-xl p-4 border border-emerald-700 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-bold text-emerald-400 mb-1">
                    ファイルの中身は一切見ません
                  </div>
                  <div className="text-xs text-slate-400 leading-relaxed">
                    ヒューリスティックスキャンにより、<span className="text-emerald-400 font-medium">ファイル名・共有設定・メタデータのみ</span>を解析。
                    ファイルの内容（本文・画像・添付データ）には一切アクセスしません。
                    機密情報が外部に送信されることはありません。
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center">
              <div className="text-xl font-bold text-white mb-2">
                5分のスキャンで、見えなかったリスクが見える
              </div>
              <div className="text-sm text-slate-400 mb-4">
                無料プランで今すぐ診断 →
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>クレジットカード不要</span>
                <span className="text-slate-600">・</span>
                <span>5分で導入完了</span>
                <span className="text-slate-600">・</span>
                <span>月2回無料スキャン</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Google-style login card */}
            <div className="bg-white rounded-lg border border-gray-300 p-10 shadow-sm">
              <div className="text-center mb-8">
                <h2 className="text-2xl text-gray-800 mb-2">ログイン</h2>
                <p className="text-gray-600">
                  Google Workspace™ アカウントでログイン
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-red-700">
                    {error === 'auth_failed'
                      ? '認証に失敗しました。もう一度お試しください。'
                      : error === 'access_denied'
                      ? 'ログインがキャンセルされました。'
                      : error === 'no_organization'
                      ? '組織情報が見つかりませんでした。Google Workspace管理者にお問い合わせください。'
                      : '認証中にエラーが発生しました。もう一度お試しください。'}
                  </p>
                </div>
              )}

              {/* Features */}
              <div className="mb-8 space-y-3">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Google Sign In Button - Material Design style */}
              <button
                onClick={login}
                className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded px-6 py-3 text-gray-700 font-medium hover:bg-gray-50 hover:shadow transition-all"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google でログイン
              </button>

              <div className="mt-6 text-center">
                <p className="text-xs text-gray-500">
                  無料プランで始められます（月2回スキャン）
                </p>
              </div>
            </div>

            <p className="mt-6 text-xs text-center text-gray-500">
              ログインすることで、<Link to="/terms" className="text-blue-600 hover:underline">利用規約</Link>と<Link to="/privacy" className="text-blue-600 hover:underline">プライバシーポリシー</Link>に同意したものとみなされます
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-center gap-8 text-sm text-gray-500 mb-4">
          <Link to="/privacy" className="hover:text-gray-700">プライバシー</Link>
          <Link to="/terms" className="hover:text-gray-700">利用規約</Link>
        </div>
        <div className="flex items-center justify-center text-sm text-gray-500 mb-2">
          <span>&copy; 2025 株式会社ハルニコ</span>
        </div>
        <p className="text-xs text-gray-400 text-center">
          Google Workspace、Google Drive、Gmail は Google LLC の商標です。本サービスは Google LLC が提供・承認するものではありません。
        </p>
      </footer>
    </div>
  );
}
