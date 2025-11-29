import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

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
        <div className="hidden lg:flex lg:w-1/2 bg-gray-50 items-center justify-center p-12">
          <div className="max-w-lg">
            <h1 className="text-4xl font-normal text-gray-800 leading-tight mb-6">
              Google Workspace™ の
              <br />
              セキュリティを守る
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Google Drive™ の共有設定をスキャンし、情報漏洩リスクを可視化。
              シンプルな操作で、組織のセキュリティ状況を把握できます。
            </p>

            {/* Feature illustration */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-red-600 font-medium">3</span>
                </div>
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <span className="text-orange-600 font-medium">12</span>
                </div>
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <span className="text-yellow-600 font-medium">28</span>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 font-medium">156</span>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                <div className="bg-red-500 w-[2%]"></div>
                <div className="bg-orange-500 w-[6%]"></div>
                <div className="bg-yellow-500 w-[14%]"></div>
                <div className="bg-green-500 w-[78%]"></div>
              </div>
              <p className="text-sm text-gray-500 mt-3">リスクレベル別ファイル数</p>
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
                      : `エラーが発生しました: ${error}`}
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
              ログインすることで、
              <a href="#" className="text-blue-600 hover:underline">利用規約</a>
              と
              <a href="#" className="text-blue-600 hover:underline">プライバシーポリシー</a>
              に同意したものとみなされます
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <span>&copy; 2025 Haruniko Inc.</span>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-gray-700">ヘルプ</a>
            <a href="#" className="hover:text-gray-700">プライバシー</a>
            <a href="#" className="hover:text-gray-700">利用規約</a>
          </div>
        </div>
        <p className="text-xs text-gray-400 text-center">
          Google Workspace、Google Drive、Gmail は Google LLC の商標です。本サービスは Google LLC が提供・承認するものではありません。
        </p>
      </footer>
    </div>
  );
}
