# SPR探偵事務所

日常の行動がポイントになり、現地の謎を解くゲーム化された探偵アプリケーション。

## プロジェクト概要

SPR探偵事務所は、ユーザーの日常の行動を記録し、探偵として功績を積み重ねていくことができるWebアプリケーションです。

## 技術スタック

このプロジェクトは以下の技術を使用して構築されています：

- **Vite** - 高速な開発サーバーとビルドツール
- **TypeScript** - 型安全なJavaScript
- **React** - UIライブラリ
- **shadcn-ui** - 美しいUIコンポーネント
- **Tailwind CSS** - ユーティリティファーストのCSSフレームワーク
- **Supabase** - バックエンド（認証・データベース・ストレージ）

## セットアップ方法

### 必要要件

- Node.js & npm - [nvm でインストール](https://github.com/nvm-sh/nvm#installing-and-updating)

### インストール手順

```sh
# Step 1: リポジトリをクローン
git clone <YOUR_GIT_URL>

# Step 2: プロジェクトディレクトリに移動
cd apps/mobile

# Step 3: 依存関係をインストール
npm install

# Step 4: 環境変数を設定
# .env ファイルを作成し、Supabaseの接続情報を設定してください

# Step 5: 開発サーバーを起動
npm run dev
```

### 環境変数

`.env` ファイルに以下の環境変数を設定してください：

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

## 利用可能なコマンド

- `npm run dev` - 開発サーバーを起動（ポート8080）
- `npm run build` - プロダクション用ビルド
- `npm run preview` - ビルドしたアプリのプレビュー
- `npm run lint` - ESLintでコードをチェック

## データベース

このプロジェクトはSupabaseを使用しています。マイグレーションファイルは `supabase/migrations/` ディレクトリに保存されています。

## デプロイ

お好みのホスティングサービス（Vercel、Netlify、Cloudflare Pagesなど）にデプロイできます。

ビルドコマンド: `npm run build`
公開ディレクトリ: `dist`

## ライセンス

このプロジェクトは個人プロジェクトです。
