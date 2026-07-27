# Karotter Client - 変更履歴サマリー
作成日: 2026/07/26

---

## 変更ファイル: `content/main.js`

---

### 変更 1: 投稿詳細ページの統計バッジスタイル修正（1行目と2行目を同じ見た目に）

**該当関数**: `normalisedDetailStatBadge`

**問題**:
投稿詳細ページの統計情報が2行に分かれて表示されており、見た目が異なっていた。
- 1行目（引用: 0 / RK: 0 / いいね: 0）: Karotterネイティブのピルボタンスタイル（青背景・白文字）
- 2行目（表示回数: 0 / ブックマーク: 0 / 日時）: スタイルなしのプレーンテキスト

**修正内容**:
- 最初の試み: 独自CSSをハードコード → 色が微妙に違い一致しなかった
- 最終的な修正: `row1.querySelector('button')` で1行目の実際のボタン要素を取得し、その `className`（TailwindCSSクラス群）をそのまま2行目のバッジ要素にコピーする方式に変更
- バッジは `<span>` 要素に `cursor:default; pointer-events:none;` のみ追加

**変更後のコード**:
```javascript
function normalisedDetailStatBadge(text, templateClassName) {
  const btn = document.createElement('span');
  if (templateClassName) {
    btn.className = templateClassName;
  }
  btn.style.cssText = 'cursor:default;pointer-events:none;';
  btn.textContent = text.trim();
  return btn;
}
```

---

### 変更 2: ショートカットパネルの白いボーダーを削除

**該当箇所**: Shadow DOM内 `.card` スタイル（`SHADOW_HTML` 内の `<style>` タグ）

**問題**:
Matrixテーマ適用時、ショートカットパネルの周囲に白い枠線が表示されていた。

**原因**:
Shadow DOM内の `.card` に `border: 1px solid rgba(255,255,255,.58)` が設定されており、
Shadow DOMはテーマのCSS変数が届かないため、どのテーマでも常に白い枠線として表示されていた。

**修正内容**:
```css
/* 変更前 */
border: 1px solid rgba(255,255,255,.58);

/* 変更後 */
border: none;
```

---

### 変更 3: Matrixテーマで白い背景エリアが残る問題を修正

**該当箇所**: `applyThemeCssVars` 関数内 `extraRules.matrix`

**問題**:
Matrixテーマ適用時、ページ内に白い矩形の背景エリアが残っていた。

**原因**:
`aero` / `rainbow` テーマには以下のルールが存在していたが、`matrix` テーマにだけ抜けていた。
```css
body [class*="bg-[var(--background)]"] { background: transparent !important; }
```
これにより、Karotterのメインコンテンツエリア（`bg-[var(--background)]` クラスを持つ要素）の
白いデフォルト背景が上書きされずに残っていた。

**修正内容**:
`extraRules.matrix` に1行追加:
```javascript
matrix: `
  body .border-b-2 { ... }
  body .bg-gray-100 { ... }
  body .mt-1.text-xs.text-gray-500 { ... }
  body [class*="bg-[var(--background)]"] { background: transparent !important; }  // ← 追加
`,
```

---

### 変更 4: ショートカットパネルのテーマ対応（revert済み）

**注意**: この変更は副作用（パネルが暗くなり見にくい）があったためrevertしました。

内容: `applyPanelTheme()` 関数と `PANEL_THEME_STYLES` 定数を追加し、
テーマごとにShadow DOM内パネルの背景色を切り替えようとしたが、
ショートカット一覧が見にくくなったためすべて削除。

---

## 変更ファイル: なし（設定・マニフェスト等は変更なし）

---

*このファイルはKiroとの会話セッションのサマリーとして自動生成されました。*

---

## 追加変更（2026/07/26 セッション続き）

### 変更5: ショートカットパネルのドラッグが動かなくなっていた問題を修正
Shadow DOM内の `.card` CSS に `right/bottom/left/top: auto !important` がついていたため、JSからの位置変更が上書きされていた。`!important` を `position: fixed` 以外から削除。

### 変更6: テーマ機能を完全削除
投稿欄の視認性問題が解消できなかったため、テーマ機能全体を削除。
- `main.js`: THEME_LINK_ID / THEME_CSS_MAP / THEME_CSS_VARS / applyTheme 等を全削除
- `settings.js`: renderTheme・defaults.theme を削除
- `settings.html`: テーマセクションを削除
- `settings.css`: Theme selectorスタイルを削除
- `content/themes/` フォルダ（aero.css / matrix.css / rainbow.css）を削除
- `manifest.json`: web_accessible_resources からtheme CSSへの参照を削除

### 変更7: TL更新（Dキー）が効かなくなっていた問題を修正
セレクタが `"TL更新"` になっていたが、実際のボタンは `"TLを更新"` に変わっていた。

### 変更8: パネル表示位置設定を削除
設定画面の「右下/左下/右上/左上」セレクトボックスを削除。ドラッグでの移動は引き続き動作する。

### 変更9: 今日の投稿カウントが増えない問題を修正
KarotterのReactがclickイベントをキャプチャフェーズより前に処理するため、`onDocumentClick` で投稿ボタンを検知できていなかった。
MutationObserverで `textarea.karotter-composer-textarea` の出現・消滅を監視し、テキストが入力された状態でダイアログが閉じた時にカウントする方式（`watchComposerSubmit`）に変更。

### 変更10: フォント切り替え機能を追加
設定画面に「フォント」セクションを追加。標準フォントとメイリオを切り替えられる。

### 変更11: 投稿テンプレート機能を追加
- 設定画面でテンプレート名・本文を登録・削除できる
- 投稿欄・返信欄に「📋 テンプレ」ボタンが表示される
- クリックするとドロップダウンが出て、選択すると投稿欄の内容が置き換わる
- ReactのnativeInputValueSetterを使ってKarotterの状態も正しく更新
