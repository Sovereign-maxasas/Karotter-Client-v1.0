(() => {
  'use strict';
  const api = globalThis.browser ?? globalThis.chrome;
  const defaults = { showShortcuts: true, postHighlight: true, actionNotifications: true, markdownToolbar: true, latexToolbar: true, latexPreview: true, markdownPreview: false, showLevel: true, panelOpacity: 0.9, font: 'default', showClock: true, clockShowSeconds: false, ageRestrictionEnabled: true, shortcuts: { like: 'E', rekarot: 'R', quote: 'W', reply: 'S', refresh: 'D', compose: 'N', nextPost: 'J', previousPost: 'K' } };
  const DEFAULT_AGE_KEYWORDS = [
    // R13: 性的な単語・下ネタ
    'ちんこ', 'まんこ', 'ちんぽ', 'おっぱい', 'おちんちん', 'セックス', 'エッチ', 'エロ', 'ムラムラ',
    // R13: 暴言・罵倒
    'しね', '死ね', 'ころせ', '殺せ', 'うせろ', 'きえろ', 'ゴミ', 'クズ', 'バカ死ね', 'アホ死ね',
    // R13: 自傷・自殺・OD
    'ODした', 'OD した', 'オーバードーズ', 'リスカした', 'リスカ', '自傷した', '自殺したい', '死にたい',
    // R15: 希死念慮
    '消えたい', '消えてしまいたい', '死んでしまいたい', '希死念慮',
    // R16以上: 性的行為の直接的な表現
    'ヤりたい', 'やりたい', 'ヤった', 'やった', 'フェラ', 'クンニ', '中出し', '射精',
    // R18
    'R18', 'R-18', '18禁', '成人向け', 'NSFW', 'nsfw', 'アダルト', '官能',
  ];
  const AGE_KEYWORDS_STORAGE_KEY = 'karotter-client-age-keywords';
  const POST_COUNT_STORAGE_KEY = 'karotter-client-post-count';
  const POST_HOURLY_STORAGE_KEY = 'karotter-client-post-hourly';
  const POST_HOURLY_TODAY_STORAGE_KEY = 'karotter-client-post-hourly-today';
  const TEMPLATES_STORAGE_KEY = 'karotter-client-templates';
  const labels = { like: 'いいね', rekarot: 'リカロート', quote: '引用RK', reply: 'リプライ', refresh: 'TL更新', compose: 'カロート', nextPost: '次の投稿', previousPost: '前の投稿' };
  const STATS_STORAGE_KEY = 'karotter-client-action-stats';
  const form = document.querySelector('#settings-form');
  const shortcutForm = document.querySelector('#shortcut-form');
  const postForm = document.querySelector('#post-form');
  const allForms = [form, shortcutForm, postForm].filter(Boolean);
  const shortcutList = document.querySelector('#shortcut-list');
  const status = document.querySelector('#save-status');
  const opacityOutput = document.querySelector('#opacity-output');
  const statLike = document.querySelector('#stat-like');
  const statRekarot = document.querySelector('#stat-rekarot');
  const statQuote = document.querySelector('#stat-quote');
  const statPostCount = document.querySelector('#stat-post-count');
  const statsResetBtn = document.querySelector('#stats-reset');
  const keywordList = document.querySelector('#keyword-list');
  const keywordInput = document.querySelector('#keyword-input');
  const keywordAddBtn = document.querySelector('#keyword-add-btn');
  let settings = structuredClone(defaults);
  let ageKeywords = [];
  let resetStatusTimer = null;

  /** Escape HTML special characters to prevent XSS in innerHTML contexts. */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Keyword editor ──────────────────────────────────────────────────── */

  function renderKeywords() {
    keywordList.textContent = '';
    ageKeywords.forEach((kw, index) => {
      const tag = document.createElement('span');
      tag.className = 'keyword-tag';
      const text = document.createElement('span');
      text.textContent = kw;
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'keyword-remove';
      removeBtn.setAttribute('aria-label', `${kw} を削除`);
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', async () => {
        ageKeywords.splice(index, 1);
        renderKeywords();
        await saveKeywords();
      });
      tag.append(text, removeBtn);
      keywordList.append(tag);
    });
  }

  async function saveKeywords() {
    await api.storage.local.set({ [AGE_KEYWORDS_STORAGE_KEY]: ageKeywords });
    status.textContent = '保存しました';
    window.clearTimeout(save.timer);
    save.timer = window.setTimeout(() => { status.textContent = ''; }, 1200);
  }

  async function addKeyword() {
    const kw = keywordInput.value.trim();
    if (!kw) return;
    if (ageKeywords.includes(kw)) {
      keywordInput.value = '';
      return;
    }
    ageKeywords.push(kw);
    keywordInput.value = '';
    renderKeywords();
    await saveKeywords();
  }

  keywordAddBtn.addEventListener('click', addKeyword);
  keywordInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); addKeyword(); }
  });

  // デフォルトキーワードパネル
  const defaultKeywordsToggle = document.querySelector('#default-keywords-toggle');
  const defaultKeywordsPanel = document.querySelector('#default-keywords-panel');
  const defaultKeywordsList = document.querySelector('#default-keywords-list');

  // デフォルトキーワードを一覧表示
  function renderDefaultKeywords() {
    defaultKeywordsList.textContent = '';
    for (const kw of DEFAULT_AGE_KEYWORDS) {
      const tag = document.createElement('span');
      tag.className = 'keyword-tag default-keyword-tag';
      const text = document.createElement('span');
      text.textContent = kw;
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'keyword-add-small';
      addBtn.setAttribute('aria-label', `${kw} を追加`);
      addBtn.textContent = '+';
      addBtn.addEventListener('click', async () => {
        if (ageKeywords.includes(kw)) return;
        ageKeywords.push(kw);
        renderKeywords();
        await saveKeywords();
      });
      tag.append(text, addBtn);
      defaultKeywordsList.append(tag);
    }
  }

  defaultKeywordsToggle.addEventListener('click', () => {
    const isHidden = defaultKeywordsPanel.hidden;
    defaultKeywordsPanel.hidden = !isHidden;
    defaultKeywordsToggle.textContent = isHidden ? '閉じる' : '初期設定を見る';
    if (isHidden) renderDefaultKeywords();
  });

  async function loadKeywords() {
    try {
      const stored = await api.storage.local.get({ [AGE_KEYWORDS_STORAGE_KEY]: null });
      const raw = stored[AGE_KEYWORDS_STORAGE_KEY];
      ageKeywords = Array.isArray(raw) ? raw : [];
    } catch (_) {
      ageKeywords = [];
    }
    renderKeywords();
  }

  /* ── Templates ───────────────────────────────────────────────────────── */

  const templateList = document.querySelector('#template-list');
  const templateNameInput = document.querySelector('#template-name-input');
  const templateBodyInput = document.querySelector('#template-body-input');
  const templateAddBtn = document.querySelector('#template-add-btn');
  let templates = [];

  function renderTemplates() {
    templateList.textContent = '';
    templates.forEach((tmpl, index) => {
      const item = document.createElement('div');
      item.className = 'template-item';
      const info = document.createElement('div');
      info.className = 'template-info';
      const name = document.createElement('span');
      name.className = 'template-name';
      name.textContent = tmpl.name;
      const body = document.createElement('span');
      body.className = 'template-body-preview';
      body.textContent = tmpl.body.length > 40 ? tmpl.body.slice(0, 40) + '…' : tmpl.body;
      info.append(name, body);
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'keyword-remove';
      removeBtn.setAttribute('aria-label', `${escapeHtml(tmpl.name)} を削除`);
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', async () => {
        templates.splice(index, 1);
        renderTemplates();
        await saveTemplatesSettings();
      });
      item.append(info, removeBtn);
      templateList.append(item);
    });
  }

  async function saveTemplatesSettings() {
    await api.storage.local.set({ [TEMPLATES_STORAGE_KEY]: templates });
    status.textContent = '保存しました';
    window.clearTimeout(save.timer);
    save.timer = window.setTimeout(() => { status.textContent = ''; }, 1200);
  }

  async function addTemplate() {
    const name = templateNameInput.value.trim();
    const body = templateBodyInput.value.trim();
    if (!name || !body) return;
    templates.push({ name, body });
    templateNameInput.value = '';
    templateBodyInput.value = '';
    renderTemplates();
    await saveTemplatesSettings();
  }

  templateAddBtn.addEventListener('click', addTemplate);

  async function loadTemplatesSettings() {
    try {
      const stored = await api.storage.local.get({ [TEMPLATES_STORAGE_KEY]: [] });
      templates = Array.isArray(stored[TEMPLATES_STORAGE_KEY]) ? stored[TEMPLATES_STORAGE_KEY] : [];
    } catch (_) { templates = []; }
    renderTemplates();
  }

  /* ── Stats ───────────────────────────────────────────────────────────── */

  /** Render stat counts; falls back to 0 if a key is missing. */
  function renderStats(stats) {
    statLike.textContent = (stats.like ?? 0).toLocaleString('ja-JP');
    statRekarot.textContent = (stats.rekarot ?? 0).toLocaleString('ja-JP');
    statQuote.textContent = (stats.quote ?? 0).toLocaleString('ja-JP');
  }

  async function loadStats() {
    try {
      const stored = await api.storage.local.get({ [STATS_STORAGE_KEY]: {} });
      renderStats(stored[STATS_STORAGE_KEY] ?? {});
    } catch (error) {
      console.warn('Could not load stats:', error);
      renderStats({});
    }
    // Load today's post count.
    try {
      const stored = await api.storage.local.get({ [POST_COUNT_STORAGE_KEY]: { date: '', count: 0 } });
      const data = stored[POST_COUNT_STORAGE_KEY];
      const today = new Date().toLocaleDateString('ja-JP');
      const count = data.date === today ? (data.count ?? 0) : 0;
      statPostCount.textContent = count.toLocaleString('ja-JP');
    } catch (_) {
      statPostCount.textContent = '0';
    }
  }

  statsResetBtn.addEventListener('click', async () => {
    if (!window.confirm('統計データをリセットしますか？')) return;
    try {
      await api.storage.local.set({ [STATS_STORAGE_KEY]: {} });
      renderStats({});
      status.textContent = '統計をリセットしました';
      window.clearTimeout(resetStatusTimer);
      resetStatusTimer = window.setTimeout(() => { status.textContent = ''; }, 1200);
    } catch (error) {
      status.textContent = `リセットに失敗しました: ${error.message}`;
    }
  });

  /* ── Hourly chart ────────────────────────────────────────────────────── */

  const hourlyChart = document.querySelector('#hourly-chart');
  const hourlyLabels = document.querySelector('#hourly-labels');
  const hourlyResetBtn = document.querySelector('#hourly-reset');
  const hourlyTodayChart = document.querySelector('#hourly-today-chart');
  const hourlyTodayLabels = document.querySelector('#hourly-today-labels');

  function buildHourlyChart(container, labelsContainer, hourly) {
    const data = Array.isArray(hourly) ? hourly : new Array(24).fill(0);
    const max = Math.max(...data, 1);
    container.textContent = '';
    labelsContainer.textContent = '';

    for (let h = 0; h < 24; h++) {
      const val = data[h] ?? 0;
      const ratio = val / max;

      const col = document.createElement('div');
      col.className = 'hourly-col';
      col.title = `${h}時: ${val}回`;

      const barWrap = document.createElement('div');
      barWrap.className = 'hourly-bar-wrap';

      const bar = document.createElement('div');
      bar.className = 'hourly-bar';
      bar.style.height = `${Math.round(ratio * 100)}%`;
      const hue = Math.round(220 - ratio * 160);
      bar.style.background = `hsl(${hue},80%,55%)`;
      if (val > 0) {
        const countLabel = document.createElement('span');
        countLabel.className = 'hourly-count';
        countLabel.textContent = String(val);
        bar.append(countLabel);
      }
      barWrap.append(bar);
      col.append(barWrap);
      container.append(col);

      const lbl = document.createElement('span');
      lbl.className = 'hourly-label';
      lbl.textContent = h % 3 === 0 ? `${h}` : '';
      labelsContainer.append(lbl);
    }
  }

  function renderHourlyChart(hourly) {
    buildHourlyChart(hourlyChart, hourlyLabels, hourly);
  }

  function renderHourlyTodayChart(hourly) {
    buildHourlyChart(hourlyTodayChart, hourlyTodayLabels, hourly);
  }

  async function loadHourlyStats() {
    try {
      const stored = await api.storage.local.get({ [POST_HOURLY_STORAGE_KEY]: new Array(24).fill(0) });
      renderHourlyChart(stored[POST_HOURLY_STORAGE_KEY]);
    } catch (_) {
      renderHourlyChart([]);
    }
    try {
      const today = new Date().toLocaleDateString('ja-JP');
      const stored = await api.storage.local.get({ [POST_HOURLY_TODAY_STORAGE_KEY]: { date: '', hourly: new Array(24).fill(0) } });
      const data = stored[POST_HOURLY_TODAY_STORAGE_KEY];
      renderHourlyTodayChart(data.date === today ? data.hourly : new Array(24).fill(0));
    } catch (_) {
      renderHourlyTodayChart([]);
    }
  }

  hourlyResetBtn.addEventListener('click', async () => {
    if (!window.confirm('時間帯データをリセットしますか？')) return;
    try {
      const empty = new Array(24).fill(0);
      await api.storage.local.set({ [POST_HOURLY_STORAGE_KEY]: empty });
      renderHourlyChart(empty);
      status.textContent = '時間帯データをリセットしました';
      window.clearTimeout(resetStatusTimer);
      resetStatusTimer = window.setTimeout(() => { status.textContent = ''; }, 1200);
    } catch (error) {
      status.textContent = `リセットに失敗しました: ${error.message}`;
    }
  });

  // Keep stats and keywords live when another tab makes changes.
  api.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes[STATS_STORAGE_KEY]) renderStats(changes[STATS_STORAGE_KEY].newValue ?? {});
    if (changes[POST_HOURLY_STORAGE_KEY]) renderHourlyChart(changes[POST_HOURLY_STORAGE_KEY].newValue ?? []);
    if (changes[POST_HOURLY_TODAY_STORAGE_KEY]) {
      const today = new Date().toLocaleDateString('ja-JP');
      const data = changes[POST_HOURLY_TODAY_STORAGE_KEY].newValue;
      renderHourlyTodayChart(data?.date === today ? data.hourly : new Array(24).fill(0));
    }
    if (changes[AGE_KEYWORDS_STORAGE_KEY]) {
      ageKeywords = Array.isArray(changes[AGE_KEYWORDS_STORAGE_KEY].newValue)
        ? changes[AGE_KEYWORDS_STORAGE_KEY].newValue : [...DEFAULT_AGE_KEYWORDS];
      renderKeywords();
    }
  });

  /* ── Settings form ───────────────────────────────────────────────────── */

  function renderShortcuts() {
    shortcutList.textContent = '';
    for (const [name, label] of Object.entries(labels)) {
      const lbl = document.createElement('label');
      lbl.textContent = label;
      const input = document.createElement('input');
      input.className = 'shortcut-key';
      input.name = `shortcut-${name}`;
      input.value = settings.shortcuts[name] ?? '';
      input.maxLength = 1;
      lbl.append(input);
      shortcutList.append(lbl);
    }
  }
  function render() {
    for (const [key, value] of Object.entries(settings)) {
      for (const f of allForms) {
        const input = f.elements.namedItem(key);
        if (input && key !== 'shortcuts') input.value = value;
        if (input?.type === 'checkbox') input.checked = value;
      }
    }
    renderShortcuts();
    renderFont();
    opacityOutput.value = `${Math.round(settings.panelOpacity * 100)}%`;
  }
  function renderFont() {
    for (const f of allForms) {
      for (const radio of f.querySelectorAll('input[name="font"]')) {
        radio.checked = radio.value === settings.font;
      }
    }
  }
  async function save() { await api.storage.local.set(settings); status.textContent = '保存しました'; window.clearTimeout(save.timer); save.timer = window.setTimeout(() => { status.textContent = ''; }, 1200); }
  async function init() { settings = { ...defaults, ...(await api.storage.local.get(defaults)) }; settings.shortcuts = { ...defaults.shortcuts, ...settings.shortcuts }; render(); await Promise.all([loadStats(), loadKeywords(), loadHourlyStats(), loadTemplatesSettings()]); }

  // アイコンパスを拡張機能のURLに差し替え
  const aboutIcon = document.querySelector('.about-icon');
  if (aboutIcon) aboutIcon.src = api.runtime.getURL('icons/icon96.png');

  // タブ切り替え
  for (const btn of document.querySelectorAll('.tab-btn')) {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('is-active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('is-active'));
      btn.classList.add('is-active');
      document.querySelector(`.tab-panel[data-panel="${btn.dataset.tab}"]`)?.classList.add('is-active');
    });
  }
  function onFormInput(event) { const target = event.target; if (target.name.startsWith('shortcut-')) { settings.shortcuts[target.name.slice(9)] = target.value.toUpperCase().slice(0, 1); target.value = settings.shortcuts[target.name.slice(9)]; } else if (target.name === 'font') { settings.font = target.value; } else if (target.type === 'checkbox') settings[target.name] = target.checked; else settings[target.name] = target.type === 'number' ? Number(target.value) : target.value; opacityOutput.value = `${Math.round(settings.panelOpacity * 100)}%`; save(); }
  function onFormKeydown(event) { if (!event.target.name.startsWith('shortcut-')) return; event.preventDefault(); event.target.value = event.key.length === 1 ? event.key.toUpperCase() : ''; event.target.dispatchEvent(new Event('input', { bubbles: true })); }
  for (const f of allForms) {
    f.addEventListener('input', onFormInput);
    f.addEventListener('keydown', onFormKeydown);
  }
  init().catch((error) => { status.textContent = `設定を読み込めませんでした: ${error.message}`; });
})();
