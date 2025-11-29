# Google 商標ガイドライン

**最終更新**: 2025年11月29日
**調査日**: 2025年11月29日

本ドキュメントは、Workspace守り番における Google 商標の適切な使用方法をまとめたものです。

---

## 公式リソース

- [Google Brand Resource Center - Trademark list](https://about.google/brand-resource-center/trademark-list/)
- [Google Developer Documentation - Trademarks](https://developers.google.com/style/trademarks)
- [Google Workspace Marketplace branding guidelines](https://developers.google.com/workspace/marketplace/terms/branding)
- [Google Brand Resource Center - Guidance](https://about.google/brand-resource-center/guidance/)
- [Google Brand Resource Center - Rules](https://about.google/brand-resource-center/rules/)

---

## 商標シンボルの使い分け

### ™（トレードマーク）と ®（登録商標）の違い

| シンボル | 意味 | 使用条件 |
|---------|------|----------|
| ™ | 未登録商標 | いつでも使用可能。商標権を主張していることを示す |
| ® | 登録商標 | 特許庁に正式に登録された商標のみ使用可能 |

### Google の方針

Google の Brand Resource Center では、**すべての商標に ™ シンボルを使用**しています。これは国際的に一貫した表記を維持するためと考えられます（登録状況は国によって異なるため）。

---

## 本サービスで使用する Google 商標一覧

| 商標名 | シンボル | 用途 |
|--------|---------|------|
| Google | ™ | 検索エンジン、企業名 |
| Google Workspace | ™ | 生産性・コラボレーションツール |
| Google Drive | ™ | オンラインストレージサービス |
| Gmail | ™ | メールサービス |
| Google Chrome | ™ | ブラウザ |
| Android | ™ | モバイルプラットフォーム |

---

## 正しい使用方法

### 1. 商標シンボルの付け方

**ルール**: 各言語セクション・ページで**最初または最も目立つ箇所**に ™ を付ける。2回目以降は省略可能。

```
✅ 正しい例:
「Google Workspace™ のセキュリティを守る」
「Google Drive™ の共有設定をスキャンします」

❌ 間違った例:
「Google Workspace™ の Google Workspace™ 管理者向け」（重複）
```

### 2. 商標は名詞を修飾する形容詞として使用

商標は単独で名詞として使わず、製品・サービスを説明する形容詞として使用します。

```
✅ 正しい例:
「Google Drive™ ストレージサービス」
「Google Workspace™ アカウント」
「Chromebook™ ノートパソコン」

❌ 間違った例:
「Driveにアップロード」（Driveを名詞として使用）
「Chromebooksを購入」（複数形にしている）
```

### 3. 動詞として使用しない

```
✅ 正しい例:
「Google™ 検索を使用して調べる」

❌ 間違った例:
「ググる」「Googleする」
```

### 4. 所有格・複数形にしない

```
✅ 正しい例:
「Google Drive™ の機能」

❌ 間違った例:
「Google Drive's の機能」
「Google Drives」
```

---

## 帰属表示（Attribution）

### 必須の帰属表示

Google 商標を使用する場合、以下の帰属表示をフッターなどに記載する必要があります。

#### 基本形式
```
Google Workspace、Google Drive、Gmail は Google LLC の商標です。
```

#### 拡張形式（第三者アプリの場合）
```
Google Workspace、Google Drive、Gmail は Google LLC の商標です。
本サービスは Google LLC が提供・承認するものではありません。
```

### 帰属表示のポイント

- 帰属表示内では ™ シンボルは不要（テキストで商標であることを明記しているため）
- 視認可能なサイズで記載する
- フッター、About ページ、利用規約などに記載

---

## 禁止事項

### 絶対にやってはいけないこと

1. **商標をブランド名に組み込まない**
   ```
   ❌ 「Google セキュリティチェッカー」
   ❌ 「Drive 守り番」
   ✅ 「Workspace 守り番」（for Google Workspace™）
   ```

2. **ロゴを無断使用しない**
   - Google のロゴやアイコンは書面による許可なく使用禁止
   - 類似のロゴを作成することも禁止

3. **商標を改変しない**
   ```
   ❌ 「G-Drive」「GoogleDrive」
   ✅ 「Google Drive」
   ```

4. **誤解を招く表現を避ける**
   ```
   ❌ 「Google 公認アプリ」
   ❌ 「Google が推奨」
   ✅ 「Google Drive™ 対応」
   ✅ 「Google Workspace™ 向け」
   ```

---

## 互換性の表記方法

Google 製品との互換性を示す場合は、以下の形式を使用します。

```
✅ 推奨される表記:
「for Google Workspace™」
「for use with Google Drive™」
「compatible with Gmail™」

❌ 避けるべき表記:
「Google Workspace 版」
「Google Drive 専用」
```

---

## 本サービスでの実装例

### ログインページ

```tsx
// ヘッダー部分（最初の出現）
<h1>Google Workspace™ のセキュリティを守る</h1>
<p>Google Drive™ の共有設定をスキャンし...</p>

// フッター（帰属表示）
<footer>
  <p>© 2025 Haruniko Inc.</p>
  <p>Google Workspace、Google Drive、Gmail は Google LLC の商標です。
     本サービスは Google LLC が提供・承認するものではありません。</p>
</footer>
```

### ダッシュボード・その他のページ

```tsx
// 見出し部分（各ページの最初の出現）
<p>Google Drive™ のセキュリティ状況</p>

// フッター（簡易版帰属表示）
<footer>
  <p>Google Workspace、Google Drive、Gmail は Google LLC の商標です。</p>
</footer>
```

---

## チェックリスト

商標使用時の確認事項:

- [ ] 各ページで最初の出現箇所に ™ を付けているか
- [ ] 商標を名詞でなく形容詞として使用しているか
- [ ] 商標を動詞・所有格・複数形にしていないか
- [ ] フッターに帰属表示があるか
- [ ] Google と無関係であることを明示しているか（第三者アプリの場合）
- [ ] Google のロゴを無断使用していないか
- [ ] 商標をブランド名に組み込んでいないか

---

## 参考情報

### 商標登録について

- ™ は未登録でも使用可能
- ® は USPTO（米国特許商標庁）などに正式登録された場合のみ使用可能
- 日本では ® の代わりに「登録商標」と表記することも一般的

### 更新履歴

| 日付 | 内容 |
|------|------|
| 2025-11-29 | 初版作成 |

---

## 免責事項

本ドキュメントは 2025年11月29日時点での Google 公式ガイドラインに基づいて作成されています。最新のガイドラインは必ず [Google Brand Resource Center](https://about.google/brand-resource-center/) を確認してください。
