# Claude Code 開発 虎の巻

このドキュメントは、Workspace守り番の開発で得た知見をまとめたものです。
同じミスや回り道を避けるためのベストプラクティス集です。

---

## 目次

1. [React Router](#react-router)
2. [Tailwind CSS](#tailwind-css)
3. [ランディングページ設計](#ランディングページ設計)
4. [利用規約・同意フロー](#利用規約同意フロー)
5. [デプロイ・CI/CD](#デプロイcicd)
6. [UI/UX パターン](#uiux-パターン)

---

## React Router

### ページ遷移時のスクロール位置リセット

**問題**: SPAではページ遷移時にスクロール位置が保持され、別ページでも下にスクロールした状態で表示される。

**解決策**: `ScrollToTop` コンポーネントを作成し、`BrowserRouter` 内に配置する。

```tsx
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

// App.tsx で使用
<BrowserRouter>
  <ScrollToTop />
  <Routes>
    {/* ... */}
  </Routes>
</BrowserRouter>
```

### ルートURL（/）をランディングページにする

**問題**: `/login` ではなく `/` でランディングページを表示したい。

**解決策**:
```tsx
// 変更前
<Route path="/login" element={<LoginPage />} />
<Route path="/" element={<Navigate to="/login" replace />} />

// 変更後
<Route path="/" element={<LoginPage />} />
<Route path="/login" element={<Navigate to="/" replace />} />  // 後方互換性

// ProtectedRoute も更新
return <Navigate to="/" replace />;  // /login から / に変更
```

### ハッシュリンク（/#section）への遷移

**注意**: `<Link to="/#features">` は別ページからのアクセス時にスクロールが動作しない場合がある。同一ページ内では `scrollIntoView` を使う。

```tsx
<a
  href="#features"
  onClick={(e) => {
    e.preventDefault();
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  }}
>
  機能
</a>
```

---

## Tailwind CSS

### カスタム値の指定

Tailwindのプリセット値が合わない場合は、任意の値を `[]` で指定できる。

```tsx
// フォントサイズ
className="text-[4rem]"          // 4rem

// 行間（line-height）
className="leading-[1.3]"        // 1.3
className="leading-[2.5rem]"     // 2.5rem

// 最大幅
className="max-w-[896px]"        // 896px（max-w-4xl相当）
```

### よく使う値の対応表

| Tailwind | 値 |
|----------|-----|
| `text-sm` | 0.875rem (14px) |
| `text-base` | 1rem (16px) |
| `text-3xl` | 1.875rem (30px) |
| `text-4xl` | 2.25rem (36px) |
| `text-5xl` | 3rem (48px) |
| `leading-tight` | 1.25 |
| `leading-snug` | 1.375 |
| `max-w-4xl` | 56rem (896px) |
| `max-w-7xl` | 80rem (1280px) |

### z-indexの重要性

クリッカブル要素が反応しない場合、z-indexを確認する。

```tsx
// ヘッダーロゴがクリックできない場合
className="relative z-10"  // 親要素より高いz-indexを設定
```

### チェックボックスのカスタムスタイル

```tsx
<label className="flex items-start gap-3 cursor-pointer group">
  <div className="relative flex items-center justify-center mt-0.5">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => setChecked(e.target.checked)}
      className="w-5 h-5 border-2 border-gray-300 rounded appearance-none cursor-pointer checked:bg-blue-500 checked:border-blue-500 transition-colors"
    />
    {checked && (
      <svg className="absolute w-3 h-3 text-white pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    )}
  </div>
  <span className="text-sm text-gray-600">ラベルテキスト</span>
</label>
```

---

## ランディングページ設計

### 統一すべき要素

複数ページで統一すべき要素:

1. **ヘッダー**
   - ロゴ（クリッカブル、TOPへ遷移）
   - ナビゲーションリンク
   - ロゴデザイン（グラデーション、シャドウ）

2. **フッター**
   - ロゴ（クリッカブル、TOPへ遷移）
   - リンク（プライバシー、利用規約）
   - 著作権表示
   - 商標表記

3. **コンテンツ幅**
   - `max-w-7xl` または `max-w-4xl` で統一
   - 視覚的な統一感のため、同じ制約を使う

### ロゴの共通パターン

```tsx
// ヘッダー用
<Link to="/" className="flex items-center gap-2">
  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
    <svg className="w-6 h-6 text-white" ...>
      {/* シールドアイコン */}
    </svg>
  </div>
  <div className="flex items-baseline gap-1">
    <span className="text-xl font-bold text-gray-800">Workspace</span>
    <span className="text-xl text-blue-600 font-bold">守り番<sup className="text-xs">™</sup></span>
  </div>
</Link>

// フッター用（ダークテーマ）
<Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
    {/* 同じアイコン */}
  </div>
  <span className="text-white font-bold">Workspace守り番<sup className="text-xs">™</sup></span>
</Link>
```

### ナビゲーションリンクのパターン

```tsx
// 公開ページ（Terms, Privacy）
<nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
  <Link to="/" className="hover:text-blue-600 transition-colors">TOP</Link>
  <Link to="/#features" className="hover:text-blue-600 transition-colors">機能</Link>
  <Link to="/#security" className="hover:text-blue-600 transition-colors">安心設計</Link>
  <Link to="/terms" className="text-blue-600 font-medium">利用規約</Link>  {/* 現在ページはハイライト */}
  <Link to="/privacy" className="hover:text-blue-600 transition-colors">プライバシー</Link>
</nav>
```

---

## 利用規約・同意フロー

### 明示的な同意を求める

「ログインすることで同意したものとみなす」ではなく、チェックボックスで明示的な同意を求める。

```tsx
const [agreedToTerms, setAgreedToTerms] = useState(false);

// チェックボックス
<label className="flex items-start gap-3 cursor-pointer group mb-4">
  {/* チェックボックスUI */}
  <span className="text-sm text-gray-600">
    <Link to="/terms" className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>利用規約</Link>
    と
    <Link to="/privacy" className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>プライバシーポリシー</Link>
    に同意します
  </span>
</label>

// ログインボタン（同意前は無効化）
<button
  onClick={login}
  disabled={!agreedToTerms}
  className={`... ${
    agreedToTerms
      ? 'bg-white border-gray-200 text-gray-700 hover:border-blue-400 cursor-pointer'
      : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
  }`}
>
  Google でログイン
</button>
```

### リンククリック時の動作

チェックボックスラベル内のリンクをクリックしてもチェック状態が変わらないようにする:

```tsx
<Link
  to="/terms"
  onClick={(e) => e.stopPropagation()}  // イベント伝播を停止
>
  利用規約
</Link>
```

### Google OAuth の場合

Google OAuth認証では、初回ログイン時にバックエンドで自動的にアカウントが作成されるため、別途「アカウント作成画面」は不要。同意チェックボックスで法的要件を満たせる。

---

## デプロイ・CI/CD

### GitHub Actions のデプロイ監視

```bash
# 最新のデプロイ状況確認
gh run list --limit 5

# 特定のrunの詳細
gh run view <run_id>

# ログ確認（完了後のみ）
gh run view <run_id> --log
```

### デプロイ時間の目安

- フロントエンド: 約1分30秒
- バックエンド: 約1分50秒
- 合計: 約3分

### よくある問題

1. **CI失敗、Deploy成功**: CIは別ワークフロー。Deployが成功していれば本番反映される。
2. **キャッシュ**: ブラウザキャッシュで古い内容が表示される場合、強制リロード（Cmd+Shift+R）。

---

## UI/UX パターン

### ボタンの無効状態

視覚的に無効状態を明確にする:

```tsx
className={`... ${
  isEnabled
    ? 'bg-white text-gray-700 hover:shadow-lg cursor-pointer'
    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
}`}
```

Googleロゴなど、アイコンの色も変更:

```tsx
<path fill={isEnabled ? "#4285F4" : "#9CA3AF"} d="..." />
```

### ホバーエフェクト

- ボタン: `hover:shadow-lg`, `hover:border-blue-400`
- リンク: `hover:text-blue-600`, `hover:underline`
- ロゴ: `hover:opacity-80`

### 間隔・余白の調整

要素間が近すぎる場合:

```tsx
// 下マージンを追加
className="... mb-4"  // 1rem = 16px

// 上マージンを追加
className="... mt-6"  // 1.5rem = 24px
```

### 行間の調整

```tsx
// Tailwindのプリセット
className="leading-tight"   // 1.25
className="leading-snug"    // 1.375
className="leading-normal"  // 1.5

// カスタム値
className="leading-[1.3]"
className="leading-[2.5rem]"
```

---

## 商標表記

### Google商標

フッターに以下を記載:

```tsx
<p className="text-xs text-gray-500">
  Google Workspace、Google Drive、Gmail は Google LLC の商標です。本サービスは Google LLC が提供・承認するものではありません。
</p>
```

### 自社商標

サービス名に ™ を付与:

```tsx
<span>守り番<sup className="text-xs">™</sup></span>
```

---

## チェックリスト

新しいページを作成する際のチェックリスト:

- [ ] ヘッダーのロゴがTOPへリンクしているか
- [ ] フッターのロゴがTOPへリンクしているか
- [ ] ナビゲーションリンクが統一されているか
- [ ] コンテンツ幅が他ページと統一されているか
- [ ] スクロール位置がリセットされるか
- [ ] z-indexの問題でクリックできない要素がないか
- [ ] モバイル表示で問題ないか
- [ ] 商標表記があるか

---

**最終更新**: 2025年12月2日
