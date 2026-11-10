chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: "newtab.html" });
});

// Safari gives extension pages a new random URL on every launch, so its Home button
// can't point at newtab.html directly. Instead the homepage is set to this fixed
// placeholder address, and any navigation to it is sent to the extension page.
const HOME_PLACEHOLDER_HOST = "amoled-newtab.invalid";

function redirectHome(tabId) {
  chrome.tabs.update(tabId, { url: chrome.runtime.getURL("newtab.html") });
}

if (chrome.webNavigation?.onBeforeNavigate) {
  chrome.webNavigation.onBeforeNavigate.addListener(
    ({ tabId, frameId }) => {
      if (frameId === 0) redirectHome(tabId);
    },
    { url: [{ hostEquals: HOME_PLACEHOLDER_HOST }] }
  );
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!changeInfo.url) return;
  try {
    if (new URL(changeInfo.url).hostname === HOME_PLACEHOLDER_HOST) redirectHome(tabId);
  } catch {}
});

// Mouse side buttons pressed inside an iframe (see mouse-nav.js)
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== "mouse-nav" || !sender.tab) return;
  if (message.direction === "back") chrome.tabs.goBack?.(sender.tab.id);
  else chrome.tabs.goForward?.(sender.tab.id);
});
