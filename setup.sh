#!/bin/bash
# ==============================================
# Workspace守り番 開発環境セットアップスクリプト
# ==============================================

set -e

echo ""
echo "=========================================="
echo "🛡️ Workspace守り番 開発環境セットアップ"
echo "=========================================="
echo ""

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# チェックマーク
CHECK="${GREEN}✓${NC}"
CROSS="${RED}✗${NC}"
ARROW="${YELLOW}→${NC}"

# --------------------------
# 1. 前提条件チェック
# --------------------------
echo "📋 前提条件をチェック中..."

# Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "  ${CHECK} Node.js: ${NODE_VERSION}"
else
    echo -e "  ${CROSS} Node.js がインストールされていません"
    echo "     https://nodejs.org/ からインストールしてください"
    exit 1
fi

# npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "  ${CHECK} npm: v${NPM_VERSION}"
else
    echo -e "  ${CROSS} npm がインストールされていません"
    exit 1
fi

# Git
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version | cut -d' ' -f3)
    echo -e "  ${CHECK} Git: v${GIT_VERSION}"
else
    echo -e "  ${CROSS} Git がインストールされていません"
    exit 1
fi

echo ""

# --------------------------
# 2. 依存関係インストール
# --------------------------
echo "📦 依存関係をインストール中..."

npm install

echo -e "  ${CHECK} npm パッケージをインストールしました"
echo ""

# --------------------------
# 3. clasp インストール確認
# --------------------------
echo "🔧 clasp (Google Apps Script CLI) を確認中..."

if ! command -v clasp &> /dev/null; then
    echo -e "  ${ARROW} clasp をグローバルインストール中..."
    npm install -g @google/clasp
fi

CLASP_VERSION=$(clasp --version 2>/dev/null || echo "不明")
echo -e "  ${CHECK} clasp: ${CLASP_VERSION}"
echo ""

# --------------------------
# 4. ディレクトリ構造作成
# --------------------------
echo "📁 ディレクトリ構造を作成中..."

# apps-script ディレクトリ
mkdir -p apps-script/src/services
mkdir -p apps-script/src/core
mkdir -p apps-script/src/utils
mkdir -p apps-script/src/ui
mkdir -p apps-script/tests

# その他のディレクトリ
mkdir -p docs
mkdir -p scripts
mkdir -p .github/workflows
mkdir -p .github/ISSUE_TEMPLATE

echo -e "  ${CHECK} ディレクトリ構造を作成しました"
echo ""

# --------------------------
# 5. 設定ファイル作成
# --------------------------
echo "📝 設定ファイルを作成中..."

# appsscript.json
if [ ! -f "apps-script/appsscript.json" ]; then
cat > apps-script/appsscript.json << 'EOF'
{
  "timeZone": "Asia/Tokyo",
  "dependencies": {
    "enabledAdvancedServices": [
      {
        "userSymbol": "Drive",
        "version": "v3",
        "serviceId": "drive"
      },
      {
        "userSymbol": "AdminDirectory",
        "version": "directory_v1",
        "serviceId": "admin"
      },
      {
        "userSymbol": "AdminReports",
        "version": "reports_v1",
        "serviceId": "admin"
      }
    ]
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/drive.metadata.readonly",
    "https://www.googleapis.com/auth/spreadsheets.currentonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/script.scriptapp",
    "https://www.googleapis.com/auth/admin.directory.user.readonly"
  ],
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8"
}
EOF
    echo -e "  ${CHECK} appsscript.json を作成しました"
fi

# .gitignore
if [ ! -f ".gitignore" ]; then
cat > .gitignore << 'EOF'
# Dependencies
node_modules/

# clasp
.clasp.json
.clasprc.json

# Environment
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Build
dist/
build/

# Logs
*.log
npm-debug.log*

# Test
coverage/

# Secrets
creds.json
credentials.json
*.pem
*.key
EOF
    echo -e "  ${CHECK} .gitignore を作成しました"
fi

# .eslintrc.json
if [ ! -f ".eslintrc.json" ]; then
cat > .eslintrc.json << 'EOF'
{
  "env": {
    "es2020": true
  },
  "extends": [
    "google"
  ],
  "parserOptions": {
    "ecmaVersion": 2020
  },
  "rules": {
    "max-len": ["error", { "code": 120 }],
    "require-jsdoc": "off",
    "valid-jsdoc": "off"
  },
  "globals": {
    "SpreadsheetApp": "readonly",
    "DriveApp": "readonly",
    "GmailApp": "readonly",
    "Logger": "readonly",
    "UrlFetchApp": "readonly",
    "Utilities": "readonly",
    "ScriptApp": "readonly",
    "Session": "readonly",
    "PropertiesService": "readonly",
    "HtmlService": "readonly",
    "ContentService": "readonly",
    "Charts": "readonly",
    "Browser": "readonly",
    "AdminDirectory": "readonly",
    "AdminReports": "readonly",
    "Drive": "readonly"
  }
}
EOF
    echo -e "  ${CHECK} .eslintrc.json を作成しました"
fi

echo ""

# --------------------------
# 6. Google認証
# --------------------------
echo "🔐 Google認証の設定..."
echo ""
echo "  次のコマンドでGoogleアカウントを認証してください:"
echo ""
echo -e "  ${YELLOW}clasp login${NC}"
echo ""
echo "  認証後、以下のコマンドでApps Scriptプロジェクトを作成:"
echo ""
echo -e "  ${YELLOW}cd apps-script && clasp create --type standalone --title 'Workspace守り番'${NC}"
echo ""

# --------------------------
# 7. 完了メッセージ
# --------------------------
echo "=========================================="
echo -e "${GREEN}✅ セットアップ完了！${NC}"
echo "=========================================="
echo ""
echo "次のステップ:"
echo ""
echo "  1. Googleアカウント認証"
echo "     clasp login"
echo ""
echo "  2. Apps Scriptプロジェクト作成"
echo "     cd apps-script"
echo "     clasp create --type standalone --title 'Workspace守り番'"
echo ""
echo "  3. コードをプッシュ"
echo "     npm run push"
echo ""
echo "  4. Apps Scriptエディタを開く"
echo "     npm run open"
echo ""
echo "=========================================="
echo ""
