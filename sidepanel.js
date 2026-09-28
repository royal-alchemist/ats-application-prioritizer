(() => {
  "use strict";


  const elements = {
    themeToggle:
      document.getElementById("themeToggle"),

    countP0:
      document.getElementById("countP0"),

    countP1:
      document.getElementById("countP1"),

    countP2:
      document.getElementById("countP2"),

    countP3:
      document.getElementById("countP3"),

    tabList:
      document.getElementById("tabList"),

    emptyState:
      document.getElementById("emptyState"),

    reprioritize:
      document.getElementById("reprioritize"),

    watermarkToggle:
      document.getElementById("watermarkToggle")
  };


  let tabState = {};


  async function init() {
    await loadSettings();

    bindEvents();

    await loadTabState();
  }


  /*
   * SETTINGS
   */

  async function loadSettings() {
    const settings =
      await chrome.storage.local.get([
        "theme",
        "watermarkEnabled"
      ]);


    const preferredTheme =
      window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches
        ? "dark"
        : "light";


    applyTheme(
      settings.theme ?? preferredTheme
    );


    elements.watermarkToggle.checked =
      settings.watermarkEnabled !== false;
  }


  async function toggleTheme() {
    const current =
      document.documentElement.dataset.theme;

    const next =
      current === "dark"
        ? "light"
        : "dark";

    applyTheme(next);

    await chrome.storage.local.set({
      theme: next
    });
  }


  function applyTheme(theme) {
    document.documentElement.dataset.theme =
      theme;

    elements.themeToggle.textContent =
      theme === "dark"
        ? "☀"
        : "☾";
  }


  /*
   * TAB STATE
   */

  async function loadTabState() {
    const response =
      await chrome.runtime.sendMessage({
        type: "GET_TAB_STATE"
      });


    if (!response?.ok) {
      return;
    }


    tabState =
      response.state ?? {};


    render();
  }


  /*
   * RENDER
   */

  function render() {
    const items =
      Object.values(tabState);


    const priorityOrder = {
      P0: 0,
      P1: 1,
      P2: 2,
      P3: 3
    };


    items.sort((a, b) => {
      const priorityDifference =
        priorityOrder[a.group] -
        priorityOrder[b.group];


      if (priorityDifference !== 0) {
        return priorityDifference;
      }


      return a.ats.localeCompare(b.ats);
    });


    renderCounts(items);

    renderRows(items);
  }


  function renderCounts(items) {
    const counts = {
      P0: 0,
      P1: 0,
      P2: 0,
      P3: 0
    };


    for (const item of items) {
      if (counts[item.group] !== undefined) {
        counts[item.group]++;
      }
    }


    elements.countP0.textContent =
      counts.P0;

    elements.countP1.textContent =
      counts.P1;

    elements.countP2.textContent =
      counts.P2;

    elements.countP3.textContent =
      counts.P3;
  }


  function renderRows(items) {
    elements.tabList.innerHTML = "";


    elements.emptyState.classList.toggle(
      "visible",
      items.length === 0
    );


    for (const item of items) {
      const row =
        createRow(item);

      elements.tabList.appendChild(row);
    }
  }


  function createRow(item) {

    const row =
      document.createElement("div");
  
  
    row.className =
      "tab-entry";
  
    row.setAttribute(
      "role",
      "button"
    );
  
    row.tabIndex = 0;
  
  
    /*
     * Priority dot
     */
    const dot =
      document.createElement("span");
  
    dot.className =
      `dot ${item.group.toLowerCase()}`;
  
  
    /*
     * ATS name
     */
    const name =
      document.createElement("span");
  
    name.className =
      "ats-name";
  
    name.textContent =
      item.ats;
  
  
    /*
     * TOP / HIGH / MEDIUM / SKIP
     */
    const priority =
      document.createElement("span");
  
    priority.className =
      "priority-label";
  
    priority.textContent =
      item.priorityLabel;
  
  
    row.append(
      dot,
      name,
      priority
    );
  
  
    /*
     * Only P3 gets a close-tab button.
     */
    if (item.group === "P3") {
  
      const closeButton =
        document.createElement("button");
  
  
      closeButton.type =
        "button";
  
      closeButton.className =
        "close-tab";
  
  
      closeButton.textContent =
        "×";
  
  
      closeButton.title =
        "Close this tab";
  
  
      closeButton.setAttribute(
        "aria-label",
        `Close ${item.ats} tab`
      );
  
  
      closeButton.addEventListener(
        "click",
        event => {
  
          /*
           * Do NOT activate the P3 tab first.
           */
          event.stopPropagation();
  
          closeLinkedTab(item);
        }
      );
  
  
      row.appendChild(
        closeButton
      );
    }
  
  
    /*
     * Clicking anywhere else jumps to the tab.
     */
    row.addEventListener(
      "click",
      () => {
        focusTab(item);
      }
    );
  
  
    /*
     * Keyboard accessibility.
     */
    row.addEventListener(
      "keydown",
      event => {
  
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();
  
          focusTab(item);
        }
  
      }
    );
  
  
    return row;
  }


  /*
   * TAB NAVIGATION
   */

  async function focusTab(item) {
    await chrome.runtime.sendMessage({
      type: "FOCUS_TAB",

      tabId:
        item.tabId,

      windowId:
        item.windowId
    });
  }

  async function closeLinkedTab(item) {

    const response =
      await chrome.runtime.sendMessage({
        type: "CLOSE_TAB",
        tabId: item.tabId
      });
  
  
    if (!response?.ok) {
      console.error(
        "Failed to close tab:",
        response?.error
      );
  
      return;
    }
  
  
    /*
     * Optimistic UI update.
     *
     * background.js will also update storage via
     * tabs.onRemoved, so this just makes it instant.
     */
    delete tabState[item.tabId];
  
    render();
  }

  /*
   * RE-PRIORITIZE
   */

  async function reprioritize() {
    elements.reprioritize.disabled =
      true;


    elements.reprioritize.textContent =
      "RE-PRIORITIZING…";


    try {
      const response =
        await chrome.runtime.sendMessage({
          type: "REPRIORITIZE"
        });


      if (response?.ok) {
        tabState =
          response.state ?? {};

        render();
      }

    } finally {

      elements.reprioritize.disabled =
        false;

      elements.reprioritize.textContent =
        "RE-PRIORITIZE";
    }
  }


  /*
   * WATERMARK
   */

  async function setWatermark(enabled) {
    await chrome.storage.local.set({
      watermarkEnabled: enabled
    });
  }


  /*
   * LIVE SYNCHRONIZATION
   *
   * background.js writes classifiedTabs whenever
   * tabs open/close/change.
   *
   * storage.onChanged fires while the sidebar is open.
   */

  function installStateListener() {
    chrome.storage.onChanged.addListener(
      (changes, areaName) => {

        if (
          areaName === "session" &&
          changes.classifiedTabs
        ) {

          tabState =
            changes.classifiedTabs.newValue ?? {};

          render();
        }
      }
    );
  }


  /*
   * EVENTS
   */

  function bindEvents() {
    elements.themeToggle.addEventListener(
      "click",
      toggleTheme
    );


    elements.reprioritize.addEventListener(
      "click",
      reprioritize
    );


    elements.watermarkToggle.addEventListener(
      "change",
      event => {
        setWatermark(
          event.target.checked
        );
      }
    );


    installStateListener();
  }


  init();

})();