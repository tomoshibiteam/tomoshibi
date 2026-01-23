# TOMOSHIBI Home Screen Design Specification
## AI Quest Generator - 灯火が炎になる体験設計

---

## 1. デザインコンセプト

**「灯火を集め、炎を灯す」**

TOMOSHIBIのHome画面は、街歩き謎解きの冒険への入口。ユーザーは3つの「灯火（ともしび）」—場所・スタイル・体験—を選び集めることで、1つの「炎（クエスト）」を生み出す。古地図のような温かみのある質感と、選ぶほどに育つ期待感が、冒険のプロローグを演出する。派手なエフェクトは避け、紙の質感・微かな揺らぎ・点灯の余韻で上品に世界観を構築する。

---

## 2. 画面レイアウト

### 2.1 全体構成（縦方向）

```
┌─────────────────────────────────────┐
│  [Safe Area Top]                    │
├─────────────────────────────────────┤
│  Header (48px)                      │
│  ロゴ + ログインボタン              │
├─────────────────────────────────────┤
│  Hero Section (88px)                │
│  メインコピー + サブコピー          │
├─────────────────────────────────────┤
│  Selection Area (flex-1)            │
│  ┌───────────────────────────────┐  │
│  │ 🔥 どこで（灯火1）            │  │
│  │ [chips]                       │  │
│  ├───────────────────────────────┤  │
│  │ 🔥 どのように（灯火2）        │  │
│  │ [chips]                       │  │
│  ├───────────────────────────────┤  │
│  │ 🔥 どんな体験（灯火3）        │  │
│  │ [chips]                       │  │
│  └───────────────────────────────┘  │
├─────────────────────────────────────┤
│  Quest Hearth Card (120px)          │
│  炎が育つ場所 + 点火ボタン          │
├─────────────────────────────────────┤
│  [Tab Bar - 64px]                   │
└─────────────────────────────────────┘
```

### 2.2 Header（48px）

| 要素 | 仕様 |
|------|------|
| 左：ロゴ | TOMOSHIBI 灯火アイコン（16px）+ テキスト（14px/600） |
| 右：ログイン | Ghost button, 12px/500, icon 16px |
| 背景 | transparent, 下にborder-b（1px, border/30） |
| 余白 | px-20, py-12 |

### 2.3 Hero Section（88px）

| 要素 | 仕様 |
|------|------|
| メインコピー | "あなただけの冒険を灯す" 22px/700, foreground |
| サブコピー | "3つの灯火を集めて、AIがクエストを生成" 13px/400, muted |
| 装飾 | 左に微小な灯火アイコン（24px, primary/60, 揺らぎアニメ） |
| 余白 | px-20, pt-16, pb-12 |

### 2.4 Selection Area（3セクション）

各セクションの構造：

```
┌─────────────────────────────────────┐
│  [灯火アイコン] セクション名        │  ← Label Row (32px)
│  ─────────────────────────────────  │  ← 区切り線（装飾的）
│  [chip] [chip] [chip] [chip]        │  ← Chip Grid (auto)
└─────────────────────────────────────┘
```

| 要素 | 仕様 |
|------|------|
| 灯火アイコン | 20px, 未選択=muted/40, 選択済=カテゴリ色で点灯 |
| セクション名 | 13px/600, foreground |
| 区切り線 | 1px dashed, border/20, 幅60% |
| Chip Grid | flex-wrap, gap-8 |
| セクション間余白 | 16px |

### 2.5 Quest Hearth Card（炉カード）

**"炎が育つ場所"をイメージした、温かみのあるカード**

```
┌─────────────────────────────────────┐
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  ← 上部グラデーション（炎）
│                                     │
│  [灯火タグ] [灯火タグ] [灯火タグ]   │  ← 選択済みキーワード
│                                     │
│  ┌─────────────────────────────┐    │
│  │   🔥  長押しで点火          │    │  ← 点火ボタン
│  │       炎を灯してクエスト生成 │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

| 状態 | 背景 | 炎グラデーション | 内容 |
|------|------|------------------|------|
| 空（0選択） | secondary/20 | なし | "灯火を選んでください" |
| 途中（1-2選択） | secondary/30 | 微かなglow | 選択タグ表示、炎が小さく |
| 完了（3選択） | secondary/40 | 明確なglow | 選択タグ + "準備完了！" |

---

## 3. コンポーネント仕様

### 3.1 Flame Chip（灯火チップ）

| 状態 | 背景 | 境界 | テキスト | 影 | アイコン |
|------|------|------|----------|-----|---------|
| **未選択** | white/60 | 1px solid border/30 | 12px/500, foreground/70 | none | なし |
| **ホバー** | white/80 | 1px solid border/50 | 12px/500, foreground | soft-sm | なし |
| **選択済** | gradient(カテゴリ色) | none | 12px/600, white | soft + glow | 左に小さな炎(8px) |
| **押下中** | gradient(darker) | none | 12px/600, white | inset | 炎が揺れる |

**カテゴリ色：**
- どこで: `from-blue-500 to-cyan-400`
- どのように: `from-amber-500 to-orange-400`
- どんな体験: `from-rose-400 to-orange-400`

**サイズ：** px-12, py-8, rounded-full

### 3.2 Quest Hearth Card

| 状態 | 背景 | 上部グロー | ボタン状態 |
|------|------|-----------|-----------|
| **空** | `bg-stone-100/80` | なし | disabled, muted |
| **1灯火** | `bg-stone-100/90` | `primary/5` 微光 | disabled |
| **2灯火** | `bg-stone-50` | `primary/10` | disabled |
| **3灯火** | `bg-white` | `primary/20` 揺らぎ | enabled, pulsate |

**カードスタイル：**
- rounded-2xl
- border: 1px solid border/20
- shadow: `0 4px 24px -4px rgba(180, 120, 60, 0.08)`
- padding: 16px

### 3.3 Ignite Button（点火ボタン）

| 状態 | 背景 | テキスト | 影 | 追加 |
|------|------|----------|-----|------|
| **通常** | gradient(primary→amber) | white, 14px/600 | lg + glow | subtle pulse |
| **長押し中** | gradient(intensify) | white | expanding glow | progress ring |
| **完了** | gradient(bright) | white | burst glow | 火花エフェクト |
| **disabled** | muted/30 | muted/50 | none | - |

**サイズ：** w-full, h-48, rounded-xl

### 3.4 タイポグラフィスケール

| レベル | サイズ | ウェイト | 行間 | 用途 |
|--------|--------|---------|------|------|
| H1 | 22px | 700 | 1.3 | ヒーローコピー |
| H2 | 16px | 600 | 1.4 | セクション見出し |
| Body | 14px | 400 | 1.5 | 本文 |
| Label | 13px | 600 | 1.4 | セクションラベル |
| Caption | 12px | 500 | 1.4 | チップ、補足 |
| Micro | 10px | 500 | 1.3 | ステータス |

### 3.5 余白・角丸・影のルール

**グリッド：** 4px基準（8px, 12px, 16px, 20px, 24px...）

| 要素 | 角丸 | 影 |
|------|------|-----|
| チップ | full (9999px) | soft-sm when selected |
| カード | 16px | soft-lg |
| ボタン | 12px | lg + glow |
| セクション | 12px | none |

**影の定義：**
```css
--shadow-soft-sm: 0 2px 8px -2px rgba(0,0,0,0.06);
--shadow-soft: 0 4px 16px -4px rgba(0,0,0,0.08);
--shadow-soft-lg: 0 8px 24px -6px rgba(0,0,0,0.10);
--shadow-glow-primary: 0 4px 20px -4px rgba(242,153,74,0.3);
```

---

## 4. アニメーション/挙動

### 4.1 チップ選択

```
トリガー: tap
duration: 200ms
easing: ease-out

1. Scale: 1 → 0.95 → 1.02 → 1 (spring)
2. 背景: 即座にgradientへトランジション
3. 灯火アイコン: fade-in (150ms), scale 0.8→1
4. Glow: 0 → 4px blur (200ms)
5. Haptics: selection (iOS) / light (Android)
```

### 4.2 灯火の合流（チップ→カード）

```
トリガー: チップ選択直後
duration: 300ms
easing: cubic-bezier(0.34, 1.56, 0.64, 1)

1. 選択チップから小さな光の粒(4px)が発生
2. 粒がHearthカードの上部へ curve path で移動
3. カード上部のglowが intensity += 0.1
4. カード内に選択タグがfade-in (200ms)
```

### 4.3 長押し点火

```
トリガー: pointer down on IgniteButton
duration: 1500ms
easing: linear (progress) + ease-out (completion)

Phase 1 - 蓄積 (0-1500ms):
  - Progress ring: stroke-dashoffset アニメーション
  - 中心の炎アイコン: scale 1 → 1.15 (pulse)
  - Glow: intensity 0.3 → 0.6
  - Haptics: 500ms, 1000ms でtick

Phase 2 - 点火 (1500ms):
  - Flash: 白フラッシュ 100ms
  - Ring: 完了して消える
  - 炎: scale 1.15 → 1.3 → 1 (burst)
  - Haptics: success
  
Phase 3 - 遷移 (1500ms+):
  - カード全体が上にスライド
  - 生成画面へcrossfade
```

### 4.4 生成中ローディング

```
スピナー禁止。以下の演出を使用：

Option A - コンパスローディング:
  - 中心にコンパス
  - 針がゆっくり回転 (3s/周)
  - 周囲に方位線がfade-in/out

Option B - 地図線描画:
  - 地図の等高線がstroke-dashoffsetでアニメーション
  - 線が徐々に描かれていく
  - 完了で全体が明るくなる

テキスト: "クエストを編纂中..." → "ルートを設計中..." → "冒険の準備完了！"
各フェーズ 1.5s
```

### 4.5 背景の温度変化

```
トリガー: 選択数の変化
duration: 500ms
easing: ease-in-out

0選択: 
  - 背景: neutral
  - 装飾: opacity 0.3
  
1選択:
  - 背景: わずかにwarm (+2% saturation)
  - セクション1の灯火アイコン: glow
  
2選択:
  - 背景: さらにwarm (+4% saturation)
  - 装飾opacity: 0.5
  
3選択:
  - 背景: 温かみのピーク (+6% saturation)
  - 全体に微かなvignette (radial gradient)
  - 装飾: opacity 0.7, subtle pulse
```

---

## 5. 実装ノート

### 5.1 パフォーマンス

- アニメーションは `transform` と `opacity` のみ使用
- Glowは `box-shadow` ではなく `filter: drop-shadow` で軽量化
- 粒子エフェクトは最大4粒に制限
- 背景の温度変化は CSS custom properties で制御

### 5.2 リソース

- 画像リソース: なし（SVG + CSS のみ）
- 背景テクスチャ: CSS noise pattern（軽量）
- アイコン: Lucide React

### 5.3 アクセシビリティ

- ボタンの長押しはキーボードでスペース長押しでも発火
- 選択状態は aria-pressed で管理
- haptics は `prefers-reduced-motion` を尊重
