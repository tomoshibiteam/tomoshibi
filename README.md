# tomoshibi apps

Lovable のモバイルアプリと tomoshibi city trail の LP/アプリを `apps/` 配下にまとめています。各プロジェクトは独立しており、依存関係やスクリプトも個別管理です。

## ディレクトリ構成
- `apps/mobile`: Lovable / SPR 探偵事務所のモバイルアプリ (Vite + React + Supabase)
- `apps/city-trail-lp`: tomoshibi city trail の LP / Web アプリ (Vite + React + Tailwind)

## セットアップの流れ
共通手順:
1. `cd apps/<project>`
2. `npm install`
3. 必要な環境変数を設定
4. `npm run dev`

### 1つのサーバーでまとめて起動する
1. ルートで依存関係をインストール: `npm install`
2. ビルド: `npm run build`（LPとモバイル両方を dist 出力）
3. サーバー起動: `npm start`
   - LP: `http://localhost:4175/`
   - モバイル: `http://localhost:4176/`

### モバイルアプリ (`apps/mobile`)
- 環境変数: `.env` に `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
- 主なスクリプト: `npm run dev`, `npm run build`, `npm run preview`, `npm run lint`

### tomoshibi city trail (LP) (`apps/city-trail-lp`)
- 環境変数: `.env.local` に `GEMINI_API_KEY`
- 主なスクリプト: `npm run dev`, `npm run build`

## 補足
- 詳細は各ディレクトリ内の README を参照してください。
- `node_modules` はそれぞれのプロジェクト配下で管理しています。
