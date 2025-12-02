import { Link } from 'react-router-dom';

export function TermsPage() {
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
              <span className="text-xl text-blue-600 font-bold">守り番</span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <Link to="/" className="hover:text-blue-600 transition-colors">TOP</Link>
            <Link to="/privacy" className="hover:text-blue-600 transition-colors">プライバシー</Link>
            <Link to="/terms" className="text-blue-600 font-medium">利用規約</Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">利用規約</h1>
        <p className="text-gray-500 mb-12">最終更新日: 2025年11月27日</p>

        <div className="space-y-8 text-gray-600 leading-relaxed">
          <p>
            Workspace守り番をご利用いただくことにより、本規約に同意したものとみなされます。
          </p>

          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">1. 同意</h2>
            <p>本サービスを使用することにより、本規約およびプライバシーポリシーに同意したものとみなされます。</p>
          </section>

          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">2. サービスの説明</h2>
            <p>
              Workspace守り番は、Google Workspace™環境におけるGoogle Drive™の共有設定をスキャンし、
              情報漏洩リスクを可視化するセキュリティ監視ツールです。本サービスはリスクの「可視化」を
              目的としており、セキュリティインシデントの防止を保証するものではありません。
            </p>
          </section>

          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">3. 要件</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>有効なGoogle Workspace™アカウント</li>
              <li>Google Drive™へのアクセス</li>
              <li>必要な権限の付与</li>
              <li>13歳以上であること</li>
            </ul>
          </section>

          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">4. 許可される使用</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>組織のセキュリティ状況の把握・監視</li>
              <li>共有設定のリスク評価・分析</li>
              <li>本規約に沿った合法的な目的</li>
            </ul>
          </section>

          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">5. 禁止される使用</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>違法または有害な目的での使用</li>
              <li>サービスのリバースエンジニアリング</li>
              <li>知的財産権の侵害</li>
              <li>不正アクセスの試み</li>
              <li>再配布またはサブライセンス</li>
            </ul>
          </section>

          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">6. 知的財産</h2>
            <p>本サービスは知的財産法により保護されています。お客様のGoogle Drive™内のコンテンツはお客様の所有物のままです。</p>
          </section>

          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">7. 料金</h2>
            <p>
              本サービスには無料プランと有料プランがあります。有料プランの料金は別途定める料金表に従います。
              料金の支払いはStripeを通じて処理されます。
            </p>
          </section>

          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">8. 免責</h2>
            <p>本サービスは「現状のまま」提供され、いかなる種類の保証もありません。</p>
          </section>

          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">9. 責任の制限</h2>
            <p>間接的、偶発的、または結果的な損害について責任を負いません。</p>
          </section>

          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">10. 変更</h2>
            <p>本サービスをいつでも変更または中止する場合があります。変更後の継続使用は同意を構成します。</p>
          </section>

          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">11. 終了</h2>
            <p>違反に対してアクセスを終了する場合があります。いつでもアカウントを削除できます。</p>
          </section>

          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">12. 準拠法</h2>
            <p>本規約は日本法に準拠します。</p>
          </section>

          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">13. 連絡先</h2>
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
              <span className="text-white font-bold">Workspace守り番</span>
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
