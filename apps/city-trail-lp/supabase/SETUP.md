# Supabase Edge Function環境変数設定ガイド

## 📝 設定が必要な環境変数

Supabase Edge Functionで以下の環境変数を設定してください：

```bash
DIFY_API_KEY=app-eE6OZ32SJp1Q3qAg8gU8eGvE
DIFY_BASE_URL=https://api.dify.ai/v1
```

## 🔧 設定方法

### オプション1: Supabase Dashboard（推奨）

1. [Supabase Dashboard](https://app.supabase.com) にアクセス
2. プロジェクトを選択
3. 左メニューから **Edge Functions** を選択
4. **Settings** タブを開く
5. **Secrets** セクションで以下を追加：
   - Name: `DIFY_API_KEY`, Value: `app-eE6OZ32SJp1Q3qAg8gU8eGvE`
   - Name: `DIFY_BASE_URL`, Value: `https://api.dify.ai/v1`

### オプション2: Supabase CLI

```bash
# Supabase CLIでログイン
npx supabase login

# プロジェクトにリンク
npx supabase link --project-ref <your-project-ref>

# シークレットを設定
npx supabase secrets set DIFY_API_KEY=app-eE6OZ32SJp1Q3qAg8gU8eGvE
npx supabase secrets set DIFY_BASE_URL=https://api.dify.ai/v1
```

## 🚀 Edge Functionのデプロイ

```bash
# Edge Functionをデプロイ
npx supabase functions deploy generate-quest

# デプロイ確認
npx supabase functions list
```

## ✅ 動作確認

デプロイ後、以下のURLでテスト：

```bash
curl -X POST \
  https://pndoojofskfmjmqiojdd.supabase.co/functions/v1/generate-quest \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "テストクエスト",
    "difficulty": "medium",
    "spot_count": 5
  }'
```

## 📋 トラブルシューティング

### Edge Functionのログを確認

```bash
npx supabase functions logs generate-quest
```

### ローカルでテスト

```bash
# ローカルでEdge Functionを起動
npx supabase functions serve generate-quest --env-file .env.local

# 別ターミナルでテスト
curl -X POST \
  http://localhost:54321/functions/v1/generate-quest \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "テストクエスト",
    "difficulty": "medium",
    "spot_count": 5
  }'
```
