// Safari ignores the mouse back/forward side buttons but still reports them to pages
// (button 3 = back, 4 = forward), so map them to history navigation. Chrome already
// handles these natively, so this only runs inside the Safari extension. Loaded as a
// content script on every site (Safari build) and directly by newtab.html.
(() => {
  let isSafari = false;
  try {
    isSafari = chrome.runtime.getURL("").startsWith("safari-web-extension://");
  } catch {}
  if (!isSafari) return;

  const BACK = 3;
  const FORWARD = 4;

  function navigate(direction) {
    if (window === window.top) {
      direction === BACK ? history.back() : history.forward();
    } else {
      // Subframes can't drive the top page's history, so ask the background script
      chrome.runtime.sendMessage({ type: "mouse-nav", direction: direction === BACK ? "back" : "forward" });
    }
  }

  addEventListener(
    "pointerdown",
    (e) => {
      if (e.button !== BACK && e.button !== FORWARD) return;
      e.preventDefault();
      e.stopPropagation();
      navigate(e.button);
    },
    true
  );

  // Swallow the follow-up auxclick so pages don't also react to the side button
  addEventListener(
    "auxclick",
    (e) => {
      if (e.button === BACK || e.button === FORWARD) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );
})();
