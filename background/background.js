chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    tab.url.includes("everytime.kr")
  ) {
    chrome.cookies.getAll({ url: tab.url }, (cookies) => {
      chrome.storage.local.set({ everytimeCookies: cookies });
      console.log(cookies);
    });
  }
});
