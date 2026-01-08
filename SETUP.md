# Tomoshibi - 環境変数セットアップガイド

このプロジェクトでは、APIキーなどの機密情報を環境変数ファイル（`.env`）で管理しています。

## 🔧 初期セットアップ

リポジトリをクローンした後、以下の手順で環境変数を設定してください。

### 1. ルートディレクトリの環境変数

```bash
# .env.example をコピーして .env を作成
cp .env.example .env

# .env.shared.example をコピーして .env.shared を作成
cp .env.shared.example .env.shared
```

### 2. City Trail LP の環境変数

```bash
# apps/city-trail-lp/.env.local.example をコピー
cp apps/city-trail-lp/.env.local.example apps/city-trail-lp/.env.local
```

### 3. Mobile アプリの環境変数

```bash
# apps/mobile/.env.example をコピー
cp apps/mobile/.env.example apps/mobile/.env
```

## 🔑 必要なAPIキー

以下のAPIキーを取得して、各`.env`ファイルに設定してください：

### Gemini API Key
- 取得先: https://makersuite.google.com/app/apikey
- 設定ファイル: `.env`
- 変数名: `GEMINI_API_KEY`

### Google Maps API Key
- 取得先: https://console.cloud.google.com/apis/credentials
- 設定ファイル: `apps/city-trail-lp/.env.local`, `apps/mobile/.env`
- 変数名: `VITE_GOOGLE_MAPS_API_KEY`

### MapTiler API Key
- 取得先: https://cloud.maptiler.com/account/keys/
- 設定ファイル: `.env.shared`, `apps/city-trail-lp/.env.local`, `apps/mobile/.env`
- 変数名: `VITE_MAPTILER_KEY`

### Supabase Configuration
- 取得先: Supabaseプロジェクトの設定画面
- 設定ファイル: `.env.shared`, `apps/city-trail-lp/.env.local`, `apps/mobile/.env`
- 必要な変数:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_SUPABASE_PROJECT_ID`

## ⚠️ 重要な注意事項

- **絶対に `.env` ファイルをGitにコミットしないでください**
- `.env` ファイルは `.gitignore` で除外されています
- APIキーを共有する場合は、安全な方法（1Password、LastPassなど）を使用してください
- 本番環境では、環境変数を適切に設定してください

## 📝 開発開始

環境変数の設定が完了したら、以下のコマンドで開発サーバーを起動できます：

```bash
# City Trail LP
cd apps/city-trail-lp
npm run dev

# Mobile App
cd apps/mobile
npm run dev
```
