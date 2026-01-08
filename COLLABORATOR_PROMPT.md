# 共同開発者向け：環境変数セットアップ用プロンプト

このプロンプトをAIエージェント（Gemini、ChatGPT、Claudeなど）にコピー&ペーストして、環境変数のセットアップを自動化できます。

---

## 📋 プロンプト（以下をコピーして使用）

```
tomoshibiプロジェクトをクローンしたので、環境変数のセットアップを手伝ってください。

以下の手順を実行してください：

1. プロジェクトのルートディレクトリで、以下のコマンドを実行して環境変数ファイルを作成：
   - `.env.example` から `.env` を作成
   - `.env.shared.example` から `.env.shared` を作成
   - `apps/city-trail-lp/.env.local.example` から `apps/city-trail-lp/.env.local` を作成
   - `apps/mobile/.env.example` から `apps/mobile/.env` を作成

2. 作成した各`.env`ファイルに、以下のAPIキーを設定する必要があることを教えてください：
   - GEMINI_API_KEY
   - VITE_GOOGLE_MAPS_API_KEY
   - VITE_MAPTILER_KEY
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
   - VITE_SUPABASE_PUBLISHABLE_KEY
   - VITE_SUPABASE_PROJECT_ID

3. 各APIキーの取得先URLを教えてください。

4. セットアップが完了したら、開発サーバーを起動する方法を教えてください。
```

---

## 🎯 より詳細なプロンプト（推奨）

もし、実際のAPIキーの値も持っている場合は、以下のようにプロンプトを修正してください：

```
tomoshibiプロジェクトをクローンしたので、環境変数のセットアップを自動で行ってください。

以下の手順を実行してください：

1. プロジェクトのルートディレクトリで、環境変数ファイルを作成：
   - `.env.example` から `.env` を作成
   - `.env.shared.example` から `.env.shared` を作成
   - `apps/city-trail-lp/.env.local.example` から `apps/city-trail-lp/.env.local` を作成
   - `apps/mobile/.env.example` から `apps/mobile/.env` を作成

2. 以下のAPIキーを各ファイルに設定してください：

**ルートの .env:**
```
GEMINI_API_KEY=[ここに実際のキーを貼り付け]
```

**ルートの .env.shared:**
```
VITE_MAPTILER_KEY=[ここに実際のキーを貼り付け]
VITE_SUPABASE_URL=[ここに実際のURLを貼り付け]
VITE_SUPABASE_ANON_KEY=[ここに実際のキーを貼り付け]
VITE_SUPABASE_PUBLISHABLE_KEY=[ここに実際のキーを貼り付け]
VITE_SUPABASE_PROJECT_ID=[ここに実際のIDを貼り付け]
```

**apps/city-trail-lp/.env.local:**
```
VITE_MAPTILER_KEY=[ここに実際のキーを貼り付け]
VITE_SUPABASE_URL=[ここに実際のURLを貼り付け]
VITE_SUPABASE_ANON_KEY=[ここに実際のキーを貼り付け]
VITE_SUPABASE_PUBLISHABLE_KEY=[ここに実際のキーを貼り付け]
VITE_SUPABASE_PROJECT_ID=[ここに実際のIDを貼り付け]
VITE_GOOGLE_MAPS_API_KEY=[ここに実際のキーを貼り付け]
```

**apps/mobile/.env:**
```
VITE_SUPABASE_PROJECT_ID=[ここに実際のIDを貼り付け]
VITE_SUPABASE_PUBLISHABLE_KEY=[ここに実際のキーを貼り付け]
VITE_SUPABASE_URL=[ここに実際のURLを貼り付け]
VITE_MAPTILER_KEY=[ここに実際のキーを貼り付け]
VITE_GOOGLE_MAPS_API_KEY=[ここに実際のキーを貼り付け]
```

3. セットアップが完了したら、`apps/city-trail-lp`ディレクトリで開発サーバーを起動してください。
```

---

## 💡 使い方

1. 上記のプロンプトをコピー
2. AIエージェント（Gemini、ChatGPT、Claude、Cursorなど）に貼り付け
3. 必要に応じて実際のAPIキーの値を追加
4. エージェントが自動でセットアップを実行

## ⚠️ セキュリティ注意

- APIキーを含むプロンプトは、**プライベートなチャット**でのみ使用してください
- 公開されているチャットやフォーラムには絶対に貼り付けないでください
- チーム内でAPIキーを共有する場合は、1PasswordやLastPassなどのパスワード管理ツールを使用することを推奨します
