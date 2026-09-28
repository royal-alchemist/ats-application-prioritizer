(() => {
  "use strict";

  const WATERMARK_ID = "__ats_priority_watermark__";

  let lastUrl = null;
  let scheduled = false;


  /**
   * Re-check the current URL and update the watermark.
   */
  function refreshClassification() {
    scheduled = false;

    const currentUrl = window.location.href;

    if (currentUrl === lastUrl) {
      return;
    }

    lastUrl = currentUrl;

    const result = globalThis.ATS_PRIORITY?.classify(currentUrl);

    if (!result) {
      removeWatermark();
      return;
    }

    renderWatermark(result);
  }


  /**
   * Avoid running multiple refreshes during rapid SPA changes.
   */
  function scheduleRefresh() {
    if (scheduled) {
      return;
    }

    scheduled = true;

    queueMicrotask(refreshClassification);
  }


  /**
   * Render or update the watermark.
   *
   * @param {object} result
   */
  function renderWatermark(result) {
    let watermark = document.getElementById(WATERMARK_ID);

    if (!watermark) {
      watermark = document.createElement("div");

      watermark.id = WATERMARK_ID;
      watermark.setAttribute("role", "status");
      watermark.setAttribute("aria-live", "polite");

      /*
       * Prevent host-page CSS from easily affecting the component.
       */
      const shadow = watermark.attachShadow({ mode: "open" });

      const style = document.createElement("style");

      style.textContent = `
        :host {
          all: initial;
        }

        .watermark {
          position: fixed;

          top: 128px;
          left: 150px;

          z-index: 2147483647;

          display: inline-flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;

          box-sizing: border-box;

          width: max-content;
          min-width: 320px;
          max-width: min(720px, calc(100vw - 180px));

          min-height: 118px;

          padding: 16px 22px;

          border-radius: 14px;

          font-family:
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Roboto,
            Helvetica,
            Arial,
            sans-serif;

          color: #ffffff;

          box-shadow:
            0 8px 28px rgba(0, 0, 0, 0.22),
            0 2px 6px rgba(0, 0, 0, 0.18);

          backdrop-filter: blur(2px);

          user-select: none;
          pointer-events: none;
        }

        .ats-name {
          font-size: 36px;
          font-weight: 850;
          line-height: 1.05;

          white-space: normal;
          overflow-wrap: anywhere;
        }

        .priority {
          margin-top: 8px;

          font-size: 27px;
          font-weight: 800;
          line-height: 1.05;

          letter-spacing: 0.045em;
          text-transform: uppercase;

          white-space: normal;
          overflow-wrap: anywhere;
        }

        .p0 {
          background: rgba(21, 128, 61, 0.72);
        }

        .p1 {
          background: rgba(37, 99, 235, 0.70);
        }

        .p2 {
          background: rgba(217, 119, 6, 0.70);
        }

        .p3 {
          background: rgba(220, 38, 38, 0.72);
        }
        `;

      const body = document.createElement("div");
      body.className = "watermark";

      body.innerHTML = `
        <div class="ats-name"></div>
        <div class="priority"></div>
      `;

      shadow.append(style, body);

      /*
       * document.documentElement exists earlier than document.body,
       * because the script runs at document_start.
       */
      document.documentElement.appendChild(watermark);
    }

    const shadow = watermark.shadowRoot;
    const body = shadow.querySelector(".watermark");
    const name = shadow.querySelector(".ats-name");
    const priority = shadow.querySelector(".priority");

    /*
     * Clear previous priority styling.
     */
    body.classList.remove("p0", "p1", "p2", "p3");

    body.classList.add(result.group.toLowerCase());

    name.textContent = result.name;
    priority.textContent = result.priority.label;

    /*
     * Helpful diagnostic info when hovering.
     */
    body.title =
      `${result.name}\n` +
      `${result.priority.message}\n` +
      `Matched: ${result.matchedString}`;
  }


  /**
   * Remove watermark if current page is not recognized.
   */
  function removeWatermark() {
    const watermark = document.getElementById(WATERMARK_ID);

    if (watermark) {
      watermark.remove();
    }
  }


  /**
   * Detect history.pushState() and history.replaceState().
   *
   * Many ATS sites behave as SPAs, so the browser may change URL
   * without reloading the page.
   */
  function installHistoryHooks() {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      const result = originalPushState.apply(this, args);
      scheduleRefresh();
      return result;
    };

    history.replaceState = function (...args) {
      const result = originalReplaceState.apply(this, args);
      scheduleRefresh();
      return result;
    };

    window.addEventListener("popstate", scheduleRefresh);
    window.addEventListener("hashchange", scheduleRefresh);
  }


  /**
   * Fallback for sites whose routing behavior isn't caught cleanly
   * by our history hooks.
   */
  function installUrlObserver() {
    const observer = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        scheduleRefresh();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }


  installHistoryHooks();
  installUrlObserver();

  /*
   * Initial classification.
   */
  refreshClassification();

})();