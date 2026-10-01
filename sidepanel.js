(() => {
  "use strict";

  const elements = {
    openApplyPages: document.getElementById("openApplyPages"),
    sortTabs: document.getElementById("sortTabs"),
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

  const HEADER_ICONS = {

    sun: `
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
        />
        <path
          fill="currentColor"
          d="M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zM16 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 16 8zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8z"
        />
        <path
          fill="currentColor"
          d="M13.657 2.343a.5.5 0 0 1 0 .707l-1.414 1.414a.5.5 0 1 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zM4.464 11.536a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 1 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zM13.657 13.657a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.464a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707z"
        />
      </svg>
    `,
    
    moon: `
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          d="M20.4 15.6A8.5 8.5 0 0 1 8.4 3.6 8.5 8.5 0 1 0 20.4 15.6Z"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    `
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
    elements.themeToggle.innerHTML = theme === "dark"
      ? HEADER_ICONS.sun
      : HEADER_ICONS.moon;
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

  async function sortBrowserTabs() {

    const button =
      elements.sortTabs;
  
  
    button.disabled = true;
  
    button.textContent = "…";
  
  
    try {
  
      /*
       * Find the Chrome window represented by
       * the currently active tab.
       */
      const activeTabs =
        await chrome.tabs.query({
          active: true,
          lastFocusedWindow: true
        });
  
  
      const activeTab =
        activeTabs[0];
  
  
      if (
        !activeTab ||
        activeTab.windowId == null
      ) {
        throw new Error(
          "Could not determine current Chrome window."
        );
      }
  
  
      const windowId =
        activeTab.windowId;
  
  
      /*
       * IMPORTANT:
       *
       * Use EXACTLY the same ordering as the
       * sidebar itself.
       */
      const orderedItems =
        getSortedItems()
          .filter(
            item =>
              item.windowId ===
              windowId
          );
  
  
      const orderedApplicationTabIds =
        orderedItems.map(
          item => item.tabId
        );
  
  
      if (
        orderedApplicationTabIds.length === 0
      ) {
  
        button.textContent = "0";
  
        return;
  
      }
  
  
      const response =
        await chrome.runtime.sendMessage({
  
          type:
            "SORT_TABS_BY_SIDEBAR",
  
          windowId,
  
          orderedApplicationTabIds,
  
          /*
           * Reuse the SAME switch that controls
           * close-current + close-left behavior.
           */
          pairSourceTabs:
            elements.closeLeftToggle.checked
  
        });
  
  
      if (!response?.ok) {
  
        throw new Error(
          response?.error ||
          "Tab sorting failed."
        );
  
      }
  
  
      button.textContent =
        "✓";
  
  
      button.title =
        [
          `Application tabs sorted: ${response.applicationTabs}`,
          `Source tabs paired: ${response.sourceTabs}`,
          `Total tabs moved: ${response.movedTabs}`
        ].join("\n");
  
  
      /*
       * Their indices changed, so refresh sidebar
       * state afterwards.
       */
      await loadTabState();
  
  
      await syncActiveTab({
        scroll: true
      });
  
  
      window.setTimeout(
        () => {
  
          button.textContent =
            "⇅";
  
        },
        1200
      );
  
  
    } catch (error) {
  
      console.error(
        "Sort tabs failed:",
        error
      );
  
  
      button.textContent =
        "!";
  
  
      button.title =
        error?.message ??
        String(error);
  
  
    } finally {
  
      button.disabled =
        false;
  
    }
  }

  function render() {
    const items = getSortedItems();
    const counts = { all: 0, P0: 0, P1: 0, P2: 0, P3: 0 };
  
    for (const item of items) {
      counts.all++;
      if (item.group in counts) counts[item.group]++;
    }
  
    elements.countAll.textContent = counts.all;
    elements.countP0.textContent = counts.P0;
    elements.countP1.textContent = counts.P1;
    elements.countP2.textContent = counts.P2;
    elements.countP3.textContent = counts.P3;
  
    renderRows(items);
    updateRowStates();
  
    if (activeTabId != null) {
      scrollTabIntoView(activeTabId, false);
    }
  }
  
  
  function renderRows(items) {
    elements.tabList.innerHTML = "";
  
    const empty = items.length === 0;
    elements.tabList.classList.toggle("hidden", empty);
    elements.emptyState.classList.toggle("visible", empty);
  
    for (const item of items) {
      elements.tabList.appendChild(createRow(item));
    }
  }
  
  
  function formatPercentage(value) {
    if (value == null || !Number.isFinite(Number(value))) {
      return "—";
    }
  
    return `${Number(value).toFixed(2)}%`;
  }
  
  
  function createRow(item) {
    const row = document.createElement("div");
    row.className = "tab-entry";
    row.dataset.tabId = String(item.tabId);
    row.setAttribute("role", "button");
    row.tabIndex = 0;
    row.title = `${item.title || item.ats}\n${item.url}`;
  
    const dot = document.createElement("span");
    dot.className = `dot ${item.group.toLowerCase()}`;
  
    const nameArea = document.createElement("span");
    nameArea.className = "ats-name-area";
  
    const name = document.createElement("span");
    name.className = "ats-name";
    name.textContent = item.ats;
  
    const percentage = document.createElement("span");
    percentage.className = "ats-percentage";
    percentage.textContent = formatPercentage(item.overallPercentage);
  
    nameArea.append(name, percentage);
  
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
  
    row.append(dot, nameArea, priority, closeButton);
  
    row.addEventListener("click", () => {
      focusLinkedTab(item);
    });
  
    row.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        focusLinkedTab(item);
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
    const itemsBeforeClose = getSortedItems();
    const closingIndex = itemsBeforeClose.findIndex(
      candidate => candidate.tabId === item.tabId
    );
  
    const wasSelected = item.tabId === activeTabId;
  
    /*
     * If the selected row is being closed:
     * prefer the row immediately ABOVE it.
     *
     * If it was already the first row, fall back
     * to the row immediately below it.
     */
    let nextSelection = null;
  
    if (wasSelected && closingIndex >= 0) {
      nextSelection =
        itemsBeforeClose[closingIndex - 1] ??
        itemsBeforeClose[closingIndex + 1] ??
        null;
    }
  
    const response = await chrome.runtime.sendMessage({
      type: "CLOSE_TAB_WITH_POLICY",
      tabId: item.tabId,
      alsoCloseLeft: elements.closeLeftToggle.checked
    });
  
    if (!response?.ok) {
      console.error(
        "Failed to close tab:",
        response?.error
      );
      return;
    }
  
    const closed = response.closedTabIds ?? [];
  
    for (const tabId of closed) {
      delete tabState[tabId];
    }
  
    render();
  
    /*
     * Only change selection when the CLOSED row
     * was the currently selected/red-circle row.
     */
    if (
      wasSelected &&
      nextSelection &&
      !closed.includes(nextSelection.tabId)
    ) {
      await focusLinkedTab(nextSelection);
      return;
    }
  
    /*
     * Closing some other row should preserve
     * whatever Chrome tab is currently active.
     */
    await syncActiveTab({ scroll: false });
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
    elements.sortTabs.addEventListener("click", sortBrowserTabs);
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
