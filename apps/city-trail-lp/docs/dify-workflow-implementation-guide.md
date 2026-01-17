# Dify ワークフロー実装ガイド（詳細版）

このドキュメントは、クエスト生成用Difyワークフローの各ノードを実装するための詳細ガイドです。
各ノードで設定が必要な項目を具体的に記載しています。

---

## 📋 ワークフロー全体像

```
[開始ノード] - 入力変数定義
    ↓
[1. Intent Analysis] - LLMノード
    ↓
[2a. Area Analysis] - LLMノード
    ↓
[2b. Real Spots Search] - HTTPリクエストノード
    ↓
[2c-1. Wikipedia Fetch] - イテレーション + HTTPリクエスト
    ↓
[2c-2. Enrich Spots] - コードノード
    ↓
[2d. Theme Scoring] - LLMノード
    ↓
[2e. Route Optimization] - コードノード
    ↓
[3. Motif Selection] - LLMノード
    ↓
[4. Story Building] - LLMノード
    ↓
[5. Puzzle Design] - イテレーション + LLMノード
    ↓
[6. Meta Puzzle] - LLMノード
    ↓
[7. Validation] - コードノード
    ↓
[8. Player Preview] - LLMノード
    ↓
[9. Output Integration] - コードノード
    ↓
[出力ノード] - 最終出力定義
```

---

## 🚀 開始ノード（Start Node）

### フィールドタイプ一覧

| 型 | Difyでの表示名 | 用途 |
|----|---------------|------|
| `string` | 短文 | 1行のテキスト入力 |
| `paragraph` | 段落 | 複数行のテキスト入力 |
| `select` | 選択 | ドロップダウン選択 |
| `number` | 数値 | 数値入力 |
| `boolean` | チェックボックス | ON/OFF切り替え |
| `file` | 単一ファイル | ファイルアップロード |
| `array[file]` | ファイルリスト | 複数ファイル |
| `object` | JSONコード | JSONオブジェクト |

### 入力変数一覧

| 変数名 | フィールドタイプ | ラベル名 | 最大長 | デフォルト値 | 必須/任意 |
|--------|-----------------|----------|--------|--------------|-----------|
| `prompt` | 段落 | prompt | 2000 | 浅草の歴史と文化を巡るミステリー謎解きクエスト | 必須 |
| `difficulty` | 選択 | difficulty | - | medium | 必須 |
| `spot_count` | 数値 | spot_count | - |  | 必須 |
| `theme_tags` | 短文 | theme_tags | 500 | 歴史,ミステリー | 任意 |
| `genre_support` | 短文 | genre_support | 100 | 探偵もの | 任意 |
| `tone_support` | 短文 | tone_support | 100 | ミステリアス | 任意 |
| `protagonist` | 短文 | protagonist | 200 | 旅人 | 任意 |
| `objective` | 短文 | objective | 200 | 隠された秘密を解き明かす | 任意 |
| `ending` | 短文 | ending | 200 | ハッピーエンド | 任意 |
| `when` | 短文 | when | 100 | 昼 | 任意 |
| `where` | 短文 | where | 200 | 浅草 | 任意 |
| `purpose` | 短文 | purpose | 200 | 観光 | 任意 |
| `with_whom` | 短文 | with_whom | 100 | 友達 | 任意 |
| `center_lat` | 短文 | center_lat | 20 | 35.7148 | 任意 |
| `center_lng` | 短文 | center_lng | 20 | 139.7967 | 任意 |
| `radius_km` | 短文 | radius_km | 10 | 1 | 任意 |

### difficulty（選択）の選択肢設定

**選択肢の追加方法**: difficulty変数の設定画面で「オプションを追加」をクリックし、以下を設定

| 選択肢の値 | 選択肢のラベル |
|------------|---------------|
| `easy` | easy |
| `medium` | medium |
| `hard` | hard |

**デフォルト値**: `medium`

---

## 🔧 Node 1: Intent Analysis（ユーザー意図分析）

### ノードタイプ
**LLMノード**

### 設定項目

| 項目 | 設定値 |
|------|--------|
| AIモデル | Gemini 3 Flash Preview |
| コンテキスト | なし |
| 推論タグの分離 | OFF |

### プロンプト設定手順

#### 1. LLMノードをクリックして設定画面を開く

#### 2. 「プロンプト」セクションで以下を設定

**システムプロンプト（SYSTEM）**:
```
あなたはユーザー体験設計の専門家です。
クエスト生成リクエストを分析し、ユーザーが本当に求めている体験を理解してください。
出力は必ずJSON形式で行ってください。
```

**ユーザープロンプト（USER）**:
```
以下のクエスト生成リクエストを分析してください。

【ユーザーリクエスト】
メインプロンプト: {{#START.prompt#}}
難易度: {{#START.difficulty#}}
スポット数: {{#START.spot_count#}}
ジャンル: {{#START.genre_support#}}
トーン: {{#START.tone_support#}}
いつ: {{#START.when#}}
どこで: {{#START.where#}}
目的: {{#START.purpose#}}
誰と: {{#START.with_whom#}}

【分析項目】
1. experience_type: 学習/冒険/ロマンチック/ファミリー/ひとり旅 のどれか
2. primary_themes: 歴史/アート/グルメ/自然/建築/文学/科学 から最大3つ
3. fitness_level: 軽め/普通/しっかり
4. learning_depth: 軽い豆知識/しっかり学習
5. puzzle_expectation: 簡単に解きたい/じっくり考えたい
6. mood_keywords: このクエストを表す形容詞3つ
7. must_include: 必須要素
8. must_avoid: 避けるべき要素
9. inferred_area: 推測されるエリア名

【出力形式】JSON
{
  "experience_type": "string",
  "primary_themes": ["string"],
  "fitness_level": "string",
  "learning_depth": "string",
  "puzzle_expectation": "string",
  "mood_keywords": ["string"],
  "must_include": ["string"],
  "must_avoid": ["string"],
  "inferred_area": "string",
  "analysis_summary": "string"
}
```

#### 3. 変数参照の注意点
- 開始ノードの変数を参照する場合: `{{#START.変数名#}}`
- 前のノードの出力を参照する場合: `{{#ノード名.変数名#}}`

### 出力
LLMの出力テキスト（JSON形式）

---

## 🔧 Node 1b: Parse Intent（意図解析結果パース）

### ノードタイプ
**コードノード**

### 入力変数

| 変数名 | 変数値 |
|--------|--------|
| `llm_output` | {{#node1.text#}} |

### コード（Python）
```python
import json
import re

def main(llm_output: str) -> dict:
    # JSON部分を抽出
    json_match = re.search(r'\{[\s\S]*\}', llm_output)
    if json_match:
        try:
            parsed = json.loads(json_match.group())
            return {
                "intent": parsed
            }
        except:
            pass
    
    # パース失敗時のデフォルト
    return {
        "intent": {
            "experience_type": "冒険",
            "primary_themes": ["歴史"],
            "fitness_level": "普通",
            "learning_depth": "軽い豆知識",
            "puzzle_expectation": "簡単に解きたい",
            "mood_keywords": ["ミステリアス"],
            "must_include": [],
            "must_avoid": [],
            "inferred_area": "",
            "analysis_summary": "分析に失敗しました"
        }
    }
```

### 出力変数

| 変数名 | 型 |
|--------|-----|
| `intent` | Object |

---

## 🔧 Node 2a: Area Analysis（エリア特性分析）

### ノードタイプ
**LLMノード**

### 設定項目

| 項目 | 設定値 |
|------|--------|
| AIモデル | Gemini 3 Pro Preview |
| コンテキスト | なし |
| 推論タグの分離 | OFF |

### システムプロンプト
```
あなたは日本の地理と歴史に詳しい専門家です。
指定されたエリアについて、街歩きクエストに役立つ情報を分析してください。
出力は必ずJSON形式で行ってください。
```

### ユーザープロンプト
```
以下のエリアを分析してください。

【エリア情報】
推測エリア名: {{#node1b.intent.inferred_area#}}
入力された場所: {{#1718075278541.where#}}
プロンプト: {{#1718075278541.prompt#}}
中心座標: 緯度{{#1718075278541.center_lat#}}, 経度{{#1718075278541.center_lng#}}
検索半径: {{#1718075278541.radius_km#}}km
求められるテーマ: {{#node1b.intent.primary_themes#}}

【分析項目】
1. area_name: 正式なエリア名
2. area_history: 歴史的背景（100-200字）
3. cultural_significance: 文化的な重要性
4. typical_spots: 典型的なスポットタイプ
5. hidden_gems: 穴場的要素
6. walking_characteristics: 歩行の特徴
7. local_stories: 伝説や逸話
8. connection_points: スポットを繋ぐテーマ

【出力形式】JSON
{
  "area_name": "string",
  "area_history": "string",
  "cultural_significance": "string",
  "typical_spots": ["string"],
  "hidden_gems": ["string"],
  "walking_characteristics": "string",
  "local_stories": ["string"],
  "connection_points": ["string"]
}
```

---

## 🔧 Node 2b: Real Spots Search（実在スポット検索）

### ノードタイプ
**HTTPリクエストノード**

### 基本設定

| 項目 | 設定値 |
|------|--------|
| API | GET |
| URL | `https://maps.googleapis.com/maps/api/place/nearbysearch/json` |
| 認証 | 認証なし |

### ヘッダー

| キー | 値 |
|------|-----|
| （設定不要） | |

### パラメータ

| キー | 値 |
|------|-----|
| `location` | `{{#START.center_lat#}},{{#START.center_lng#}}` |
| `radius` | `1000` |
| `type` | `tourist_attraction` |
| `language` | `ja` |
| `key` | `あなたのGoogle Maps APIキー` |

### ボディ
- **none** を選択

### タイムアウト設定

| 項目 | 設定値 |
|------|--------|
| 接続タイムアウト | 30 秒 |
| 読み取りタイムアウト | 30 秒 |
| 書き込みタイムアウト | 30 秒 |

### 失敗時再試行

| 項目 | 設定値 |
|------|--------|
| 最大試行回数 | 3 回 |
| 再試行間隔 | 100 ミリ秒 |

### 例外処理
- **処理なし** または **次のステップ**

### 出力変数

| 変数名 | 型 | 説明 |
|--------|-----|------|
| `body` | String | レスポンスコンテンツ（JSON文字列） |
| `status_code` | Number | レスポンスステータスコード |
| `headers` | Object | レスポンスヘッダ（JSON） |

### 注意事項
- Google Cloud Platformで Places API を有効にしてください
- APIキーを直接入力するか、Difyの環境変数に設定
- 複数のtypeで検索する場合は、HTTPリクエストノードを複数作成

### 代替案：LLMでスポット生成（Google API不要）

Google APIを使わない場合は、**LLMノード**で以下のプロンプトを使用：

```
【エリア情報】より、謎解きクエストに適した実在スポットを生成してください。

エリア: {{#node2a_parse.area_name#}}
典型的なスポット: {{#node2a_parse.typical_spots#}}
穴場: {{#node2a_parse.hidden_gems#}}

【スポット数】
{{#START.spot_count#}}件 + 予備3件

【出力形式】JSON配列
[
  {
    "name": "正式名称",
    "lat": 35.XXXXXX,
    "lng": 139.XXXXXX,
    "summary": "概要2-3行",
    "facts": ["事実1", "事実2"],
    "puzzle_hooks": ["謎に使える要素"]
  }
]
```

---

## 🔧 Node 2c: Enrich Spots with Wikipedia（Wikipedia情報付加）

### ノードタイプ
**イテレーション** + **HTTPリクエスト** + **変数集約器**

### 2c-1: イテレーション設定

| 項目 | 設定値 |
|------|--------|
| 入力配列 | `{{#node2b.body.results#}}` |
| 並列実行 | ON（推奨） |
| 最大並列数 | 5 |

### 2c-2: HTTPリクエスト（イテレーション内）

| 項目 | 設定値 |
|------|--------|
| メソッド | GET |
| URL | `https://ja.wikipedia.org/api/rest_v1/page/summary/{{#item.name#}}` |
| ヘッダー | `Accept: application/json` |
| タイムアウト | 10秒 |
| エラー時続行 | ON |

### 2c-3: 変数集約器
イテレーション結果を配列として集約

---

## 🔧 Node 2d: Theme Scoring（テーマ適合度スコアリング）

### ノードタイプ
**LLMノード**

### 設定項目

| 項目 | 設定値 |
|------|--------|
| AIモデル | Gemini 3 Flash Preview |
| コンテキスト | なし |
| 推論タグの分離 | OFF |

### ユーザープロンプト
```
以下のスポット候補を、ユーザーの求める体験との適合度でスコアリングしてください。

【ユーザーが求める体験】
{{#node1b.intent#}}

【スポット候補】
{{#node2c.enriched_spots#}}

【必要なスポット数】
{{#1718075278541.spot_count#}}件

【スコアリング基準（各0-100点）】
1. theme_fit: テーマとの一致度
2. educational_value: 学びがあるか
3. puzzle_potential: 謎のネタになるか
4. walkability: ルートに組み込みやすいか
5. uniqueness: 特別感

【出力形式】JSON配列
[
  {
    "name": "スポット名",
    "place_id": "place_id",
    "lat": 緯度,
    "lng": 経度,
    "scores": {
      "theme_fit": 点数,
      "educational_value": 点数,
      "puzzle_potential": 点数,
      "walkability": 点数,
      "uniqueness": 点数,
      "total": 合計点
    },
    "learning_hooks": ["学びのフック"],
    "puzzle_ideas": ["謎のアイデア"]
  }
]

上位{{#1718075278541.spot_count#}}件×1.5件を選出してください。
```

---

## 🔧 Node 2e: Route Optimization（ルート最適化）

### ノードタイプ
**コードノード**

### 入力変数

| 変数名 | 変数値 |
|--------|--------|
| `scored_spots` | {{#node2d_parsed.spots#}} |
| `spot_count` | {{#1718075278541.spot_count#}} |
| `center_lat` | {{#1718075278541.center_lat#}} |
| `center_lng` | {{#1718075278541.center_lng#}} |

### コード（Python）
```python
import math

def haversine_distance(lat1, lng1, lat2, lng2):
    R = 6371000
    phi1 = math.radians(float(lat1))
    phi2 = math.radians(float(lat2))
    delta_phi = math.radians(float(lat2) - float(lat1))
    delta_lambda = math.radians(float(lng2) - float(lng1))
    
    a = math.sin(delta_phi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

def optimize_route(spots, start_lat, start_lng):
    if not spots:
        return []
    
    remaining = spots.copy()
    route = []
    current_lat, current_lng = float(start_lat), float(start_lng)
    
    while remaining:
        nearest = min(remaining, key=lambda s: haversine_distance(
            current_lat, current_lng, s.get('lat', 0), s.get('lng', 0)
        ))
        route.append(nearest)
        remaining.remove(nearest)
        current_lat = nearest.get('lat', current_lat)
        current_lng = nearest.get('lng', current_lng)
    
    return route

def main(scored_spots: list, spot_count: int, center_lat: str, center_lng: str) -> dict:
    if not scored_spots:
        return {"optimized_spots": [], "total_distance_meters": 0, "estimated_walking_minutes": 0}
    
    # スコア上位を取得
    sorted_spots = sorted(scored_spots, key=lambda x: x.get('scores', {}).get('total', 0), reverse=True)
    top_spots = sorted_spots[:int(spot_count) + 3]
    
    # ルート最適化
    start_lat = center_lat if center_lat else "35.6762"
    start_lng = center_lng if center_lng else "139.6503"
    optimized = optimize_route(top_spots, start_lat, start_lng)
    
    # 必要数に絞り込み
    final_route = optimized[:int(spot_count)]
    
    # インデックス付与
    for i, spot in enumerate(final_route):
        spot['spot_index'] = i + 1
        spot['spot_id'] = f"S{i + 1}"
    
    # 総距離計算
    total_distance = 0
    for i in range(1, len(final_route)):
        total_distance += haversine_distance(
            final_route[i-1].get('lat', 0), final_route[i-1].get('lng', 0),
            final_route[i].get('lat', 0), final_route[i].get('lng', 0)
        )
    
    return {
        "optimized_spots": final_route,
        "total_distance_meters": int(total_distance),
        "estimated_walking_minutes": int(total_distance / 80)
    }
```

### 出力変数

| 変数名 | 型 |
|--------|-----|
| `optimized_spots` | Array[Object] |
| `total_distance_meters` | Number |
| `estimated_walking_minutes` | Number |

---

## 🔧 Node 3: Motif Selection（モチーフ選定）

### ノードタイプ
**LLMノード**

### 設定項目

| 項目 | 設定値 |
|------|--------|
| AIモデル | Gemini 3 Pro Preview |
| コンテキスト | なし |
| 推論タグの分離 | OFF |

### ユーザープロンプト
```
以下のスポットを使って、一貫した謎解き物語を構築するため、各スポットの役割を決定してください。

【スポット一覧】
{{#node2e.optimized_spots#}}

【ユーザーの求める体験】
{{#node1b.intent#}}

【scene_roleの種類】
- 導入: 物語の始まり（最初のスポット専用）
- 展開: 情報収集、謎が深まる
- 転換: 状況が変わる（中盤に1-2個）
- 真相接近: 核心に迫る
- ミスリード解除: 誤解が解ける
- 結末: 物語の締め（最後のスポット専用）

【puzzle_typeの種類】
- logic: 論理パズル
- pattern: パターン認識
- cipher: 暗号解読
- wordplay: 言葉遊び
- lateral: 水平思考
- math: 算数パズル
- observation: 観察パズル

【plot_key_typeの種類】
- keyword / cipher_piece / coordinate / name / number / symbol

【出力形式】JSON
{
  "motifs": [
    {
      "spot_id": "S1",
      "spot_name": "スポット名",
      "scene_role": "導入",
      "puzzle_type": "logic",
      "plot_key_type": "keyword",
      "learning_elements": ["学び1", "学び2"],
      "story_beat": "物語上の出来事",
      "puzzle_concept": "謎のコンセプト"
    }
  ],
  "overall_narrative_arc": "物語全体のアーク説明",
  "meta_puzzle_hint": "メタパズルの仕掛けヒント"
}
```

---

## 🔧 Node 4: Story Building（物語骨格生成）

### ノードタイプ
**LLMノード**

### 設定項目

| 項目 | 設定値 |
|------|--------|
| AIモデル | Gemini 3 Pro Preview |
| コンテキスト | なし |
| 推論タグの分離 | OFF |

### ユーザープロンプト
```
街歩き謎解きクエストの物語骨格を構築してください。

【スポットとモチーフ】
{{#node3_parsed.motifs#}}

【ユーザーの求める体験】
{{#node1b.intent#}}

【premise（前提説明）のルール】
- 500〜800字、3〜5段落
- 二人称（あなた）中心、現在形
- 段落は\n\nで区切る
- 最後は問いかけで締める
- ネタバレ禁止

【premiseに含める要素】
1. 雰囲気の一撃目
2. プレイヤーの役割
3. 舞台の描写
4. 事件・異変
5. 痕跡・手がかり
6. 賭け金
7. 体験の約束
8. CTA

【出力形式】JSON
{
  "main_plot": {
    "premise": "500〜800字の導入文",
    "goal": "主人公の目的",
    "antagonist_or_mystery": "中心の謎",
    "final_reveal_outline": "真相の概要"
  },
  "spot_story_beats": [
    {
      "spot_id": "S1",
      "story_beat": "物語上の出来事",
      "emotional_arc": "プレイヤーの感情",
      "key_discovery": "発見する重要なこと"
    }
  ]
}
```

---

## 🔧 Node 5: Puzzle Design（謎設計ループ）

### ノードタイプ
**イテレーション** + **LLMノード**

### 5a: イテレーション設定

| 項目 | 設定値 |
|------|--------|
| 入力配列 | `{{#node3_parsed.motifs#}}` |
| 並列実行 | OFF（順番に生成） |

### 5b: LLMノード（イテレーション内）

| 項目 | 設定値 |
|------|--------|
| AIモデル | Gemini 3 Pro Preview |
| コンテキスト | なし |
| 推論タグの分離 | OFF |

### ユーザープロンプト（イテレーション内）
```
以下のスポットに教育的価値のある謎を設計してください。

【スポット情報】
スポット名: {{#item.spot_name#}}
スポットID: {{#item.spot_id#}}
物語上の役割: {{#item.scene_role#}}
謎のタイプ: {{#item.puzzle_type#}}
学び要素: {{#item.learning_elements#}}
謎のコンセプト: {{#item.puzzle_concept#}}

【物語の前提】
{{#node4_parsed.main_plot.premise#}}

【絶対ルール】
1. player_handoutだけで解けること
2. 外部知識は不要
3. 解いた瞬間に「そうか！」と学びがあること
4. 中学生でも読める言葉で書くこと

【出力形式】JSON
{
  "spot_id": "{{#item.spot_id#}}",
  "spot_name": "{{#item.spot_name#}}",
  "scene_role": "{{#item.scene_role#}}",
  "lore_card": {
    "short_story_text": "物語文（2-4文）",
    "facts_used": ["使用した事実"],
    "player_handout": "プレイヤー用資料（100-200字）"
  },
  "puzzle": {
    "type": "{{#item.puzzle_type#}}",
    "prompt": "出題文（50-100字）",
    "rules": "ルール説明",
    "answer": "答え",
    "solution_steps": ["ステップ1", "ステップ2", "ステップ3"],
    "hints": ["抽象ヒント", "具体ヒント", "救済ヒント"],
    "difficulty": 2
  },
  "reward": {
    "lore_reveal": "背景理解（2-3文）",
    "plot_key": "物語の鍵（5文字以内）",
    "next_hook": "次への誘導"
  },
  "linking_rationale": "この謎がこのスポットである理由"
}
```

### 5c: 変数集約器
イテレーション結果を `spot_scenes` 配列として集約

---

## 🔧 Node 6: Meta Puzzle（メタパズル生成）

### ノードタイプ
**LLMノード**

### 設定項目

| 項目 | 設定値 |
|------|--------|
| AIモデル | Gemini 3 Pro Preview |
| コンテキスト | なし |
| 推論タグの分離 | OFF |

### ユーザープロンプト
```
全スポットで集めた「鍵」を使った最終謎を作成してください。

【集めた鍵】
{{#spot_scenes#}}から各spot.reward.plot_keyを抽出

【物語の真相】
{{#node4_parsed.main_plot.final_reveal_outline#}}

【出力形式】JSON
{
  "meta_puzzle": {
    "inputs": ["S1.plot_key", "S2.plot_key", ...],
    "prompt": "最終謎の出題文（50-100字）",
    "answer": "最終的な答え",
    "explanation": "真相との接続（2-3文）"
  }
}
```

---

## 🔧 Node 7: Validation（検証）

### ノードタイプ
**コードノード**

### 入力変数

| 変数名 | 変数値 |
|--------|--------|
| `spot_scenes` | {{#node5_aggregated.spot_scenes#}} |
| `meta_puzzle` | {{#node6_parsed.meta_puzzle#}} |
| `optimized_spots` | {{#node2e.optimized_spots#}} |

### コード（Python）
```python
def main(spot_scenes: list, meta_puzzle: dict, optimized_spots: list) -> dict:
    errors = []
    warnings = []
    
    # スポット数チェック
    if len(spot_scenes) < 3:
        errors.append("スポット数が3未満です")
    
    # 各スポットの検証
    for scene in spot_scenes:
        spot_id = scene.get('spot_id', 'unknown')
        
        # player_handoutチェック
        handout = scene.get('lore_card', {}).get('player_handout', '')
        if len(handout) < 30:
            warnings.append(f"{spot_id}: player_handoutが短い")
        
        # 答えチェック
        answer = scene.get('puzzle', {}).get('answer', '')
        if not answer:
            errors.append(f"{spot_id}: 答えがない")
        
        # plot_keyチェック
        plot_key = scene.get('reward', {}).get('plot_key', '')
        if not plot_key:
            errors.append(f"{spot_id}: plot_keyがない")
    
    # メタパズルチェック
    if not meta_puzzle.get('answer'):
        errors.append("メタパズルの答えがない")
    
    # スコア計算
    score = 100 - (len(errors) * 20) - (len(warnings) * 5)
    score = max(0, score)
    
    return {
        "validation_passed": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "quality_score": score
    }
```

### 出力変数

| 変数名 | 型 |
|--------|-----|
| `validation_passed` | Boolean |
| `errors` | Array[String] |
| `warnings` | Array[String] |
| `quality_score` | Number |

---

## 🔧 Node 8: Player Preview（プレビュー生成）

### ノードタイプ
**LLMノード**

### 設定項目

| 項目 | 設定値 |
|------|--------|
| AIモデル | Gemini 3 Flash Preview |
| コンテキスト | なし |
| 推論タグの分離 | OFF |

### ユーザープロンプト
```
ネタバレなしの魅力的なプレビューを生成してください。

【重要：ネタバレ禁止】
- 謎の答え・ヒントは書かない
- 「何が起きるか」だけを書く

【クエスト情報】
物語: {{#node4_parsed.main_plot.premise#}}
スポット数: {{#node2e.optimized_spots#}}のlength
総距離: {{#node2e.total_distance_meters#}}m
推定時間: {{#node2e.estimated_walking_minutes#}}分

【出力形式】JSON
{
  "title": "クエストタイトル",
  "one_liner": "30〜45文字のキャッチコピー",
  "trailer": "80〜140文字の予告文",
  "mission": "あなたは〇〇して最後に〇〇を突き止める",
  "teasers": ["ティザー1", "ティザー2", "ティザー3"],
  "summary_actions": ["歩く", "集める", "照合する"],
  "route_meta": {
    "area_start": "開始エリア名",
    "area_end": "終了エリア名",
    "distance_km": "距離km",
    "estimated_time_min": "所要時間",
    "spots_count": スポット数,
    "difficulty_label": "難易度ラベル",
    "difficulty_reason": "難易度理由",
    "weather_note": "天候注意"
  },
  "highlight_spots": [
    {"name": "スポット名", "teaser_experience": "体験ティザー"}
  ],
  "tags": ["タグ1", "タグ2"],
  "prep_and_safety": ["準備1"],
  "cta_copy": {
    "primary": "主CTA",
    "secondary": "副CTA",
    "note": "補足"
  }
}
```

---

## 🔧 Node 9: Output Integration（出力統合）

### ノードタイプ
**コードノード**

### 入力変数

| 変数名 | 変数値 |
|--------|--------|
| `player_preview` | {{#node8_parsed#}} |
| `main_plot` | {{#node4_parsed.main_plot#}} |
| `spot_scenes` | {{#node5_aggregated.spot_scenes#}} |
| `meta_puzzle` | {{#node6_parsed.meta_puzzle#}} |
| `optimized_spots` | {{#node2e.optimized_spots#}} |
| `validation` | {{#node7#}} |

### コード（Python）
```python
from datetime import datetime

def main(
    player_preview: dict,
    main_plot: dict,
    spot_scenes: list,
    meta_puzzle: dict,
    optimized_spots: list,
    validation: dict
) -> dict:
    
    # スポットシーンに座標を追加
    for scene in spot_scenes:
        spot_id = scene.get('spot_id')
        for spot in optimized_spots:
            if spot.get('spot_id') == spot_id:
                scene['lat'] = spot.get('lat')
                scene['lng'] = spot.get('lng')
                scene['place_id'] = spot.get('place_id', '')
                scene['address'] = spot.get('address', '')
                break
    
    # creator_payload構築
    creator_payload = {
        "quest_id": f"quest-{int(datetime.now().timestamp())}",
        "quest_title": player_preview.get('title', '無題のクエスト'),
        "main_plot": main_plot,
        "spots": spot_scenes,
        "meta_puzzle": meta_puzzle,
        "generation_metadata": {
            "generated_at": datetime.now().isoformat(),
            "pipeline_version": "2.0.0-dify",
            "validation_passed": validation.get('validation_passed', False),
            "validation_warnings": validation.get('warnings', []),
            "quality_score": validation.get('quality_score', 0)
        }
    }
    
    return {
        "player_preview": player_preview,
        "creator_payload": creator_payload
    }
```

### 出力変数

| 変数名 | 型 |
|--------|-----|
| `player_preview` | Object |
| `creator_payload` | Object |

---

## 🏁 出力ノード（End Node）

### 出力変数定義

| 変数名 | 値 |
|--------|-----|
| `player_preview` | {{#node9.player_preview#}} |
| `creator_payload` | {{#node9.creator_payload#}} |

---

## ✅ 実装チェックリスト

| ノード | タイプ | 完了 |
|--------|--------|:----:|
| 開始ノード | 入力定義 | ⬜ |
| 1. Intent Analysis | LLM | ⬜ |
| 1b. Parse Intent | コード | ⬜ |
| 2a. Area Analysis | LLM | ⬜ |
| 2b. Real Spots Search | HTTP | ⬜ |
| 2c. Wikipedia Fetch | イテレーション+HTTP | ⬜ |
| 2d. Theme Scoring | LLM | ⬜ |
| 2d-parse | コード | ⬜ |
| 2e. Route Optimization | コード | ⬜ |
| 3. Motif Selection | LLM | ⬜ |
| 3-parse | コード | ⬜ |
| 4. Story Building | LLM | ⬜ |
| 4-parse | コード | ⬜ |
| 5. Puzzle Design | イテレーション+LLM | ⬜ |
| 5-aggregate | 変数集約器 | ⬜ |
| 6. Meta Puzzle | LLM | ⬜ |
| 6-parse | コード | ⬜ |
| 7. Validation | コード | ⬜ |
| 8. Player Preview | LLM | ⬜ |
| 8-parse | コード | ⬜ |
| 9. Output Integration | コード | ⬜ |
| 出力ノード | 出力定義 | ⬜ |

---

## 🔑 環境変数（Difyに設定）

| 変数名 | 説明 |
|--------|------|
| `GOOGLE_MAPS_API_KEY` | Google Maps APIキー |

---

## 📝 パース用コードノードのテンプレート

LLMの出力をJSONにパースする共通コード：

```python
import json
import re

def main(llm_output: str) -> dict:
    # JSON部分を抽出
    json_match = re.search(r'\{[\s\S]*\}', llm_output)
    if not json_match:
        # 配列の場合
        json_match = re.search(r'\[[\s\S]*\]', llm_output)
    
    if json_match:
        try:
            return {"parsed": json.loads(json_match.group())}
        except json.JSONDecodeError:
            pass
    
    return {"parsed": None, "error": "JSON parse failed"}
```

---

## � トラブルシューティング

### LLMがJSON以外を出力する場合
- システムプロンプトに「必ずJSON形式で出力してください」を追加
- ユーザープロンプトの最後に「JSONのみを出力し、それ以外は何も書かないでください」を追加

### HTTPリクエストがタイムアウトする場合
- タイムアウト値を増やす（30→60秒）
- 並列実行数を減らす

### 座標が取得できない場合
- center_lat/center_lngが空の場合のデフォルト値を設定
- Places APIの前にGeocoding APIで座標を取得する処理を追加
