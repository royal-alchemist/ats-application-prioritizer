(() => {
  "use strict";

  const elements = {
    openApplyPages: document.getElementById("openApplyPages"),
    themeToggle: document.getElementById("themeToggle"),
    countAll: document.getElementById("countAll"),
    countP0: document.getElementById("countP0"),
    countP1: document.getElementById("countP1"),
    countP2: document.getElementById("countP2"),
    countP3: document.getElementById("countP3"),
    tabList: document.getElementById("tabList"),
    emptyState: document.getElementById("emptyState"),
    reprioritize: document.getElementById("reprioritize"),
    closeLinkedIn: document.getElementById("closeLinkedIn"),
    watermarkToggle: document.getElementById("watermarkToggle"),
    closeLeftToggle: document.getElementById("closeLeftToggle")
  };

  let tabState = {};
  let activeTabId = null;

  async function init() {
    await loadSettings();
    bindEvents();
    await loadTabState();
    await syncActiveTab({ scroll: true });
  }

  async function loadSettings() {
    const settings = await chrome.storage.local.get([
      "theme",
      "watermarkEnabled",
      "closeLeftTabEnabled"
    ]);

    const preferredTheme = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches ? "dark" : "light";

    applyTheme(settings.theme ?? preferredTheme);
    elements.watermarkToggle.checked = settings.watermarkEnabled !== false;
    elements.closeLeftToggle.checked = settings.closeLeftTabEnabled === true;
  }

  async function toggleTheme() {
    const current = document.documentElement.dataset.theme;
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    await chrome.storage.local.set({ theme: next });
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    elements.themeToggle.textContent = theme === "dark" ? "☀" : "☾";
  }

  async function setWatermark(enabled) {
    await chrome.storage.local.set({ watermarkEnabled: enabled });
  }

  async function setCloseLeft(enabled) {
    await chrome.storage.local.set({ closeLeftTabEnabled: enabled });
  }

  async function loadTabState() {
    const response = await chrome.runtime.sendMessage({
      type: "GET_TAB_STATE"
    });

    if (!response?.ok) return;

    tabState = response.state ?? {};
    render();
  }

  function getSortedItems() {
    const items = Object.values(tabState);
    const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };

    items.sort((a, b) => {
      const pd = priorityOrder[a.group] - priorityOrder[b.group];
      if (pd !== 0) return pd;

      const ad = a.ats.localeCompare(b.ats);
      if (ad !== 0) return ad;

      return (a.index ?? 0) - (b.index ?? 0);
    });

    return items;
  }

  function render() {
    const items = getSortedItems();
    renderCounts(items);
    renderRows(items);
    updateRowStates();

    if (activeTabId != null) {
      scrollTabIntoView(activeTabId, false);
    }
  }

  function renderCounts(items) {
    const counts = { all: 0, P0: 0, P1: 0, P2: 0, P3: 0 };

    for (const item of items) {
      counts.all++;
      if (Object.prototype.hasOwnProperty.call(counts, item.group)) {
        counts[item.group]++;
      }
    }

    elements.countAll.textContent = counts.all;
    elements.countP0.textContent = counts.P0;
    elements.countP1.textContent = counts.P1;
    elements.countP2.textContent = counts.P2;
    elements.countP3.textContent = counts.P3;
  }

  function renderRows(items) {
    elements.tabList.innerHTML = "";
    const isEmpty = items.length === 0;

    elements.tabList.classList.toggle("hidden", isEmpty);
    elements.emptyState.classList.toggle("visible", isEmpty);

    for (const item of items) {
      elements.tabList.appendChild(createRow(item));
    }
  }

  function createRow(item) {
    const row = document.createElement("div");
    row.className = "tab-entry";
    row.dataset.tabId = String(item.tabId);
    row.setAttribute("role", "button");
    row.tabIndex = 0;

    // Native Chrome tab-hover previews cannot be triggered by extensions.
    // Provide the linked tab title/URL as a useful sidebar hover tooltip.
    row.title = `${item.title || item.ats}\n${item.url}`;

    const dot = document.createElement("span");
    dot.className = `dot ${item.group.toLowerCase()}`;

    const name = document.createElement("span");
    name.className = "ats-name";
    name.textContent = item.ats;

    const priority = document.createElement("span");
    priority.className = "priority-label";
    priority.textContent = item.priorityLabel;

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "close-tab";
    closeButton.title = "Close linked tab";
    closeButton.setAttribute("aria-label", `Close ${item.ats} tab`);

    closeButton.addEventListener("click", event => {
      event.stopPropagation();
      closeLinkedTab(item);
    });

    row.append(dot, name, priority, closeButton);

    row.addEventListener("click", async () => {
      await focusLinkedTab(item);
    });

    row.addEventListener("keydown", async event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        await focusLinkedTab(item);
      }
    });

    return row;
  }

  function updateRowStates() {
    const rows = elements.tabList.querySelectorAll(".tab-entry");

    for (const row of rows) {
      const tabId = Number(row.dataset.tabId);
      row.classList.toggle("is-active", tabId === activeTabId);
    }
  }

  function scrollTabIntoView(tabId, smooth = true) {
    const row = elements.tabList.querySelector(
      `.tab-entry[data-tab-id="${tabId}"]`
    );

    if (!row) return;

    row.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: smooth ? "smooth" : "auto"
    });
  }

  async function focusLinkedTab(item) {
    /*
     * Move the visual current-tab marker immediately, then
     * Chrome's onActivated event will confirm the same state.
     */
    activeTabId = item.tabId;

    updateRowStates();
    scrollTabIntoView(item.tabId, true);

    await chrome.runtime.sendMessage({
      type: "FOCUS_TAB",
      tabId: item.tabId,
      windowId: item.windowId
    });
  }


  async function syncActiveTab({ scroll = true } = {}) {
    const tabs = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true
    });

    activeTabId = tabs[0]?.id ?? null;
    updateRowStates();

    if (scroll && activeTabId != null) {
      scrollTabIntoView(activeTabId, true);
    }
  }

  async function closeLinkedTab(item) {
    const response = await chrome.runtime.sendMessage({
      type: "CLOSE_TAB_WITH_POLICY",
      tabId: item.tabId,
      alsoCloseLeft: elements.closeLeftToggle.checked
    });

    if (!response?.ok) {
      console.error("Failed to close tab:", response?.error);
      return;
    }

    const closed = response.closedTabIds ?? [];

    for (const tabId of closed) {
      delete tabState[tabId];
    }

    if (closed.includes(activeTabId)) {
      activeTabId = null;
    }

    render();
    await syncActiveTab({ scroll: true });
  }

  async function openAllApplicationPages() {

    const button =
      elements.openApplyPages;
  
  
    button.disabled =
      true;
  
    button.textContent =
      "…";
  
  
    try {
  
      const response =
        await chrome.runtime.sendMessage({
          type:
            "OPEN_ALL_APPLICATION_PAGES"
        });
  
  
      if (!response?.ok) {
  
        console.error(
          "Bulk application-page opening failed:",
          response?.error
        );
  
        button.textContent =
          "!";
  
        return;
      }
  
  
      /*
       * Brief visual confirmation.
       *
       * Example:
       * 17 application pages opened.
       */
      button.textContent =
        response.opened > 0
          ? "✓"
          : "0";
  
  
      button.title =
        [
          `Recognized job tabs: ${response.recognized}`,
          `Application pages opened: ${response.opened}`,
          `Already open: ${response.alreadyOpen}`,
          `Apply control not found: ${response.notFound}`,
          `Failed: ${response.failed}`
        ].join("\n");
  
  
      /*
       * Newly opened ATS tabs should immediately
       * appear in the sidebar.
       */
      await loadTabState();
  
  
      window.setTimeout(
        () => {
  
          button.textContent =
            "↗";
  
        },
        1400
      );
  
  
    } catch (error) {
  
      console.error(
        "Bulk application-page opening failed:",
        error
      );
  
      button.textContent =
        "!";
  
  
    } finally {
  
      button.disabled =
        false;
  
    }
  }

  async function reprioritize() {
    elements.reprioritize.disabled = true;
    elements.reprioritize.textContent = "RE-PRIORITIZING…";

    try {
      const response = await chrome.runtime.sendMessage({
        type: "REPRIORITIZE"
      });

      if (response?.ok) {
        tabState = response.state ?? {};
        render();
        await syncActiveTab({ scroll: true });
      }
    } finally {
      elements.reprioritize.disabled = false;
      elements.reprioritize.textContent = "RE-PRIORITIZE";
    }
  }

  async function closeJobrightLinkedInTabs() {
    const button = elements.closeLinkedIn;
    button.disabled = true;
    button.textContent = "CHECKING…";

    try {
      const response = await chrome.runtime.sendMessage({
        type: "CLOSE_JOBRIGHT_LINKEDIN_TABS"
      });

      if (!response?.ok) {
        button.textContent = "ERROR";
        return;
      }

      button.textContent = `CLOSED ${response.closed ?? 0}`;
      await loadTabState();
      await syncActiveTab({ scroll: true });

      window.setTimeout(() => {
        button.textContent = "CLOSE LINKEDIN";
      }, 1400);
    } catch (error) {
      console.error(error);
      button.textContent = "ERROR";
    } finally {
      button.disabled = false;
    }
  }

  function installStateListener() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "session" && changes.classifiedTabs) {
        tabState = changes.classifiedTabs.newValue ?? {};
        render();
      }

    });
  }

  function bindEvents() {
    elements.openApplyPages.addEventListener("click", openAllApplicationPages);
    elements.themeToggle.addEventListener("click", toggleTheme);
    elements.reprioritize.addEventListener("click", reprioritize);
    elements.closeLinkedIn.addEventListener("click", closeJobrightLinkedInTabs);

    elements.watermarkToggle.addEventListener("change", event => {
      setWatermark(event.target.checked);
    });

    elements.closeLeftToggle.addEventListener("change", event => {
      setCloseLeft(event.target.checked);
    });

    // Actual tab activation/switching is supported by Chrome.
    chrome.tabs.onActivated.addListener(activeInfo => {
      activeTabId = activeInfo.tabId;
      updateRowStates();
      scrollTabIntoView(activeTabId, true);
    });

    chrome.windows.onFocusChanged.addListener(windowId => {
      if (windowId === chrome.windows.WINDOW_ID_NONE) return;
      syncActiveTab({ scroll: true });
    });

    installStateListener();
  }

  init();
})();
