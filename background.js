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

const BUILTIN_HOSTS =
  new Set([
    "builtin.com",

    /*
     * Older / regional Built In domains.
     */
    "builtinnyc.com",
    "builtinchicago.org",
    "builtinaustin.com",
    "builtinboston.com",
    "builtincolorado.com",
    "builtinla.com",
    "builtinsf.com",
    "builtinseattle.com"
  ]);


function detectJobSiteKind(url) {

  if (!url) {
    return null;
  }


  try {

    const parsed =
      new URL(url);


    const host =
      parsed.hostname
        .toLowerCase()
        .replace(/^www\./, "");


    const path =
      parsed.pathname.toLowerCase();


    /*
     * HiringCafe
     */
    if (
      host === "hiring.cafe" ||
      host.endsWith(".hiring.cafe")
    ) {
      return "hiringcafe";
    }


    /*
     * Jobright
     *
     * Restrict to actual job-detail pages.
     */
    if (
      (
        host === "jobright.ai" ||
        host.endsWith(".jobright.ai")
      ) &&
      /^\/jobs\/info\/[^/]+\/?$/i.test(
        path
      )
    ) {
      return "jobright";
    }


    /*
     * Built In
     */
    if (
      BUILTIN_HOSTS.has(host) ||
      host.endsWith(".builtin.com")
    ) {
      return "builtin";
    }


    /*
     * RemoteRocketship
     */
    if (
      host === "remoterocketship.com" ||
      host.endsWith(
        ".remoterocketship.com"
      )
    ) {
      return "remoterocketship";
    }


    return null;


  } catch {

    return null;

  }
}

async function inspectApplyDestination(
  tabId,
  siteKind
) {

  try {

    const results =
      await chrome.scripting.executeScript({

        target: {
          tabId
        },


        /*
         * MAIN is useful for HiringCafe because
         * its React click handler can call
         * window.open().
         */
        world: "MAIN",


        args: [
          siteKind
        ],


        func: async siteKind => {

          const absoluteUrl =
            value => {

              if (!value) {
                return null;
              }

              try {

                return new URL(
                  value,
                  location.href
                ).href;

              } catch {

                return null;

              }

            };


          const anchorResult =
            (
              anchor,
              method
            ) => {

              if (!anchor) {
                return null;
              }


              const url =
                absoluteUrl(
                  anchor.getAttribute(
                    "href"
                  ) ||
                  anchor.href
                );


              if (!url) {
                return null;
              }


              return {
                found: true,
                url,
                method
              };

            };


          /*
           * ─────────────────────────
           * JOBRIGHT
           * ─────────────────────────
           */

          if (
            siteKind === "jobright"
          ) {

            /*
             * Exact current selector first.
             *
             * CSS-module hashes may change,
             * so also support prefix match.
             */
            const anchor =
              document.querySelector(
                "a.index_origin__e6tHu"
              ) ||
              document.querySelector(
                'a[class*="index_origin__"][href]'
              );


            return (
              anchorResult(
                anchor,
                "jobright-origin-anchor"
              ) ?? {
                found: false,
                reason:
                  "Jobright origin anchor not found"
              }
            );

          }


          /*
           * ─────────────────────────
           * BUILT IN
           * ─────────────────────────
           */

          if (
            siteKind === "builtin"
          ) {

            const anchor =
              document.querySelector(
                "a#applyButton[href]"
              );


            return (
              anchorResult(
                anchor,
                "builtin-applyButton"
              ) ?? {
                found: false,
                reason:
                  "Built In #applyButton not found"
              }
            );

          }


          /*
           * ─────────────────────────
           * REMOTE ROCKETSHIP
           * ─────────────────────────
           */

          if (
            siteKind ===
            "remoterocketship"
          ) {

            const anchors =
              [
                ...document.querySelectorAll(
                  "a[href]"
                )
              ];


            /*
             * Prefer a real Apply Now external link.
             *
             * This is much more stable than matching
             * Tailwind class names.
             */
            const anchor =
              anchors.find(
                element => {

                  const text =
                    element.textContent
                      ?.trim()
                      ?.replace(
                        /\s+/g,
                        " "
                      );


                  if (
                    !/^apply now$/i.test(
                      text ?? ""
                    )
                  ) {
                    return false;
                  }


                  try {

                    const destination =
                      new URL(
                        element.href,
                        location.href
                      );


                    return (
                      destination.hostname !==
                      location.hostname
                    );


                  } catch {

                    return false;

                  }

                }
              );


            return (
              anchorResult(
                anchor,
                "remoterocketship-apply-now"
              ) ?? {
                found: false,
                reason:
                  "RemoteRocketship Apply Now link not found"
              }
            );

          }


          /*
           * ─────────────────────────
           * HIRINGCAFE
           * ─────────────────────────
           */

          if (
            siteKind ===
            "hiringcafe"
          ) {

            const button =
              document.querySelector(
                'button[data-testid="job-page-apply"]'
              );


            if (!button) {

              return {
                found: false,
                reason:
                  "HiringCafe apply button not found"
              };

            }


            /*
             * Occasionally the button may be inside
             * or associated with an anchor.
             */
            const surroundingAnchor =
              button.closest(
                "a[href]"
              ) ||
              button.querySelector(
                "a[href]"
              );


            if (surroundingAnchor) {

              return anchorResult(
                surroundingAnchor,
                "hiringcafe-anchor"
              );

            }


            /*
             * Check common URL-bearing attributes.
             */
            const possibleAttributes =
              [
                "data-href",
                "data-url",
                "formaction"
              ];


            for (
              const attribute
              of possibleAttributes
            ) {

              const raw =
                button.getAttribute(
                  attribute
                );


              const url =
                absoluteUrl(raw);


              if (url) {

                return {
                  found: true,
                  url,
                  method:
                    `hiringcafe-${attribute}`
                };

              }

            }


            /*
             * HiringCafe's React button often opens
             * the employer URL from its onclick logic.
             *
             * Temporarily intercept both:
             *
             *   window.open(...)
             *
             * and dynamically-created
             *
             *   <a>.click()
             *
             * so the site reveals the target without
             * actually creating a popup itself.
             */

            let capturedUrl =
              null;


            const originalWindowOpen =
              window.open;


            const originalAnchorClick =
              HTMLAnchorElement
                .prototype
                .click;


            try {

              window.open =
                function (
                  url
                ) {

                  capturedUrl =
                    absoluteUrl(url);


                  /*
                   * Minimal Window-like object in case
                   * their handler immediately calls
                   * .focus().
                   */
                  return {
                    focus() {},
                    close() {},
                    closed: false
                  };

                };


              HTMLAnchorElement
                .prototype
                .click =
                function () {

                  if (this.href) {

                    capturedUrl =
                      absoluteUrl(
                        this.href
                      );

                    return;

                  }


                  return originalAnchorClick
                    .apply(
                      this,
                      arguments
                    );

                };


              button.click();


              /*
               * Give React/event code a brief window
               * for asynchronous URL generation.
               */
              await new Promise(
                resolve =>
                  setTimeout(
                    resolve,
                    350
                  )
              );


            } finally {

              window.open =
                originalWindowOpen;


              HTMLAnchorElement
                .prototype
                .click =
                originalAnchorClick;

            }


            if (capturedUrl) {

              return {
                found: true,
                url:
                  capturedUrl,
                method:
                  "hiringcafe-click-capture"
              };

            }


            /*
             * Last-resort fallback.
             *
             * HiringCafe often exposes an
             * "Original Job Post" anchor separately.
             */
            const originalPost =
              [
                ...document.querySelectorAll(
                  "a[href]"
                )
              ].find(
                element =>
                  /original job post/i.test(
                    element.textContent ??
                    ""
                  )
              );


            if (originalPost) {

              return anchorResult(
                originalPost,
                "hiringcafe-original-job-post"
              );

            }


            return {
              found: false,
              reason:
                "HiringCafe destination URL could not be resolved"
            };

          }


          return {
            found: false,
            reason:
              "Unknown source site"
          };

        }

      });


    return (
      results?.[0]?.result ??
      null
    );


  } catch (error) {

    return {
      found: false,
      reason:
        error.message
    };

  }
}

async function openRightOfSource(
  sourceTabId,
  destinationUrl
) {

  /*
   * Fetch the source tab NOW.
   *
   * Its index may have changed because application
   * tabs opened earlier in this same batch.
   */
  const sourceTab =
    await chrome.tabs.get(
      sourceTabId
    );


  /*
   * Avoid exact duplicate tabs when the user
   * accidentally presses ↗ twice.
   */
  const existing =
    await chrome.tabs.query({
      windowId:
        sourceTab.windowId
    });


  const alreadyOpen =
    existing.some(
      tab =>
        tab.url ===
        destinationUrl
    );


  if (alreadyOpen) {

    return {
      opened: false,
      alreadyOpen: true
    };

  }


  await chrome.tabs.create({

    windowId:
      sourceTab.windowId,

    /*
     * Directly after source job-site tab.
     */
    index:
      sourceTab.index + 1,

    url:
      destinationUrl,

    /*
     * Don't jump around while processing.
     */
    active:
      false

  });


  return {
    opened: true,
    alreadyOpen: false
  };
}

async function openAllApplicationPages() {

  /*
   * The side panel belongs conceptually to the
   * currently focused Chrome window.
   */
  const currentWindow =
    await chrome.windows.getLastFocused({
      windowTypes: [
        "normal"
      ]
    });


  if (
    currentWindow?.id == null
  ) {
    throw new Error(
      "No active Chrome window"
    );
  }


  let tabs =
    await chrome.tabs.query({
      windowId:
        currentWindow.id
    });


  /*
   * IMPORTANT:
   *
   * Inspect in exactly the user's visual order:
   *
   * left → right.
   */
  tabs.sort(
    (a, b) =>
      a.index - b.index
  );


  let recognized = 0;
  let opened = 0;
  let alreadyOpen = 0;
  let notFound = 0;
  let failed = 0;


  for (const tab of tabs) {

    if (
      tab.id == null
    ) {
      continue;
    }


    const siteKind =
      detectJobSiteKind(
        tab.url
      );


    if (!siteKind) {
      continue;
    }


    recognized++;


    try {

      const destination =
        await inspectApplyDestination(
          tab.id,
          siteKind
        );


      if (
        !destination?.found ||
        !destination.url
      ) {

        notFound++;

        console.debug(
          "Apply destination not found:",
          siteKind,
          tab.url,
          destination?.reason
        );

        continue;

      }


      const result =
        await openRightOfSource(
          tab.id,
          destination.url
        );


      if (
        result.alreadyOpen
      ) {

        alreadyOpen++;

      } else if (
        result.opened
      ) {

        opened++;

      }


    } catch (error) {

      failed++;

      console.error(
        "Failed to open application page:",
        siteKind,
        tab.url,
        error
      );

    }

  }


  /*
   * Let the newly opened ATS pages immediately
   * appear in Prioritizer.
   */
  await rebuildTabState();


  return {
    recognized,
    opened,
    alreadyOpen,
    notFound,
    failed
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (
    message?.type ===
    "OPEN_ALL_APPLICATION_PAGES"
  ) {
  
    openAllApplicationPages()
      .then(result => {
  
        sendResponse({
          ok: true,
          ...result
        });
  
      })
      .catch(error => {
  
        console.error(
          "Bulk application-page opening failed:",
          error
        );
  
  
        sendResponse({
          ok: false,
          error:
            error.message
        });
  
      });
  
  
    return true;
  }

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
