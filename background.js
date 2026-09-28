importScripts("ats-rules.js");

const STATE_KEY = "classifiedTabs";

/*
 * Clicking the extension toolbar icon opens the side panel.
 *
 * Run this whenever the service worker starts rather than
 * depending only on installation/startup events.
 */
chrome.sidePanel
  .setPanelBehavior({
    openPanelOnActionClick: true
  })
  .catch(error => {
    console.error(
      "Failed to configure side panel:",
      error
    );
});

/*
 * Make extension-icon click open the side panel.
 */
chrome.runtime.onInstalled.addListener(async () => {
  await chrome.sidePanel.setPanelBehavior({
    openPanelOnActionClick: true
  });

  await rebuildTabState();
});


chrome.runtime.onStartup.addListener(async () => {
  await chrome.sidePanel.setPanelBehavior({
    openPanelOnActionClick: true
  });

  await rebuildTabState();
});


/*
 * Rebuild state from actual Chrome tabs.
 *
 * This means our state can always recover even if the
 * service worker was terminated.
 */
async function rebuildTabState() {
  const tabs = await chrome.tabs.query({});

  const classifiedTabs = {};

  for (const tab of tabs) {
    const item = classifyTab(tab);

    if (item) {
      classifiedTabs[tab.id] = item;
    }
  }

  await saveState(classifiedTabs);

  return classifiedTabs;
}


/*
 * Convert a Chrome tab into the small object
 * needed by the sidebar.
 */
function classifyTab(tab) {
  if (
    !tab ||
    !tab.id ||
    !tab.url ||
    !/^https?:/i.test(tab.url)
  ) {
    return null;
  }

  const result =
    globalThis.ATS_PRIORITY?.classify(tab.url);

  if (!result) {
    return null;
  }

  return {
    tabId: tab.id,
    windowId: tab.windowId,

    url: tab.url,

    ats: result.name,
    group: result.group,

    priorityLabel:
      result.priority.label,

    watermarkLabel:
      result.priority.watermarkLabel ??
      result.priority.label
  };
}


async function getState() {
  const stored =
    await chrome.storage.session.get(STATE_KEY);

  return stored[STATE_KEY] ?? {};
}


async function saveState(state) {
  await chrome.storage.session.set({
    [STATE_KEY]: state
  });
}


/*
 * Update ONE tab instead of rebuilding everything.
 */
async function updateTabState(tabId) {
  let tab;

  try {
    tab = await chrome.tabs.get(tabId);
  } catch {
    await removeTabState(tabId);
    return;
  }

  const state = await getState();

  const item = classifyTab(tab);

  if (item) {
    state[tabId] = item;
  } else {
    delete state[tabId];
  }

  await saveState(state);
}


async function removeTabState(tabId) {
  const state = await getState();

  delete state[tabId];

  await saveState(state);
}


/*
 * ─────────────────────────────────────────────
 * LIVE TAB EVENTS
 * ─────────────────────────────────────────────
 */


/*
 * New tab.
 */
chrome.tabs.onCreated.addListener(tab => {
  if (tab.id) {
    updateTabState(tab.id);
  }
});


/*
 * URL changed / navigation happened.
 */
chrome.tabs.onUpdated.addListener(
  (tabId, changeInfo) => {
    if (
      changeInfo.url ||
      changeInfo.status === "complete"
    ) {
      updateTabState(tabId);
    }
  }
);


/*
 * Tab closed.
 */
chrome.tabs.onRemoved.addListener(tabId => {
  removeTabState(tabId);
});


/*
 * Tab moved between windows.
 */
chrome.tabs.onAttached.addListener(tabId => {
  updateTabState(tabId);
});

/*
 * Ensure the current version of the content script exists
 * in an already-open tab.
 *
 * This is important during extension development:
 * reloading an unpacked extension does NOT automatically
 * inject its new content script into tabs that were already open.
 */
async function ensureContentScript(tab) {
  if (
    !tab?.id ||
    !tab.url ||
    !/^https?:/i.test(tab.url)
  ) {
    return false;
  }

  /*
   * First see whether our current content script is alive.
   */
  try {
    const response =
      await chrome.tabs.sendMessage(
        tab.id,
        {
          type: "PING_ATS_PRIORITIZER"
        }
      );

    if (response?.ok) {
      return true;
    }
  } catch {
    // No current content script. Inject below.
  }


  try {
    await chrome.scripting.insertCSS({
      target: {
        tabId: tab.id
      },
      files: [
        "watermark.css"
      ]
    });

    await chrome.scripting.executeScript({
      target: {
        tabId: tab.id
      },
      files: [
        "ats-rules.js",
        "content.js"
      ]
    });

    return true;

  } catch (error) {
    /*
     * chrome:// pages, Web Store pages, etc. cannot be injected.
     * Silently ignore them.
     */
    console.debug(
      "Could not inject Prioritizer into tab:",
      tab.id,
      error
    );

    return false;
  }
}


/*
 * Force every currently-open normal webpage
 * to re-run classification + watermark rendering.
 */
async function refreshAllOpenPages() {
  const tabs =
    await chrome.tabs.query({});

  await Promise.allSettled(
    tabs.map(async tab => {

      const ready =
        await ensureContentScript(tab);

      if (!ready) {
        return;
      }

      try {
        await chrome.tabs.sendMessage(
          tab.id,
          {
            type: "FORCE_ATS_REFRESH"
          }
        );
      } catch {
        // Tab disappeared or navigated while refreshing.
      }

    })
  );
}

/*
 * ─────────────────────────────────────────────
 * SIDEBAR MESSAGES
 * ─────────────────────────────────────────────
 */

chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {

    if (message?.type === "GET_TAB_STATE") {
      getState().then(state => {
        sendResponse({
          ok: true,
          state
        });
      });

      return true;
    }


    if (message?.type === "REPRIORITIZE") {

      (async () => {
    
        /*
         * 1. Re-evaluate every open tab URL.
         */
        const state =
          await rebuildTabState();
    
        /*
         * 2. Force every open webpage itself
         *    to update its watermark.
         */
        await refreshAllOpenPages();
    
        sendResponse({
          ok: true,
          state
        });
    
      })().catch(error => {
    
        console.error(
          "Re-prioritize failed:",
          error
        );
    
        sendResponse({
          ok: false,
          error: error.message
        });
    
      });
    
      return true;
    }


    if (message?.type === "FOCUS_TAB") {
      focusTab(
        message.tabId,
        message.windowId
      ).then(() => {
        sendResponse({
          ok: true
        });
      });

      return true;
    }

    if (message?.type === "CLOSE_TAB") {

      chrome.tabs
        .remove(message.tabId)
        .then(() => {
    
          sendResponse({
            ok: true
          });
    
        })
        .catch(error => {
    
          sendResponse({
            ok: false,
            error: error.message
          });
    
        });
    
      return true;
    }
  }
);


async function focusTab(tabId, windowId) {
  if (windowId) {
    await chrome.windows.update(
      windowId,
      {
        focused: true
      }
    );
  }

  await chrome.tabs.update(
    tabId,
    {
      active: true
    }
  );
}