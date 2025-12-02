import { Link } from 'react-router-dom';

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
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
            <Link to="/" className="hover:text-blue-600 transition-colors">TOP</Link>
            <Link to="/#features" className="hover:text-blue-600 transition-colors">機能</Link>
            <Link to="/#security" className="hover:text-blue-600 transition-colors">安心設計</Link>
            <Link to="/terms" className="hover:text-blue-600 transition-colors">利用規約</Link>
            <Link to="/privacy" className="text-blue-600 font-medium">プライバシー</Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">プライバシーポリシー</h1>
        <p className="text-gray-500 mb-12">最終更新日: 2025年11月27日</p>

        <div className="max-w-4xl space-y-8 text-gray-600 leading-relaxed">
          <p>
            このプライバシーポリシーは、Workspace守り番がサービス使用時にどのように情報を収集、使用、保護するかについて説明します。
          </p>

          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">1. アクセスする情報</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-gray-800">アカウント情報：</strong>
                Googleアカウントから取得する氏名、メールアドレス、プロフィール画像。
              </li>
              <li>
                <strong className="text-gray-800">組織情報：</strong>
                Google Workspace™のドメイン情報。
              </li>
              <li>
                <strong className="text-gray-800">ファイルメタデータ：</strong>
                Google Drive™のファイル名、共有設定、権限情報。<strong>ファイルの内容（コンテンツ）は取得しません。</strong>
              </li>
            </ul>
          </section>

          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">2. 情報の使用方法</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>共有設定のスキャン・リスク評価を提供</li>
              <li>セキュリティリスクの可視化・レポート生成</li>
              <li>サービスの改善・開発</li>
            </ul>
          </section>

          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">3. データの保存</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-gray-800">ファイル内容非取得：</strong>
                ファイルの内容（コンテンツ）を取得・保存することはありません。
              </li>
              <li>
                <strong className="text-gray-800">メタデータ：</strong>
                スキャン結果（ファイル名、共有設定等）は一定期間保存後、自動削除されます。
              </li>
              <li>
                <strong className="text-gray-800">アカウント情報：</strong>
                サービス提供に必要な期間保存されます。
              </li>
            </ul>
          </section>

          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">4. データの共有</h2>
            <p className="mb-4">以下の場合を除き、情報を第三者に販売・転送しません：</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-gray-800">決済処理：</strong>
                有料プランの決済はStripeを通じて処理されます。
              </li>
              <li>
                <strong className="text-gray-800">法的要件：</strong>
                法律で要求される場合、情報を開示する場合があります。
              </li>
            </ul>
          </section>

          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">5. セキュリティ</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>すべてのデータ送信はHTTPS暗号化を使用</li>
              <li>Google Cloud Platformの安全なインフラストラクチャを使用</li>
              <li>アクセス制御と定期的なセキュリティ監査を実施</li>
            </ul>
          </section>

          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">6. お客様の権利</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-gray-800">アクセス：</strong>
                自己の個人情報へのアクセスを請求できます。
              </li>
              <li>
                <strong className="text-gray-800">削除：</strong>
                アカウント削除により、関連するすべてのデータが削除されます。
              </li>
              <li>
                <strong className="text-gray-800">連携解除：</strong>
                Googleアカウントとの連携をいつでも解除できます。
              </li>
            </ul>
          </section>

          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">7. 児童のプライバシー</h2>
            <p>本サービスは13歳未満の児童を対象としていません。児童から個人情報を故意に収集することはありません。</p>
          </section>

          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">8. 変更</h2>
            <p>このポリシーを更新する場合があります。変更は「最終更新日」で示されます。</p>
          </section>

          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">9. お問い合わせ</h2>
            <p>
              <strong className="text-gray-800">株式会社ハルニコ</strong><br />
              〒123-0852 東京都足立区関原3-5-7<br />
              メール: info@haruniko.co.jp
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <Link to="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            TOPに戻る
          </Link>
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
