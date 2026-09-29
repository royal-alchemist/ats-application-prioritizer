importScripts("ats-rules.js");

const STATE_KEY = "classifiedTabs";
let rebuildTimer = null;

async function configureSidePanel() {
  try {
    await chrome.sidePanel.setPanelBehavior({
      openPanelOnActionClick: true
    });
  } catch (error) {
    console.error("Failed to configure side panel:", error);
  }
}

configureSidePanel();

chrome.runtime.onInstalled.addListener(async () => {
  await configureSidePanel();
  await rebuildTabState();
});

chrome.runtime.onStartup.addListener(async () => {
  await configureSidePanel();
  await rebuildTabState();
});

function classifyTab(tab) {
  if (!tab || tab.id == null || !tab.url || !/^https?:/i.test(tab.url)) {
    return null;
  }

  const result = globalThis.ATS_PRIORITY?.classify(tab.url);
  if (!result) return null;

  return {
    tabId: tab.id,
    windowId: tab.windowId,
    index: tab.index,
    title: tab.title || result.name,
    url: tab.url,
    ats: result.name,
    group: result.group,
    priorityLabel: result.priority.label,
    watermarkLabel: result.priority.watermarkLabel ?? result.priority.label
  };
}

async function rebuildTabState() {
  const tabs = await chrome.tabs.query({});
  const classifiedTabs = {};

  for (const tab of tabs) {
    const item = classifyTab(tab);
    if (item) classifiedTabs[tab.id] = item;
  }

  await chrome.storage.session.set({
    [STATE_KEY]: classifiedTabs
  });

  return classifiedTabs;
}

function scheduleTabStateRebuild() {
  if (rebuildTimer !== null) clearTimeout(rebuildTimer);

  rebuildTimer = setTimeout(async () => {
    rebuildTimer = null;
    try {
      await rebuildTabState();
    } catch (error) {
      console.error("Failed to rebuild tab state:", error);
    }
  }, 75);
}

chrome.tabs.onCreated.addListener(scheduleTabStateRebuild);
chrome.tabs.onRemoved.addListener(scheduleTabStateRebuild);
chrome.tabs.onAttached.addListener(scheduleTabStateRebuild);
chrome.tabs.onDetached.addListener(scheduleTabStateRebuild);
chrome.tabs.onReplaced.addListener(scheduleTabStateRebuild);
chrome.tabs.onMoved.addListener(scheduleTabStateRebuild);
chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (changeInfo.url || changeInfo.title || changeInfo.status === "complete") {
    scheduleTabStateRebuild();
  }
});

async function focusTab(tabId, windowId) {
  if (windowId != null) {
    await chrome.windows.update(windowId, { focused: true });
  }
  await chrome.tabs.update(tabId, { active: true });
}

async function closeTabWithPolicy(tabId, alsoCloseLeft) {
  const tab = await chrome.tabs.get(tabId);
  const tabs = await chrome.tabs.query({ windowId: tab.windowId });
  tabs.sort((a, b) => a.index - b.index);

  const currentIndex = tabs.findIndex(t => t.id === tabId);
  const idsToClose = [tabId];

  if (alsoCloseLeft && currentIndex > 0) {
    const leftTab = tabs[currentIndex - 1];
    if (leftTab?.id != null) idsToClose.unshift(leftTab.id);
  }

  const uniqueIds = [...new Set(idsToClose)];
  await chrome.tabs.remove(uniqueIds);
  await rebuildTabState();
  return uniqueIds;
}

function isJobrightPostingUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host !== "jobright.ai" && host !== "www.jobright.ai") return false;
    return /^\/jobs\/info\/[^/]+\/?$/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

async function inspectJobrightOrigin(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const anchor = document.querySelector("a.index_origin__e6tHu");
        if (!anchor) {
          return { found: false, rawHref: "", resolvedHref: "" };
        }
        return {
          found: true,
          rawHref: anchor.getAttribute("href") ?? "",
          resolvedHref: anchor.href ?? ""
        };
      }
    });
    return results?.[0]?.result ?? null;
  } catch {
    return null;
  }
}

async function closeJobrightLinkedInTabs() {
  const tabs = await chrome.tabs.query({});
  const candidates = tabs.filter(
    tab => tab.id != null && isJobrightPostingUrl(tab.url)
  );

  const idsToClose = [];

  for (const tab of candidates) {
    const origin = await inspectJobrightOrigin(tab.id);
    if (!origin?.found) continue;

    const href = `${origin.rawHref} ${origin.resolvedHref}`.toLowerCase();
    if (href.includes("linkedin.com")) idsToClose.push(tab.id);
  }

  if (idsToClose.length) await chrome.tabs.remove(idsToClose);
  await rebuildTabState();

  return {
    checked: candidates.length,
    closed: idsToClose.length
  };
}

async function ensureContentScript(tab) {
  if (tab?.id == null || !tab.url || !/^https?:/i.test(tab.url)) {
    return false;
  }

  try {
    const response = await chrome.tabs.sendMessage(
      tab.id,
      { type: "PING_ATS_PRIORITIZER" }
    );
    if (response?.ok) return true;
  } catch {}

  try {
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["watermark.css"]
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["ats-rules.js", "content.js"]
    });

    return true;
  } catch {
    return false;
  }
}

async function refreshAllOpenPages() {
  const tabs = await chrome.tabs.query({});

  await Promise.allSettled(
    tabs.map(async tab => {
      const ready = await ensureContentScript(tab);
      if (!ready) return;
      try {
        await chrome.tabs.sendMessage(
          tab.id,
          { type: "FORCE_ATS_REFRESH" }
        );
      } catch {}
    })
  );
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "GET_TAB_STATE") {
    rebuildTabState()
      .then(state => sendResponse({ ok: true, state }))
      .catch(error => sendResponse({ ok: false, state: {}, error: error.message }));
    return true;
  }

  if (message?.type === "REPRIORITIZE") {
    (async () => {
      const state = await rebuildTabState();
      await refreshAllOpenPages();
      sendResponse({ ok: true, state });
    })().catch(error => {
      sendResponse({ ok: false, error: error.message });
    });
    return true;
  }

  if (message?.type === "FOCUS_TAB") {
    focusTab(message.tabId, message.windowId)
      .then(() => sendResponse({ ok: true }))
      .catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "CLOSE_TAB_WITH_POLICY") {
    closeTabWithPolicy(message.tabId, Boolean(message.alsoCloseLeft))
      .then(closedTabIds => sendResponse({ ok: true, closedTabIds }))
      .catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "CLOSE_JOBRIGHT_LINKEDIN_TABS") {
    closeJobrightLinkedInTabs()
      .then(result => sendResponse({ ok: true, ...result }))
      .catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }
});

rebuildTabState().catch(() => {});
