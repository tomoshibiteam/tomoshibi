# Dify クエスト生成ワークフロー 実装ガイド（Part 3）

## 現在のフロー構成（続き）

```
[13. 物語骨格生成パース]
     ↓
[14. 謎設計ループ] ← イテレーション + LLMノード ★ここから
     ↓
[15. 謎設計結果統合] ← コードノード
     ↓
[16. メタパズル生成] ← LLMノード
     ↓
[17. メタパズル生成パース] ← コードノード
     ↓
[18. 検証] ← コードノード
     ↓
[19. プレビュー生成] ← LLMノード
     ↓
[20. プレビュー生成パース] ← コードノード
     ↓
[21. 出力統合] ← コードノード
     ↓
[終了ノード]
```

---

## 🔧 14. 謎設計ループ（シンプル版）

### ⚠️ 重要：イテレーションを避けるシンプルな方法

Difyのイテレーションは複雑なので、**1つのLLMノードで全スポットの謎を一括生成**します。

### ノードタイプ
**LLMノード**

### 接続
- 前: 物語骨格生成パース
- 後: 謎設計結果統合

### 設定

| 項目 | 設定値 |
|------|--------|
| AIモデル | Gemini 3 Pro Preview |
| コンテキスト | なし |
| 推論タグの分離 | OFF |

### システムプロンプト（SYSTEM）
```
あなたはひらめき型パズルの謎作家です。
「解く = 学ぶ」を実現する、美しい謎を設計してください。
出力は必ずJSON形式で行ってください。
```

### ユーザープロンプト（USER）
```
以下の全スポットに対して、教育的価値のある謎を設計してください。

【物語の前提】
{{#物語骨格生成パース.premise#}}

【物語の目的】
{{#物語骨格生成パース.goal#}}

【中心の謎】
{{#物語骨格生成パース.mystery#}}

【スポットとモチーフ】
{{#モチーフ選定パース.motifs_text#}}

【各スポットのストーリービート】
{{#物語骨格生成パース.spot_beats_text#}}

【謎設計の絶対ルール】
1. player_handout（プレイヤー資料）だけで解けること
2. 外部知識（ネット検索、暗記）は不要
3. 解いた瞬間に「そうか！」と学びがあること
4. スポットの歴史/文化と直接つながっていること
5. 中学生でも読める言葉で書くこと

【禁止事項】
- 「○○を建てたのは誰？」系の暗記クイズ
- スポットと関係ない一般パズル
- 答えが複数通りある曖昧な問題

【出力形式】JSON配列
[
  {
    "spot_id": "S1",
    "spot_name": "スポット名",
    "scene_role": "導入",
    "lore_card": {
      "short_story_text": "物語文（2-4文、このスポットの意味づけ）",
      "player_handout": "プレイヤー用資料（100-200字、謎を解くヒント含む）"
    },
    "puzzle": {
      "type": "observation",
      "prompt": "出題文（50-100字、美しく謎めいた語り口で）",
      "answer": "答え（明確に）",
      "solution_steps": [
        "ステップ1: まず○○を確認する",
        "ステップ2: 次に△△を比較する",
        "ステップ3: 最後に□□を導き出す"
      ],
      "hints": [
        "抽象的なヒント",
        "具体的なヒント",
        "救済ヒント（ほぼ答え）"
      ],
      "difficulty": 2
    },
    "reward": {
      "lore_reveal": "謎を解くと分かる背景（2-3文）",
      "plot_key": "物語の鍵（1-5文字）",
      "next_hook": "次のスポットへ行きたくなる一文"
    }
  }
]

全スポット分を生成してください。
```

---

## 🔧 15. 謎設計結果統合

### ノードタイプ
**コードノード**

### 接続
- 前: 謎設計ループ
- 後: メタパズル生成

### 入力変数

| 変数名 | 変数値 |
|--------|--------|
| `llm_output` | {{#謎設計ループ.text#}} |

### コード（Python）
```python
import json
import re

def main(llm_output: str) -> dict:
    json_match = re.search(r'\[[\s\S]*\]', llm_output)
    if json_match:
        try:
            spots = json.loads(json_match.group())
            
            # plot_keysを収集
            plot_keys = []
            spots_summary = ""
            
            for s in spots:
                spot_id = s.get('spot_id', '')
                spot_name = s.get('spot_name', '')
                plot_key = s.get('reward', {}).get('plot_key', '')
                puzzle_prompt = s.get('puzzle', {}).get('prompt', '')
                answer = s.get('puzzle', {}).get('answer', '')
                
                plot_keys.append(f"{spot_id}: {plot_key}")
                spots_summary += f"{spot_id} ({spot_name})\n"
                spots_summary += f"  謎: {puzzle_prompt}\n"
                spots_summary += f"  答え: {answer}\n"
                spots_summary += f"  鍵: {plot_key}\n\n"
            
            return {
                "spot_scenes_json": json.dumps(spots, ensure_ascii=False),
                "spot_scenes_count": len(spots),
                "plot_keys_text": "\n".join(plot_keys),
                "spots_summary": spots_summary
            }
        except:
            pass
    
    return {
        "spot_scenes_json": "[]",
        "spot_scenes_count": 0,
        "plot_keys_text": "パースに失敗しました",
        "spots_summary": ""
    }
```

### 出力変数

| 変数名 | 型 |
|--------|-----|
| `spot_scenes_json` | String |
| `spot_scenes_count` | Number |
| `plot_keys_text` | String |
| `spots_summary` | String |

---

## 🔧 16. メタパズル生成

### ノードタイプ
**LLMノード**

### 接続
- 前: 謎設計結果統合
- 後: メタパズル生成パース

### 設定

| 項目 | 設定値 |
|------|--------|
| AIモデル | Gemini 3 Pro Preview |
| コンテキスト | なし |
| 推論タグの分離 | OFF |

### システムプロンプト（SYSTEM）
```
あなたはひらめき型パズルの謎作家です。
全スポットで集めた「鍵」を使って解く、感動の最終謎を作成してください。
出力は必ずJSON形式で行ってください。
```

### ユーザープロンプト（USER）
```
これまでのスポットで集めた「鍵」を全て使って解く、最終謎を作成してください。

【集めた鍵】
{{#謎設計結果統合.plot_keys_text#}}

【物語の真相】
{{#物語骨格生成パース.final_reveal#}}

【メタパズルのコンセプト】
{{#モチーフ選定パース.meta_puzzle_concept#}}

【設計原則】
1. 全てのplot_keyを使うこと
2. 解けた時に「そういうことだったのか！」と全体が繋がる感覚
3. 謎自体は難しすぎない（鍵を並べれば見えてくる）
4. 真相が教育的価値を持つこと

【出力形式】JSON
{
  "meta_puzzle": {
    "inputs": ["S1の鍵", "S2の鍵", ...],
    "prompt": "最終謎の出題文（50-100字）",
    "answer": "最終的な答え",
    "solution_steps": [
      "ステップ1",
      "ステップ2",
      "ステップ3"
    ],
    "explanation": "真相との接続説明（2-3文）"
  }
}
```

---

## 🔧 17. メタパズル生成パース

### ノードタイプ
**コードノード**

### 接続
- 前: メタパズル生成
- 後: 検証

### 入力変数

| 変数名 | 変数値 |
|--------|--------|
| `llm_output` | {{#メタパズル生成.text#}} |

### コード（Python）
```python
import json
import re

def main(llm_output: str) -> dict:
    json_match = re.search(r'\{[\s\S]*\}', llm_output)
    if json_match:
        try:
            data = json.loads(json_match.group())
            meta = data.get("meta_puzzle", data)
            
            return {
                "meta_puzzle_json": json.dumps(meta, ensure_ascii=False),
                "meta_prompt": meta.get("prompt", ""),
                "meta_answer": meta.get("answer", ""),
                "meta_explanation": meta.get("explanation", "")
            }
        except:
            pass
    
    return {
        "meta_puzzle_json": "{}",
        "meta_prompt": "パースに失敗しました",
        "meta_answer": "",
        "meta_explanation": ""
    }
```

### 出力変数

| 変数名 | 型 |
|--------|-----|
| `meta_puzzle_json` | String |
| `meta_prompt` | String |
| `meta_answer` | String |
| `meta_explanation` | String |

---

## 🔧 18. 検証

### ノードタイプ
**コードノード**

### 接続
- 前: メタパズル生成パース
- 後: プレビュー生成

### 入力変数

| 変数名 | 変数値 |
|--------|--------|
| `spot_scenes_json` | {{#謎設計結果統合.spot_scenes_json#}} |
| `meta_puzzle_json` | {{#メタパズル生成パース.meta_puzzle_json#}} |
| `spot_count` | {{#START.spot_count#}} |

### コード（Python）
```python
import json

def main(spot_scenes_json: str, meta_puzzle_json: str, spot_count: int) -> dict:
    errors = []
    warnings = []
    
    try:
        spots = json.loads(spot_scenes_json)
        meta = json.loads(meta_puzzle_json)
    except:
        return {
            "validation_passed": False,
            "errors_text": "JSONパースに失敗",
            "warnings_text": "",
            "quality_score": 0
        }
    
    # スポット数チェック
    if len(spots) < int(spot_count):
        errors.append(f"スポット数が不足: {len(spots)} / {spot_count}")
    
    # 各スポット検証
    for scene in spots:
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
    if not meta.get('answer'):
        errors.append("メタパズルの答えがない")
    
    # スコア計算
    score = 100 - (len(errors) * 20) - (len(warnings) * 5)
    score = max(0, score)
    
    return {
        "validation_passed": len(errors) == 0,
        "errors_text": "\n".join(errors) if errors else "なし",
        "warnings_text": "\n".join(warnings) if warnings else "なし",
        "quality_score": score
    }
```

### 出力変数

| 変数名 | 型 |
|--------|-----|
| `validation_passed` | Boolean |
| `errors_text` | String |
| `warnings_text` | String |
| `quality_score` | Number |

---

## 🔧 19. プレビュー生成

### ノードタイプ
**LLMノード**

### 接続
- 前: 検証
- 後: プレビュー生成パース

### 設定

| 項目 | 設定値 |
|------|--------|
| AIモデル | Gemini 3 Flash Preview |
| コンテキスト | なし |
| 推論タグの分離 | OFF |

### システムプロンプト（SYSTEM）
```
あなたは「プレイヤーが"やってみたい！"と思える」クエスト紹介文を作る専門家です。
ネタバレは絶対に禁止です。
出力は必ずJSON形式で行ってください。
```

### ユーザープロンプト（USER）
```
ネタバレなしの魅力的なプレビューを生成してください。

【重要ルール：ネタバレ禁止】
- 謎の問題文・答え・ヒントの具体は絶対に書かない
- 「どう解くか」ではなく「何が起きるか」だけを書く

【物語の導入】
{{#物語骨格生成パース.premise#}}

【スポット情報】
{{#謎設計結果統合.spots_summary#}}

【ルート情報】
総距離: {{#ルート最適化.total_distance_m#}}m
歩行時間: {{#ルート最適化.walking_time_min#}}分
スポット数: {{#START.spot_count#}}箇所

【難易度】
{{#START.difficulty#}}

【出力形式】JSON
{
  "title": "クエストタイトル（魅力的に）",
  "one_liner": "30〜45文字のキャッチコピー",
  "trailer": "80〜140文字の予告文",
  "mission": "あなたは〇〇して最後に〇〇を突き止める",
  "teasers": [
    "スポット名で〇〇すると△△が見えてくる",
    "別のスポットで〇〇すると△△が起きる",
    "最後に〇〇すると△△が現れる"
  ],
  "summary_actions": ["歩く", "集める", "照合する"],
  "route_meta": {
    "area_start": "開始エリア名",
    "area_end": "終了エリア名",
    "distance_km": "距離km",
    "estimated_time_min": "所要時間",
    "spots_count": スポット数,
    "difficulty_label": "難易度ラベル",
    "weather_note": "天候の注意"
  },
  "tags": ["タグ1", "タグ2", "タグ3"],
  "cta_copy": {
    "primary": "冒険を始める",
    "secondary": "詳しく見る"
  }
}
```

---

## 🔧 20. プレビュー生成パース

### ノードタイプ
**コードノード**

### 接続
- 前: プレビュー生成
- 後: 出力統合

### 入力変数

| 変数名 | 変数値 |
|--------|--------|
| `llm_output` | {{#プレビュー生成.text#}} |

### コード（Python）
```python
import json
import re

def main(llm_output: str) -> dict:
    json_match = re.search(r'\{[\s\S]*\}', llm_output)
    if json_match:
        try:
            preview = json.loads(json_match.group())
            return {
                "player_preview_json": json.dumps(preview, ensure_ascii=False),
                "quest_title": preview.get("title", "無題のクエスト"),
                "one_liner": preview.get("one_liner", ""),
                "trailer": preview.get("trailer", "")
            }
        except:
            pass
    
    return {
        "player_preview_json": "{}",
        "quest_title": "無題のクエスト",
        "one_liner": "",
        "trailer": ""
    }
```

### 出力変数

| 変数名 | 型 |
|--------|-----|
| `player_preview_json` | String |
| `quest_title` | String |
| `one_liner` | String |
| `trailer` | String |

---

## 🔧 21. 出力統合

### ノードタイプ
**コードノード**

### 接続
- 前: プレビュー生成パース
- 後: 終了ノード

### 入力変数

| 変数名 | 変数値 |
|--------|--------|
| `player_preview_json` | {{#プレビュー生成パース.player_preview_json#}} |
| `quest_title` | {{#プレビュー生成パース.quest_title#}} |
| `premise` | {{#物語骨格生成パース.premise#}} |
| `goal` | {{#物語骨格生成パース.goal#}} |
| `mystery` | {{#物語骨格生成パース.mystery#}} |
| `final_reveal` | {{#物語骨格生成パース.final_reveal#}} |
| `spot_scenes_json` | {{#謎設計結果統合.spot_scenes_json#}} |
| `meta_puzzle_json` | {{#メタパズル生成パース.meta_puzzle_json#}} |
| `optimized_spots_json` | {{#ルート最適化.optimized_spots_json#}} |
| `validation_passed` | {{#検証.validation_passed#}} |
| `quality_score` | {{#検証.quality_score#}} |

### コード（Python）
```python
import json
from datetime import datetime

def main(
    player_preview_json: str,
    quest_title: str,
    premise: str,
    goal: str,
    mystery: str,
    final_reveal: str,
    spot_scenes_json: str,
    meta_puzzle_json: str,
    optimized_spots_json: str,
    validation_passed: bool,
    quality_score: int
) -> dict:
    
    # JSONパース
    try:
        player_preview = json.loads(player_preview_json)
        spot_scenes = json.loads(spot_scenes_json)
        meta_puzzle = json.loads(meta_puzzle_json)
        optimized_spots = json.loads(optimized_spots_json)
    except:
        return {
            "output_json": "{}",
            "error": "JSONパースに失敗しました"
        }
    
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
        "quest_title": quest_title,
        "main_plot": {
            "premise": premise,
            "goal": goal,
            "antagonist_or_mystery": mystery,
            "final_reveal_outline": final_reveal
        },
        "spots": spot_scenes,
        "meta_puzzle": meta_puzzle,
        "generation_metadata": {
            "generated_at": datetime.now().isoformat(),
            "pipeline_version": "2.0.0-dify",
            "validation_passed": validation_passed,
            "quality_score": quality_score
        }
    }
    
    # 最終出力
    output = {
        "player_preview": player_preview,
        "creator_payload": creator_payload
    }
    
    return {
        "output_json": json.dumps(output, ensure_ascii=False, indent=2)
    }
```

### 出力変数

| 変数名 | 型 |
|--------|-----|
| `output_json` | String |

---

## 🏁 終了ノード

### 出力変数

| 変数名 | 値 |
|--------|-----|
| `result` | {{#出力統合.output_json#}} |

---

## ✅ 実装チェックリスト

| # | ノード名 | タイプ | 完了 |
|---|----------|--------|:----:|
| 1 | 開始ノード | 入力定義 | ✅ |
| 2 | ユーザー意図分析 | LLM | ✅ |
| 3 | 意図解析結果パース | コード | ✅ |
| 4 | エリア特性分析 | LLM | ✅ |
| 5 | 実在スポット検索 | HTTP | ✅ |
| 6 | 実在スポット検索パース | コード | ✅ |
| 7 | テーマスコアリング | LLM | ⬜ |
| 8 | テーマスコアリングパース | コード | ⬜ |
| 9 | ルート最適化 | コード | ⬜ |
| 10 | モチーフ選定 | LLM | ⬜ |
| 11 | モチーフ選定パース | コード | ⬜ |
| 12 | 物語骨格生成 | LLM | ⬜ |
| 13 | 物語骨格生成パース | コード | ⬜ |
| 14 | 謎設計ループ | LLM | ⬜ |
| 15 | 謎設計結果統合 | コード | ⬜ |
| 16 | メタパズル生成 | LLM | ⬜ |
| 17 | メタパズル生成パース | コード | ⬜ |
| 18 | 検証 | コード | ⬜ |
| 19 | プレビュー生成 | LLM | ⬜ |
| 20 | プレビュー生成パース | コード | ⬜ |
| 21 | 出力統合 | コード | ⬜ |
| 22 | 終了ノード | 出力定義 | ⬜ |
