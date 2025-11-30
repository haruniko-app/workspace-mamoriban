# 権限管理機能 設計書

## 1. 概要

本ドキュメントでは、Workspace守り番における共有設定管理機能の設計を定義します。
ユーザーがリスクのあるファイルに対して効率的に対処できるよう、以下の2つの機能を提供します。

1. **フォルダ単位でのグルーピング表示**
2. **アプリ内での権限変更機能**

---

## 2. 機能A: フォルダ単位でのグルーピング表示

### 2.1 目的

同じフォルダ内にリスクファイルが複数ある場合、フォルダの共有設定を1回変更するだけで
複数のファイルのリスクを一括解決できる。ユーザーの作業効率を大幅に向上。

### 2.2 データモデル変更

```typescript
// ScannedFile に追加するフィールド
interface ScannedFile {
  // ... 既存フィールド

  // 親フォルダ情報
  parentFolderId: string | null;      // 親フォルダのID
  parentFolderName: string | null;    // 親フォルダ名
  folderPath: string | null;          // フルパス（例: "マイドライブ/プロジェクト/資料"）
}
```

### 2.3 API変更

#### Drive API からの追加取得フィールド

```javascript
// files.list / files.get のfieldsに追加
fields: '...,parents'

// 親フォルダ情報を別途取得
drive.files.get({
  fileId: parentId,
  fields: 'id,name'
});
```

#### 新規エンドポイント

```
GET /api/scan/:scanId/folders
```

レスポンス:
```json
{
  "folders": [
    {
      "id": "folder_id_1",
      "name": "プロジェクト資料",
      "path": "マイドライブ/営業/プロジェクト資料",
      "fileCount": 15,
      "riskySummary": {
        "critical": 2,
        "high": 5,
        "medium": 8,
        "low": 0
      },
      "highestRiskLevel": "critical",
      "totalRiskScore": 450
    }
  ],
  "pagination": { ... }
}
```

### 2.4 UIデザイン

#### 表示モード切替

```
[ファイル表示] [フォルダ表示]  ← トグルボタン
```

#### フォルダビュー

```
┌──────────────────────────────────────────────────────────────┐
│ 📁 営業/プロジェクト資料                                      │
│    15件のファイル │ Critical: 2 │ High: 5 │ Medium: 8         │
│    [フォルダを開く] [共有設定を確認]                          │
├──────────────────────────────────────────────────────────────┤
│   📄 見積書_A社.xlsx          Critical  85点                  │
│   📄 顧客リスト.csv           Critical  90点                  │
│   📄 提案資料.pptx            High      65点                  │
│   ... 他12件                                                  │
│   [すべて表示]                                                │
└──────────────────────────────────────────────────────────────┘
```

### 2.5 実装ステップ

1. **スキャン時に親フォルダ情報を取得・保存**
   - `parents`フィールドを取得
   - 親フォルダ名をバッチで取得（API呼び出し最適化）

2. **フォルダ集計エンドポイントを追加**
   - Firestoreでフォルダ別に集計
   - キャッシュ活用で高速化

3. **フロントエンドにフォルダビューを追加**
   - 表示モード切替
   - フォルダ展開/折りたたみ

---

## 3. 機能B: アプリ内での権限変更

### 3.1 目的

Google Driveの共有設定画面に遷移せず、Workspace守り番の中で
直接権限を変更できるようにする。特に一括変更が可能になることで大幅な効率化。

### 3.2 OAuth スコープ変更

#### 現在のスコープ
```
https://www.googleapis.com/auth/drive.readonly
https://www.googleapis.com/auth/drive.metadata.readonly
```

#### 追加が必要なスコープ
```
https://www.googleapis.com/auth/drive
```

**注意点:**
- `drive`スコープは「センシティブ」に分類される
- OAuth同意画面で「このアプリはファイルを変更できます」と表示される
- Google Cloud Consoleでの検証が必要になる可能性

#### 代替案: 限定スコープ
```
https://www.googleapis.com/auth/drive.file
```
- 自社が作成したファイルのみ変更可能
- 他者から共有されたファイルは変更不可
- 制限があるが、スコープが狭いため承認が通りやすい

### 3.3 権限変更API

#### Google Drive API

```javascript
// 権限を削除
drive.permissions.delete({
  fileId: 'file_id',
  permissionId: 'permission_id'
});

// 権限を更新（編集者→閲覧者）
drive.permissions.update({
  fileId: 'file_id',
  permissionId: 'permission_id',
  requestBody: {
    role: 'reader'  // writer → reader
  }
});

// 「リンクを知っている全員」を無効化
// type: 'anyone' の permission を削除
drive.permissions.delete({
  fileId: 'file_id',
  permissionId: 'anyoneWithLink'
});
```

### 3.4 新規エンドポイント

#### 単一ファイルの権限変更

```
POST /api/files/:fileId/permissions/:permissionId/revoke
```

リクエスト:
```json
{
  "action": "revoke"  // 権限削除
}
```

```
PATCH /api/files/:fileId/permissions/:permissionId
```

リクエスト:
```json
{
  "role": "reader"  // 編集者→閲覧者に降格
}
```

#### 一括権限変更

```
POST /api/files/bulk-permissions
```

リクエスト:
```json
{
  "action": "revoke_public_link",  // または "demote_external_editors"
  "fileIds": ["file_id_1", "file_id_2", ...],
  "dryRun": false  // trueで変更内容のプレビューのみ
}
```

レスポンス:
```json
{
  "success": true,
  "results": [
    { "fileId": "file_id_1", "status": "success", "message": "公開リンクを無効化しました" },
    { "fileId": "file_id_2", "status": "error", "message": "権限がありません" }
  ],
  "summary": {
    "total": 10,
    "succeeded": 8,
    "failed": 2
  }
}
```

### 3.5 提供するアクション

| アクション | 説明 | 影響 |
|-----------|------|------|
| `revoke_public_link` | 「リンクを知っている全員」を無効化 | type=anyoneの権限を削除 |
| `demote_external_editors` | 外部編集者を閲覧者に降格 | 外部ドメインのwriter→reader |
| `revoke_external_access` | 外部アクセスを完全削除 | 外部ドメインの権限をすべて削除 |
| `revoke_permission` | 特定の権限を削除 | 指定した権限IDを削除 |

### 3.6 UIデザイン

#### ファイル詳細モーダル

```
┌──────────────────────────────────────────────────────────────┐
│ 📄 顧客リスト.xlsx                                    [×]    │
├──────────────────────────────────────────────────────────────┤
│ リスクスコア: 90点 (Critical)                                │
│                                                              │
│ 🔴 検出されたリスク                                          │
│   • 「リンクを知っている全員」がアクセス可能                  │
│   • 外部ユーザーが編集可能                                    │
│                                                              │
│ 📋 共有設定                                                  │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ 🌐 リンクを知っている全員 (閲覧者)    [無効化] ⚠️      │  │
│ │ 👤 tanaka@example.com (編集者)       [削除] [降格]     │  │
│ │ 👤 suzuki@mycompany.com (編集者)     [削除]            │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│        [閉じる]                [すべてのリスクを解決]        │
└──────────────────────────────────────────────────────────────┘
```

#### 一括操作UI

```
┌──────────────────────────────────────────────────────────────┐
│ 一括操作                                                     │
├──────────────────────────────────────────────────────────────┤
│ ☑️ 選択中のファイル: 15件                                    │
│                                                              │
│ 実行するアクション:                                          │
│ ○ 公開リンクを無効化 (8件に適用)                            │
│ ○ 外部編集者を閲覧者に降格 (5件に適用)                      │
│ ○ 外部アクセスをすべて削除 (12件に適用)                     │
│                                                              │
│ ⚠️ この操作は取り消せません                                  │
│                                                              │
│        [キャンセル]                      [実行]              │
└──────────────────────────────────────────────────────────────┘
```

### 3.7 監査ログ

権限変更操作はすべて監査ログに記録:

```typescript
interface PermissionChangeLog {
  id: string;
  organizationId: string;
  userId: string;              // 操作したユーザー
  userEmail: string;
  action: 'revoke' | 'demote' | 'bulk_revoke' | 'bulk_demote';
  fileId: string;
  fileName: string;
  targetPermission: {
    id: string;
    type: string;
    email: string | null;
    oldRole: string;
    newRole: string | null;   // null = 削除
  };
  timestamp: Date;
  result: 'success' | 'error';
  errorMessage: string | null;
}
```

### 3.8 セキュリティ考慮事項

1. **確認ダイアログ**
   - 一括操作前に必ず確認
   - 影響を受けるファイル数を明示

2. **権限チェック**
   - 操作ユーザーがファイルの編集権限を持っているか確認
   - オーナー以外は一部操作制限

3. **レート制限**
   - 一括操作は最大100ファイルまで
   - API呼び出しは指数バックオフで制御

4. **ドライラン機能**
   - 実行前に変更内容をプレビュー
   - 意図しない変更を防止

---

## 4. 実装優先度

### Phase 1: フォルダ表示（工数: 中）
- スキャン時の親フォルダ情報取得
- フォルダ集計API
- フォルダビューUI

### Phase 2: 権限変更（工数: 大）
- OAuthスコープ変更
- 権限変更API
- 単一ファイルの権限変更UI
- 監査ログ

### Phase 3: 一括操作（工数: 中）
- 一括選択UI
- 一括権限変更API
- バッチ処理の最適化

---

## 5. 技術的リスク

| リスク | 影響 | 対策 |
|--------|------|------|
| OAuthスコープ拡大による審査 | リリース遅延 | 限定スコープ(drive.file)で先行リリース |
| Drive API レート制限 | 一括操作の失敗 | バッチ処理、指数バックオフ、キュー制御 |
| 権限変更の誤操作 | ユーザーの業務影響 | 確認UI、ドライラン、監査ログ |
| 外部オーナーファイルの変更制限 | 機能が使えないケース | UI上で明確に制限を表示 |

---

## 6. 改訂履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2025-11-30 | 1.0 | 初版作成 |

