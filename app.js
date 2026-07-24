const CONFIG = {
  contactEmail: "Ae.th.ry.on.ex.is@proton.me",
  // Local: "http://127.0.0.1:10000". Production: "https://your-render-service.onrender.com".
  backendUrl: "",
  // GOOGLE ANALYTICS 4: paste your Measurement ID (e.g. "G-XXXXXXXXXX") to enable analytics —
  // including per-section view + dwell-time tracking. Leave "" to load no analytics at all.
  gaMeasurementId: ""
};

(function () {
  "use strict";

  const root = document.documentElement;
  root.classList.add("has-js");

  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        root.classList.add("is-ready");
      });
    });
  } else {
    root.classList.add("is-ready");
  }

  initLoader();
  initScrollSpy();
  initReveals();
  initMagnetic();
  initQuiz();
  initNudge();
  initModal();
  initAnalytics();

  // The name rail is a scroll-spy: the section crossing a stable viewport line owns the active syllable.
  function initScrollSpy() {
    const links = Array.from(document.querySelectorAll(".index-link[data-target]"));
    const sections = Array.from(document.querySelectorAll("[data-section]"));

    if (links.length === 0 || sections.length === 0) {
      return;
    }

    let framePending = false;

    function setActive(sectionId) {
      links.forEach(function (link) {
        const isCurrent = link.dataset.target === sectionId;
        link.classList.toggle("is-active", isCurrent);

        if (isCurrent) {
          link.setAttribute("aria-current", "location");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    }

    function syncActiveSection() {
      const referenceLine = window.innerHeight * 0.38;
      let activeId = sections[0].dataset.section || "";

      sections.forEach(function (section) {
        const bounds = section.getBoundingClientRect();
        if (bounds.top <= referenceLine) {
          activeId = section.dataset.section || activeId;
        }
      });

      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
        activeId = sections[sections.length - 1].dataset.section || activeId;
      }

      setActive(activeId);
      framePending = false;
    }

    function requestSync() {
      if (framePending) {
        return;
      }

      framePending = true;
      if (typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(syncActiveSection);
      } else {
        syncActiveSection();
      }
    }

    links.forEach(function (link) {
      link.addEventListener("click", function () {
        const targetId = link.dataset.target;
        if (targetId) {
          setActive(targetId);
        }
      });
    });

    window.addEventListener("scroll", requestSync, { passive: true });
    window.addEventListener("resize", requestSync);
    window.addEventListener("hashchange", requestSync);
    syncActiveSection();
  }

  // Reveal .reveal elements as they enter view. .has-js hides them first, so no-JS shows everything.
  function initReveals() {
    const items = Array.from(document.querySelectorAll(".reveal"));
    if (items.length === 0) {
      return;
    }

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || typeof window.IntersectionObserver !== "function") {
      items.forEach(function (el) {
        el.classList.add("in");
      });
      return;
    }

    const observer = new window.IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
    );

    items.forEach(function (el) {
      observer.observe(el);
    });
  }

  // Subtle magnetic pull on primary buttons (pointer devices only; skipped for reduced motion / touch).
  function initMagnetic() {
    const noHover =
      typeof window.matchMedia !== "function" ||
      !window.matchMedia("(hover: hover)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (noHover) {
      return;
    }

    const strength = 14;
    Array.from(document.querySelectorAll("[data-magnetic]")).forEach(function (btn) {
      btn.addEventListener("pointermove", function (event) {
        const rect = btn.getBoundingClientRect();
        const mx = (event.clientX - rect.left - rect.width / 2) / rect.width;
        const my = (event.clientY - rect.top - rect.height / 2) / rect.height;
        btn.style.transform = "translate(" + mx * strength + "px," + my * strength + "px)";
      });
      btn.addEventListener("pointerleave", function () {
        btn.style.transform = "";
      });
    });
  }

  // The quiz uses one state object for selection, navigation, summary, mailto, and clipboard output.
  function initQuiz() {
    const form = document.querySelector("#scope-form");
    if (!form) {
      return;
    }

    const progress = form.querySelector("#quiz-progress");
    const summary = form.querySelector("#scope-summary");
    const emailInput = form.querySelector("#contact-email");
    const emailError = form.querySelector("#email-error");
    const noteInput = form.querySelector("#contact-note");
    const honeypotInput = form.querySelector("#contact-company");
    const copyButton = form.querySelector("#copy-brief");
    const copyStatus = form.querySelector("#copy-status");
    const confirmation = form.querySelector("#transmit-confirmation");
    const panels = Array.from(form.querySelectorAll("[data-panel]"));
    const choiceButtons = Array.from(form.querySelectorAll(".choice-chip[data-key][data-value]"));
    const backButtons = Array.from(form.querySelectorAll("[data-back]"));
    const keys = ["domain", "stage", "timeline"];
    const state = {
      step: 0,
      answers: {
        domain: "",
        stage: "",
        timeline: ""
      }
    };
    const formReadyAt = Date.now(); // time-trap baseline for spam detection

    if (panels.length === 0 || choiceButtons.length === 0) {
      return;
    }

    function firstIncompleteStep() {
      return keys.findIndex(function (key) {
        return !state.answers[key];
      });
    }

    function syncChoiceStates() {
      choiceButtons.forEach(function (button) {
        const key = button.dataset.key || "";
        const value = button.dataset.value || "";
        const isSelected = Boolean(key && value && state.answers[key] === value);
        button.classList.toggle("is-selected", isSelected);
        button.setAttribute("aria-pressed", String(isSelected));
      });
    }

    function updateSummary() {
      if (!summary) {
        return;
      }

      summary.textContent = [
        "> SCOPE",
        "  domain    : " + (state.answers.domain || "—"),
        "  stage     : " + (state.answers.stage || "—"),
        "  timeline  : " + (state.answers.timeline || "—")
      ].join("\n");
    }

    function focusPanel(panelKey, preferSelected) {
      const currentPanel = panels.find(function (panel) {
        return panel.dataset.panel === panelKey;
      });

      if (!currentPanel) {
        return;
      }

      if (preferSelected && panelKey !== "reveal") {
        const selectedButton = choiceButtons.find(function (button) {
          return (
            button.dataset.key === panelKey &&
            button.dataset.value === state.answers[panelKey]
          );
        });

        if (selectedButton) {
          selectedButton.focus();
          return;
        }
      }

      const focusTarget = currentPanel.querySelector(
        panelKey === "reveal" ? ".reveal-label" : ".quiz-question"
      );
      if (focusTarget && typeof focusTarget.focus === "function") {
        focusTarget.focus();
      }
    }

    function showStep(nextStep, moveFocus, preferSelected) {
      let safeStep = Math.max(0, Math.min(3, nextStep));
      const missingStep = firstIncompleteStep();

      if (safeStep === 3 && missingStep !== -1) {
        safeStep = missingStep;
      }

      state.step = safeStep;
      const panelKey = safeStep === 3 ? "reveal" : keys[safeStep];

      panels.forEach(function (panel) {
        panel.hidden = panel.dataset.panel !== panelKey;
      });

      if (progress) {
        progress.textContent =
          String(Math.min(safeStep + 1, 3)).padStart(2, "0") + " / 03";
      }

      syncChoiceStates();

      if (safeStep === 3) {
        updateSummary();
      } else {
        if (copyStatus) {
          copyStatus.textContent = "";
        }
        if (confirmation) {
          confirmation.hidden = true;
        }
      }

      if (moveFocus) {
        focusPanel(panelKey, preferSelected);
      }
    }

    choiceButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        const key = button.dataset.key || "";
        const value = button.dataset.value || "";
        const selectedStep = keys.indexOf(key);

        if (selectedStep === -1 || !value) {
          return;
        }

        state.answers[key] = value;
        showStep(Math.min(selectedStep + 1, 3), true, false);
      });

      button.addEventListener("keydown", function (event) {
        const group = button.closest(".chip-group");
        if (!group) {
          return;
        }

        const groupButtons = Array.from(group.querySelectorAll(".choice-chip"));
        const currentIndex = groupButtons.indexOf(button);
        if (currentIndex === -1 || groupButtons.length === 0) {
          return;
        }

        let targetIndex = currentIndex;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          targetIndex = (currentIndex + 1) % groupButtons.length;
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          targetIndex = (currentIndex - 1 + groupButtons.length) % groupButtons.length;
        } else if (event.key === "Home") {
          targetIndex = 0;
        } else if (event.key === "End") {
          targetIndex = groupButtons.length - 1;
        } else {
          return;
        }

        event.preventDefault();
        groupButtons[targetIndex].focus();
      });
    });

    backButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        const targetStep = Number.parseInt(button.dataset.back || "", 10);
        if (!Number.isInteger(targetStep) || targetStep < 0 || targetStep > 2) {
          return;
        }
        showStep(targetStep, true, true);
      });
    });

    function isEmailValid() {
      if (!emailInput) {
        return false;
      }
      return emailInput.value.trim() !== "" && emailInput.validity.valid;
    }

    function clearEmailError() {
      if (emailInput) {
        emailInput.setAttribute("aria-invalid", "false");
      }
      if (emailError) {
        emailError.hidden = true;
      }
    }

    function showEmailError() {
      if (emailInput) {
        emailInput.setAttribute("aria-invalid", "true");
        emailInput.focus();
      }
      if (emailError) {
        emailError.hidden = false;
      }
    }

    if (emailInput) {
      emailInput.addEventListener("input", function () {
        if (isEmailValid()) {
          clearEmailError();
        }
      });
    }

    function buildPlainText(contactEmail) {
      const note =
        noteInput && noteInput.value.trim() !== "" ? noteInput.value.trim() : "—";

      return [
        "New build inquiry via aethryonexis site.",
        "",
        "Domain    : " + state.answers.domain,
        "Stage     : " + state.answers.stage,
        "Timeline  : " + state.answers.timeline,
        "Contact   : " + (contactEmail || "—"),
        "",
        "Note:",
        note
      ].join("\n");
    }

    function mailtoHref(subject, body) {
      return (
        "mailto:" +
        CONFIG.contactEmail +
        "?subject=" +
        encodeURIComponent(subject) +
        "&body=" +
        encodeURIComponent(body)
      );
    }

    function backendHref(path) {
      return CONFIG.backendUrl.replace(/\/+$/, "") + path;
    }

    async function submitTicket(contactEmail) {
      if (!CONFIG.backendUrl || typeof window.fetch !== "function") {
        return { sent: false };
      }

      const response = await window.fetch(backendHref("/api/tickets"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          domain: state.answers.domain,
          stage: state.answers.stage,
          timeline: state.answers.timeline,
          email: contactEmail,
          note: noteInput ? noteInput.value.trim() : "",
          company: honeypotInput ? honeypotInput.value : "",
          startedAt: formReadyAt
        })
      });

      return { sent: response.ok };
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      const missingStep = firstIncompleteStep();
      if (missingStep !== -1) {
        showStep(missingStep, true, false);
        return;
      }

      if (!isEmailValid() || !emailInput) {
        showEmailError();
        return;
      }

      clearEmailError();

      // Spam handling without a CAPTCHA: silently drop honeypot hits and implausibly fast submits.
      const honeyFilled = honeypotInput && honeypotInput.value.trim() !== "";
      const tooFast = Date.now() - formReadyAt < 2500;
      if (honeyFilled || tooFast) {
        if (confirmation) {
          confirmation.hidden = false;
        }
        return;
      }

      const contactEmail = emailInput.value.trim();
      const submitBtn = form.querySelector(".transmit-button");
      const plaintext = buildPlainText(contactEmail);

      if (submitBtn) {
        submitBtn.disabled = true;
      }
      if (copyStatus) {
        copyStatus.textContent = CONFIG.backendUrl ? "Sending..." : "Opening your mail app...";
      }

      const subject =
        "[SCOPE] " +
        state.answers.domain +
        " · " +
        state.answers.stage +
        " · " +
        state.answers.timeline;

      function finish(message) {
        if (submitBtn) {
          submitBtn.disabled = false;
        }
        if (copyStatus) {
          copyStatus.textContent = message || "";
        }
        if (confirmation) {
          confirmation.hidden = false;
        }
      }

      submitTicket(contactEmail)
        .then(function (result) {
          if (result.sent) {
            finish("Sent.");
            return;
          }

          window.location.href = mailtoHref(subject, plaintext);
          window.setTimeout(function () {
            finish("");
          }, 700);
        })
        .catch(function () {
          window.location.href = mailtoHref(subject, plaintext);
          window.setTimeout(function () {
            finish("Network issue - opened your mail app instead.");
          }, 700);
        });
    });

    function legacyCopy(text) {
      const previousFocus = document.activeElement;
      const copyArea = document.createElement("textarea");
      let copied = false;

      copyArea.value = text;
      copyArea.setAttribute("readonly", "");
      copyArea.setAttribute("aria-hidden", "true");
      copyArea.style.position = "fixed";
      copyArea.style.top = "0";
      copyArea.style.left = "0";
      copyArea.style.width = "1px";
      copyArea.style.height = "1px";
      copyArea.style.padding = "0";
      copyArea.style.border = "0";
      copyArea.style.opacity = "0";
      document.body.appendChild(copyArea);

      try {
        copyArea.focus({ preventScroll: true });
      } catch (error) {
        copyArea.focus();
      }

      copyArea.select();
      copyArea.setSelectionRange(0, copyArea.value.length);

      try {
        copied =
          typeof document.execCommand === "function" && document.execCommand("copy");
      } catch (error) {
        copied = false;
      } finally {
        copyArea.remove();
        if (previousFocus && typeof previousFocus.focus === "function") {
          previousFocus.focus();
        }
      }

      return copied;
    }

    async function copyText(text) {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch (error) {
          return legacyCopy(text);
        }
      }

      return legacyCopy(text);
    }

    if (copyButton) {
      copyButton.addEventListener("click", async function () {
        const contactEmail = emailInput ? emailInput.value.trim() : "";
        const copied = await copyText(buildPlainText(contactEmail));

        if (copyStatus) {
          copyStatus.textContent = copied
            ? "Copied."
            : "Copy unavailable — select the brief above.";
        }
      });
    }

    showStep(0, false, false);
  }

  // Persistent floating nudge — always visible; focuses the quiz when used.
  function initNudge() {
    const nudge = document.querySelector("#nudge-cta");
    const contact = document.querySelector("#is");
    if (!nudge) {
      return;
    }
    nudge.addEventListener("click", function () {
      window.setTimeout(function () {
        const question = contact && contact.querySelector(".quiz-question");
        if (question && typeof question.focus === "function") {
          question.focus();
        }
      }, 520);
    });
  }

  // Hide the loading overlay once the page is ready (CSS auto-hides too, as a fallback).
  function initLoader() {
    const loader = document.querySelector("#loader");
    if (!loader) {
      return;
    }
    function done() {
      loader.classList.add("loader--done");
      window.setTimeout(function () {
        if (loader.parentNode) {
          loader.parentNode.removeChild(loader);
        }
      }, 600);
    }
    if (document.readyState === "complete") {
      window.setTimeout(done, 300);
    } else {
      window.addEventListener("load", function () {
        window.setTimeout(done, 300);
      });
    }
  }

  // Post-load contact popup — once per session, focus-trapped, closes on ESC / backdrop / buttons.
  function initModal() {
    const backdrop = document.querySelector("#lead-modal");
    if (!backdrop) {
      return;
    }
    const dialog = backdrop.querySelector(".modal");
    const closeBtn = backdrop.querySelector("#modal-close");
    const dismissBtn = backdrop.querySelector("#modal-dismiss");
    const cta = backdrop.querySelector("#modal-cta");
    const storeKey = "aethryonexis_lead_seen";
    let lastFocus = null;

    function seen() {
      try {
        return window.sessionStorage.getItem(storeKey) === "1";
      } catch (e) {
        return false;
      }
    }
    function markSeen() {
      try {
        window.sessionStorage.setItem(storeKey, "1");
      } catch (e) {}
    }

    function onKey(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key === "Tab" && dialog) {
        const f = Array.from(dialog.querySelectorAll("a[href], button:not([disabled])"));
        if (f.length === 0) {
          return;
        }
        const first = f[0];
        const last = f[f.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    function open() {
      if (!backdrop.hidden) {
        return;
      }
      lastFocus = document.activeElement;
      backdrop.hidden = false;
      window.requestAnimationFrame(function () {
        backdrop.classList.add("open");
      });
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", onKey, true);
      if (closeBtn && typeof closeBtn.focus === "function") {
        closeBtn.focus();
      }
    }

    function close() {
      backdrop.classList.remove("open");
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = "";
      markSeen();
      window.setTimeout(function () {
        backdrop.hidden = true;
      }, 380);
      if (lastFocus && typeof lastFocus.focus === "function") {
        lastFocus.focus();
      }
    }

    backdrop.addEventListener("click", function (event) {
      if (event.target === backdrop) {
        close();
      }
    });
    if (closeBtn) {
      closeBtn.addEventListener("click", close);
    }
    if (dismissBtn) {
      dismissBtn.addEventListener("click", close);
    }
    if (cta) {
      cta.addEventListener("click", function () {
        close();
        window.setTimeout(function () {
          const q = document.querySelector("#is .quiz-question");
          if (q && typeof q.focus === "function") {
            q.focus();
          }
        }, 560);
      });
    }

    if (!seen()) {
      const trigger = function () {
        window.setTimeout(open, 2400);
      };
      if (document.readyState === "complete") {
        trigger();
      } else {
        window.addEventListener("load", trigger);
      }
    }
  }

  function initAnalytics() {
    const measurementId = (CONFIG.gaMeasurementId || "").trim();
    if (!/^G-[A-Z0-9]+$/i.test(measurementId)) {
      return;
    }

    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function () {
        window.dataLayer.push(arguments);
      };
    window.gtag("js", new Date());
    window.gtag("config", measurementId, { send_page_view: true });

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(measurementId);
    document.head.appendChild(script);

    trackSectionAnalytics();
  }

  function trackSectionAnalytics() {
    if (typeof window.gtag !== "function" || typeof window.IntersectionObserver !== "function") {
      return;
    }

    const sectionState = new Map();
    let activeSection = null;
    let activeSince = 0;

    function sendDwell(sectionId, durationMs) {
      if (!sectionId || durationMs < 1000) {
        return;
      }
      window.gtag("event", "section_dwell", {
        section_id: sectionId,
        duration_ms: Math.round(durationMs)
      });
    }

    function setActiveSection(sectionId) {
      const now = performance.now();
      if (activeSection && activeSection !== sectionId) {
        sendDwell(activeSection, now - activeSince);
      }
      activeSection = sectionId;
      activeSince = now;
    }

    const observer = new window.IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          const sectionId = entry.target.getAttribute("data-section");
          if (!sectionId) {
            return;
          }

          sectionState.set(sectionId, entry.intersectionRatio);
          if (entry.isIntersecting && !entry.target.dataset.analyticsSeen) {
            entry.target.dataset.analyticsSeen = "true";
            window.gtag("event", "section_view", { section_id: sectionId });
          }
        });

        let strongestId = null;
        let strongestRatio = 0;
        sectionState.forEach(function (ratio, sectionId) {
          if (ratio > strongestRatio) {
            strongestRatio = ratio;
            strongestId = sectionId;
          }
        });
        if (strongestId) {
          setActiveSection(strongestId);
        }
      },
      { threshold: [0.25, 0.5, 0.75] }
    );

    Array.from(document.querySelectorAll("[data-section]")).forEach(function (section) {
      observer.observe(section);
    });

    window.addEventListener("pagehide", function () {
      if (activeSection) {
        sendDwell(activeSection, performance.now() - activeSince);
      }
    });
  }
})();
