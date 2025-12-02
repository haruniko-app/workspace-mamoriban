import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

const features = [
  'Google Drive™ の共有設定を自動スキャン',
  '情報漏洩リスクを0-100点で可視化',
  '外部共有・公開リンクを即座に検出',
  '改善提案を日本語でわかりやすく表示',
  'ISMS / Pマーク審査対応PDFレポート出力',
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
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-gray-800">Workspace</span>
              <span className="text-xl text-blue-600 font-bold">守り番<sup className="text-xs">™</sup></span>
            </div>
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              TOP
            </a>
            <a
              href="#features"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              機能
            </a>
            <a
              href="#security"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('security')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              安心設計
            </a>
            <Link to="/terms" className="hover:text-blue-600 transition-colors">利用規約</Link>
            <Link to="/privacy" className="hover:text-blue-600 transition-colors">プライバシー</Link>
          </nav>
        </div>
      </header>

      {/* Hero Section with Diagonal Design */}
      <main className="flex-1">
        {/* Hero Area */}
        <div className="relative overflow-hidden">
          {/* Blue diagonal background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-30"></div>
          </div>

          {/* Diagonal cut */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
              <path d="M0 120L1440 0V120H0Z" fill="rgb(240, 249, 255)" />
            </svg>
          </div>

          <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-44">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left - Text Content */}
              <div className="text-white">
                <h1 className="text-3xl md:text-[4rem] font-bold leading-tight md:leading-[1.3] mb-6">
                  Google Drive™ の<br />
                  <span className="text-yellow-300">共有リスク</span>を<br />
                  5分で可視化
                </h1>
                <p className="text-lg text-blue-100 mb-8 leading-relaxed">
                  ファイルの中身は見ずに、共有設定だけをスキャン。<br />
                  情報漏洩リスクをスコア化して、改善点を日本語で提案します。
                </p>

                {/* Stats Badges */}
                <div className="flex flex-wrap gap-4 mb-8">
                  <div className="bg-yellow-300 rounded-xl px-5 py-2 flex items-center gap-2 shadow-lg">
                    <span className="text-2xl font-bold text-blue-600">5分</span>
                    <span className="text-sm text-blue-600 font-medium">で導入完了</span>
                  </div>
                  <div className="bg-yellow-300 rounded-xl px-5 py-2 flex items-center gap-2 shadow-lg">
                    <span className="text-2xl font-bold text-blue-600">月2回</span>
                    <span className="text-sm text-blue-600 font-medium">無料スキャン</span>
                  </div>
                  <div className="bg-yellow-300 rounded-xl px-5 py-2 flex items-center gap-2 shadow-lg">
                    <span className="text-2xl font-bold text-blue-600">0円</span>
                    <span className="text-sm text-blue-600 font-medium">から始められる</span>
                  </div>
                </div>

                {/* Trust Points */}
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2 text-blue-100">
                    <svg className="w-5 h-5 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>ファイル内容にアクセスしません</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-100">
                    <svg className="w-5 h-5 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>ISMS/Pマーク対応PDF出力</span>
                  </div>
                </div>
              </div>

              {/* Right - Login Card */}
              <div className="lg:ml-auto w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-2xl shadow-blue-900/20 p-8">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">無料で始める</h2>
                    <p className="text-gray-500 text-sm">
                      Google Workspace™ アカウントでログイン
                    </p>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
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

                  {/* Google Sign In Button */}
                  <button
                    onClick={login}
                    className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 rounded-xl px-6 py-4 text-gray-700 font-medium hover:border-blue-400 hover:shadow-lg transition-all"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Google でログイン
                  </button>

                  <p className="mt-4 text-xs text-center text-gray-400">
                    クレジットカード不要・即時利用可能
                  </p>

                  {/* Divider */}
                  <div className="my-6 border-t border-gray-100"></div>

                  {/* Features mini list */}
                  <div className="space-y-2">
                    {features.slice(0, 3).map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="mt-4 text-xs text-center text-blue-100">
                  ログインすることで、<Link to="/terms" className="underline hover:text-white">利用規約</Link>と<Link to="/privacy" className="underline hover:text-white">プライバシーポリシー</Link>に同意
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="py-16 bg-sky-50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                こんなリスク、<span className="text-blue-600">放置していませんか？</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Risk 1 */}
              <div className="bg-white rounded-2xl p-6 shadow-lg shadow-blue-100 hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">退職者がアクセス可能</h3>
                <p className="text-gray-600 text-sm">退職したメンバーが、まだ機密ファイルにアクセスできる状態になっていませんか？</p>
              </div>

              {/* Risk 2 */}
              <div className="bg-white rounded-2xl p-6 shadow-lg shadow-blue-100 hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">「全員に公開」のまま</h3>
                <p className="text-gray-600 text-sm">一時的に公開したファイルが、そのまま「リンクを知っている全員」に公開されていませんか？</p>
              </div>

              {/* Risk 3 */}
              <div className="bg-white rounded-2xl p-6 shadow-lg shadow-blue-100 hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 bg-yellow-100 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">外部に編集権限</h3>
                <p className="text-gray-600 text-sm">外部パートナーに渡したファイルが、編集可能な状態のままになっていませんか？</p>
              </div>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div id="security" className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 rounded-full px-4 py-1 text-sm font-medium mb-4">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  安心設計
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-4">
                  ファイルの中身は<br /><span className="text-green-600">一切見ません</span>
                </h2>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Workspace守り番は<strong>ヒューリスティックスキャン</strong>を採用。
                  ファイル名・共有設定・メタデータのみを解析し、
                  ファイルの内容（本文・画像・添付データ）には一切アクセスしません。
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-700">機密情報が外部に送信されません</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-700">ISMS / Pマーク審査対応PDFを出力</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-700">競合他社にはない独自機能</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-8">
                <div className="bg-white rounded-xl p-6 shadow-lg">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">スキャン対象</h3>
                    <div className="space-y-2 text-left">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-green-600">○</span>
                        <span className="text-gray-600">ファイル名・フォルダ名</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-green-600">○</span>
                        <span className="text-gray-600">共有設定・アクセス権限</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-green-600">○</span>
                        <span className="text-gray-600">最終更新日・オーナー情報</span>
                      </div>
                      <div className="border-t border-gray-200 my-3"></div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-red-500">×</span>
                        <span className="text-gray-400">ファイルの中身・本文</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-red-500">×</span>
                        <span className="text-gray-400">画像・添付ファイル</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-16 bg-gradient-to-r from-blue-500 to-blue-600">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              5分のスキャンで、見えなかったリスクが見える
            </h2>
            <p className="text-blue-100 mb-8">
              まずは無料プランで、あなたの組織のGoogle Driveをスキャンしてみませんか？
            </p>
            <button
              onClick={login}
              className="inline-flex items-center gap-3 bg-white text-blue-600 font-bold px-8 py-4 rounded-xl hover:shadow-xl transition-all"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              無料でスキャンを開始
            </button>
            <div className="flex items-center justify-center gap-4 mt-6 text-sm text-blue-100">
              <span>クレジットカード不要</span>
              <span>•</span>
              <span>5分で導入完了</span>
              <span>•</span>
              <span>月2回無料スキャン</span>
            </div>
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
