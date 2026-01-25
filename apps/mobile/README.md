# Tomoshibi Mobile

Tomoshibiの「生成 -> 保存 -> プレイ」を一気通貫で扱うモバイル向けWebアプリです。  
AIで街歩きクエストを生成し、Supabaseへ保存し、そのままゲームプレイまで行えます。

このREADMEは「何がどこで動いているか」を把握するための開発者向けガイドです。

## 1. できること（全体像）

このアプリの主要フローは次の4つです。

1) クエスト生成（AI）
- ユーザーのプロンプトをもとにクエストを生成
- 生成モードは `dify / gemini / auto` をenvで切替
- カバー画像が未指定なら生成処理を追加で実行

2) 生成結果プレビュー
- ヒーロー、ルート、スポット一覧、物語要素を確認
- 生成直後にそのまま保存可能

3) Supabaseへ保存
- `quests / spots / spot_details / spot_story_messages / story_timelines / purchases` を更新
- 既存スポットは削除 -> 再挿入（spot_detailsと会話も一旦削除）

4) プレイ画面（GPS + Map + 物語 + 謎解き）
- GPS許可を明示的に要求
- 地図はGoogle Mapsを使用
- ストーリー/謎解きは下部シートで切替表示

## 2. 技術スタック

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase（Auth / PostgREST / Storage）
- Google Maps（@vis.gl/react-google-maps）
- AI生成（Dify Workflow or Gemini API）

## 3. セットアップ

```sh
cd apps/mobile
npm install
cp .env.example .env
npm run dev
```

開発サーバー:
- `http://localhost:4176`

## 4. 重要な環境変数

`.env.example` をベースに設定してください。

### 4.1 Supabase

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

### 4.2 Google Maps / 位置情報

- `VITE_GOOGLE_MAPS_API_KEY`

### 4.3 生成（Dify / Gemini）

- `VITE_GENERATION_MODE=dify | gemini | auto`
- `VITE_GENERATION_TIMEOUT=300000`

Geminiを使う場合:
- `VITE_GEMINI_API_KEY`
- `VITE_GEMINI_MODEL`（例: `gemini-2.0-flash`）

Difyを使う場合:
- `VITE_DIFY_API_KEY`
- `VITE_DIFY_ENDPOINT`（例: `https://api.dify.ai/v1/workflows/run`）

## 5. 生成モードの仕様

生成の入口は `apps/mobile/src/lib/questGenerator.ts` です。

- `dify`: Dify Workflowを叩く
- `gemini`: Gemini APIを直接叩く
- `auto`: `VITE_DIFY_API_KEY` があれば dify、なければ gemini

関連ファイル:
- Dify: `apps/mobile/src/lib/difyQuest.ts`
- Gemini: `apps/mobile/src/lib/geminiQuest.ts`
- 生成切替: `apps/mobile/src/lib/questGenerator.ts`

## 6. データ保存の流れ（Supabase）

保存処理の本体は `apps/mobile/src/pages/Home.tsx` の `handleSave` です。

保存時の主な挙動:

1) `quests` をupsert
- まず拡張カラム込みでupsert
- スキーマ差分がある環境では最小カラムで再upsert

2) `spots` を入れ直す
- 既存spotを取得
- `spot_details / spot_story_messages` を先に削除
- `spots` を削除 -> 再insert

3) `spot_details` をinsert
- `story_text` は previewの要約系を利用
- 謎系はAI出力の以下を優先して保存
  - `question_text / answer_text / hint_text / explanation_text`
  - フォールバック: `question / answer / puzzle_question / puzzle_answer / puzzle_hint`

4) `spot_story_messages` をinsert
- 現在は `pre_puzzle` の1件を自動生成
- 本格的な会話はSQLなどで追加する想定

5) `story_timelines` をupsert
- `prologue / epilogue` を保存

6) `purchases` をinsert（未購入なら）
- 自分の生成物をそのままプレイ可能にするための処理

## 7. プレイ画面の仕様（重要）

プレイ画面は `apps/mobile/src/pages/GamePlay.tsx` です。

### 7.1 GPSの前提条件

ブラウザの仕様上、GPSは次の条件でのみ動作します。

- `https://` でアクセスしている
- または `http://localhost`

NG例:
- `http://192.168.x.x:4176`（安全なオリジンではない）

そのため、プレイ画面ではGPS許可ボタン押下時に `window.isSecureContext` を確認しています。

### 7.2 画面の状態遷移

主なモード:
- `travel`（移動）
- `story`（会話/物語）
- `puzzle`（謎解き）

ポイント:
- ストーリー/謎解きは全て下部シートで切替表示
- 画面上に重なるモーダルを減らし、地図を常に視認しやすく

### 7.3 ルート線

ルート表示はDirections APIを使っています。
- 直線ではなく道路に沿ったルートを描画
- 実装: `RoutePathsHandler`（`GamePlay.tsx` 内）

## 8. 言語切替（翻訳）

翻訳取得は `apps/mobile/src/hooks/useTranslatedQuest.ts` に集約しています。

- `quests / spots / spot_details / story_timelines` を読み込み
- 翻訳テーブルがあればそちらを優先
- 言語依存度が高い謎は原文を優先する設計

## 9. ディレクトリガイド（迷ったらここ）

主要な編集ポイント:

- 生成切替: `apps/mobile/src/lib/questGenerator.ts`
- 生成プロンプト/スキーマ:
  - `apps/mobile/src/lib/difyQuest.ts`
  - `apps/mobile/src/lib/geminiQuest.ts`
- 生成UI/保存: `apps/mobile/src/pages/Home.tsx`
- プレイ画面: `apps/mobile/src/pages/GamePlay.tsx`
- 生成結果プレビュー:
  - `apps/mobile/src/components/quest/PlayerPreview.tsx`
  - `apps/mobile/src/components/quest/JourneyMapPreview.tsx`

## 10. よくあるエラーと対処

### 10.1 GPSが有効にならない

エラー例:
- `Only secure origins are allowed`

対処:
- `https://` で開く
- もしくは `http://localhost:4176` を使う

### 10.2 Supabaseの400/409系エラー

よくある原因:
- スキーマに存在しないカラムを保存しようとしている
- 一意制約が無いのにupsertしている

補助:
- `apps/mobile/supabase/migrations/20260115000000_add_purchases_unique_constraint.sql`

## 11. コマンド

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`

## 12. デプロイ時の注意

`apps/mobile/vite.config.ts` で本番baseは `/mobile/` です。

- dev base: `/`
- prod base: `/mobile/`

サブパス配信する前提なので、リバースプロキシやホスティング設定に注意してください。
