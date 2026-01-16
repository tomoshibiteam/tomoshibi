# Difyワークフロー 入出力変数定義

このドキュメントは、Difyワークフローで使用する入力変数と出力変数の完全な定義です。

## 📥 入力変数（Workflow Inputs）

Difyワークフローの「開始」ノードで以下の変数を定義してください：

### 必須変数

| 変数名 | 型 | 説明 | 例 |
|--------|-----|------|-----|
| `prompt` | Text | ユーザーのメインリクエスト | `"渋谷のストリートカルチャーを巡るミステリー"` |
| `difficulty` | Select | 難易度 | `easy`, `medium`, `hard` |
| `spot_count` | Number | スポット数（5〜12） | `7` |

### オプション変数（補助情報）

| 変数名 | 型 | 説明 | デフォルト |
|--------|-----|------|-----------|
| `theme_tags` | Text | テーマタグ（カンマ区切り） | `""` |
| `genre_support` | Text | ジャンル補助 | `""` |
| `tone_support` | Text | トーン補助 | `""` |
| `protagonist` | Text | 主人公設定 | `""` |
| `objective` | Text | 目的 | `""` |
| `ending` | Text | 結末の希望 | `""` |
| `when` | Text | いつ（時間帯） | `""` |
| `where` | Text | どこで（エリア） | `""` |
| `purpose` | Text | 旅の目的 | `""` |
| `with_whom` | Text | 誰と | `""` |
| `center_lat` | Text | 中心緯度 | `""` |
| `center_lng` | Text | 中心経度 | `""` |
| `radius_km` | Text | 検索半径（km） | `"1"` |

---

## 📤 出力変数（Workflow Outputs）

Difyワークフローの「終了」ノードで以下の構造のJSONを返してください：

### トップレベル構造

```json
{
  "player_preview": { ... },
  "creator_payload": { ... }
}
```

### A. player_preview（ネタバレなしプレビュー）

```json
{
  "title": "クエストタイトル",
  "one_liner": "30〜45文字のキャッチコピー",
  "trailer": "80〜140文字の予告文（2〜3行）",
  "mission": "あなたは〇〇して最後に〇〇を突き止める",
  "teasers": [
    "スポット名で〇〇すると、△△が見えてくる",
    "別のスポットで〇〇すると、△△が起きる",
    "最後に〇〇すると、△△が現れる"
  ],
  "summary_actions": ["歩く", "集める", "照合する"],
  "route_meta": {
    "area_start": "開始エリア名",
    "area_end": "終了エリア名",
    "distance_km": "2.1",
    "estimated_time_min": "90",
    "spots_count": 7,
    "outdoor_ratio_percent": "80",
    "recommended_people": "2〜4人",
    "difficulty_label": "中級",
    "difficulty_reason": "ひらめき型：考える時間が必要な謎が5回ある",
    "weather_note": "雨天OK"
  },
  "highlight_spots": [
    {
      "name": "スポット名1",
      "teaser_experience": "ここで〇〇すると△△が見える（答えは出さない）"
    },
    {
      "name": "スポット名2",
      "teaser_experience": "ここで〇〇すると△△が起きる"
    },
    {
      "name": "スポット名3",
      "teaser_experience": "ここで〇〇すると△△が現れる"
    }
  ],
  "tags": ["ミステリー好き", "デート向け", "初心者OK", "歩き多め", "雨でもOK"],
  "prep_and_safety": [
    "スマートフォン必須",
    "歩きやすい靴推奨",
    "所要時間90分程度"
  ],
  "cta_copy": {
    "primary": "今すぐ冒険を始める",
    "secondary": "詳細を見る",
    "note": "友達や家族と一緒に楽しめます"
  }
}
```

### B. creator_payload（クリエイター用フルデータ）

```json
{
  "quest_id": "quest-1234567890",
  "quest_title": "クエストタイトル",
  "main_plot": {
    "premise": "物語の前提（500〜800字、3〜5段落、\\n\\nで区切る）",
    "goal": "主人公の目的（1〜2文）",
    "antagonist_or_mystery": "対立要素または中心の謎（1〜2文）",
    "final_reveal_outline": "最終的な真相の概要"
  },
  "spots": [
    {
      "spot_id": "S1",
      "spot_name": "スポット名",
      "lat": 35.6586,
      "lng": 139.7454,
      "place_id": "ChIJ...",
      "address": "東京都渋谷区...",
      "scene_role": "導入",
      "lore_card": {
        "short_story_text": "物語文（2-4文）",
        "facts_used": ["fact_1", "fact_2"],
        "player_handout": "プレイヤーに提示する資料（これだけで謎が解ける情報を含む）"
      },
      "puzzle": {
        "type": "logic",
        "prompt": "出題文（物語に溶け込む、美しく謎めいた語り口で）",
        "rules": "ルール説明（必要な場合のみ）",
        "answer": "答え",
        "solution_steps": [
          "ステップ1: まず〇〇を確認する",
          "ステップ2: 次に△△と照合する",
          "ステップ3: 最後に□□を導き出す"
        ],
        "hints": [
          "抽象的なヒント",
          "具体的なヒント",
          "ほぼ答えのヒント（救済）"
        ],
        "difficulty": 2
      },
      "reward": {
        "lore_reveal": "謎を解くと分かる背景理解（factsと接続した解説）",
        "plot_key": "物語の鍵（キーワード/暗号片/数字など）",
        "next_hook": "次のスポットへ行きたくなる一文"
      },
      "linking_rationale": "なぜこの謎がこのスポットである必然性があるか（1-2文）"
    }
    // ... 他のスポット（S2, S3, ...）
  ],
  "meta_puzzle": {
    "inputs": ["S1.plot_key", "S2.plot_key", "S3.plot_key", "..."],
    "prompt": "全ての鍵を組み合わせて、最後の謎を解け",
    "answer": "最終的な答え",
    "explanation": "真相との接続説明"
  },
  "generation_metadata": {
    "generated_at": "2026-01-16T19:00:00Z",
    "pipeline_version": "2.0.0-dify",
    "validation_passed": true,
    "validation_warnings": []
  }
}
```

---

## 🔧 Difyワークフロー設計のヒント

### 1. 変数の型変換

入力変数は全て文字列として受け取る可能性があるため、ワークフロー内で適切に変換してください：

```python
# Code ノードの例
spot_count = int(inputs['spot_count']) if inputs['spot_count'] else 7
center_lat = float(inputs['center_lat']) if inputs['center_lat'] else None
```

### 2. 条件分岐

オプション変数が空の場合の処理：

```python
# genre_supportが空の場合はデフォルト値を使用
genre = inputs['genre_support'] if inputs['genre_support'] else "ミステリー"
```

### 3. 出力の構造化

最終的な出力は必ず以下の構造にしてください：

```json
{
  "player_preview": { ... },
  "creator_payload": { ... }
}
```

### 4. エラーハンドリング

必須フィールドが欠けている場合はエラーを返す：

```python
if not inputs.get('prompt'):
    return {
        "error": "prompt is required",
        "player_preview": None,
        "creator_payload": None
    }
```

---

## ✅ 検証チェックリスト

出力を返す前に以下を確認してください：

- [ ] `player_preview.title` が存在する
- [ ] `creator_payload.quest_title` が存在する
- [ ] `creator_payload.spots` が配列で、要素数が `spot_count` と一致する
- [ ] 各スポットに `spot_id`, `spot_name`, `lat`, `lng` が存在する
- [ ] 各スポットの `puzzle.answer` が設定されている
- [ ] `meta_puzzle.inputs` に全スポットの `plot_key` が含まれている
- [ ] `player_preview` にネタバレ情報（答え、ヒントの具体）が含まれていない

---

## 📝 使用例

### 入力例

```json
{
  "prompt": "渋谷のストリートカルチャーを巡るミステリー",
  "difficulty": "medium",
  "spot_count": 7,
  "genre_support": "探偵もの",
  "tone_support": "スリリング",
  "when": "夜",
  "where": "渋谷駅周辺",
  "purpose": "デート",
  "with_whom": "カップル",
  "center_lat": "35.6586",
  "center_lng": "139.7454",
  "radius_km": "1"
}
```

### 期待される出力

上記の「出力変数」セクションの構造に従った完全なJSONオブジェクト。

---

## 🚀 次のステップ

1. Difyワークフローで上記の入力変数を定義
2. ワークフロー内部で自由にロジックを構築
3. 最終的に上記の出力構造を返す
4. `.env`ファイルで `VITE_DIFY_API_KEY` を設定
5. アプリを起動してテスト

入出力さえ守れば、ワークフロー内部は自由に改善できます！
