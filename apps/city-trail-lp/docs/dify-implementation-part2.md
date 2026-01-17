# Dify クエスト生成ワークフロー 実装ガイド（Part 2）

## 現在のフロー構成

```
[1. 開始ノード]
     ↓
[2. ユーザー意図分析] ← LLMノード
     ↓
[3. 意図解析結果パース] ← コードノード
     ↓
[4. エリア特性分析] ← LLMノード
     ↓
[5. 実在スポット検索] ← HTTPリクエストノード
     ↓
[6. 実在スポット検索パース] ← コードノード
     ↓
[7. テーマスコアリング] ← LLMノード ★ここから実装
     ↓
[8. テーマスコアリングパース] ← コードノード
     ↓
[9. ルート最適化] ← コードノード
     ↓
[10. モチーフ選定] ← LLMノード
     ↓
[11. モチーフ選定パース] ← コードノード
     ↓
[12. 物語骨格生成] ← LLMノード
     ↓
[13. 物語骨格生成パース] ← コードノード
     ↓
[14. 謎設計ループ] ← イテレーション + LLMノード
     ↓
[15. メタパズル生成] ← LLMノード
     ↓
[16. 検証] ← コードノード
     ↓
[17. プレビュー生成] ← LLMノード
     ↓
[18. 出力統合] ← コードノード
     ↓
[終了ノード]
```

---

## 🔧 7. テーマスコアリング

### ノードタイプ
**LLMノード**

### 接続
- 前: 実在スポット検索パース
- 後: テーマスコアリングパース

### 設定

| 項目 | 設定値 |
|------|--------|
| AIモデル | Gemini 3 Pro Preview |
| コンテキスト | なし |
| 推論タグの分離 | OFF |

### システムプロンプト（SYSTEM）
```
あなたはクエストデザイナーです。
観光スポットをユーザーの求める体験との適合度でスコアリングします。
出力は必ずJSON形式で行ってください。
```

### ユーザープロンプト（USER）
```
以下のスポット候補を、ユーザーの求める体験との適合度でスコアリングしてください。

【ユーザーが求める体験】
体験タイプ: {{#意図解析結果パース.experience_type#}}
主要テーマ: {{#意図解析結果パース.primary_themes#}}
学びの深さ: {{#意図解析結果パース.learning_depth#}}
謎の期待: {{#意図解析結果パース.puzzle_expectation#}}
必須要素: {{#意図解析結果パース.must_include#}}
避けるべき要素: {{#意図解析結果パース.must_avoid#}}

【エリア情報】
{{#エリア特性分析.text#}}

【スポット候補】
{{#実在スポット検索パース.spots_summary#}}

【必要なスポット数】
{{#START.spot_count#}}件

【スコアリング基準（各0-100点）】
1. theme_fit: ユーザーの求めるテーマとの一致度
2. educational_value: 「へぇ！」と思える学びがあるか
3. puzzle_potential: 謎解きのネタになりそうか
4. walkability: ルートに組み込みやすいか（位置関係）
5. uniqueness: このスポットならではの特別感

【出力形式】JSON配列
必要なスポット数 + 予備3件を出力してください。

[
  {
    "name": "スポット名",
    "lat": 緯度,
    "lng": 経度,
    "place_id": "place_id",
    "address": "住所",
    "theme_fit": 点数,
    "educational_value": 点数,
    "puzzle_potential": 点数,
    "walkability": 点数,
    "uniqueness": 点数,
    "total": 合計点,
    "selection_reason": "このスポットを選んだ理由（1文）",
    "historical_facts": ["このスポットの歴史的事実1", "事実2"],
    "puzzle_ideas": ["謎のアイデア1", "アイデア2"]
  }
]

totalが高い順に並べてください。
```

---

## 🔧 8. テーマスコアリングパース

### ノードタイプ
**コードノード**

### 接続
- 前: テーマスコアリング
- 後: ルート最適化

### 入力変数

| 変数名 | 変数値 |
|--------|--------|
| `llm_output` | {{#テーマスコアリング.text#}} |

### コード（Python）
```python
import json
import re

def main(llm_output: str) -> dict:
    # JSON部分を抽出
    json_match = re.search(r'\[[\s\S]*\]', llm_output)
    if json_match:
        try:
            spots = json.loads(json_match.group())
            
            # スポット一覧をテキスト化
            spots_text = ""
            for i, s in enumerate(spots):
                spots_text += f"{i+1}. {s.get('name', '')} (スコア: {s.get('total', 0)})\n"
            
            return {
                "scored_spots_json": json.dumps(spots, ensure_ascii=False),
                "scored_spots_count": len(spots),
                "scored_spots_text": spots_text
            }
        except:
            pass
    
    return {
        "scored_spots_json": "[]",
        "scored_spots_count": 0,
        "scored_spots_text": "パースに失敗しました"
    }
```

### 出力変数

| 変数名 | 型 |
|--------|-----|
| `scored_spots_json` | String |
| `scored_spots_count` | Number |
| `scored_spots_text` | String |

---

## 🔧 9. ルート最適化

### ノードタイプ
**コードノード**

### 接続
- 前: テーマスコアリングパース
- 後: モチーフ選定

### 入力変数

| 変数名 | 変数値 |
|--------|--------|
| `scored_spots_json` | {{#テーマスコアリングパース.scored_spots_json#}} |
| `spot_count` | {{#START.spot_count#}} |
| `center_lat` | {{#START.center_lat#}} |
| `center_lng` | {{#START.center_lng#}} |

### コード（Python）
```python
import json
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

def main(scored_spots_json: str, spot_count: int, center_lat: str, center_lng: str) -> dict:
    spots = json.loads(scored_spots_json)
    
    if not spots:
        return {
            "optimized_spots_json": "[]",
            "optimized_spots_text": "スポットがありません",
            "total_distance_m": 0,
            "walking_time_min": 0
        }
    
    # 上位スポットを取得
    top_spots = spots[:int(spot_count) + 2]
    
    # ルート最適化
    start_lat = center_lat if center_lat else "35.7148"
    start_lng = center_lng if center_lng else "139.7967"
    optimized = optimize_route(top_spots, start_lat, start_lng)
    
    # 必要数に絞り込み
    final_route = optimized[:int(spot_count)]
    
    # スポットID付与
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
    
    # テキスト形式
    spots_text = ""
    for s in final_route:
        spots_text += f"{s['spot_id']}: {s['name']} ({s.get('address', '')})\n"
        spots_text += f"   - 選定理由: {s.get('selection_reason', '')}\n"
        spots_text += f"   - 歴史: {', '.join(s.get('historical_facts', []))}\n"
        spots_text += f"   - 謎アイデア: {', '.join(s.get('puzzle_ideas', []))}\n\n"
    
    return {
        "optimized_spots_json": json.dumps(final_route, ensure_ascii=False),
        "optimized_spots_text": spots_text,
        "total_distance_m": int(total_distance),
        "walking_time_min": int(total_distance / 80)
    }
```

### 出力変数

| 変数名 | 型 |
|--------|-----|
| `optimized_spots_json` | String |
| `optimized_spots_text` | String |
| `total_distance_m` | Number |
| `walking_time_min` | Number |

---

## 🔧 10. モチーフ選定

### ノードタイプ
**LLMノード**

### 接続
- 前: ルート最適化
- 後: モチーフ選定パース

### 設定

| 項目 | 設定値 |
|------|--------|
| AIモデル | Gemini 3 Pro Preview |
| コンテキスト | なし |
| 推論タグの分離 | OFF |

### システムプロンプト（SYSTEM）
```
あなたは謎解きゲームの物語構成の専門家です。
各スポットに物語上の役割と謎のタイプを割り当てます。
出力は必ずJSON形式で行ってください。
```

### ユーザープロンプト（USER）
```
以下のスポットを使って、一貫した謎解き物語を構築するため、各スポットの役割を決定してください。

【最適化されたスポット一覧】
{{#ルート最適化.optimized_spots_text#}}

【ユーザーが求める体験】
体験タイプ: {{#意図解析結果パース.experience_type#}}
テーマ: {{#意図解析結果パース.primary_themes#}}
学び: {{#意図解析結果パース.learning_depth#}}
雰囲気: {{#意図解析結果パース.mood_keywords#}}

【scene_roleの種類と説明】
- 導入: 物語の始まり。世界観を提示する。必ず最初のスポット。
- 展開: 情報収集フェーズ。謎が深まり、手がかりが増える。
- 転換: 状況が変わる重要地点。新事実が判明する。中盤に1-2個。
- 真相接近: 核心に迫る。答えに近づいている緊張感。
- 結末: 物語の締めくくり。達成感と余韻。必ず最後のスポット。

【puzzle_typeの種類】
- logic: 論理パズル（証言整理、条件分岐）
- pattern: パターン認識（数列、図形）
- cipher: 暗号解読（換字式、位置暗号）
- wordplay: 言葉遊び（漢字分解、アナグラム）
- observation: 観察パズル（現地で見つける）

【plot_key_typeの種類】
- keyword: キーワード
- number: 数字・年号
- name: 人物名・地名
- symbol: 記号・紋章

【出力形式】JSON
{
  "motifs": [
    {
      "spot_id": "S1",
      "spot_name": "スポット名",
      "scene_role": "導入",
      "puzzle_type": "observation",
      "plot_key_type": "keyword",
      "learning_elements": ["このスポットで学べること1", "学べること2"],
      "story_beat": "物語上、このスポットで起こること（1文）",
      "puzzle_concept": "この謎の基本コンセプト（1文）"
    }
  ],
  "overall_narrative": "物語全体の流れ（3-4文）",
  "meta_puzzle_concept": "最終謎の基本アイデア"
}

【重要ルール】
- 最初のスポットは必ず「導入」
- 最後のスポットは必ず「結末」
- 「転換」は中盤に1-2個
```

---

## 🔧 11. モチーフ選定パース

### ノードタイプ
**コードノード**

### 接続
- 前: モチーフ選定
- 後: 物語骨格生成

### 入力変数

| 変数名 | 変数値 |
|--------|--------|
| `llm_output` | {{#モチーフ選定.text#}} |

### コード（Python）
```python
import json
import re

def main(llm_output: str) -> dict:
    json_match = re.search(r'\{[\s\S]*\}', llm_output)
    if json_match:
        try:
            data = json.loads(json_match.group())
            motifs = data.get("motifs", [])
            
            # モチーフテキスト化
            motifs_text = ""
            for m in motifs:
                motifs_text += f"{m.get('spot_id')}: {m.get('spot_name')}\n"
                motifs_text += f"  役割: {m.get('scene_role')}\n"
                motifs_text += f"  謎タイプ: {m.get('puzzle_type')}\n"
                motifs_text += f"  鍵タイプ: {m.get('plot_key_type')}\n"
                motifs_text += f"  学び: {', '.join(m.get('learning_elements', []))}\n"
                motifs_text += f"  物語: {m.get('story_beat')}\n"
                motifs_text += f"  謎コンセプト: {m.get('puzzle_concept')}\n\n"
            
            return {
                "motifs_json": json.dumps(motifs, ensure_ascii=False),
                "motifs_text": motifs_text,
                "overall_narrative": data.get("overall_narrative", ""),
                "meta_puzzle_concept": data.get("meta_puzzle_concept", ""),
                "motifs_count": len(motifs)
            }
        except:
            pass
    
    return {
        "motifs_json": "[]",
        "motifs_text": "パースに失敗しました",
        "overall_narrative": "",
        "meta_puzzle_concept": "",
        "motifs_count": 0
    }
```

### 出力変数

| 変数名 | 型 |
|--------|-----|
| `motifs_json` | String |
| `motifs_text` | String |
| `overall_narrative` | String |
| `meta_puzzle_concept` | String |
| `motifs_count` | Number |

---

## 🔧 12. 物語骨格生成

### ノードタイプ
**LLMノード**

### 接続
- 前: モチーフ選定パース
- 後: 物語骨格生成パース

### 設定

| 項目 | 設定値 |
|------|--------|
| AIモデル | Gemini 3 Pro Preview |
| コンテキスト | なし |
| 推論タグの分離 | OFF |

### システムプロンプト（SYSTEM）
```
あなたは「映画予告編のように没入感を作る」トップコピーライター兼ストーリー設計者です。
街歩き謎解きクエストの物語骨格を構築してください。
出力は必ずJSON形式で行ってください。
```

### ユーザープロンプト（USER）
```
以下の情報を使って、街歩き謎解きクエストの物語骨格を構築してください。

【スポットとモチーフ】
{{#モチーフ選定パース.motifs_text#}}

【物語全体の流れ】
{{#モチーフ選定パース.overall_narrative#}}

【ユーザーの求める体験】
体験タイプ: {{#意図解析結果パース.experience_type#}}
テーマ: {{#意図解析結果パース.primary_themes#}}
雰囲気: {{#意図解析結果パース.mood_keywords#}}

【エリアの歴史】
{{#エリア特性分析.text#}}

【premise（前提説明）の必須ルール】
- 500〜800字、3〜5段落
- 二人称（あなた）中心、現在形
- 段落は改行で区切る
- 最後の1文は問いかけで締める
- ネタバレ禁止（答え、犯人、どんでん返しは書かない）
- 歴史的事実から逸脱しない

【premiseに必ず含める8要素】
1. 雰囲気の一撃目（映画のオープニング感）
2. プレイヤーの役割（なりきり）
3. 舞台の描写（具体的な場所）
4. 事件・異変（導入フック）
5. 痕跡（シンボル/暗号/伝承/手がかり）
6. 賭け金（タイムリミット/危機/失敗示唆）
7. 体験の約束（ただの散歩ではない）
8. CTA（問いかけで締め）

【出力形式】JSON
{
  "main_plot": {
    "premise": "500〜800字の導入文",
    "goal": "主人公の目的（1〜2文）",
    "antagonist_or_mystery": "対立要素または中心の謎（1〜2文）",
    "final_reveal_outline": "最終的な真相の概要（ネタバレ注意、曖昧に）"
  },
  "spot_story_beats": [
    {
      "spot_id": "S1",
      "story_beat": "この地点で起こる物語上の出来事",
      "emotional_arc": "この地点でのプレイヤーの感情",
      "key_discovery": "この地点で発見する重要なこと"
    }
  ]
}
```

---

## 🔧 13. 物語骨格生成パース

### ノードタイプ
**コードノード**

### 接続
- 前: 物語骨格生成
- 後: 謎設計ループ

### 入力変数

| 変数名 | 変数値 |
|--------|--------|
| `llm_output` | {{#物語骨格生成.text#}} |

### コード（Python）
```python
import json
import re

def main(llm_output: str) -> dict:
    json_match = re.search(r'\{[\s\S]*\}', llm_output)
    if json_match:
        try:
            data = json.loads(json_match.group())
            main_plot = data.get("main_plot", {})
            spot_beats = data.get("spot_story_beats", [])
            
            # ストーリービートテキスト化
            beats_text = ""
            for b in spot_beats:
                beats_text += f"{b.get('spot_id')}: {b.get('story_beat')}\n"
                beats_text += f"  感情: {b.get('emotional_arc')}\n"
                beats_text += f"  発見: {b.get('key_discovery')}\n\n"
            
            return {
                "premise": main_plot.get("premise", ""),
                "goal": main_plot.get("goal", ""),
                "mystery": main_plot.get("antagonist_or_mystery", ""),
                "final_reveal": main_plot.get("final_reveal_outline", ""),
                "spot_beats_json": json.dumps(spot_beats, ensure_ascii=False),
                "spot_beats_text": beats_text
            }
        except:
            pass
    
    return {
        "premise": "パースに失敗しました",
        "goal": "",
        "mystery": "",
        "final_reveal": "",
        "spot_beats_json": "[]",
        "spot_beats_text": ""
    }
```

### 出力変数

| 変数名 | 型 |
|--------|-----|
| `premise` | String |
| `goal` | String |
| `mystery` | String |
| `final_reveal` | String |
| `spot_beats_json` | String |
| `spot_beats_text` | String |

---

次のノード（謎設計ループ以降）は Part 3 に続きます。
