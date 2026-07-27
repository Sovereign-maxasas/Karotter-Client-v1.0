/*
 * Karotter Client content script.
 *
 * All Karotter markup knowledge lives in SELECTORS.  This keeps shortcut logic
 * independent of UI changes and makes a Chrome port (or a site adapter) simple.
 */
(() => {
  'use strict';

  const UI_HOST_ID = 'karotter-client-shortcut-help';
  const POST_HOVER_CLASS = 'karotter-client-post-hover';
  const POST_SELECTED_CLASS = 'karotter-client-post-selected';
  const POST_SELECTION_STYLE_ID = 'karotter-client-post-selection-style';
  const IMAGE_SAVE_BUTTON_CLASS = 'karotter-client-image-save-button';
  const IMAGE_SAVE_STYLE_ID = 'karotter-client-image-save-style';
  const IMAGE_MEDIA_BOUND_ATTRIBUTE = 'data-karotter-client-save-bound';
  const COMPOSER_TOOLBAR_STYLE_ID = 'karotter-client-composer-toolbar-style';
  const TEMPLATES_STORAGE_KEY = 'karotter-client-templates';
  const TEMPLATE_BTN_ATTR = 'data-kc-template-injected';

  /**
   * Karotter's current markup. These selectors deliberately use button classes,
   * child layout and accessible attributes?not labels rendered as text or SVG.
   * Keep all site-specific details here when Karotter changes its UI.
   */
  const SELECTORS = Object.freeze({
    post: [
      '.flex.gap-2\\.5'
    ],
    like: [
      'button.group:has(> div.rounded-full.group-hover\\:bg-red-50)'
    ],
    rekarot: [
      'button.group:has(> div.rounded-full.group-hover\\:bg-green-50)'
    ],
    rekarotMenuItem: [
      'button[type="button"].flex.w-full.items-center.gap-3.px-4.py-3.text-left.text-sm'
    ],
    reply: [
      'button.group.-ml-1.flex.min-w-0.items-center.gap-0\\.5.text-gray-500.transition-colors.hover\\:text-blue-600'
    ],
    refresh: [
      'button[aria-label="TL\u3092\u66f4\u65b0"][title="TL\u3092\u66f4\u65b0"]'
    ],
    compose: [
      'button.mobile-post-fab[aria-label="\u30ab\u30ed\u30fc\u30c8\u3092\u4f5c\u6210"]'
    ],
    // The \u6295\u7a3f\u753b\u9762 (post creation screen)'s own textarea. Karotter marks it with
    // this dedicated class, which is what lets the input toolbar tell it apart
    // from reply/quote boxes that may also use a plain <textarea>.
    composerTextarea: [
      'textarea.karotter-composer-textarea'
    ],
    // A control that only exists in the composer's own action bar (media/poll/
    // schedule/save row). Used purely as an anchor to locate that row so the
    // Markdown/LaTeX toggle can be embedded next to it.
    composerActionBarAnchor: [
      'button[title="\u753b\u50cf\u3092\u4fdd\u5b58"]',
      'button[aria-label="\u753b\u50cf\u3092\u4fdd\u5b58"]',
      'button[title="\u753b\u50cf"]',
      'button[title="Image"]',
      'button[title="GIF"]',
      'button[aria-label="GIF"]'
    ],
    // The left-hand sidebar (\u30db\u30fc\u30e0/\u691c\u7d22/\u901a\u77e5/\u2026/\u30b3\u30df\u30e5\u30cb\u30c6\u30a3\u3068\u30d7\u30ed\u30d5). Used as the
    // insertion point for the extension's own settings link.
    sidebarNav: [
      'nav.space-y-2.flex-1'
    ],
    karotCount: [
      'p.text-xs.text-gray-500.sm\\:text-sm'
    ],
    // Age restriction toggle button in the composer (shows "\u5e74\u9f62: \u306a\u3057" when closed).
    ageRestriction: [
      'button[type="button"].inline-flex.items-center.gap-1.rounded-full.border'
    ],
    // Age restriction number input, only present after the button is clicked.
    ageRestrictionInput: [
      'input[type="number"][min="6"][max="99"]'
    ],
    // Submit button in the composer ("\u30ab\u30ed\u30fc\u30c8" post button).
    composerSubmit: [
      'button[type="submit"]'
    ]
  });

  const ACTION_LABELS = Object.freeze({
    like: '\u3044\u3044\u306d',
    rekarot: '\u30ea\u30ab\u30ed\u30fc\u30c8',
    quote: '\u5f15\u7528RK',
    reply: '\u30ea\u30d7\u30e9\u30a4',
    refresh: 'TL\u66f4\u65b0',
    compose: '\u30ab\u30ed\u30fc\u30c8\u6295\u7a3f'
  });

  const NAVIGATION = Object.freeze({
    // Clicking Karotter's own menu lets its SPA router handle the transition.
    '1': { label: '\u30db\u30fc\u30e0', fallbackRoute: '/' },
    '2': { label: '\u691c\u7d22', fallbackRoute: '/search' },
    '3': { label: '\u901a\u77e5', fallbackRoute: '/notifications' },
    '4': { label: '\u30e1\u30c3\u30bb\u30fc\u30b8', fallbackRoute: '/messages' },
    '5': { label: '\u30d6\u30c3\u30af\u30de\u30fc\u30af', fallbackRoute: '/bookmarks' },
    '6': { label: '\u30b3\u30df\u30e5\u30cb\u30c6\u30a3', fallbackRoute: '/communities' },
    '7': { label: '\u30d7\u30ed\u30d5\u30a3\u30fc\u30eb', fallbackRoute: '/profile' }
  });

  const DEFAULT_SETTINGS = Object.freeze({
    showShortcuts: true, postHighlight: true, actionNotifications: true,
    markdownToolbar: true, latexToolbar: true, latexPreview: true, markdownPreview: false,
    showLevel: true, panelOpacity: 0.9,
    font: 'default',
    showClock: true,
    clockShowSeconds: false,
    ageRestrictionEnabled: true,
    shortcuts: { like: 'E', rekarot: 'R', quote: 'W', reply: 'S', refresh: 'D', compose: 'N', nextPost: 'J', previousPost: 'K' }
  });
  const DEFAULT_AGE_KEYWORDS = Object.freeze([
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
  ]);
  const extensionApi = globalThis.browser ?? globalThis.chrome;

  const STATS_STORAGE_KEY = 'karotter-client-action-stats';
  const POST_COUNT_STORAGE_KEY = 'karotter-client-post-count';
  const TRACKABLE_ACTIONS = Object.freeze(['like', 'rekarot', 'quote']);

  /**
   * Increment a single action counter in storage.
   * Uses a single get/set call to minimise the race window when multiple tabs
   * trigger an action at the same time.
   */
  async function incrementActionStat(action) {
    if (!TRACKABLE_ACTIONS.includes(action)) return;
    const api = extensionApi?.storage?.local;
    if (!api) return;
    try {
      const stored = await api.get({ [STATS_STORAGE_KEY]: {} });
      const stats = { ...(stored[STATS_STORAGE_KEY] ?? {}) };
      stats[action] = (stats[action] ?? 0) + 1;
      await api.set({ [STATS_STORAGE_KEY]: stats });
    } catch (error) {
      console.warn('[Karotter Client] Could not update action stats:', error);
    }
  }

  let hoveredPost = null;
  let selectedPost = null;
  let selectedPostIndex = 0;
  let selectionMutationQueued = false;
  let noticeElement = null;
  let karotCountElement = null;
  const imageSaveControls = new Map();
  let imageIntersectionObserver = null;
  let imageControlMutationQueued = false;
  let shortcutPanelHost = null;
  let shortcutPanelCard = null;
  let levelElement = null;
  let postCountElement = null;
  let composerToolbarInjectionCheckQueued = false;
  let settings = { ...DEFAULT_SETTINGS, shortcuts: { ...DEFAULT_SETTINGS.shortcuts } };
  const PANEL_POSITION_KEY = 'karotter-client-shortcut-panel-position';
  const PANEL_COLLAPSED_KEY = 'karotter-client-shortcut-panel-collapsed';
  const KAROT_COUNT_STORAGE_KEY = 'karotter-client-karot-count';

  /** Load extension-wide preferences while retaining safe defaults if storage is unavailable. */
  async function loadSettings() {
    if (!extensionApi?.storage?.local) return;
    try {
      const stored = await extensionApi.storage.local.get(DEFAULT_SETTINGS);
      settings = { ...DEFAULT_SETTINGS, ...stored, shortcuts: { ...DEFAULT_SETTINGS.shortcuts, ...stored.shortcuts } };
      await loadAgeKeywords();
      applySettings();
    } catch (error) {
      console.warn('[Karotter Client] Could not load settings:', error);
    }
  }

  // Keep the content script's copy of settings in sync when the options page saves.
  if (extensionApi?.storage?.onChanged) {
    extensionApi.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      let didChange = false;
      for (const [key, change] of Object.entries(changes)) {
        if (key === 'shortcuts') {
          settings.shortcuts = { ...settings.shortcuts, ...change.newValue };
          didChange = true;
        } else if (key === AGE_KEYWORDS_STORAGE_KEY) {
          ageKeywords = Array.isArray(change.newValue) ? change.newValue : [];
        } else if (key === POST_COUNT_STORAGE_KEY) {
          if (postCountElement) {
            const today = new Date().toLocaleDateString('ja-JP');
            const data = change.newValue;
            postCountElement.textContent = (data?.date === today ? (data.count ?? 0) : 0).toLocaleString('ja-JP');
          }
        } else if (key in DEFAULT_SETTINGS) {
          settings[key] = change.newValue;
          didChange = true;
        }
      }
      if (didChange) applySettings();
    });
  }

  const FONT_STYLE_ID = 'karotter-client-font-style';
  const FONT_FAMILIES = Object.freeze({
    default: '',
    meiryo: '"Meiryo", "メイリオ", sans-serif',
  });

  function applyFont(fontKey) {
    document.getElementById(FONT_STYLE_ID)?.remove();
    const family = FONT_FAMILIES[fontKey];
    if (!family) return;
    const style = document.createElement('style');
    style.id = FONT_STYLE_ID;
    style.textContent = `body, body * { font-family: ${family} !important; }`;
    (document.head || document.documentElement).append(style);
  }

  function applySettings() {
    applyFont(settings.font);
    applyClock();
    if (shortcutPanelHost) shortcutPanelHost.hidden = !settings.showShortcuts;
    if (shortcutPanelCard) {
      shortcutPanelCard.style.opacity = String(settings.panelOpacity);
      // Shadow DOM内のkbdを最新のショートカットキーで更新
      for (const kbd of shortcutPanelCard.querySelectorAll('kbd[data-shortcut]')) {
        const key = settings.shortcuts[kbd.dataset.shortcut];
        if (key) kbd.textContent = key;
      }
    }
    if (selectedPost) selectedPost.classList.toggle(POST_SELECTED_CLASS, settings.postHighlight);
    if (levelElement) updateLevelDisplay();
    syncComposerToolbarVisibility();
    queueComposerToolbarInjectionCheck();
  }

  /** True if an element matches any selector in the list (mirrors findFirst's error handling). */
  function matchesAnySelector(element, selectors) {
    for (const selector of selectors) {
      try {
        if (element.matches(selector)) return true;
      } catch (error) {
        console.warn('[Karotter Client] Invalid selector:', selector, error);
      }
    }
    return false;
  }

  /** Return the first valid selector match below a DOM root. */
  function findFirst(root, selectors) {
    for (const selector of selectors) {
      try {
        const element = root.querySelector(selector);
        if (element) return element;
      } catch (error) {
        // Non-standard selectors must not prevent the remaining fallbacks.
        console.warn('[Karotter Client] Invalid selector:', selector, error);
      }
    }
    return null;
  }

  /** Locate a currently rendered Karotter post in timeline order. */
  function getTimelinePosts() {
    return [...document.querySelectorAll(SELECTORS.post.join(','))]
      .filter((post) => post.isConnected && post.getClientRects().length > 0);
  }

  /** Apply the keyboard selection state and optionally bring it into view. */
  function selectPost(post, shouldScroll = true) {
    if (!post?.isConnected) return false;
    selectedPost?.classList.remove(POST_SELECTED_CLASS);
    selectedPost = post;
    selectedPost.classList.toggle(POST_SELECTED_CLASS, settings.postHighlight);
    const index = getTimelinePosts().indexOf(post);
    if (index >= 0) selectedPostIndex = index;
    if (shouldScroll) {
      selectedPost.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
    return true;
  }

  /** Select the adjacent timeline post. The first J always begins at the top. */
  function movePostSelection(direction) {
    const posts = getTimelinePosts();
    if (!posts.length) {
      showNotice('\u9078\u629e\u4e2d\u306e\u6295\u7a3f\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093\u3067\u3057\u305f\u3002');
      return false;
    }
    if (!selectedPost?.isConnected) {
      return selectPost(posts[0]);
    }
    const currentIndex = posts.indexOf(selectedPost);
    const nextIndex = Math.max(0, Math.min(posts.length - 1, currentIndex + direction));
    return selectPost(posts[nextIndex]);
  }

  /** Keep the selection when the timeline is re-rendered, refreshed, or pruned. */
  function reconcileSelectedPost() {
    selectionMutationQueued = false;
    // Do not create a selection merely because the timeline has loaded.
    if (!selectedPost) return;
    if (selectedPost?.isConnected) {
      selectedPost.classList.toggle(POST_SELECTED_CLASS, settings.postHighlight);
      return;
    }
    const posts = getTimelinePosts();
    if (!posts.length) return;
    selectPost(posts[Math.min(selectedPostIndex, posts.length - 1)], false);
  }

  /** Watch SPA timeline mutations without doing work for each individual node. */
  function observeTimelineChanges() {
    const observer = new MutationObserver(() => {
      if (selectionMutationQueued) return;
      selectionMutationQueued = true;
      window.requestAnimationFrame(() => {
        reconcileSelectedPost();
        updateKarotCount();
        updateLevelDisplay();
        ensureSettingsNavLinkInjected();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  /** Add selection visuals to page DOM; the shortcut card itself remains isolated. */
  function injectPostSelectionStyles() {
    if (document.getElementById(POST_SELECTION_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = POST_SELECTION_STYLE_ID;
    style.textContent = `
      .${POST_SELECTED_CLASS} {
        outline: 2px solid rgba(40, 119, 214, .88) !important;
        outline-offset: 2px;
        border-radius: 12px;
        background-color: rgba(40, 119, 214, .075) !important;
        transition: outline-color 200ms ease, background-color 200ms ease;
      }
    `;
    (document.head || document.documentElement).append(style);
  }

  /** Find the profile statistic in Karotter's current profile markup. */
  function readKarotCount() {
    const countElement = [...document.querySelectorAll(SELECTORS.karotCount.join(','))]
      .find((element) => /^\s*[\d,]+\s+\u30ab\u30ed\u30fc\u30c8\s*$/.test(element.textContent));
    return countElement?.textContent.match(/[\d,]+/)?.[0] || null;
  }

  /**
   * Read current XP and "next level remaining XP" directly from Karotter's DOM.
   *   Current XP  : <div class="font-black">141,180 XP</div>
   *   Remaining   : <div class="text-[11px] text-[var(--text-muted)]">\u6b21\u307e\u3067 1,920 XP</div>
   * Returns { xp, remaining } as numbers, or null when the element is absent.
   */
  function readLevelXpFromDOM() {
    let xp = null;
    let remaining = null;

    for (const el of document.querySelectorAll('div')) {
      const text = el.textContent.trim();
      if (xp === null) {
        const xpMatch = /^([\d,]+)\s*XP$/.exec(text);
        if (xpMatch && el.children.length === 0) {
          xp = Number(xpMatch[1].replace(/,/g, ''));
        }
      }
      if (remaining === null) {
        const remMatch = /^\u6b21\u307e\u3067\s*([\d,]+)\s*XP$/.exec(text);
        if (remMatch && el.children.length === 0) {
          remaining = Number(remMatch[1].replace(/,/g, ''));
        }
      }
      if (xp !== null && remaining !== null) break;
    }

    return (xp !== null || remaining !== null) ? { xp, remaining } : null;
  }

  /** Update the J/K-side statistic and retain the most recent valid value. */
  function updateKarotCount() {
    if (!karotCountElement) return;
    const currentCount = readKarotCount();
    try {
      const count = currentCount || window.localStorage.getItem(KAROT_COUNT_STORAGE_KEY);
      if (!count) return;
      karotCountElement.textContent = count;
      if (currentCount) window.localStorage.setItem(KAROT_COUNT_STORAGE_KEY, currentCount);
    } catch (error) {
      // If storage is blocked, the value remains available while this page is open.
      if (currentCount) karotCountElement.textContent = currentCount;
      console.warn('[Karotter Client] Could not persist Karot count:', error);
    }
  }

  /** Return a usable image URL from an img tag or a CSS background image. */
  function getMediaUrl(element) {
    if (element instanceof HTMLImageElement) return element.currentSrc || element.src || null;
    const backgroundImage = window.getComputedStyle(element).backgroundImage;
    const match = /^url\(["']?(.*?)["']?\)$/.exec(backgroundImage);
    return match?.[1] || null;
  }

  /** Restrict saving controls to sizeable media inside a Karotter post. */
  function isPostMedia(element) {
    if (!(element instanceof Element) || !element.closest(SELECTORS.post.join(','))) return false;
    const bounds = element.getBoundingClientRect();
    return bounds.width >= 64 && bounds.height >= 64 && Boolean(getMediaUrl(element));
  }

  /** Use an image wrapper where possible; img elements cannot host a button. */
  function getMediaContainer(mediaElement) {
    return mediaElement instanceof HTMLImageElement ? mediaElement.parentElement : mediaElement;
  }

  /** Remove a control when its image is hidden, removed, or no longer relevant. */
  function removeImageSaveControl(mediaElement) {
    const control = imageSaveControls.get(mediaElement);
    if (!control) return;
    window.clearTimeout(control.hideTimeoutId);
    control.button.remove();
    imageSaveControls.delete(mediaElement);
  }

  function hideImageSaveControlSoon(mediaElement) {
    const control = imageSaveControls.get(mediaElement);
    if (!control) return;
    window.clearTimeout(control.hideTimeoutId);
    control.hideTimeoutId = window.setTimeout(() => {
      if (!control.button.matches(':hover')) control.button.hidden = true;
    }, 80);
  }

  /** A timestamped, extension-aware filename for the native browser download. */
  function createImageFilename(blob) {
    const extensionByMimeType = {
      'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif'
    };
    const extension = extensionByMimeType[blob.type] || 'jpg';
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, '');
    return `Karotter_image_${timestamp}.${extension}`;
  }

  /** Download an image using only standard Fetch, Blob and anchor APIs. */
  async function downloadImage(mediaElement, button) {
    const url = getMediaUrl(mediaElement);
    if (!url) return;
    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = '保存中…';
    try {
      const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';
      const filename = createImageFilename({ type: `image/${ext}` });
      await extensionApi.runtime.sendMessage({ type: 'download', url, filename });
    } catch (error) {
      console.error('[Karotter Client] Image download failed:', error);
      showNotice('画像を保存できませんでした。');
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  }

  /** Attach one absolute-positioned save control to one image container. */
  function createImageSaveControl(mediaElement) {
    if (imageSaveControls.has(mediaElement) || !isPostMedia(mediaElement)) return;
    const container = getMediaContainer(mediaElement);
    if (!container) return;
    if (window.getComputedStyle(container).position === 'static') container.style.position = 'relative';

    const button = document.createElement('button');
    button.className = IMAGE_SAVE_BUTTON_CLASS;
    button.type = 'button';
    button.hidden = true;
    button.setAttribute('aria-label', '\u753b\u50cf\u3092\u4fdd\u5b58');
    button.textContent = '\ud83d\udcbe \u4fdd\u5b58';
    const control = { button, hideTimeoutId: null };
    imageSaveControls.set(mediaElement, control);
    button.addEventListener('mouseenter', () => window.clearTimeout(control.hideTimeoutId));
    button.addEventListener('mouseleave', () => hideImageSaveControlSoon(mediaElement));
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      downloadImage(mediaElement, button);
    });
    container.append(button);
  }

  /** Bind mouseenter/mouseleave to all current and SPA-inserted post media. */
  function bindPostMediaSaveControls() {
    const candidates = [
      ...document.querySelectorAll(`${SELECTORS.post.join(',')} img`),
      ...document.querySelectorAll(`${SELECTORS.post.join(',')} [style*="background-image"]`)
    ];
    for (const mediaElement of candidates) {
      if (!isPostMedia(mediaElement)) continue;
      if (!mediaElement.hasAttribute(IMAGE_MEDIA_BOUND_ATTRIBUTE)) {
        mediaElement.setAttribute(IMAGE_MEDIA_BOUND_ATTRIBUTE, '');
        mediaElement.addEventListener('mouseenter', () => {
          if (!imageSaveControls.has(mediaElement)) createImageSaveControl(mediaElement);
          const control = imageSaveControls.get(mediaElement);
          if (!control) return;
          window.clearTimeout(control.hideTimeoutId);
          control.button.hidden = false;
        });
        mediaElement.addEventListener('mouseleave', () => hideImageSaveControlSoon(mediaElement));
        imageIntersectionObserver?.observe(mediaElement);
      }
      createImageSaveControl(mediaElement);
    }
  }

  /** Set up per-image controls and clean them up when SPA content changes. */
  function initializeImageSaveFeature() {
    if (document.getElementById(IMAGE_SAVE_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = IMAGE_SAVE_STYLE_ID;
    style.textContent = `
      .${IMAGE_SAVE_BUTTON_CLASS} { position: absolute; top: 8px; left: 8px; z-index: 100; display: inline-flex; align-items: center; gap: 5px; border: 1px solid rgba(255,255,255,.62); border-radius: 8px; background: rgba(31,82,143,.92); box-shadow: 0 5px 16px rgba(16,45,80,.28), inset 0 1px 0 rgba(255,255,255,.20); color: #fff; padding: 6px 9px; font: 600 12px/1 system-ui, sans-serif; cursor: pointer; backdrop-filter: blur(10px); transition: transform 200ms ease, background 200ms ease; } .${IMAGE_SAVE_BUTTON_CLASS}:hover { transform: translateY(-1px); background: rgba(25,103,195,.96); } .${IMAGE_SAVE_BUTTON_CLASS}:disabled { cursor: wait; opacity: .72; }
    `;
    (document.head || document.documentElement).append(style);

    imageIntersectionObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) removeImageSaveControl(entry.target);
      }
    });
    new MutationObserver(() => {
      if (imageControlMutationQueued) return;
      imageControlMutationQueued = true;
      window.requestAnimationFrame(() => {
        imageControlMutationQueued = false;
        for (const mediaElement of imageSaveControls.keys()) {
          if (!mediaElement.isConnected) removeImageSaveControl(mediaElement);
        }
        bindPostMediaSaveControls();
      });
    }).observe(document.body, { childList: true, subtree: true });
    bindPostMediaSaveControls();
  }

  /** Hovered posts take priority; keyboard selection is the fallback target. */
  function getCurrentPost() {
    if (hoveredPost?.isConnected) return hoveredPost;
    return document.querySelector(`.${POST_HOVER_CLASS}`) || selectedPost;
  }

  /** Click a post-local button and report a user-facing failure without throwing. */
  function runPostAction(actionName) {
    const post = getCurrentPost();
    if (!post) {
      showNotice('\u6295\u7a3f\u3092\u30db\u30d0\u30fc\u3059\u308b\u304b\u3001J/K\u3067\u9078\u629e\u3057\u3066\u304b\u3089\u64cd\u4f5c\u3057\u3066\u304f\u3060\u3055\u3044\u3002');
      return false;
    }

    const target = findFirst(post, SELECTORS[actionName]);
    if (!target) {
      showNotice(`\u3053\u306e\u6295\u7a3f\u3067\u306f\u300c${ACTION_LABELS[actionName] ?? actionName}\u300d\u3092\u5229\u7528\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002`);
      return false;
    }

    try {
      target.click();
      return true;
    } catch (error) {
      console.error('[Karotter Client] Post action failed:', actionName, error);
      showNotice('\u64cd\u4f5c\u3092\u5b9f\u884c\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002');
      return false;
    }
  }

  /** Click a page-wide control such as refresh or compose. */
  function runPageAction(actionName) {
    const target = findFirst(document, SELECTORS[actionName]);
    if (!target) {
      showNotice(`\u300c${ACTION_LABELS[actionName] ?? actionName}\u300d\u3092\u5229\u7528\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002`);
      return false;
    }
    try {
      target.click();
      return true;
    } catch (error) {
      console.error('[Karotter Client] Page action failed:', actionName, error);
      showNotice('\u64cd\u4f5c\u3092\u5b9f\u884c\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002');
      return false;
    }
  }

  /**
   * Karotter renders the rekarot popover outside the post DOM. Its menu order
   * is RK first, followed by Quote RK; selecting by that structure avoids
   * relying on text content or SVG classes.
   */
  async function runRekarotMenuAction(menuIndex, actionLabel) {
    const post = getCurrentPost();
    if (!post) {
      showNotice('\u6295\u7a3f\u3092\u30db\u30d0\u30fc\u3059\u308b\u304b\u3001J/K\u3067\u9078\u629e\u3057\u3066\u304b\u3089\u64cd\u4f5c\u3057\u3066\u304f\u3060\u3055\u3044\u3002');
      return false;
    }

    const rekarotButton = findFirst(post, SELECTORS.rekarot);
    if (!rekarotButton) {
      showNotice('\u3053\u306e\u6295\u7a3f\u3067\u306f\u300c\u30ea\u30ab\u30ed\u30fc\u30c8\u300d\u3092\u5229\u7528\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002');
      return false;
    }

    try {
      rekarotButton.click();
      const menuItems = await waitForVisibleMenuItems(menuIndex + 1, 1000);
      const menuItem = menuItems[menuIndex];
      if (!menuItem) {
        showNotice(`\u300c${ACTION_LABELS.rekarot}\u300d\u306e\u30e1\u30cb\u30e5\u30fc\u304c\u958b\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002`);
        return false;
      }
      menuItem.click();
      return true;
    } catch (error) {
      console.error('[Karotter Client] Rekarot menu action failed:', error);
      showNotice(`\u300c${actionLabel}\u300d\u3092\u5b9f\u884c\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002`);
      return false;
    }
  }

  /** Wait for the visible RK/Quote RK popover without polling forever. */
  function waitForVisibleMenuItems(requiredCount, timeoutMs) {
    return new Promise((resolve) => {
      const startedAt = Date.now();
      const check = () => {
        const menuItems = [...document.querySelectorAll(SELECTORS.rekarotMenuItem.join(','))]
          .filter((element) => element.getClientRects().length > 0);
        if (menuItems.length >= requiredCount) {
          resolve(menuItems);
          return;
        }
        if (Date.now() - startedAt >= timeoutMs) {
          resolve([]);
          return;
        }
        window.requestAnimationFrame(check);
      };
      check();
    });
  }

  /** Navigate with an existing site link when possible, otherwise use its route. */
  function navigate(key) {
    const destination = NAVIGATION[key];
    if (!destination) return false;

    try {
      // Do not select the site's logo link for Home: it triggers a document
      // navigation. The visible menu label belongs to Karotter's SPA control.
      const menuControl = [...document.querySelectorAll('span')]
        .filter((span) => span.getClientRects().length > 0)
        .find((span) => span.textContent.trim() === destination.label)
        ?.closest('a, button');
      if (menuControl) menuControl.click();
      else window.location.assign(destination.fallbackRoute);
      return true;
    } catch (error) {
      console.error('[Karotter Client] Navigation failed:', key, error);
      showNotice('\u753b\u9762\u79fb\u52d5\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002');
      return false;
    }
  }

  /** Inputs must retain their normal keyboard behavior. */
  function isEditable(target) {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]'));
  }

  function onPointerMove(event) {
    const post = event.target instanceof Element
      ? event.target.closest(SELECTORS.post.join(','))
      : null;
    if (post === hoveredPost) return;
    hoveredPost?.classList.remove(POST_HOVER_CLASS);
    hoveredPost = post;
    hoveredPost?.classList.add(POST_HOVER_CLASS);
  }

  function onKeyDown(event) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || isEditable(event.target)) return;
    const key = event.key.toUpperCase();
    const shortcuts = {
      [settings.shortcuts.nextPost]: () => movePostSelection(1),
      [settings.shortcuts.previousPost]: () => movePostSelection(-1),
      [settings.shortcuts.like]: () => runPostAction('like'),
      [settings.shortcuts.rekarot]: () => runRekarotMenuAction(0, '\u30ea\u30ab\u30ed\u30fc\u30c8'),
      [settings.shortcuts.quote]: () => runRekarotMenuAction(1, '\u5f15\u7528RK'),
      [settings.shortcuts.reply]: () => runPostAction('reply'),
      [settings.shortcuts.refresh]: () => runPageAction('refresh'),
      [settings.shortcuts.compose]: () => runPageAction('compose'),
      '1': () => navigate('1'),
      '2': () => navigate('2'),
      '3': () => navigate('3'),
      '4': () => navigate('4'),
      '5': () => navigate('5'),
      '6': () => navigate('6'),
      '7': () => navigate('7')
    };
    const handler = shortcuts[key];
    if (!handler) return;

    event.preventDefault();
    handler();
  }

  function showNotice(message) {
    if (!settings.actionNotifications) return;
    if (!noticeElement) return;
    noticeElement.textContent = message;
    noticeElement.hidden = false;
    window.clearTimeout(showNotice.timeoutId);
    showNotice.timeoutId = window.setTimeout(() => { noticeElement.hidden = true; }, 2800);
  }

  const LEVEL_XP_STORAGE_KEY = 'karotter-client-level-xp';

  /**
   * Silently navigate to /profile, wait for XP and karot-count elements to
   * appear in the DOM, capture their values, then navigate back ? all within
   * the same SPA session so only a brief flash is visible to the user.
   *
   * sessionStorage is used to prevent re-entry across MutationObserver
   * callbacks and across the back-navigation that returns to the origin page.
   */
  const PROFILE_FETCH_SESSION_KEY = 'karotter-client-profile-fetch-done';

  function fetchProfileDataInBackground() {
    // Prevent re-entry: once per browser session (tab).
    try {
      if (window.sessionStorage.getItem(PROFILE_FETCH_SESSION_KEY)) return;
    } catch (_) { /* ignore */ }

    if (window.location.pathname.startsWith('/profile')) return;

    // Navigate to profile via SPA router only (no hard reload).
    const profileMenuControl = [...document.querySelectorAll('span')]
      .filter((span) => span.getClientRects().length > 0)
      .find((span) => span.textContent.trim() === '\u30d7\u30ed\u30d5\u30a3\u30fc\u30eb')
      ?.closest('a, button');
    if (!profileMenuControl) return; // SPA not ready yet ? skip silently.

    // Mark as done only after we are sure we can proceed.
    try { window.sessionStorage.setItem(PROFILE_FETCH_SESSION_KEY, '1'); } catch (_) { /* ignore */ }
    profileMenuControl.click();

    // Poll until XP and karot-count elements appear (max ~4 s).
    const startedAt = Date.now();
    const TIMEOUT_MS = 4000;
    const POLL_INTERVAL_MS = 150;

    const poll = () => {
      const domData = readLevelXpFromDOM();
      const karotCount = readKarotCount();
      const elapsed = Date.now() - startedAt;

      if (domData || karotCount || elapsed >= TIMEOUT_MS) {
        if (domData) {
          try {
            window.localStorage.setItem(LEVEL_XP_STORAGE_KEY,
              JSON.stringify({ xp: domData.xp, remaining: domData.remaining }));
          } catch (_) { /* storage may be disabled */ }
          updateLevelDisplay();
        }
        if (karotCount) {
          try { window.localStorage.setItem(KAROT_COUNT_STORAGE_KEY, karotCount); } catch (_) { /* ignore */ }
          updateKarotCount();
        }

        // Return via browser history ? avoids any hard reload.
        window.history.back();
        return;
      }
      window.setTimeout(poll, POLL_INTERVAL_MS);
    };
    window.setTimeout(poll, POLL_INTERVAL_MS);
  }

  /** Update the level panel: prefer live DOM values; fall back to last persisted values. */
  function updateLevelDisplay() {
    if (!levelElement) return;
    levelElement.hidden = !settings.showLevel;
    if (!settings.showLevel) return;

    // Try to read from Karotter's DOM first.
    const domData = readLevelXpFromDOM();

    let xp = null;
    let remaining = null;

    if (domData) {
      xp = domData.xp;
      remaining = domData.remaining;
      // Persist so we can show values when the profile section is not visible.
      try {
        window.localStorage.setItem(LEVEL_XP_STORAGE_KEY, JSON.stringify({ xp, remaining }));
      } catch (_) { /* storage may be disabled */ }
    } else {
      // Fall back to last stored values.
      try {
        const stored = JSON.parse(window.localStorage.getItem(LEVEL_XP_STORAGE_KEY));
        if (stored) { xp = stored.xp; remaining = stored.remaining; }
      } catch (_) { /* ignore */ }
    }

    // If still nothing from DOM or storage, show placeholder.
    if (xp === null) xp = 0;

    const xpLabel = xp !== null ? xp.toLocaleString('ja-JP') : '--';
    const remainingLabel = remaining !== null ? remaining.toLocaleString('ja-JP') : '--';
    const totalXp = (xp ?? 0) + (remaining ?? 0);
    const progress = totalXp > 0 ? Math.min(100, Math.round(((xp ?? 0) / totalXp) * 100)) : 0;

    // Build level card with DOM APIs instead of innerHTML.
    levelElement.textContent = '';
    const title = document.createElement('span');
    title.className = 'level-title';
    title.textContent = 'Karotter XP';
    const strong = document.createElement('strong');
    strong.textContent = `${xpLabel} XP`;
    const bar = document.createElement('span');
    bar.className = 'xp-bar';
    const barInner = document.createElement('i');
    barInner.style.width = `${progress}%`;
    bar.append(barInner);
    const small = document.createElement('small');
    small.textContent = `\u6b21\u307e\u3067 ${remainingLabel} XP`;
    levelElement.append(title, strong, bar, small);
  }

  /** Restore a user-dragged panel position, or retain the CSS default. */
  function restorePanelPosition(card) {
    try {
      const saved = JSON.parse(window.localStorage.getItem(PANEL_POSITION_KEY));
      if (!Number.isFinite(saved?.left) || !Number.isFinite(saved?.top)) return;
      // \u753b\u9762\u5916\u306b\u51fa\u3066\u3044\u305f\u3089\u30ea\u30bb\u30c3\u30c8
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (saved.left < 0 || saved.left > vw - 50 || saved.top < 0 || saved.top > vh - 50) {
        window.localStorage.removeItem(PANEL_POSITION_KEY);
        return;
      }
      card.style.left = `${saved.left}px`;
      card.style.top = `${saved.top}px`;
      card.style.right = 'auto';
      card.style.bottom = 'auto';
    } catch (error) {
      // Storage can be disabled by browser privacy settings; the UI still works.
      console.warn('[Karotter Client] Could not restore panel position:', error);
    }
  }

  /** Persist the panel position without making shortcut handling depend on storage. */
  function savePanelPosition(left, top) {
    try {
      window.localStorage.setItem(PANEL_POSITION_KEY, JSON.stringify({ left, top }));
    } catch (error) {
      console.warn('[Karotter Client] Could not save panel position:', error);
    }
  }

  /** Make the title area a pointer-friendly drag handle for the floating card. */
  function enablePanelDragging(card, handle) {
    let dragOffset = null;

    handle.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      // The visibility button remains clickable and must not begin a drag.
      if (event.target.closest('button, a')) return;
      const bounds = card.getBoundingClientRect();
      dragOffset = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      card.classList.add('is-dragging');
      handle.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    handle.addEventListener('pointermove', (event) => {
      if (!dragOffset) return;
      const maxLeft = Math.max(8, window.innerWidth - card.offsetWidth - 8);
      const maxTop = Math.max(8, window.innerHeight - card.offsetHeight - 8);
      const left = Math.min(maxLeft, Math.max(8, event.clientX - dragOffset.x));
      const top = Math.min(maxTop, Math.max(8, event.clientY - dragOffset.y));
      card.style.left = `${left}px`;
      card.style.top = `${top}px`;
      card.style.right = 'auto';
      card.style.bottom = 'auto';
    });

    const finishDragging = (event) => {
      if (!dragOffset) return;
      const bounds = card.getBoundingClientRect();
      savePanelPosition(Math.round(bounds.left), Math.round(bounds.top));
      dragOffset = null;
      card.classList.remove('is-dragging');
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    };
    handle.addEventListener('pointerup', finishDragging);
    handle.addEventListener('pointercancel', finishDragging);
  }

  /** Apply and persist the compact, list-hidden state. */
  function setPanelCollapsed(card, toggleButton, collapsed, persist = true) {
    card.classList.toggle('is-collapsed', collapsed);
    toggleButton.textContent = collapsed ? '\u8868\u793a' : '\u975e\u8868\u793a';
    toggleButton.setAttribute('aria-expanded', String(!collapsed));
    if (!persist) return;
    try {
      window.localStorage.setItem(PANEL_COLLAPSED_KEY, String(collapsed));
    } catch (error) {
      console.warn('[Karotter Client] Could not save panel visibility:', error);
    }
  }

  /** Restore the last visibility preference. */
  function restorePanelVisibility(card, toggleButton) {
    try {
      setPanelCollapsed(card, toggleButton, window.localStorage.getItem(PANEL_COLLAPSED_KEY) === 'true', false);
    } catch (error) {
      console.warn('[Karotter Client] Could not restore panel visibility:', error);
    }
  }

  /** Render inside a shadow root so Karotter CSS cannot alter the help card. */
  function mountShortcutHelp() {
    if (document.getElementById(UI_HOST_ID)) return;
    const host = document.createElement('aside');
    host.id = UI_HOST_ID;
    host.setAttribute('aria-label', 'Karotter Client shortcuts');
    const shadow = host.attachShadow({ mode: 'open' });

    // Use DOMParser to avoid innerHTML ? all content is static and extension-owned.
    const SHADOW_HTML = `<style>
        :host { all: initial; }
        /* Neutralise any theme animation / colour that may bleed through the host */ 
        :host, .card, .card * { animation: none !important; text-shadow: none !important; }
        .card { position: fixed !important; right: 20px; bottom: 20px; left: auto; top: auto; z-index: 2147483647; box-sizing: border-box; width: 250px; padding: 12px; border: none; border-radius: 16px; background: linear-gradient(145deg, rgba(255,255,255,.80), rgba(244,248,255,.62)) !important; color: #1d2939 !important; box-shadow: 0 16px 40px rgba(29,41,57,.18), inset 0 1px 0 rgba(255,255,255,.72); backdrop-filter: blur(18px) saturate(145%); -webkit-backdrop-filter: blur(18px) saturate(145%); font: 14px/1.45 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important; transition: transform 200ms ease, box-shadow 200ms ease, width 200ms ease, padding 200ms ease; }
        .card:hover { transform: translateY(-2px); box-shadow: 0 20px 48px rgba(29,41,57,.22), inset 0 1px 0 rgba(255,255,255,.78); }
        .card.is-dragging { cursor: grabbing; transition: none; user-select: none; }
        .title-bar { display: flex; align-items: center; gap: 8px; margin: -3px -3px 8px; padding: 3px; cursor: grab; touch-action: none; }
        .title-icon { display: grid; width: 25px; height: 25px; place-items: center; border: 1px solid rgba(82,126,189,.20); border-radius: 8px; background: rgba(255,255,255,.55); color: #3478d4 !important; font-size: 14px; box-shadow: inset 0 1px 0 rgba(255,255,255,.85); }
        h2 { flex: 1; margin: 0; color: rgba(64,81,107,.64) !important; font-size: 11px; font-weight: 650; letter-spacing: .035em; }
        .visibility-toggle { border: 1px solid rgba(104,128,162,.25); border-radius: 7px; background: rgba(255,255,255,.48); color: #5b6b82 !important; padding: 3px 7px; font: 600 10px/1.4 inherit; cursor: pointer; transition: background 200ms ease, color 200ms ease; } .visibility-toggle:hover { background: rgba(255,255,255,.82); color: #2877d6 !important; }
        .level-card { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 5px 8px; margin: 0 0 8px; padding: 7px 8px; border: 1px solid rgba(104,128,162,.18); border-radius: 8px; background: rgba(255,255,255,.36); } .level-title { grid-column: 1 / -1; color: #78869a !important; font-size: 9px; } .level-card strong { color: #2877d6 !important; font-size: 13px; } .xp-bar { height: 6px; overflow: hidden; border-radius: 999px; background: rgba(88,117,156,.17); } .xp-bar i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg,#2877d6,#66a5ef); } .level-card small { color: #667892 !important; font-size: 9px; white-space: nowrap; }
        .shortcut-group { margin: 0; padding: 0; list-style: none; }
        .shortcut-group + .shortcut-group { margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(104,128,162,.20); }
        .shortcut-row { display: grid; grid-template-columns: 30px minmax(0, 1fr); align-items: center; column-gap: 6px; min-height: 24px; }
        .selection-group { display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 10px; }
        .selection-group .shortcut-row { grid-column: 1; }
        .user-stat { grid-row: 1 / span 2; grid-column: 2; display: flex; min-width: 54px; flex-direction: column; justify-content: center; border-left: 1px solid rgba(104,128,162,.20); padding-left: 10px; color: #78869a !important; font-size: 9px; line-height: 1.15; white-space: nowrap; }
        .user-stat strong { color: #3d5d85 !important; font-size: 13px; font-weight: 750; letter-spacing: .01em; }
        .post-count-row { display: flex; align-items: center; justify-content: space-between; margin: 4px 0 0; padding: 4px 8px; border: 1px solid rgba(104,128,162,.15); border-radius: 7px; background: rgba(255,255,255,.28); font-size: 9px; color: #78869a !important; }
        .post-count-row strong { color: #2877d6 !important; font-size: 13px; font-weight: 750; }
        .navigation-group { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 6px; }
        kbd { display: inline-flex; box-sizing: border-box; width: 30px; height: 20px; align-items: center; justify-content: center; border: 1px solid rgba(113,132,159,.48); border-bottom-color: rgba(87,104,128,.72); border-radius: 6px; background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(222,229,239,.90)); color: #34445d !important; box-shadow: inset 0 1px 0 #fff, inset 0 -1px 0 rgba(132,149,173,.22), 0 1px 1px rgba(52,68,93,.16); font: 700 10px/1 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; text-align: center; }
        .description { color: #40516b !important; font-size: 10px; font-weight: 520; text-align: left; white-space: nowrap; }
        footer { margin-top: 9px; padding-top: 8px; border-top: 1px solid rgba(104,128,162,.18); color: #78869a !important; font-size: 10px; letter-spacing: .01em; }
        a { color: #2877d6 !important; font-weight: 700; text-decoration: none; } a:hover { color: #1767c3 !important; text-decoration: underline; }
        [data-notice] { margin: 10px 0 0; padding: 7px 8px; border: 1px solid rgba(211,47,47,.18); border-radius: 8px; background: rgba(255,239,239,.72); color: #b42318 !important; font-size: 10px; }
        .card.is-collapsed { width: 166px; padding: 10px 12px; } .card.is-collapsed .title-bar { margin: 0; } .card.is-collapsed .shortcut-group, .card.is-collapsed [data-notice], .card.is-collapsed footer { display: none; }
      </style>
      <section class="card">
        <header class="title-bar" title="\u30c9\u30e9\u30c3\u30b0\u3057\u3066\u79fb\u52d5"><span class="title-icon" aria-hidden="true">\u2328</span><h2>Karotter Client v1.0</h2><button class="visibility-toggle" type="button" aria-expanded="true">\u975e\u8868\u793a</button></header>
        <div class="level-card" data-level-card></div>
        <ul class="shortcut-group selection-group">
          <li class="shortcut-row"><kbd data-shortcut="nextPost">J</kbd><span class="description">\u6b21\u306e\u6295\u7a3f</span></li>
          <li class="shortcut-row"><kbd data-shortcut="previousPost">K</kbd><span class="description">\u524d\u306e\u6295\u7a3f</span></li>
          <li class="user-stat" aria-label="\u30ab\u30ed\u30fc\u30c8\u6570"><strong data-karot-count>--</strong><span>\u30ab\u30ed\u30fc\u30c8</span></li>
        </ul>
        <ul class="shortcut-group">
          <li class="shortcut-row"><kbd data-shortcut="like">E</kbd><span class="description">\u3044\u3044\u306d</span></li>
          <li class="shortcut-row"><kbd data-shortcut="rekarot">R</kbd><span class="description">\u30ea\u30ab\u30ed\u30fc\u30c8</span></li>
          <li class="shortcut-row"><kbd data-shortcut="quote">W</kbd><span class="description">\u5f15\u7528RK</span></li>
          <li class="shortcut-row"><kbd data-shortcut="reply">S</kbd><span class="description">\u30ea\u30d7\u30e9\u30a4</span></li>
          <li class="shortcut-row"><kbd data-shortcut="refresh">D</kbd><span class="description">\u66f4\u65b0</span></li>
          <li class="shortcut-row"><kbd data-shortcut="compose">N</kbd><span class="description">\u6295\u7a3f</span></li>
        </ul>
        <ul class="shortcut-group navigation-group">
          <li class="shortcut-row"><kbd>1</kbd><span class="description">\u30db\u30fc\u30e0</span></li>
          <li class="shortcut-row"><kbd>2</kbd><span class="description">\u691c\u7d22</span></li>
          <li class="shortcut-row"><kbd>3</kbd><span class="description">\u901a\u77e5</span></li>
          <li class="shortcut-row"><kbd>4</kbd><span class="description">\u30e1\u30c3\u30bb\u30fc\u30b8</span></li>
          <li class="shortcut-row"><kbd>5</kbd><span class="description">\u30d6\u30c3\u30af\u30de\u30fc\u30af</span></li>
          <li class="shortcut-row"><kbd>6</kbd><span class="description">\u30b3\u30df\u30e5\u30cb\u30c6\u30a3</span></li>
          <li class="shortcut-row"><kbd>7</kbd><span class="description">\u30d7\u30ed\u30d5\u30a3\u30fc\u30eb</span></li>
        </ul>
        <p data-notice hidden role="status"></p>
        <div class="post-count-row"><span>\u4eca\u65e5\u306e\u6295\u7a3f</span><span><strong data-post-count>--</strong> \u56de</span></div>
        <footer>Created by <a href="https://karotter.com/profile/Sc" target="_blank" rel="noopener noreferrer">@Sc</a></footer>
      </section>`;
    const parsed = new DOMParser().parseFromString(SHADOW_HTML, 'text/html');
    for (const node of parsed.head.childNodes) shadow.append(document.importNode(node, true));
    for (const node of parsed.body.childNodes) shadow.append(document.importNode(node, true));
    noticeElement = shadow.querySelector('[data-notice]');
    karotCountElement = shadow.querySelector('[data-karot-count]');
    levelElement = shadow.querySelector('[data-level-card]');
    postCountElement = shadow.querySelector('[data-post-count]');
    document.documentElement.append(host);
    const card = shadow.querySelector('.card');
    shortcutPanelHost = host;
    shortcutPanelCard = card;
    const toggleButton = shadow.querySelector('.visibility-toggle');
    restorePanelPosition(card);
    enablePanelDragging(card, shadow.querySelector('.title-bar'));
    restorePanelVisibility(card, toggleButton);
    toggleButton.addEventListener('click', () => {
      setPanelCollapsed(card, toggleButton, !card.classList.contains('is-collapsed'));
    });
    updateKarotCount();
    updateLevelDisplay();
    loadPostCount();
  }


  /* -----------------------------------------------------------------------
   * Sidebar settings link
   * -------------------------------------------------------------------------
   * Adds a "\u62e1\u5f35\u8a2d\u5b9a" entry to Karotter's own left-hand nav, styled to match
   * its other items, that opens this extension's settings page in a new tab.
   * --------------------------------------------------------------------- */

  const SETTINGS_NAV_LINK_ATTRIBUTE = 'data-karotter-client-settings-link';

  /* -----------------------------------------------------------------------
   * 時計表示
   * ----------------------------------------------------------------------- */
  const CLOCK_ID = 'karotter-client-clock';
  const CLOCK_STYLE_ID = 'karotter-client-clock-style';
  const DAYS_JA = ['日', '月', '火', '水', '木', '金', '土'];
  let clockTimer = null;

  function ensureClockStyles() {
    if (document.getElementById(CLOCK_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = CLOCK_STYLE_ID;
    style.textContent = `
      #${CLOCK_ID} {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 12px;
        border-radius: 999px;
        background: var(--surface-soft, rgba(107,114,128,0.08));
        border: 1px solid var(--border-soft, rgba(107,114,128,0.18));
        color: var(--text-secondary, #374151);
        font-size: 13px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.01em;
        white-space: nowrap;
        cursor: default;
        user-select: none;
      }
      #${CLOCK_ID} .kc-clock-date { opacity: 0.75; font-size: 12px; }
      #${CLOCK_ID} .kc-clock-time { font-size: 14px; }
    `;
    document.head.append(style);
  }

  function updateClock() {
    const el = document.getElementById(CLOCK_ID);
    if (!el) return;
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const dow = DAYS_JA[now.getDay()];
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const timeStr = settings.clockShowSeconds
      ? `${hh}:${mm}:${ss}`
      : `${hh}:${mm}`;
    el.querySelector('.kc-clock-date').textContent = `${month}/${day}(${dow})`;
    el.querySelector('.kc-clock-time').textContent = timeStr;
  }

  function injectClock() {
    if (document.getElementById(CLOCK_ID)) return;
    const refreshBtn = document.querySelector('button[aria-label="TLを更新"]');
    if (!refreshBtn) return;
    // グリッドの右列ラッパー（refreshBtnの親）に時計を横並びで追加
    const rightCol = refreshBtn.parentElement;
    if (!rightCol) return;

    ensureClockStyles();
    const clock = document.createElement('div');
    clock.id = CLOCK_ID;
    const dateSpan = document.createElement('span');
    dateSpan.className = 'kc-clock-date';
    const timeSpan = document.createElement('span');
    timeSpan.className = 'kc-clock-time';
    clock.append(dateSpan, timeSpan);

    // 右列をflexにして時計とボタンを横並びにする
    rightCol.style.cssText = 'display:flex;align-items:center;justify-content:flex-end;gap:8px;';
    rightCol.insertBefore(clock, refreshBtn);
    updateClock();
  }

  function startClock() {
    if (clockTimer) return;
    clockTimer = window.setInterval(() => {
      if (!document.getElementById(CLOCK_ID)) {
        injectClock();
      }
      updateClock();
    }, 1000);
    injectClock();
  }

  function stopClock() {
    if (clockTimer) { window.clearInterval(clockTimer); clockTimer = null; }
    document.getElementById(CLOCK_ID)?.remove();
  }

  function applyClock() {
    if (settings.showClock) startClock();
    else stopClock();
  }

  function findSidebarNav() {
    return findFirst(document, SELECTORS.sidebarNav);
  }

  function buildSettingsNavLink() {
    const link = document.createElement('a');
    link.href = extensionApi.runtime.getURL('settings.html');
    link.target = '_blank';
    link.rel = 'noopener';
    link.setAttribute(SETTINGS_NAV_LINK_ATTRIBUTE, 'true');
    link.className = 'flex items-center space-x-3 px-4 py-2 rounded-full transition-colors relative text-gray-700 hover:bg-gray-100';

    // Build icon + label with DOM APIs to avoid innerHTML.
    const iconWrap = document.createElement('div');
    iconWrap.className = 'relative';
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('xmlns', svgNS);
    svg.setAttribute('width', '24');
    svg.setAttribute('height', '24');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('class', 'lucide lucide-settings w-5 h-5');
    const pathEl = document.createElementNS(svgNS, 'path');
    pathEl.setAttribute('d', 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z');
    const circleEl = document.createElementNS(svgNS, 'circle');
    circleEl.setAttribute('cx', '12');
    circleEl.setAttribute('cy', '12');
    circleEl.setAttribute('r', '3');
    svg.append(pathEl, circleEl);
    iconWrap.append(svg);
    const labelSpan = document.createElement('span');
    labelSpan.className = 'font-medium text-sm md:text-base';
    labelSpan.textContent = '\u62e1\u5f35\u8a2d\u5b9a';
    link.append(iconWrap, labelSpan);
    return link;
  }

  /** Add the settings link once; safe to call repeatedly (e.g. after SPA re-renders). */
  function ensureSettingsNavLinkInjected() {
    if (!extensionApi?.runtime?.getURL) return;
    const nav = findSidebarNav();
    if (!nav || nav.querySelector(`[${SETTINGS_NAV_LINK_ATTRIBUTE}]`)) return;
    nav.append(buildSettingsNavLink());
  }

  /* -----------------------------------------------------------------------
   * Markdown / LaTeX composer toolbar
   * -------------------------------------------------------------------------
   * Embedded directly into Karotter's own \u6295\u7a3f\u753b\u9762 action bar (the row with
   * \u30ea\u30ab\u30ed/\u8fd4\u4fe1/\u5e74\u9f62/\u6295\u7a3f\u5148 and the media/poll/schedule/save icons), reusing
   * that row's CSS variables so it matches the site's look. A toggle button
   * added to that row shows/hides the panel on demand ? it is not tied to
   * textarea focus, so it stays open or closed exactly as the user left it
   * for as long as the \u6295\u7a3f\u753b\u9762 itself stays open. Values are written through
   * React's own setter so Karotter's controlled input notices the change,
   * the same way typed input would.
   * --------------------------------------------------------------------- */

  const MARKDOWN_BUTTONS = Object.freeze([
    { label: 'B', title: '\u592a\u5b57', before: '**', after: '**', placeholder: '\u592a\u5b57' },
    { label: 'I', title: '\u659c\u4f53', before: '*', after: '*', placeholder: '\u659c\u4f53' },
    { label: 'S', title: '\u53d6\u308a\u6d88\u3057\u7dda', before: '~~', after: '~~', placeholder: '\u53d6\u308a\u6d88\u3057\u7dda' },
    { label: '</>', title: '\u30b3\u30fc\u30c9', before: '`', after: '`', placeholder: 'code' },
    { label: '{ }', title: '\u30b3\u30fc\u30c9\u30d6\u30ed\u30c3\u30af', before: '```\n', after: '\n```', placeholder: 'code' },
    { label: '??', title: '\u30ea\u30f3\u30af', before: '[', after: '](https://)', placeholder: '\u30ea\u30f3\u30af\u30c6\u30ad\u30b9\u30c8' },
    { label: '"', title: '\u5f15\u7528', linePrefix: '> ' },
    { label: '-', title: '\u7b87\u6761\u66f8\u304d', linePrefix: '- ' },
    { label: '1.', title: '\u756a\u53f7\u4ed8\u304d\u30ea\u30b9\u30c8', linePrefix: '1. ' },
    { label: '#', title: '\u898b\u51fa\u3057', linePrefix: '## ' }
  ]);

  const LATEX_BUTTONS = Object.freeze([
    { label: '\\$', title: '\u30a4\u30f3\u30e9\u30a4\u30f3\u6570\u5f0f', before: '\$', after: '\$', placeholder: 'x' },
    { label: '\$\\$\$', title: '\u30d6\u30ed\u30c3\u30af\u6570\u5f0f', before: '\$\$\n', after: '\n\$\$', placeholder: 'x' },
    { label: 'a/b', title: '\u5206\u6570 (\\frac)', snippet: '\\frac{}{}', caretOffset: 6 },
    { label: '\u221a', title: '\u5e73\u65b9\u6839 (\\sqrt)', snippet: '\\sqrt{}', caretOffset: 6 },
    { label: 'x\u00b2', title: '\u4e0a\u4ed8\u304d\u6587\u5b57', snippet: '^{}', caretOffset: 2 },
    { label: 'x\u2082', title: '\u4e0b\u4ed8\u304d\u6587\u5b57', snippet: '_{}', caretOffset: 2 },
    { label: '\u03a3', title: '\u7dcf\u548c (\\sum)', snippet: '\\sum_{}^{}', caretOffset: 5 },
    { label: '\u222b', title: '\u7a4d\u5206 (\\int)', snippet: '\\int_{}^{}', caretOffset: 5 },
    { label: '\u03c0', title: '\\pi', snippet: '\\pi' },
    { label: '\u221e', title: '\\infty', snippet: '\\infty' }
  ]);

  // Approximate LaTeX symbol conversions for the lightweight preview only;
  // this is a visual sanity check, not a real math renderer.
  const LATEX_SYMBOL_PATTERNS = Object.freeze([
    [/\\\\alpha\b/g, '\u03b1'], [/\\\\beta\b/g, '\u03b2'], [/\\\\gamma\b/g, '\u03b3'], [/\\\\delta\b/g, '\u03b4'],
    [/\\\\epsilon\b/g, '\u03b5'], [/\\\\theta\b/g, '\u03b8'], [/\\\\lambda\b/g, '\u03bb'], [/\\\\mu\b/g, '\u03bc'],
    [/\\\\pi\b/g, '\u03c0'], [/\\\\sigma\b/g, '\u03c3'], [/\\\\phi\b/g, '\u03c6'], [/\\\\omega\b/g, '\u03c9'],
    [/\\\\Delta\b/g, '\u0394'], [/\\\\Sigma\b/g, '\u03a3'], [/\\\\Omega\b/g, '\u03a9'], [/\\\\infty\b/g, '\u221e'],
    [/\\\\pm\b/g, '\u00b1'], [/\\\\times\b/g, '\u00d7'], [/\\\\cdot\b/g, '\u00b7'], [/\\\\leq\b/g, '\u2264'],
    [/\\\\geq\b/g, '\u2265'], [/\\\\neq\b/g, '\u2260'], [/\\\\approx\b/g, '\u2248'], [/\\\\rightarrow\b/g, '\u2192'],
    [/\\\\leftarrow\b/g, '\u2190'], [/\\\\sum\b/g, '\u03a3'], [/\\\\int\b/g, '\u222b']
  ]);

  /** Safely set preview body content using DOMParser instead of innerHTML. */
  function setPreviewContent(previewBody, html) {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
    previewBody.textContent = '';
    for (const child of doc.body.firstChild.childNodes) {
      previewBody.append(document.importNode(child, true));
    }
  }
  function setEditorValue(textarea, value) {
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    if (nativeSetter) nativeSetter.call(textarea, value);
    else textarea.value = value;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /** Wrap the current selection (or a placeholder, if nothing is selected) with delimiters. */
  function wrapEditorSelection(textarea, before, after, placeholder = '') {
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const value = textarea.value;
    const selected = value.slice(start, end) || placeholder;
    setEditorValue(textarea, value.slice(0, start) + before + selected + after + value.slice(end));
    textarea.focus();
    textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
  }

  /** Insert a fixed snippet at the caret, leaving the caret inside it (e.g. \frac{|}{}). */
  function insertEditorSnippet(textarea, snippet, caretOffset) {
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const value = textarea.value;
    setEditorValue(textarea, value.slice(0, start) + snippet + value.slice(end));
    const caret = start + (Number.isInteger(caretOffset) ? caretOffset : snippet.length);
    textarea.focus();
    textarea.setSelectionRange(caret, caret);
  }

  /** Toggle a line-start prefix (quote, list, heading) across every selected line. */
  function toggleLinePrefix(textarea, prefix) {
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const value = textarea.value;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineEndIndex = value.indexOf('\n', end);
    const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
    const lines = value.slice(lineStart, lineEnd).split('\n');
    const allPrefixed = lines.every((line) => line.startsWith(prefix));
    const nextBlock = lines.map((line) => (allPrefixed ? line.slice(prefix.length) : prefix + line)).join('\n');
    setEditorValue(textarea, value.slice(0, lineStart) + nextBlock + value.slice(lineEnd));
    textarea.focus();
    textarea.setSelectionRange(lineStart, lineStart + nextBlock.length);
  }

  function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /** A deliberately approximate LaTeX-to-HTML pass for a quick visual check, not authoritative rendering. */
  function convertLatexCommands(source) {
    let out = source;
    out = out.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '<span class="kc-md-frac"><span class="kc-md-num">$1</span><span class="kc-md-den">$2</span></span>');
    out = out.replace(/\\\\sqrt\{([^{}]*)\}/g, '<span class="kc-md-sqrt">\u221a<span class="kc-md-sqrt-inner"></span></span>');
    out = out.replace(/\\\\sum_\{([^{}]*)\}\^\{([^{}]*)\}/g, '\u03a3<sub></sub><sup></sup>');
    out = out.replace(/\\\\int_\{([^{}]*)\}\^\{([^{}]*)\}/g, '\u222b<sub></sub><sup></sup>');
    out = out.replace(/\^\{([^{}]*)\}/g, '<sup>$1</sup>');
    out = out.replace(/_\{([^{}]*)\}/g, '<sub>$1</sub>');
    out = out.replace(/\^(\w)/g, '<sup>$1</sup>');
    out = out.replace(/_(\w)/g, '<sub>$1</sub>');
    for (const [pattern, symbol] of LATEX_SYMBOL_PATTERNS) out = out.replace(pattern, symbol);
    return out;
  }

  /** Render $inline$ and $$block$$ math approximately; everything else stays as plain escaped text. */
  /** Render a lightweight Markdown preview (bold/italic/strikethrough/code/quote/heading). */
  function renderMarkdownPreview(rawText) {
    if (!rawText.trim()) {
      return '<span class="kc-md-empty">テキストを入力するとプレビューが表示されます</span>';
    }
    let html = escapeHtml(rawText);
    // Headings
    html = html.replace(/^## (.+)$/gm, '<strong style="font-size:1.1em">$1</strong>');
    // Code block
    html = html.replace(/```[\s\S]+?```/g, (m) => `<code style="display:block;background:rgba(0,0,0,.06);padding:2px 6px;border-radius:4px;font-family:monospace;white-space:pre-wrap">${m.slice(3, -3).trim()}</code>`);
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,.06);padding:0 4px;border-radius:3px;font-family:monospace">$1</code>');
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Strikethrough
    html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');
    // Quote
    html = html.replace(/^&gt; (.+)$/gm, '<span style="border-left:3px solid #94a3b8;padding-left:8px;color:#64748b">$1</span>');
    // Unordered list
    html = html.replace(/^- (.+)$/gm, '• $1');
    // Ordered list
    html = html.replace(/^\d+\. (.+)$/gm, (m) => m);
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  function renderLatexPreview(rawText) {
    if (!rawText.trim()) {
      return '<span class="kc-md-empty">\u6570\u5f0f\u3092\u5165\u529b\u3059\u308b\u3068\u30d7\u30ec\u30d3\u30e5\u30fc\u304c\u8868\u793a\u3055\u308c\u307e\u3059\uff08\u4f8b: \^2+1\$\u3001\$\$\\\\frac{a}{b}\$\$\uff09</span>';
    }
    let html = escapeHtml(rawText);
    html = html.replace(/\$\$([\s\S]+?)\$\$/g, (_, inner) => `<div class="kc-md-block">${convertLatexCommands(inner.trim())}</div>`);
    html = html.replace(/\$([^\n$]+?)\$/g, (_, inner) => `<span class="kc-md-inline">${convertLatexCommands(inner)}</span>`);
    return html;
  }

  /** Find the composer's action-bar row (\u30ea\u30ab\u30ed/\u8fd4\u4fe1/\u5e74\u9f62/\u6295\u7a3f\u5148 + media/poll/save icons). */
  function findComposerActionBar() {
    // First try: anchor button with known titles (may change as Karotter updates).
    const anchor = findFirst(document, SELECTORS.composerActionBarAnchor);
    if (anchor) {
      const row = anchor.closest('div.flex.flex-wrap.items-center.justify-between')
        ?? anchor.closest('div.flex.items-center')
        ?? anchor.closest('div.flex');
      if (row) return { row, iconGroup: anchor.parentElement ?? row };
    }

    // Second try: find the action bar directly by its known class structure inside a form
    // that also contains the composer textarea.
    const textarea = findFirst(document, SELECTORS.composerTextarea);
    const form = textarea?.closest('form');
    if (form) {
      const row = form.querySelector('div.flex.flex-wrap.items-center.justify-between.gap-3')
        ?? form.querySelector('div.flex.flex-wrap.items-center.justify-between');
      if (row) {
        const iconGroup = row.querySelector('div.flex.items-center.gap-1\\.5')
          ?? row.querySelector('div.flex.flex-wrap.items-center.gap-2')
          ?? row.querySelector('div.flex');
        return { row, iconGroup: iconGroup ?? row };
      }
    }

    return null;
  }

  /** The composer's own textarea, queried fresh each time (Karotter shows one composer at a time). */
  function getComposerTextarea() {
    return findFirst(document, SELECTORS.composerTextarea);
  }

  function ensureComposerToolbarStyles() {
    if (document.getElementById(COMPOSER_TOOLBAR_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = COMPOSER_TOOLBAR_STYLE_ID;
    style.textContent = `
      .kc-md-toggle.is-active { background: var(--accent-soft, #e0f2fe); color: var(--accent, #2563eb); }
      .kc-md-toolbar { display: none; flex-direction: column; gap: 6px; width: 100%; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-soft, #e2e8f0); }
      .kc-md-toolbar.is-open { display: flex; }
      .kc-md-row { display: flex; flex-wrap: wrap; gap: 4px; }
      .kc-md-row[hidden] { display: none; }
      .kc-md-btn { min-width: 26px; height: 26px; padding: 0 6px; border-radius: 9999px; border: 1px solid var(--border-soft, #e2e8f0); background: var(--surface-soft, #f8fafc); color: var(--text-secondary, #475569); font: 600 12px/1 ui-monospace, monospace; cursor: pointer; transition: background-color 150ms ease, color 150ms ease; }
      .kc-md-btn:hover { background: var(--accent-soft, #e0f2fe); color: var(--accent, #2563eb); }
      .kc-md-preview[hidden] { display: none; }
      .kc-md-preview { margin-top: 2px; padding: 6px 8px; border-radius: 10px; background: var(--surface-soft, #f8fafc); }
      .kc-md-preview-label { display: block; margin-bottom: 3px; font-size: 10px; letter-spacing: .04em; color: var(--text-muted, #94a3b8); }
      .kc-md-preview-body { color: var(--text-secondary, #475569); font-size: 13px; white-space: pre-wrap; word-break: break-word; max-height: 90px; overflow: auto; }
      .kc-md-empty { font-style: italic; color: var(--text-muted, #94a3b8); }
      .kc-md-block { display: block; margin: 3px 0; text-align: center; }
      .kc-md-frac { display: inline-flex; flex-direction: column; text-align: center; font-size: .92em; line-height: 1.15; margin: 0 1px; vertical-align: middle; }
      .kc-md-num, .kc-md-den { display: block; padding: 0 2px; }
      .kc-md-den { border-top: 1px solid currentColor; }
      .kc-md-sqrt { display: inline-flex; align-items: flex-start; }
      .kc-md-sqrt-inner { border-top: 1px solid currentColor; padding: 0 2px; margin-left: 1px; }
    `;
    document.head.append(style);
  }

  /** Build one toolbar button; edits always target whichever composer textarea currently exists. */
  function buildToolbarButton(button, previewBody) {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = 'kc-md-btn';
    element.textContent = button.label;
    element.title = button.title;
    // Keep focus on the textarea so the composer never blurs from a toolbar click.
    element.addEventListener('mousedown', (event) => event.preventDefault());
    element.addEventListener('click', () => {
      const textarea = getComposerTextarea();
      if (!textarea) return;
      if (button.linePrefix) toggleLinePrefix(textarea, button.linePrefix);
      else if (button.snippet) insertEditorSnippet(textarea, button.snippet, button.caretOffset);
      else wrapEditorSelection(textarea, button.before, button.after, button.placeholder);
      if (previewBody && settings.latexPreview) setPreviewContent(previewBody, renderLatexPreview(textarea.value));
    });
    return element;
  }

  function buildComposerToolbarPanel() {
    const panel = document.createElement('div');
    panel.className = 'kc-md-toolbar';

    const markdownRow = document.createElement('div');
    markdownRow.className = 'kc-md-row';
    markdownRow.hidden = !settings.markdownToolbar;

    const latexRow = document.createElement('div');
    latexRow.className = 'kc-md-row';
    latexRow.hidden = !settings.latexToolbar;

    const previewWrap = document.createElement('div');
    previewWrap.className = 'kc-md-preview';
    previewWrap.hidden = !settings.latexPreview;
    const previewLabel = document.createElement('span');
    previewLabel.className = 'kc-md-preview-label';
    previewLabel.textContent = '数式プレビュー（簡易表示）';
    const previewBody = document.createElement('div');
    previewBody.className = 'kc-md-preview-body';
    previewWrap.append(previewLabel, previewBody);
    setPreviewContent(previewBody, renderLatexPreview(''));

    // Markdownプレビューエリア
    const mdPreviewWrap = document.createElement('div');
    mdPreviewWrap.className = 'kc-md-preview kc-md-preview--markdown';
    mdPreviewWrap.hidden = !settings.markdownPreview;
    const mdPreviewLabel = document.createElement('span');
    mdPreviewLabel.className = 'kc-md-preview-label';
    mdPreviewLabel.textContent = 'Markdownプレビュー';
    const mdPreviewBody = document.createElement('div');
    mdPreviewBody.className = 'kc-md-preview-body';
    mdPreviewWrap.append(mdPreviewLabel, mdPreviewBody);
    setPreviewContent(mdPreviewBody, renderMarkdownPreview(''));

    MARKDOWN_BUTTONS.forEach((button) => markdownRow.append(buildToolbarButton(button, previewBody)));
    LATEX_BUTTONS.forEach((button) => latexRow.append(buildToolbarButton(button, previewBody)));

    panel.append(markdownRow, latexRow, mdPreviewWrap, previewWrap);
    return { panel, markdownRow, latexRow, previewWrap, previewBody, mdPreviewWrap, mdPreviewBody };
  }

  /** The icon-style toggle button added to the composer's own action row. */
  function buildToolbarToggleButton(panel) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'rounded-full p-2 transition-colors hover:bg-blue-50 text-blue-600 kc-md-toggle';
    button.setAttribute('aria-pressed', 'false');
    button.title = 'Markdown / LaTeX \u30c4\u30fc\u30eb\u30d0\u30fc';
    button.style.font = '700 13px ui-monospace, monospace';
    button.style.lineHeight = '1';
    button.textContent = 'Aa';
    button.addEventListener('click', () => {
      const isOpen = panel.classList.toggle('is-open');
      button.setAttribute('aria-pressed', String(isOpen));
      button.classList.toggle('is-active', isOpen);
    });
    return button;
  }

  /** Keep an already-open panel's group visibility (and preview) in sync with live settings. */
  function syncComposerToolbarVisibility() {
    const actionBar = findComposerActionBar();
    if (!actionBar) return;
    const panel = actionBar.row.nextElementSibling;
    if (!panel || !panel.classList.contains('kc-md-toolbar')) return;
    const markdownRow = panel.querySelector('.kc-md-row:nth-child(1)');
    const latexRow = panel.querySelector('.kc-md-row:nth-child(2)');
    const previewWrap = panel.querySelector('.kc-md-preview:not(.kc-md-preview--markdown)');
    const mdPreviewWrap = panel.querySelector('.kc-md-preview--markdown');
    if (markdownRow) markdownRow.hidden = !settings.markdownToolbar;
    if (latexRow) latexRow.hidden = !settings.latexToolbar;
    if (previewWrap) previewWrap.hidden = !settings.latexPreview;
    if (mdPreviewWrap) mdPreviewWrap.hidden = !settings.markdownPreview;
    if (!settings.markdownToolbar && !settings.latexToolbar && !settings.latexPreview && !settings.markdownPreview) {
      panel.classList.remove('is-open');
      const toggle = actionBar.iconGroup.querySelector('.kc-md-toggle');
      toggle?.setAttribute('aria-pressed', 'false');
      toggle?.classList.remove('is-active');
    }
  }

  /** Insert the toggle button + panel into a newly-opened composer, once. */
  function ensureComposerToolbarInjected() {
    const actionBar = findComposerActionBar();
    if (!actionBar || actionBar.row.dataset.karotterClientToolbarInjected) return;
    if (!settings.markdownToolbar && !settings.latexToolbar && !settings.latexPreview) return;
    actionBar.row.dataset.karotterClientToolbarInjected = 'true';
    // Reset age restriction flag when a new composer is opened.
    ageRestrictionApplied = false;
    ensureComposerToolbarStyles();
    const { panel, previewBody, mdPreviewBody } = buildComposerToolbarPanel();
    actionBar.iconGroup.append(buildToolbarToggleButton(panel));
    actionBar.row.insertAdjacentElement('afterend', panel);
    const textarea = getComposerTextarea();
    if (textarea) {
      setPreviewContent(previewBody, renderLatexPreview(textarea.value));
      setPreviewContent(mdPreviewBody, renderMarkdownPreview(textarea.value));
    }
    ensureCharCounterInjected();
  }

  function queueComposerToolbarInjectionCheck() {
    if (composerToolbarInjectionCheckQueued) return;
    composerToolbarInjectionCheckQueued = true;
    window.requestAnimationFrame(() => {
      composerToolbarInjectionCheckQueued = false;
      ensureComposerToolbarInjected();
    });
  }

  /** Keep the live preview current while the panel is open and the composer textarea is edited. */
  function onComposerTextareaInput(event) {
    if (!(event.target instanceof HTMLTextAreaElement)) return;
    if (!matchesAnySelector(event.target, SELECTORS.composerTextarea)) return;
    // Age restriction check.
    checkAgeRestriction(event.target.value);
    // Character counter update.
    updateCharCounter(event.target.value);
    const actionBar = findComposerActionBar();
    const panel = actionBar?.row.nextElementSibling;
    if (!panel?.classList.contains('kc-md-toolbar') || !panel.classList.contains('is-open')) return;
    const previewWrap = panel.querySelector('.kc-md-preview:not(.kc-md-preview--markdown)');
    if (previewWrap && !previewWrap.hidden) {
      const previewBody = previewWrap.querySelector('.kc-md-preview-body');
      if (previewBody) setPreviewContent(previewBody, renderLatexPreview(event.target.value));
    }
    const mdPreviewWrap = panel.querySelector('.kc-md-preview--markdown');
    if (mdPreviewWrap && !mdPreviewWrap.hidden) {
      const mdPreviewBody = mdPreviewWrap.querySelector('.kc-md-preview-body');
      if (mdPreviewBody) setPreviewContent(mdPreviewBody, renderMarkdownPreview(event.target.value));
    }
  }

  /**
   * Watch all clicks on the page (capture phase) and count interactions with
   * Karotter's like / rekarot / quote controls regardless of whether they were
   * triggered by mouse or keyboard.
   *
   * - Like / Rekarot buttons are matched directly against SELECTORS.
   * - Quote is identified as the *second* visible rekarotMenuItem item, because
   *   the popover is shared for both RK and Quote RK.
   *
   * We use the capture phase so the listener fires before Karotter's own
   * handlers and before runPostAction / runRekarotMenuAction, which means the
   * count is incremented once for every real user interaction regardless of
   * the trigger source.  Duplicate counting from the keyboard path is avoided
   * by removing the explicit incrementActionStat calls from runPostAction and
   * runRekarotMenuAction — this listener becomes the single source of truth.
   */
  function onDocumentClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    // Composer submit button は React がイベントを横取りするため click では検知不可。
    // 代わりに watchComposerSubmit() で MutationObserver を使って検知している。

    // Like button
    const likeBtn = target.closest(SELECTORS.like.join(','));
    if (likeBtn) {
      incrementActionStat('like');
      return;
    }

    // Rekarot button (opens the popover ? counts as rekarot only when the
    // popover menu item for plain RK is then clicked; so we do NOT count here)
    // Instead, count on the rekarotMenuItem clicks below.

    // Rekarot / Quote RK menu items (inside the popover)
    const menuItem = target.closest(SELECTORS.rekarotMenuItem.join(','));
    if (menuItem) {
      const visibleItems = [...document.querySelectorAll(SELECTORS.rekarotMenuItem.join(','))]
        .filter((el) => el.getClientRects().length > 0);
      const index = visibleItems.indexOf(menuItem);
      if (index === 0) incrementActionStat('rekarot');
      else if (index === 1) {
        incrementActionStat('quote');
        // \u6295\u7a3f\u306f\u9001\u4fe1\u30dc\u30bf\u30f3\u62bc\u4e0b\u6642\u306b\u30ab\u30a6\u30f3\u30c8\uff08\u5f15\u7528\u3082submit\u3067\u78ba\u8a8d\uff09
      }
    }
  }

  /* -----------------------------------------------------------------------
   * Post count
   * ----------------------------------------------------------------------- */

  const POST_COUNT_DATE_KEY = 'karotter-client-post-count-date';

  /**
   * textarea.karotter-composer-textarea が DOM に現れたら監視を開始し、
   * 消えた時点（＝投稿完了）でカウントを増やす。
   * テキストが空でない状態で消えた場合のみカウントして誤検知を防ぐ。
   */
  function watchComposerSubmit() {
    let composerTextarea = null;

    new MutationObserver(() => {
      const current = document.querySelector('textarea.karotter-composer-textarea');

      // 新たに出現した
      if (current && !composerTextarea) {
        composerTextarea = current;
        return;
      }

      // 消えた（＝投稿完了 or キャンセル）
      if (!current && composerTextarea) {
        const hadContent = (composerTextarea.value ?? '').trim().length > 0;
        composerTextarea = null;
        if (hadContent) {
          incrementPostCount();
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  /** Load today's post count from storage and update the panel. */
  async function loadPostCount() {
    const el = postCountElement ?? shortcutPanelHost?.shadowRoot?.querySelector('[data-post-count]');
    if (!el) return;
    try {
      const stored = await extensionApi.storage.local.get({ [POST_COUNT_STORAGE_KEY]: { date: '', count: 0 } });
      const data = stored[POST_COUNT_STORAGE_KEY];
      const today = new Date().toLocaleDateString('ja-JP');
      const count = data.date === today ? (data.count ?? 0) : 0;
      el.textContent = count.toLocaleString('ja-JP');
    } catch (_) {
      el.textContent = '0';
    }
  }

  /** Increment today's post count. Resets automatically on a new day. */
  async function incrementPostCount() {
    const api = extensionApi?.storage?.local;
    if (!api) {
      console.warn('[Karotter Client] incrementPostCount: storage API not available');
      return;
    }
    try {
      const today = new Date().toLocaleDateString('ja-JP');
      const stored = await api.get({ [POST_COUNT_STORAGE_KEY]: { date: '', count: 0 } });
      const data = stored[POST_COUNT_STORAGE_KEY];
      const count = data.date === today ? (data.count ?? 0) + 1 : 1;
      await api.set({ [POST_COUNT_STORAGE_KEY]: { date: today, count } });
      const el = postCountElement ?? shortcutPanelHost?.shadowRoot?.querySelector('[data-post-count]');
      if (el) el.textContent = count.toLocaleString('ja-JP');
    } catch (error) {
      console.warn('[Karotter Client] Could not update post count:', error);
    }
    incrementPostHourlyStat();
  }

  /* -----------------------------------------------------------------------
   * Hourly post stats ? records which hour of day posts are made
   * ----------------------------------------------------------------------- */
  const POST_HOURLY_STORAGE_KEY = 'karotter-client-post-hourly';
  const POST_HOURLY_TODAY_STORAGE_KEY = 'karotter-client-post-hourly-today';

  async function incrementPostHourlyStat() {
    const api = extensionApi?.storage?.local;
    if (!api) return;
    try {
      const now = new Date();
      const hour = now.getHours();
      const today = now.toLocaleDateString('ja-JP');

      // 累計
      const stored = await api.get({ [POST_HOURLY_STORAGE_KEY]: new Array(24).fill(0) });
      const hourly = [...(stored[POST_HOURLY_STORAGE_KEY] ?? new Array(24).fill(0))];
      hourly[hour] = (hourly[hour] ?? 0) + 1;
      await api.set({ [POST_HOURLY_STORAGE_KEY]: hourly });

      // 今日分（日付が変わったらリセット）
      const storedToday = await api.get({ [POST_HOURLY_TODAY_STORAGE_KEY]: { date: '', hourly: new Array(24).fill(0) } });
      const todayData = storedToday[POST_HOURLY_TODAY_STORAGE_KEY];
      const todayHourly = todayData.date === today
        ? [...(todayData.hourly ?? new Array(24).fill(0))]
        : new Array(24).fill(0);
      todayHourly[hour] = (todayHourly[hour] ?? 0) + 1;
      await api.set({ [POST_HOURLY_TODAY_STORAGE_KEY]: { date: today, hourly: todayHourly } });
    } catch (error) {
      console.warn('[Karotter Client] Could not update hourly stats:', error);
    }
  }

  /* -----------------------------------------------------------------------
   * Character counter ? injected below the composer textarea
   * ----------------------------------------------------------------------- */
  const CHAR_COUNTER_ID = 'karotter-client-char-counter';
  const CHAR_LIMIT = 200; // Karotter's post character limit

  function ensureCharCounterInjected() {
    if (document.getElementById(CHAR_COUNTER_ID)) return;
    const textarea = getComposerTextarea();
    if (!textarea) return;
    const counter = document.createElement('div');
    counter.id = CHAR_COUNTER_ID;
    counter.style.cssText = [
      'display:flex', 'align-items:center', 'justify-content:flex-end',
      'gap:6px', 'margin:4px 0 0', 'font:600 12px/1 ui-sans-serif,system-ui,sans-serif',
      'color:var(--text-muted,#94a3b8)', 'pointer-events:none'
    ].join(';');
    // Arc progress ring (SVG).
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '22');
    svg.setAttribute('height', '22');
    svg.setAttribute('viewBox', '0 0 22 22');
    svg.style.transform = 'rotate(-90deg)';
    const trackCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    trackCircle.setAttribute('cx', '11'); trackCircle.setAttribute('cy', '11');
    trackCircle.setAttribute('r', '9'); trackCircle.setAttribute('fill', 'none');
    trackCircle.setAttribute('stroke', 'rgba(0,0,0,0.10)'); trackCircle.setAttribute('stroke-width', '2.5');
    const progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    progressCircle.setAttribute('cx', '11'); progressCircle.setAttribute('cy', '11');
    progressCircle.setAttribute('r', '9'); progressCircle.setAttribute('fill', 'none');
    progressCircle.setAttribute('stroke', 'var(--accent,#2563eb)'); progressCircle.setAttribute('stroke-width', '2.5');
    progressCircle.setAttribute('stroke-linecap', 'round');
    const circumference = 2 * Math.PI * 9;
    progressCircle.style.transition = 'stroke-dashoffset 150ms ease, stroke 150ms ease';
    progressCircle.setAttribute('stroke-dasharray', String(circumference));
    progressCircle.setAttribute('stroke-dashoffset', String(circumference));
    svg.append(trackCircle, progressCircle);
    // Remaining count label.
    const label = document.createElement('span');
    label.textContent = String(CHAR_LIMIT);
    counter.append(svg, label);
    counter._progressCircle = progressCircle;
    counter._label = label;
    counter._circumference = circumference;
    textarea.closest('div')?.after(counter);
    updateCharCounter(textarea.value);
  }

  function updateCharCounter(text) {
    const counter = document.getElementById(CHAR_COUNTER_ID);
    if (!counter) return;
    const len = text.length;
    const remaining = CHAR_LIMIT - len;
    const ratio = Math.min(len / CHAR_LIMIT, 1);
    const { _progressCircle: circle, _label: label, _circumference: circ } = counter;
    if (!circle || !label) return;
    circle.setAttribute('stroke-dashoffset', String(circ * (1 - ratio)));
    if (remaining < 0) {
      label.textContent = String(remaining);
      label.style.color = '#e53e3e';
      circle.setAttribute('stroke', '#e53e3e');
    } else if (remaining <= 20) {
      label.textContent = String(remaining);
      label.style.color = '#dd6b20';
      circle.setAttribute('stroke', '#dd6b20');
    } else {
      label.textContent = String(remaining);
      label.style.color = '';
      circle.setAttribute('stroke', 'var(--accent,#2563eb)');
    }
  }

  /* -----------------------------------------------------------------------
   * Age restriction auto-detection
   * -----------------------------------------------------------------------
   * Watches the composer textarea for keywords defined by the user. When a
   * match is found the age-restriction button is clicked to turn it on, and
   * a small indicator is shown so the user knows why it was activated.
   * The button is only clicked when its current state is "\u306a\u3057" (off) to
   * avoid toggling it back off on every keystroke.
   * --------------------------------------------------------------------- */

  const AGE_KEYWORDS_STORAGE_KEY = 'karotter-client-age-keywords';
  const AGE_INDICATOR_ID = 'karotter-client-age-indicator';
  let ageKeywords = [];

  async function loadAgeKeywords() {
    try {
      const stored = await extensionApi.storage.local.get({ [AGE_KEYWORDS_STORAGE_KEY]: null });
      const raw = stored[AGE_KEYWORDS_STORAGE_KEY];
      ageKeywords = Array.isArray(raw) ? raw : [];
    } catch (_) {
      ageKeywords = [];
    }
  }

  /** Find the age restriction number input inside the composer. */
  /** Find the age restriction toggle button (shown as "\u5e74\u9f62: \u306a\u3057" when closed). */
  function findAgeRestrictionButton() {
    return [...document.querySelectorAll(SELECTORS.ageRestriction.join(','))]
      .find((btn) => [...btn.querySelectorAll('span')].some((s) => s.textContent.trim() === '\u5e74\u9f62:'));
  }

  /** Find the age restriction number input (only present after button is clicked). */
  function findAgeRestrictionInput() {
    return findFirst(document, SELECTORS.ageRestrictionInput);
  }

  /**
   * Click the toggle button to expand the age input, wait for it to appear,
   * then set the value to 18 via React native setter.
   */

  function setAgeInputValue(input) {
    input.focus();
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (nativeSetter) nativeSetter.call(input, '18');
    else input.value = '18';
    input.dispatchEvent(new Event('input',  { bubbles: true, cancelable: true }));
    input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    input.blur();
  }

  /**
   * Try to set the age restriction to 18 without opening the UI panel.
   * Strategy: find the React fiber on the toggle button and directly invoke
   * its onClick handler with a synthetic event, then immediately set the
   * input value via the fiber's onChange before the DOM has a chance to repaint.
   * Falls back to the visible click/set/close flow if the fiber approach fails.
   */
  let ageRestrictionApplied = false;

  async function applyAgeRestriction() {
    // Once applied per composer session, do not run again.
    if (ageRestrictionApplied) return;

    const existingInput = findAgeRestrictionInput();
    if (existingInput && existingInput.value !== '') {
      ageRestrictionApplied = true;
      return;
    }

    // Try React fiber approach first (no visible UI change).
    const btn = findAgeRestrictionButton();
    if (!btn) return;

    // Find the React internal fiber key.
    const fiberKey = Object.keys(btn).find((k) => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'));
    if (fiberKey) {
      try {
        // Walk fiber to find the component's state setter.
        let fiber = btn[fiberKey];
        while (fiber) {
          if (fiber.memoizedProps?.onClick) {
            // Trigger the click handler silently via the fiber prop.
            fiber.memoizedProps.onClick({ type: 'click', preventDefault: () => {}, stopPropagation: () => {} });
            // Wait one frame for React to process the state update.
            await new Promise((resolve) => window.requestAnimationFrame(resolve));
            const input = findAgeRestrictionInput();
            if (input) {
              setAgeInputValue(input);
              ageRestrictionApplied = true;
              // Close the panel by clicking the button again via fiber.
              await new Promise((resolve) => window.requestAnimationFrame(resolve));
              fiber.memoizedProps.onClick({ type: 'click', preventDefault: () => {}, stopPropagation: () => {} });
              return;
            }
          }
          fiber = fiber.return;
        }
      } catch (_) { /* fiber approach failed, fall through to DOM approach */ }
    }

    // Fallback: visible click -> set -> close.
    btn.click();
    const input = await new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        const el = findAgeRestrictionInput();
        if (el) { resolve(el); return; }
        if (Date.now() - start > 1000) { resolve(null); return; }
        window.requestAnimationFrame(check);
      };
      check();
    });
    if (!input) return;
    setAgeInputValue(input);
    ageRestrictionApplied = true;
    // Close the panel.
    await new Promise((resolve) => window.setTimeout(resolve, 50));
    btn.click();
  }

  /** Return matched keywords found in text, or empty array. */
  function detectAgeKeywords(text) {
    if (!text || !ageKeywords.length) return [];
    return ageKeywords.filter((kw) => kw && text.includes(kw));
  }

  /** Show or update the matched-keyword indicator below the composer. */
  function updateAgeIndicator(matched) {
    let indicator = document.getElementById(AGE_INDICATOR_ID);
    if (!matched.length) {
      indicator?.remove();
      return;
    }
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = AGE_INDICATOR_ID;
      indicator.style.cssText = 'margin: 4px 0 0; padding: 4px 10px; border-radius: 8px; background: rgba(220,50,50,.10); color: #c0392b; font-size: 11px; font-weight: 600; border: 1px solid rgba(220,50,50,.22);';
      const textarea = getComposerTextarea();
      textarea?.closest('div')?.after(indicator);
    }
    indicator.textContent = `\ud83d\udd1e \u5e74\u9f62\u5236\u9650\u3092\u8a2d\u5b9a\u3057\u307e\u3057\u305f\uff08\u30de\u30c3\u30c1: ${matched.join(', ')}\uff09`;
  }

  /** Core check: run on every composer input event. */
  function checkAgeRestriction(text) {
    if (!settings.ageRestrictionEnabled) return;
    const matched = detectAgeKeywords(text);
    updateAgeIndicator(matched);
    if (!matched.length) return;
    applyAgeRestriction();
  }

  /* -----------------------------------------------------------------------
   * 投稿テンプレート
   * ----------------------------------------------------------------------- */
  let postTemplates = [];

  async function loadTemplates() {
    try {
      const stored = await extensionApi.storage.local.get({ [TEMPLATES_STORAGE_KEY]: [] });
      postTemplates = Array.isArray(stored[TEMPLATES_STORAGE_KEY]) ? stored[TEMPLATES_STORAGE_KEY] : [];
    } catch (_) {
      postTemplates = [];
    }
  }

  async function saveTemplates() {
    try {
      await extensionApi.storage.local.set({ [TEMPLATES_STORAGE_KEY]: postTemplates });
    } catch (error) {
      console.warn('[Karotter Client] Could not save templates:', error);
    }
  }

  /** テンプレートをtextareaに適用（Reactの状態も更新するためnativeInputValueSetterを使用） */
  function applyTemplate(text) {
    const textarea = getComposerTextarea();
    if (!textarea) return;
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    )?.set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(textarea, text);
    } else {
      textarea.value = text;
    }
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    textarea.focus();
  }

  /** テンプレート選択ドロップダウンを生成してボタンの下に表示 */
  function showTemplateDropdown(anchorBtn) {
    // 既存のドロップダウンを閉じる
    document.querySelector('.kc-tmpl-dropdown')?.remove();
    if (!postTemplates.length) return;

    const dropdown = document.createElement('div');
    dropdown.className = 'kc-tmpl-dropdown';
    dropdown.style.cssText = [
      'position:fixed',
      'z-index:2147483646',
      'min-width:160px',
      'max-width:280px',
      'padding:4px',
      'border:1px solid rgba(104,128,162,.20)',
      'border-radius:10px',
      'background:#fff',
      'box-shadow:0 8px 24px rgba(29,41,57,.18)',
    ].join(';');

    for (const tmpl of postTemplates) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'kc-tmpl-item';
      item.style.cssText = [
        'display:block',
        'width:100%',
        'padding:7px 12px',
        'border:none',
        'border-radius:7px',
        'background:transparent',
        'color:#1d2939',
        'font-size:13px',
        'font-weight:500',
        'text-align:left',
        'cursor:pointer',
        'white-space:nowrap',
        'overflow:hidden',
        'text-overflow:ellipsis',
        'box-sizing:border-box',
      ].join(';');
      item.textContent = tmpl.name;
      item.title = tmpl.body;
      item.addEventListener('mouseover', () => { item.style.background = '#f0f6ff'; item.style.color = '#2877d6'; });
      item.addEventListener('mouseout', () => { item.style.background = 'transparent'; item.style.color = '#1d2939'; });
      item.addEventListener('mousedown', (e) => e.preventDefault());
      item.addEventListener('click', () => {
        applyTemplate(tmpl.body);
        dropdown.remove();
      });
      dropdown.append(item);
    }

    // ボタン位置の下に配置
    const rect = anchorBtn.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + 4}px`;
    dropdown.style.left = `${rect.left}px`;
    document.body.append(dropdown);

    // 外側クリックで閉じる
    const close = (e) => {
      if (!dropdown.contains(e.target) && e.target !== anchorBtn) {
        dropdown.remove();
        document.removeEventListener('mousedown', close, true);
      }
    };
    document.addEventListener('mousedown', close, true);
  }

  /** テンプレートボタンをコンポーザーのアクションバーに注入 */
  function ensureTemplateButtonInjected() {
    const actionBar = findComposerActionBar();
    if (!actionBar || actionBar.row.hasAttribute(TEMPLATE_BTN_ATTR)) return;
    if (!postTemplates.length) return;
    actionBar.row.setAttribute(TEMPLATE_BTN_ATTR, 'true');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'kc-md-btn kc-tmpl-btn';
    btn.textContent = 'テンプレ';
    btn.title = 'テンプレートを挿入';
    btn.addEventListener('mousedown', (e) => e.preventDefault());
    btn.addEventListener('click', () => showTemplateDropdown(btn));
    actionBar.iconGroup.append(btn);
  }

  function initializeTemplateFeature() {
    loadTemplates().then(() => {
      ensureTemplateButtonInjected();
      // ストレージ変更をリアルタイム反映
      extensionApi.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !changes[TEMPLATES_STORAGE_KEY]) return;
        postTemplates = Array.isArray(changes[TEMPLATES_STORAGE_KEY].newValue)
          ? changes[TEMPLATES_STORAGE_KEY].newValue : [];
        // 既存のボタンを再注入できるようフラグをリセット
        document.querySelector(`[${TEMPLATE_BTN_ATTR}]`)?.removeAttribute(TEMPLATE_BTN_ATTR);
        ensureTemplateButtonInjected();
      });
    });

    // コンポーザーが開くたびにボタンを注入
    new MutationObserver(() => {
      ensureTemplateButtonInjected();
    }).observe(document.body, { childList: true, subtree: true });
  }

  function initializeComposerToolbarFeature() {
    let composerWasOpen = false;
    const observer = new MutationObserver(() => {
      queueComposerToolbarInjectionCheck();
      const isOpen = Boolean(findComposerActionBar());
      if (composerWasOpen && !isOpen) {
        // Reset flags and remove char counter when composer closes.
        ageRestrictionApplied = false;
        document.getElementById(CHAR_COUNTER_ID)?.remove();
        // ツールバー注入フラグをリセット（次回再注入できるように）
        document.querySelector(`[data-karotter-client-toolbar-injected]`)
          ?.removeAttribute('data-karotter-client-toolbar-injected');
        document.querySelector(`.kc-md-toolbar`)?.remove();
        document.querySelector(`.kc-md-toggle`)?.remove();
        document.querySelector(`[${TEMPLATE_BTN_ATTR}]`)?.removeAttribute(TEMPLATE_BTN_ATTR);
      }
      if (isOpen && !composerWasOpen) {
        // Inject char counter when composer opens.
        window.requestAnimationFrame(ensureCharCounterInjected);
      }
      composerWasOpen = isOpen;
    });
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('input', onComposerTextareaInput, true);
    queueComposerToolbarInjectionCheck();
  }

  /* -----------------------------------------------------------------------
   * Post detail stats badge normalisation
   * -----------------------------------------------------------------------
   * Karotter renders the detail page stats as two separate rows:
   *   Row 1 (buttons): 引用 / RK / いいね      — already has pill styling
   *   Row 2 (div):     表示回数 · ブックマーク  — plain text, no styling
   *   Row 3 (div):     date/time               — plain text, no styling
   *
   * This feature rewrites rows 2 & 3 so every item becomes an individual
   * pill badge that visually matches the buttons in row 1.
   * --------------------------------------------------------------------- */

  const POST_DETAIL_STATS_ATTR = 'data-kc-stats-normalised';

  /**
   * Build a badge that looks identical to the row-1 buttons (引用/RK/いいね)
   * by cloning the className straight from one of those buttons.
   */
  function normalisedDetailStatBadge(text, templateClassName) {
    const btn = document.createElement('span');
    if (templateClassName) {
      btn.className = templateClassName;
    }
    btn.style.cssText = 'cursor:default;pointer-events:none;';
    btn.textContent = text.trim();
    return btn;
  }

  /**
   * Parse "表示回数: N · ブックマーク: N" and the date div into individual
   * pill badges, then replace the original elements with a single flex row.
   */
  function normalisePostDetailStats(container) {
    // The stats area is the div containing the row-1 buttons (引用/RK/いいね).
    // Row 2 and 3 are its next siblings with class mt-1.
    const row1 = container.querySelector('div.mt-2.flex.flex-wrap.items-center.gap-4');
    if (!row1 || row1.hasAttribute(POST_DETAIL_STATS_ATTR)) return;

    const row2 = row1.nextElementSibling; // 表示回数 · ブックマーク
    const row3 = row2?.nextElementSibling; // date

    if (!row2 || !row2.textContent.includes('\u8868\u793a\u56de\u6570')) return;

    row1.setAttribute(POST_DETAIL_STATS_ATTR, 'true');

    // Grab the className from the first row-1 button so badges look identical.
    const templateBtn = row1.querySelector('button');
    const templateClassName = templateBtn ? templateBtn.className : null;

    // Parse row2: "表示回数: N · ブックマーク: N"
    const row2Items = row2.textContent.split('\u00b7').map(s => s.trim()).filter(Boolean);

    // Parse row3: date string
    const dateText = row3?.textContent?.trim();

    // Build a unified wrapper that continues the same flex row style as row1.
    const wrapper = document.createElement('div');
    wrapper.className = row1.className; // same flex/gap/text classes
    wrapper.setAttribute(POST_DETAIL_STATS_ATTR, 'true');

    for (const item of row2Items) {
      wrapper.append(normalisedDetailStatBadge(item, templateClassName));
    }
    if (dateText) {
      wrapper.append(normalisedDetailStatBadge(dateText, templateClassName));
    }

    // Replace row2 (and row3) with the new unified row.
    row2.replaceWith(wrapper);
    row3?.remove();
  }

  function initPostDetailStatsBadges() {
    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(() => {
        queued = false;
        normalisePostDetailStats(document.body);
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // Run once immediately in case the page is already loaded.
    normalisePostDetailStats(document.body);
  }

  function initialize() {
    try {
      mountShortcutHelp();
      loadSettings();
      injectPostSelectionStyles();
      initializeImageSaveFeature();
      initializeComposerToolbarFeature();
      initializeTemplateFeature();
      initPostDetailStatsBadges();
      ensureSettingsNavLinkInjected();
      document.addEventListener('pointermove', onPointerMove, { passive: true });
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('click', onDocumentClick, true);
      watchComposerSubmit();
      observeTimelineChanges();
      window.setTimeout(fetchProfileDataInBackground, 1200);
    } catch (error) {
      console.error('[Karotter Client] Initialization failed:', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
