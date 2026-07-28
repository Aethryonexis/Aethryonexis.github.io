const CONFIG = {
  contactEmail: "Ae.th.ry.on.ex.is@proton.me",
  // Local: "http://127.0.0.1:10000". Production: "https://your-render-service.onrender.com".
  backendUrl: "https://aethryonexis-backend.onrender.com",
  // GOOGLE ANALYTICS 4: paste your Measurement ID (e.g. "G-XXXXXXXXXX") to enable analytics —
  // including per-section view + dwell-time tracking. Leave "" to load no analytics at all.
  gaMeasurementId: "G-KWZG6QZBX5"
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
  initDecrypt();
  initScrollSpy();
  initReveals();
  initMagnetic();
  initTilt();
  initQuiz();
  initNudge();
  initModal();
  initMenu();
  initChromeState();
  initCursorGlow();
  initAnalytics();
  initBackendWarmup();
  initParallax();
  initSmoothScroll();
  initScrollProgress();

  // The name rail is a scroll-spy: the section crossing a stable viewport line owns the active syllable.
  function initScrollSpy() {
    const links = Array.from(document.querySelectorAll(".index-link[data-target]"));
    const sections = Array.from(document.querySelectorAll("[data-section]"));

    if (links.length === 0 || sections.length === 0) {
      return;
    }

    let framePending = false;
    const pill = document.querySelector("#rail-pill");

    // Slide the gold pill under whichever link is active, so the nav reads as one
    // continuous object rather than six separate states blinking on and off.
    function movePill(link) {
      if (!pill || !link || link.offsetParent === null) {
        return;
      }
      pill.style.width = link.offsetWidth + "px";
      pill.style.transform = "translateX(" + link.offsetLeft + "px)";
      pill.classList.add("is-live");
    }

    function setActive(sectionId) {
      links.forEach(function (link) {
        const isCurrent = link.dataset.target === sectionId;
        link.classList.toggle("is-active", isCurrent);

        if (isCurrent) {
          link.setAttribute("aria-current", "location");
          movePill(link);
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
    // Step order. "domain" is multi-select (an array); "brief" is a free-text step with no
    // chips, so it is always considered complete and never blocks progression.
    const keys = ["domain", "stage", "brief", "timeline"];
    const MULTI = { domain: true };
    const OPTIONAL = { brief: true };
    const LAST_STEP = keys.length;

    const state = {
      step: 0,
      answers: {
        domain: [],
        stage: "",
        brief: "",
        timeline: ""
      }
    };

    function hasAnswer(key) {
      if (OPTIONAL[key]) {
        return true;
      }
      return MULTI[key] ? state.answers[key].length > 0 : Boolean(state.answers[key]);
    }
    const formReadyAt = Date.now(); // time-trap baseline for spam detection

    if (panels.length === 0 || choiceButtons.length === 0) {
      return;
    }

    function firstIncompleteStep() {
      return keys.findIndex(function (key) {
        return !hasAnswer(key);
      });
    }

    function syncChoiceStates() {
      choiceButtons.forEach(function (button) {
        const key = button.dataset.key || "";
        const value = button.dataset.value || "";
        let isSelected = false;

        if (key && value) {
          isSelected = MULTI[key]
            ? state.answers[key].indexOf(value) !== -1
            : state.answers[key] === value;
        }

        button.classList.toggle("is-selected", isSelected);
        button.setAttribute("aria-pressed", String(isSelected));
      });

      // Multi-select needs an explicit Continue, so keep its state and label in sync.
      const count = state.answers.domain.length;
      const countEl = form.querySelector("#domain-count");
      const nextBtn = form.querySelector('.quiz-next[data-next="1"]');

      if (countEl) {
        countEl.textContent =
          count === 0
            ? "Nothing selected yet"
            : count + (count === 1 ? " service selected" : " services selected");
      }
      if (nextBtn) {
        nextBtn.disabled = count === 0;
      }
    }

    const briefDomain = form.querySelector("#brief-domain");
    const briefStage = form.querySelector("#brief-stage");
    const briefTimeline = form.querySelector("#brief-timeline");
    const briefRead = form.querySelector("#brief-read");
    const railSegs = Array.from(form.querySelectorAll(".quiz-rail-seg"));
    const noteCount = form.querySelector("#note-count");

    // Turn the three answers into one plain-English sentence, so the payoff screen reads like
    // something a person wrote rather than a record we dumped back at them.
    // Join a list the way a person would: "A, B and C".
    function humanList(items) {
      if (items.length === 0) {
        return "";
      }
      if (items.length === 1) {
        return items[0];
      }
      return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
    }

    function briefSentence() {
      const stagePhrase = {
        "Idea": "starting from an idea",
        "Prototype": "moving a prototype to production",
        "In production": "already in production",
        "Firefighting": "in need of urgent repair"
      }[state.answers.stage] || state.answers.stage.toLowerCase();

      const timelinePhrase = {
        "Now": "starting now",
        "This quarter": "planned for this quarter",
        "Just exploring": "still being scoped"
      }[state.answers.timeline] || state.answers.timeline.toLowerCase();

      const services = humanList(
        state.answers.domain.map(function (d) {
          return d.toLowerCase();
        })
      );

      return "A project spanning " + services + " — " + stagePhrase + ", " + timelinePhrase + ".";
    }

    function updateSummary() {
      const domainText = state.answers.domain.join(", ");

      if (summary) {
        summary.textContent = [
          "> SCOPE",
          "  services  : " + (domainText || "—"),
          "  stage     : " + (state.answers.stage || "—"),
          "  timeline  : " + (state.answers.timeline || "—")
        ].join("\n");
      }

      if (briefDomain) {
        briefDomain.textContent = domainText || "—";
      }
      if (briefStage) {
        briefStage.textContent = state.answers.stage || "—";
      }
      if (briefTimeline) {
        briefTimeline.textContent = state.answers.timeline || "—";
      }
      if (briefRead) {
        const complete = keys.every(function (key) {
          return state.answers[key];
        });
        briefRead.textContent = complete ? briefSentence() : "—";
      }
    }

    function updateRail(step) {
      railSegs.forEach(function (seg, index) {
        seg.classList.toggle("is-done", index < step);
        seg.classList.toggle("is-current", index === step);
      });
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
      let safeStep = Math.max(0, Math.min(LAST_STEP, nextStep));
      const missingStep = firstIncompleteStep();

      if (safeStep === LAST_STEP && missingStep !== -1) {
        safeStep = missingStep;
      }

      state.step = safeStep;
      const panelKey = safeStep === LAST_STEP ? "reveal" : keys[safeStep];

      panels.forEach(function (panel) {
        panel.hidden = panel.dataset.panel !== panelKey;
      });

      if (progress) {
        progress.textContent =
          safeStep === LAST_STEP
            ? "Complete"
            : String(safeStep + 1).padStart(2, "0") + " / 0" + LAST_STEP;
      }

      updateRail(safeStep);
      syncChoiceStates();

      if (safeStep === LAST_STEP) {
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

        // Multi-select toggles in place and waits for Continue — auto-advancing would make it
        // impossible to pick a second service.
        if (MULTI[key]) {
          const list = state.answers[key];
          const at = list.indexOf(value);

          if (at === -1) {
            list.push(value);
          } else {
            list.splice(at, 1);
          }

          syncChoiceStates();
          updateSummary();
          return;
        }

        state.answers[key] = value;
        showStep(Math.min(selectedStep + 1, LAST_STEP), true, false);
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
        if (!Number.isInteger(targetStep) || targetStep < 0 || targetStep >= LAST_STEP) {
          return;
        }
        showStep(targetStep, true, true);
      });
    });

    // Explicit "Continue" buttons for the steps that do not auto-advance.
    Array.from(form.querySelectorAll(".quiz-next[data-next]")).forEach(function (button) {
      button.addEventListener("click", function () {
        const targetStep = Number.parseInt(button.dataset.next || "", 10);
        if (!Number.isInteger(targetStep)) {
          return;
        }
        showStep(Math.min(targetStep, LAST_STEP), true, false);
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

    if (noteInput && noteCount) {
      noteInput.addEventListener("input", function () {
        noteCount.textContent = noteInput.value.length + " / 280";
      });
    }

    const pitchInput = form.querySelector("#pitch");
    const pitchCount = form.querySelector("#pitch-count");

    if (pitchInput) {
      pitchInput.addEventListener("input", function () {
        state.answers.brief = pitchInput.value.trim();
        if (pitchCount) {
          pitchCount.textContent = pitchInput.value.length + " / 1200";
        }
      });
    }

    // Celebrate a real submission, then hand the form back clean. Reset waits long enough for
    // the confirmation to be read, and is cancelled if the visitor starts typing again.
    function celebrateAndReset() {
      burstConfetti();

      const resetAt = window.setTimeout(function () {
        state.answers.domain = [];
        state.answers.stage = "";
        state.answers.brief = "";
        state.answers.timeline = "";

        if (emailInput) {
          emailInput.value = "";
        }
        if (noteInput) {
          noteInput.value = "";
        }
        if (noteCount) {
          noteCount.textContent = "0 / 280";
        }
        if (pitchInput) {
          pitchInput.value = "";
        }
        if (pitchCount) {
          pitchCount.textContent = "0 / 1200";
        }
        if (copyStatus) {
          copyStatus.textContent = "";
        }

        clearEmailError();
        updateSummary();
        showStep(0, false, false);
      }, 3200);

      // If they interact again before the reset lands, leave their input alone.
      [emailInput, noteInput].forEach(function (el) {
        if (el) {
          el.addEventListener(
            "input",
            function () {
              window.clearTimeout(resetAt);
            },
            { once: true }
          );
        }
      });
    }

    function buildPlainText(contactEmail) {
      const note =
        noteInput && noteInput.value.trim() !== "" ? noteInput.value.trim() : "—";
      const pitch = state.answers.brief || "—";

      return [
        "New build inquiry via aethryonexis site.",
        "",
        "Services  : " + (state.answers.domain.join(", ") || "—"),
        "Stage     : " + state.answers.stage,
        "Timeline  : " + state.answers.timeline,
        "Contact   : " + (contactEmail || "—"),
        "",
        "What they're trying to do:",
        pitch,
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
          // Keep `domain` a string for backwards compatibility with the existing backend,
          // and send the structured list alongside it.
          domain: state.answers.domain.join(", "),
          services: state.answers.domain,
          stage: state.answers.stage,
          timeline: state.answers.timeline,
          pitch: state.answers.brief,
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
        state.answers.domain.join(" + ") +
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
            celebrateAndReset();
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

  // Celebratory confetti on a successful transmit. Self-contained canvas (no library, no network),
  // brand palette only, GPU-cheap, removes itself when the last piece falls offscreen. Skipped
  // entirely under reduced-motion — the written confirmation already carries the message.
  function burstConfetti() {
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof document.createElement("canvas").getContext !== "function") {
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.className = "confetti-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      canvas.remove();
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;

    function size() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    window.addEventListener("resize", size);

    const COLORS = ["#E4C15C", "#F9EBBB", "#B08A28", "#F6F4ED", "#FFF7E0"];
    const pieces = [];

    // Two angled jets from the lower corners — reads as a celebration, not a screen wipe.
    [
      { x: width * 0.16, y: height * 0.86, dir: 1 },
      { x: width * 0.84, y: height * 0.86, dir: -1 }
    ].forEach(function (origin) {
      for (let i = 0; i < 70; i++) {
        const spread = (Math.random() - 0.5) * 0.9;
        const power = 13 + Math.random() * 11;
        pieces.push({
          x: origin.x,
          y: origin.y,
          vx: (Math.cos(-Math.PI / 2 + spread) * power * 0.55 + origin.dir * 3.2),
          vy: Math.sin(-Math.PI / 2 + spread) * power,
          w: 5 + Math.random() * 6,
          h: 3 + Math.random() * 5,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.3,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          life: 1
        });
      }
    });

    const GRAVITY = 0.32;
    const DRAG = 0.988;
    let raf = null;

    function cleanup() {
      if (raf !== null) {
        window.cancelAnimationFrame(raf);
      }
      window.removeEventListener("resize", size);
      canvas.remove();
    }

    function frame() {
      ctx.clearRect(0, 0, width, height);
      let alive = 0;

      pieces.forEach(function (p) {
        p.vy += GRAVITY;
        p.vx *= DRAG;
        p.vy *= DRAG;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;

        // Fade out over the last stretch of the fall rather than vanishing abruptly.
        if (p.y > height * 0.62) {
          p.life -= 0.014;
        }

        if (p.life <= 0 || p.y > height + 40) {
          return;
        }

        alive += 1;
        ctx.save();
        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      if (alive > 0) {
        raf = window.requestAnimationFrame(frame);
      } else {
        cleanup();
      }
    }

    raf = window.requestAnimationFrame(frame);
    // Hard stop, so a backgrounded tab can never leave the canvas alive indefinitely.
    window.setTimeout(cleanup, 9000);
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
      }, 900);
    });

    // Retire the nudge once the contact section is on screen — at that point it is redundant
    // and only overlaps the form and footer. It comes back if they scroll away again.
    if (contact && typeof window.IntersectionObserver === "function") {
      const observer = new window.IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            nudge.classList.toggle("is-retired", entry.isIntersecting);
          });
        },
        { threshold: 0.08 }
      );
      observer.observe(contact);
    }
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

    // Trigger on demonstrated interest rather than a timer. A 2.4s popup lands before the
    // visitor has read the hero — it covers the pitch and reads as an ambush. Waiting until
    // they have scrolled past the first screen means it only interrupts people who stayed,
    // and it never fires once they have reached the contact form on their own.
    if (!seen()) {
      let armed = true;

      const onScroll = function () {
        if (!armed) {
          return;
        }

        const contact = document.querySelector("#is");
        if (contact && contact.getBoundingClientRect().top < window.innerHeight) {
          // They found the form themselves — no popup needed.
          armed = false;
          markSeen();
          window.removeEventListener("scroll", onScroll);
          return;
        }

        if ((window.scrollY || 0) > window.innerHeight * 1.4) {
          armed = false;
          window.removeEventListener("scroll", onScroll);
          open();
        }
      };

      window.addEventListener("scroll", onScroll, { passive: true });
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

  // Warm the (possibly asleep) Render backend as the visitor nears the contact form,
  // so their actual submission is fast. Fires at most once, best-effort.
  function initBackendWarmup() {
    if (
      !CONFIG.backendUrl ||
      typeof window.fetch !== "function" ||
      typeof window.IntersectionObserver !== "function"
    ) {
      return;
    }
    const contact = document.querySelector("#is");
    if (!contact) {
      return;
    }
    let warmed = false;
    const observer = new window.IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !warmed) {
            warmed = true;
            observer.disconnect();
            const url = CONFIG.backendUrl.replace(/\/+$/, "") + "/health";
            window.fetch(url, { method: "GET", mode: "cors", cache: "no-store" }).catch(function () {});
          }
        });
      },
      { rootMargin: "0px 0px 240px 0px", threshold: 0.01 }
    );
    observer.observe(contact);
  }

  // Signature: the wordmark resolves from scrambled ciphertext into AE·TH·RY·ON·EX·IS on load —
  // an on-brand "decryption" for an applied-cryptography studio. Purely visual; the real text is
  // always in the DOM (and the h1 aria-label), so no-JS and reduced-motion just show the name.
  function initDecrypt() {
    const syllables = Array.from(document.querySelectorAll(".wordmark .syl"));
    if (syllables.length === 0) {
      return;
    }
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      return;
    }
    const glyphs = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789/\\<>#*+=%$";
    const rnd = function () {
      return glyphs.charAt(Math.floor(Math.random() * glyphs.length));
    };
    syllables.forEach(function (el, index) {
      const finalText = el.textContent;
      const len = finalText.length;
      const scrambleTicks = 9;
      el.classList.add("is-decrypting");
      window.setTimeout(function () {
        let tick = 0;
        const timer = window.setInterval(function () {
          tick += 1;
          if (tick < scrambleTicks) {
            let out = "";
            for (let c = 0; c < len; c++) {
              out += rnd();
            }
            el.textContent = out;
          } else {
            const settled = tick - scrambleTicks;
            let out = "";
            for (let c = 0; c < len; c++) {
              out += c < settled ? finalText.charAt(c) : rnd();
            }
            el.textContent = out;
            if (settled >= len) {
              el.textContent = finalText;
              el.classList.remove("is-decrypting");
              window.clearInterval(timer);
            }
          }
        }, 45);
      }, index * 95);
    });
  }

  // Smooth multi-layer parallax + scroll-zoom. Each layer eases (lerps) toward its target every
  // frame, so motion stays buttery even when the wheel scrolls in coarse steps. Transform/opacity
  // only; the rAF loop sleeps once everything has settled, and it is skipped under reduced-motion.
  function initParallax() {
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      return;
    }

    const q = function (sel) {
      return document.querySelector(sel);
    };

    // Every [data-depth] element becomes a parallax layer automatically; the hero pieces get
    // explicit tuning. speed = vertical drift factor, zoom = extra scale over the first ~700px.
    const layers = Array.from(document.querySelectorAll("[data-depth]")).map(function (el) {
      return { el: el, speed: parseFloat(el.dataset.depth) || 0, zoom: 0, y: 0, z: 0 };
    });

    [
      { el: q(".wordmark"), speed: -0.05, zoom: 0 },
      { el: q(".hero-logo"), speed: 0.16, zoom: 0.1 }
    ].forEach(function (l) {
      if (l.el) {
        layers.push({ el: l.el, speed: l.speed, zoom: l.zoom, y: 0, z: 0 });
      }
    });

    if (layers.length === 0) {
      return;
    }

    let raf = null;
    function frame() {
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const capped = Math.min(scrollY, 1400);
      let moving = false;

      layers.forEach(function (l) {
        const targetY = capped * l.speed;
        l.y += (targetY - l.y) * 0.09;

        let transform = "translate3d(0," + l.y.toFixed(2) + "px,0)";
        if (l.zoom) {
          const targetZ = (Math.min(scrollY, 700) / 700) * l.zoom;
          l.z += (targetZ - l.z) * 0.09;
          transform += " scale(" + (1 + l.z).toFixed(4) + ")";
          if (Math.abs(targetZ - l.z) > 0.0004) {
            moving = true;
          }
        }
        l.el.style.transform = transform;
        if (Math.abs(targetY - l.y) > 0.08) {
          moving = true;
        }
      });

      raf = moving ? window.requestAnimationFrame(frame) : null;
    }

    function kick() {
      if (raf === null) {
        raf = window.requestAnimationFrame(frame);
      }
    }

    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick);
    kick();
  }

  // Robust in-page smooth scroll: intercept every "#id" link and land it at a fixed offset below
  // the floating nav. Rather than the browser's native "smooth" (whose curve and duration vary by
  // engine and can land with a visible jerk), this drives the scroll itself on a long ease-out
  // curve, with distance-scaled duration, and aborts the moment the user takes over the wheel.
  function initSmoothScroll() {
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const OFFSET = 92;
    let animating = false;

    function easeOutQuint(t) {
      return 1 - Math.pow(1 - t, 5);
    }

    // Resolve where a target should sit RIGHT NOW. This is recomputed every frame because
    // reveal animations and lazy layout keep changing the document height while we travel —
    // a destination captured once at click time goes stale and lands short. Sections that
    // cannot reach the offset (the last one on the page) clamp to the true page bottom.
    function resolveTarget(el) {
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

      // Anchor on the element the visitor actually came for. #is is a tall, vertically-centred
      // section, so landing on its top edge leaves the form itself below the fold — aim at the
      // form and pull up by a small margin so its heading still frames the view.
      const focal = el.querySelector("[data-scroll-focus]");
      const anchor = focal || el;
      const margin = focal ? 24 : 0;

      const top = anchor.getBoundingClientRect().top + scrollY - OFFSET - margin;
      return Math.max(0, Math.min(top, max));
    }

    function glideTo(el) {
      const start = window.scrollY || window.pageYOffset || 0;

      if (Math.abs(resolveTarget(el) - start) < 2) {
        return;
      }

      // Duration is set from the initial distance; 620ms floor, 1500ms ceiling.
      const duration = Math.min(1500, Math.max(620, Math.abs(resolveTarget(el) - start) * 0.55));
      const startedAt = performance.now();
      animating = true;

      function step(now) {
        if (!animating) {
          return;
        }
        const t = Math.min((now - startedAt) / duration, 1);
        // Re-resolve each frame so a growing page cannot leave us short of the section.
        const destination = resolveTarget(el);
        window.scrollTo(0, start + (destination - start) * easeOutQuint(t));

        if (t < 1) {
          window.requestAnimationFrame(step);
          return;
        }

        animating = false;

        // Final correction: settle exactly on target after layout has stopped moving.
        window.setTimeout(function () {
          if (animating) {
            return;
          }
          const settled = resolveTarget(el);
          if (Math.abs((window.scrollY || 0) - settled) > 4) {
            window.scrollTo(0, settled);
          }
        }, 90);
      }

      window.requestAnimationFrame(step);
    }

    // Any manual scroll intent cancels the glide immediately — never fight the user.
    ["wheel", "touchstart", "keydown"].forEach(function (evt) {
      window.addEventListener(
        evt,
        function () {
          animating = false;
        },
        { passive: true }
      );
    });

    document.addEventListener("click", function (event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const link = event.target.closest ? event.target.closest('a[href^="#"]') : null;
      if (!link) {
        return;
      }
      const hash = link.getAttribute("href");
      if (!hash || hash.length < 2) {
        return;
      }
      const target = document.getElementById(hash.slice(1));
      if (!target) {
        return;
      }
      event.preventDefault();

      // Force any pending reveals inside the destination to their final state before we travel.
      // Otherwise the section is still collapsed (blurred, offset) while we compute where to
      // land, and the scroll finishes above the content the visitor asked for.
      Array.from(target.querySelectorAll(".reveal")).forEach(function (el) {
        el.classList.add("in");
      });
      if (target.classList.contains("reveal")) {
        target.classList.add("in");
      }

      if (reduced) {
        window.scrollTo(0, resolveTarget(target));
      } else {
        glideTo(target);
      }

      if (window.history && typeof window.history.replaceState === "function") {
        window.history.replaceState(null, "", hash);
      }
    });
  }

  // Mobile menu: full-screen overlay, hamburger morphs to an X, links stagger in, focus is
  // trapped while open, and the body scroll locks. Closing restores focus to the toggle.
  function initMenu() {
    const toggle = document.querySelector("#menu-toggle");
    const overlay = document.querySelector("#mobile-menu");
    if (!toggle || !overlay) {
      return;
    }

    let open = false;

    function onKey(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const focusables = Array.from(overlay.querySelectorAll("a[href], button:not([disabled])"));
      if (focusables.length === 0) {
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function openMenu() {
      if (open) {
        return;
      }
      open = true;
      overlay.hidden = false;
      root.classList.add("is-locked");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close menu");
      window.requestAnimationFrame(function () {
        overlay.classList.add("open");
      });
      document.addEventListener("keydown", onKey, true);
    }

    function close() {
      if (!open) {
        return;
      }
      open = false;
      overlay.classList.remove("open");
      root.classList.remove("is-locked");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
      document.removeEventListener("keydown", onKey, true);
      window.setTimeout(function () {
        if (!open) {
          overlay.hidden = true;
        }
      }, 560);
      if (typeof toggle.focus === "function") {
        toggle.focus();
      }
    }

    toggle.addEventListener("click", function () {
      if (open) {
        close();
      } else {
        openMenu();
      }
    });

    // Close on any in-menu navigation, then let the smooth-scroll handler do the travelling.
    Array.from(overlay.querySelectorAll("[data-menu-link]")).forEach(function (link) {
      link.addEventListener("click", close);
    });

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) {
        close();
      }
    });

    // A resize past the desktop breakpoint must not leave the page scroll-locked.
    window.addEventListener("resize", function () {
      if (open && window.innerWidth >= 900) {
        close();
      }
    });
  }

  // Condense the floating header once the page has left the top of the hero.
  function initChromeState() {
    const chrome = document.querySelector("#chrome");
    if (!chrome) {
      return;
    }
    let ticking = false;

    function update() {
      ticking = false;
      chrome.classList.toggle("is-stuck", (window.scrollY || 0) > 24);
    }

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          window.requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
    update();
  }

  // A soft gold light that trails the cursor, easing toward it rather than snapping — and
  // swelling over anything interactive. Pointer devices only; never shown on touch or under
  // reduced-motion, where a lagging follower is noise rather than polish.
  function initCursorGlow() {
    const noHover =
      typeof window.matchMedia !== "function" ||
      !window.matchMedia("(hover: hover)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (noHover) {
      return;
    }

    const dot = document.createElement("div");
    dot.className = "cursor-glow";
    dot.setAttribute("aria-hidden", "true");
    document.body.appendChild(dot);

    const HOT = 'a, button, [data-tilt], input, textarea, .choice-chip, .social, .eng-row';
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let x = targetX;
    let y = targetY;
    let raf = null;
    let visible = false;

    function frame() {
      // Lerp toward the pointer: the lag is what makes it feel like a physical light.
      x += (targetX - x) * 0.18;
      y += (targetY - y) * 0.18;
      dot.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";

      if (Math.abs(targetX - x) > 0.1 || Math.abs(targetY - y) > 0.1) {
        raf = window.requestAnimationFrame(frame);
      } else {
        raf = null;
      }
    }

    function kick() {
      if (raf === null) {
        raf = window.requestAnimationFrame(frame);
      }
    }

    window.addEventListener(
      "pointermove",
      function (event) {
        if (event.pointerType === "touch") {
          return;
        }
        targetX = event.clientX;
        targetY = event.clientY;

        if (!visible) {
          visible = true;
          // Jump to the first known position so it doesn't fly in from the corner.
          x = targetX;
          y = targetY;
          dot.classList.add("is-visible");
        }

        dot.classList.toggle("is-hot", Boolean(event.target.closest && event.target.closest(HOT)));
        kick();
      },
      { passive: true }
    );

    document.addEventListener("pointerleave", function () {
      visible = false;
      dot.classList.remove("is-visible");
    });
  }

  // Pointer-tracked tilt on practice cards — small angles only, so it reads as depth rather
  // than as a gimmick. Pointer devices only, and skipped entirely under reduced motion.
  function initTilt() {
    const noHover =
      typeof window.matchMedia !== "function" ||
      !window.matchMedia("(hover: hover)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (noHover) {
      return;
    }

    const MAX_DEG = 4;

    Array.from(document.querySelectorAll("[data-tilt]")).forEach(function (card) {
      card.addEventListener("pointermove", function (event) {
        const rect = card.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.transform =
          "perspective(900px) rotateX(" +
          (-py * MAX_DEG).toFixed(2) +
          "deg) rotateY(" +
          (px * MAX_DEG).toFixed(2) +
          "deg) translateY(-5px)";
      });

      card.addEventListener("pointerleave", function () {
        card.style.transform = "";
      });
    });
  }

  // Thin gold bar at the very top that fills with page scroll progress.
  function initScrollProgress() {
    const bar = document.querySelector("#scroll-progress-bar");
    if (!bar) {
      return;
    }
    let ticking = false;
    function update() {
      ticking = false;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(Math.max((window.scrollY || 0) / max, 0), 1) : 0;
      bar.style.transform = "scaleX(" + p.toFixed(4) + ")";
    }
    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          window.requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
    window.addEventListener("resize", update);
    update();
  }
})();
