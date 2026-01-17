# Dify ワークフロー実装ガイド（詳細版）

このドキュメントは、クエスト生成用Difyワークフローの各ノードを実装するための詳細ガイドです。
各ノードで設定が必要な項目を具体的に記載しています。

---

## 📋 重要な注意事項

### Difyの制限事項
- **オブジェクト型の出力変数のプロパティは直接参照できません**
- 例: `{{#node1b.intent.inferred_area#}}` は動作しません
- **解決策**: コードノードで個別の変数（String, Number等）として出力する

### 変数参照のルール
- 開始ノードの変数: `{{#START.変数名#}}`
- 他のノードの出力: `{{#ノード名.変数名#}}`

---

## 🔧 Node 1b: Parse Intent（意図解析結果パース）

### ノードタイプ
**コードノード**

### 目的
LLMの出力JSONを個別の変数に分解して、後続ノードで参照可能にする

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
            # 個別の変数として出力（Difyの制限対応）
            return {
                "experience_type": parsed.get("experience_type", "冒険"),
                "primary_themes": ", ".join(parsed.get("primary_themes", ["歴史"])),
                "fitness_level": parsed.get("fitness_level", "普通"),
                "learning_depth": parsed.get("learning_depth", "軽い豆知識"),
                "puzzle_expectation": parsed.get("puzzle_expectation", "簡単に解きたい"),
                "mood_keywords": ", ".join(parsed.get("mood_keywords", ["ミステリアス"])),
                "must_include": ", ".join(parsed.get("must_include", [])),
                "must_avoid": ", ".join(parsed.get("must_avoid", [])),
                "inferred_area": parsed.get("inferred_area", ""),
                "analysis_summary": parsed.get("analysis_summary", "")
            }
        except:
            pass
    
    # パース失敗時のデフォルト
    return {
        "experience_type": "冒険",
        "primary_themes": "歴史",
        "fitness_level": "普通",
        "learning_depth": "軽い豆知識",
        "puzzle_expectation": "簡単に解きたい",
        "mood_keywords": "ミステリアス",
        "must_include": "",
        "must_avoid": "",
        "inferred_area": "",
        "analysis_summary": "分析に失敗しました"
    }
```

### 出力変数

| 変数名 | 型 | 説明 |
|--------|-----|------|
| `experience_type` | String | 体験タイプ |
| `primary_themes` | String | 主要テーマ（カンマ区切り） |
| `fitness_level` | String | 体力レベル |
| `learning_depth` | String | 学びの深さ |
| `puzzle_expectation` | String | 謎の期待値 |
| `mood_keywords` | String | 雰囲気キーワード（カンマ区切り） |
| `must_include` | String | 必須要素（カンマ区切り） |
| `must_avoid` | String | 避けるべき要素（カンマ区切り） |
| `inferred_area` | String | 推測されるエリア名 |
| `analysis_summary` | String | 分析サマリー |

### 後続ノードでの参照方法
```
推測エリア名: {{#node1b.inferred_area#}}
主要テーマ: {{#node1b.primary_themes#}}
分析サマリー: {{#node1b.analysis_summary#}}
```
