chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: "newtab.html" });
});
