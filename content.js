(() => {
  "use strict";

  if (globalThis.__ATS_PRIORITIZER_CONTENT_LOADED__) return;
  globalThis.__ATS_PRIORITIZER_CONTENT_LOADED__ = true;

  const WATERMARK_ID = "__ats_priority_watermark__";
  const DEFAULT_POSITION = { x: 32, y: 32 };

  let lastUrl = null;
  let scheduled = false;
  //let dismissedUrl = null;

  async function getSettings() {
    return await chrome.storage.local.get({
      watermarkEnabled: true,
    });
  }

  async function refreshClassification(force = false) {
    scheduled = false;

    const currentUrl = window.location.href;
    const urlChanged = currentUrl !== lastUrl;

    //if (urlChanged) dismissedUrl = null;

    const settings = await getSettings();

    if (settings.watermarkEnabled === false) {
      lastUrl = currentUrl;
      removeWatermark();
      return;
    }

    // if (dismissedUrl === currentUrl) {
    //   lastUrl = currentUrl;
    //   removeWatermark();
    //   return;
    // }

    if (!force && !urlChanged) return;

    lastUrl = currentUrl;

    const result = globalThis.ATS_PRIORITY?.classify(currentUrl);

    if (!result) {
      removeWatermark();
      return;
    }

    renderWatermark(
      result,
      DEFAULT_POSITION
    );
  }

  function scheduleRefresh() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => refreshClassification(false));
  }

  function clampPosition(x, y, body) {
    const rect = body.getBoundingClientRect();

    const maxX = Math.max(8, window.innerWidth - rect.width - 8);
    const maxY = Math.max(8, window.innerHeight - rect.height - 8);

    return {
      x: Math.min(Math.max(8, x), maxX),
      y: Math.min(Math.max(8, y), maxY)
    };
  }

  function installDragBehavior(body, handle) {
    let dragging = false;
    let pointerId = null;
  
    let offsetX = 0;
    let offsetY = 0;
  
    let bodyWidth = 0;
    let bodyHeight = 0;
  
    let previousUserSelect = "";
  
  
    function stopDrag() {
      if (!dragging) return;
  
      dragging = false;
      body.classList.remove("dragging");
  
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("pointerup", stopDrag, true);
      window.removeEventListener("pointercancel", stopDrag, true);
      window.removeEventListener("blur", stopDrag);
  
      document.removeEventListener(
        "visibilitychange",
        onVisibilityChange
      );
  
      document.documentElement.style.userSelect =
        previousUserSelect;
  
      try {
        if (
          pointerId !== null &&
          handle.hasPointerCapture(pointerId)
        ) {
          handle.releasePointerCapture(pointerId);
        }
      } catch {}
  
      pointerId = null;
    }
  
  
    function onVisibilityChange() {
      if (document.hidden) stopDrag();
    }
  
  
    function onMove(event) {
      if (
        !dragging ||
        event.pointerId !== pointerId
      ) {
        return;
      }
  
      /*
       * Safety valve:
       * if Chrome missed pointerup because the mouse
       * was released outside the browser/handle,
       * stop as soon as we see the left button isn't down.
       */
      if ((event.buttons & 1) === 0) {
        stopDrag();
        return;
      }
  
      const maxX = Math.max(
        8,
        window.innerWidth - bodyWidth - 8
      );
  
      const maxY = Math.max(
        8,
        window.innerHeight - bodyHeight - 8
      );
  
      const x = Math.min(
        Math.max(8, event.clientX - offsetX),
        maxX
      );
  
      const y = Math.min(
        Math.max(8, event.clientY - offsetY),
        maxY
      );
  
      body.style.left = `${x}px`;
      body.style.top = `${y}px`;
    }
  
  
    handle.addEventListener("pointerdown", event => {
      if (
        event.button !== 0 ||
        dragging
      ) {
        return;
      }
  
      event.preventDefault();
      event.stopPropagation();
  
      const rect = body.getBoundingClientRect();
  
      dragging = true;
      pointerId = event.pointerId;
  
      /*
       * Calculate these ONCE rather than forcing
       * layout on every mouse movement.
       */
      bodyWidth = rect.width;
      bodyHeight = rect.height;
  
      offsetX = event.clientX - rect.left;
      offsetY = event.clientY - rect.top;
  
      body.classList.add("dragging");
  
      previousUserSelect =
        document.documentElement.style.userSelect;
  
      document.documentElement.style.userSelect =
        "none";
  
      try {
        handle.setPointerCapture(pointerId);
      } catch {}
  
      /*
       * Listen globally, not just on the drag strip.
       */
      window.addEventListener("pointermove", onMove, true);
      window.addEventListener("pointerup", stopDrag, true);
      window.addEventListener("pointercancel", stopDrag, true);
      window.addEventListener("blur", stopDrag);
  
      document.addEventListener(
        "visibilitychange",
        onVisibilityChange
      );
    });
  
  
    /*
     * Extra protection if Chrome/browser itself
     * unexpectedly releases pointer capture.
     */
    handle.addEventListener(
      "lostpointercapture",
      () => {
        if (dragging) stopDrag();
      }
    );
  }

  function formatOverallPercentage(
    value
  ) {
  
    if (
      value === null ||
      value === undefined ||
      !Number.isFinite(
        Number(value)
      )
    ) {
      return "—";
    }
  
  
    return (
      Number(value)
        .toFixed(2) +
      "%"
    );
  }

  function renderWatermark(result, savedPosition) {
    let watermark = document.getElementById(WATERMARK_ID);
  
    // Remove watermark DOM made by an older content-script version.
    if (watermark) {
      const shadow = watermark.shadowRoot;
  
      const valid =
        shadow &&
        shadow.querySelector(".watermark") &&
        shadow.querySelector(".ats-name") &&
        shadow.querySelector(".ats-percentage") &&
        shadow.querySelector(".priority");
  
      if (!valid) {
        watermark.remove();
        watermark = null;
      }
    }
  
    if (!watermark) {
      watermark = document.createElement("div");
      watermark.id = WATERMARK_ID;
      watermark.setAttribute("role", "status");

      const shadow = watermark.attachShadow({ mode: "open" });
      const style = document.createElement("style");

      style.textContent = `
        :host { all: initial; }

        .watermark {
          position: fixed;
          top: 32px;
          left: 32px;
          z-index: 2147483647;

          display: inline-flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;

          box-sizing: border-box;

          width: max-content;
          min-width: 320px;
          max-width: min(720px, calc(100vw - 64px));
          min-height: 118px;

          padding: 22px 56px 16px 78px;

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

          /* Page clicks pass through except for controls. */
          pointer-events: none;
        }

        .drag-handle {
          position: absolute;

          top: 0;
          left: 0;
          bottom: 0;

          width: 58px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 14px 0 0 14px;

          cursor: grab;

          color: rgba(255, 255, 255, 0.75);

          font-size: 18px;
          font-weight: 800;

          pointer-events: auto;
          touch-action: none;

          /*
          * Slight visual differentiation,
          * while preserving the watermark color.
          */
          background:
            rgba(255, 255, 255, 0.08);
        }


        .drag-handle:hover {
          background:
            rgba(255, 255, 255, 0.16);
        }


        .dragging .drag-handle {
          cursor: grabbing;

          background:
            rgba(255, 255, 255, 0.20);
        }

        .grip {
          font-size: 14px;
          line-height: 1;
        }

        .wm-close {
          position: absolute;

          top: 7px;
          right: 8px;

          width: 26px;
          height: 26px;

          padding: 0;

          display: grid;
          place-items: center;

          border: 0;
          border-radius: 5px;

          background: transparent;
          color: #ffffff;

          font-size: 22px;
          font-weight: 400;
          line-height: 1;

          cursor: pointer;

          pointer-events: auto;
        }


        .wm-close:hover {
          background:
            rgba(255, 255, 255, 0.16);
        }

        .ats-percentage {
          flex: 0 0 auto;

          color:
            rgba(
              255,
              255,
              255,
              0.68
            );

          font-size: 17px;
          font-weight: 700;
          line-height: 1;

          white-space: nowrap;
        }

        .priority {
          margin-top: 8px;
          font-size: 27px;
          font-weight: 800;
          line-height: 1.05;
          letter-spacing: 0.045em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .p0 { background: rgba(21, 128, 61, 0.72); }
        .p1 { background: rgba(37, 99, 235, 0.70); }
        .p2 { background: rgba(217, 119, 6, 0.70); }
        .p3 { background: rgba(220, 38, 38, 0.72); }
      `;

      const body = document.createElement("div");
      body.className = "watermark";
      body.innerHTML = `
        <div
          class="drag-handle"
          title="Drag watermark"
          aria-label="Drag watermark"
        >
          ⠿
        </div>

        <button
          class="wm-close"
          type="button"
          aria-label="Close watermark"
          title="Close watermark"
        >
          ×
        </button>

        <div class="ats-heading">
          <div class="ats-name"></div>
          <div class="ats-percentage"></div>
        </div>

        <div class="priority"></div>
      `;

      shadow.append(style, body);
      document.documentElement.appendChild(watermark);

      const handle = shadow.querySelector(".drag-handle");
      const closeButton = shadow.querySelector(".wm-close");

      installDragBehavior(body, handle);

      closeButton.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        // dismissedUrl = window.location.href;
        removeWatermark();
      });
    }

    const shadow = watermark.shadowRoot;
    const body = shadow.querySelector(".watermark");
    const name = shadow.querySelector(".ats-name");
    const percentage = shadow.querySelector(".ats-percentage");
    const priority = shadow.querySelector(".priority");

    body.classList.remove("p0", "p1", "p2", "p3");
    body.classList.add(result.group.toLowerCase());

    const watermarkLabel =
      result.priority.watermarkLabel ?? result.priority.label;

    if (name) {
      name.textContent = result.name;
    }
    
    if (percentage) {
      percentage.textContent =
        formatOverallPercentage(result.overallPercentage);
    }
    
    if (priority) {
      priority.textContent = watermarkLabel;
    }

    body.title =
      `${result.name}\n${watermarkLabel}\nMatched: ${result.matchedString}`;

    const position = savedPosition ?? DEFAULT_POSITION;
    body.style.left = `${position.x ?? 32}px`;
    body.style.top = `${position.y ?? 32}px`;

    requestAnimationFrame(() => {
      const rect = body.getBoundingClientRect();
      const clamped = clampPosition(rect.left, rect.top, body);
      body.style.left = `${clamped.x}px`;
      body.style.top = `${clamped.y}px`;
    });
  }

  function removeWatermark() {
    const watermark = document.getElementById(WATERMARK_ID);
    if (watermark) watermark.remove();
  }

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

  function installUrlObserver() {
    const observer = new MutationObserver(() => {
      if (window.location.href !== lastUrl) scheduleRefresh();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "PING_ATS_PRIORITIZER") {
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === "FORCE_ATS_REFRESH") {
      refreshClassification(true);
      sendResponse({ ok: true });
      return;
    }
  });

  chrome.storage.onChanged.addListener(
    (changes, areaName) => {
      if (
        areaName === "local" &&
        changes.watermarkEnabled
      ) {
        refreshClassification(true);
      }
    }
  );

  installHistoryHooks();
  installUrlObserver();
  refreshClassification(true);
})();
