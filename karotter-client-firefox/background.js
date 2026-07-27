/**
 * Karotter Client — Background Script
 * content script から送られたダウンロードリクエストを処理する。
 * browser.downloads API はbackground scriptでのみ使用可能。
 */
'use strict';

const api = globalThis.browser ?? globalThis.chrome;

api.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'download') return false;

  const { url, filename } = message;
  api.downloads.download({ url, filename, saveAs: false })
    .then(() => sendResponse({ ok: true }))
    .catch((error) => {
      console.error('[Karotter Client] Background download failed:', error);
      sendResponse({ ok: false, error: error.message });
    });

  return true; // 非同期レスポンスのために必要
});
