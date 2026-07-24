const CONFIG = {
  contactEmail: "Ae.th.ry.on.ex.is@proton.me",
  // GitHub Pages is static and cannot run a backend, so submissions are relayed to your inbox
  // by FormSubmit.co — no account needed. On the FIRST real submission FormSubmit emails you a
  // one-time activation link; click it once and every submission after lands in your inbox,
  // independent of the visitor's mail client. Nothing else to host — it stays 100% on Pages.
  // Tip: after activating, replace this with your FormSubmit alias hash to keep the email off
  // the page. Set formTarget to "" to disable the relay and fall back to mailto compose.
  formTarget: "Ae.th.ry.on.ex.is@proton.me",
  // END-TO-END ENCRYPTION: the brief is encrypted in the browser with THIS public key before it
  // ever leaves the page, so the relay / GitHub / network only see ciphertext. Only your offline
  // private key (crypto/private-key.jwk) can read it. Generate or replace both via
  // crypto/keygen.html and paste the new public key here. Set to null to send plaintext instead.
  publicKeyJwk: {
    alg: "RSA-OAEP-256",
    kty: "RSA",
    e: "AQAB",
    n: "mKNxo5kTLIkbR-pH9zyQSONLrwbn18ouIctkSnExmySqjsc87JGVHm1o4Cq509jBB44fMgL_k6RAuACLDLgIHhRWQN3nW2QtM0nwH3zq8bdvSJaZsW3ucqVWpsLvBYllQ589PM6oE3rH3DgQlQjxMotIgUghmQ8zh_C9ZNrMDwh2uypZFmt501cIIaU6psx8ZfzzU_BofIAnKM-eGNe6nXxMLz6Bh7gYT6H88jJ6AS3ITcId2TU59HGeF99Ii7vvL4oEBcbjgSqKI4EmhnN9dt-VmXJXsl3oPFTuXJ0aozv7pRXHq0sPUx_cw6sqnQLk2on5lWQ9oRPLOzeAegMS4gdad7BNJScSQY_3gcNYe1gMzKj4vF5eE8sRbC3cWlFGHOaoyouFbxEZzADI52bafGcrP-HuBr3IAvr7xpU8blS6MHDsIm2zXt0IrIAEWJC7ydthyKGwPmSAcJJbbOcL_C1lnRwVqZVS6Khblk-8miVdjkJStvd6_9c3Yebt6HQYUVnaIC_xBk1rieDkh53caj79-fYrifE8E7oYgSTxT2TdQ9ZxGisb0a9gKMr4wvcy9h2U-bmhGpgnFMeWOyB9Miy68Ar1HdIBUBaIjtkC4d72T-tTvAqhiwUZXNgltxDndFe8uB4SjSnQIbzjhqiK1yCYZu2OKDAnjkZ9Ct5MofU"
  }
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

  // ---- end-to-end encryption (Web Crypto API — no libraries, works offline / on GitHub Pages) ----
  function bufToB64(buf) {
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  function cryptoAvailable() {
    return !!(
      CONFIG.publicKeyJwk &&
      window.crypto &&
      window.crypto.subtle &&
      window.TextEncoder &&
      window.btoa
    );
  }

  // Hybrid encrypt: AES-256-GCM for the message, RSA-OAEP to wrap the AES key. Returns a base64
  // envelope that only the matching private key (crypto/private-key.jwk) can open.
  async function encryptBrief(plaintext) {
    const subtle = window.crypto.subtle;
    const publicKey = await subtle.importKey(
      "jwk",
      CONFIG.publicKeyJwk,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["encrypt"]
    );
    const aesKey = await subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const data = await subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      aesKey,
      new TextEncoder().encode(plaintext)
    );
    const rawAes = await subtle.exportKey("raw", aesKey);
    const wrappedKey = await subtle.encrypt({ name: "RSA-OAEP" }, publicKey, rawAes);
    const envelope = {
      v: 1,
      alg: "RSA-OAEP-256+A256GCM",
      key: bufToB64(wrappedKey),
      iv: bufToB64(iv),
      data: bufToB64(data)
    };
    return window.btoa(JSON.stringify(envelope));
  }

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

    // Relay the (already-encrypted) blob through FormSubmit — server-side delivery, no backend to
    // host. The honeypot is enforced at the relay too via the _honey field.
    function relaySend(subject, blob) {
      return window
        .fetch("https://formsubmit.co/ajax/" + encodeURIComponent(CONFIG.formTarget), {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            _subject: subject,
            _captcha: "false",
            _honey: honeypotInput ? honeypotInput.value : "",
            Inquiry: blob
          })
        })
        .then(function (res) {
          return res.ok;
        })
        .catch(function () {
          return false;
        });
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

    // Encrypt the brief end-to-end when a public key is configured; otherwise fall back to plaintext.
    function buildPayload(plaintext) {
      if (!cryptoAvailable()) {
        return Promise.resolve({ body: plaintext, encrypted: false });
      }
      return encryptBrief(plaintext).then(
        function (blob) {
          return { body: blob, encrypted: true };
        },
        function () {
          return { body: plaintext, encrypted: false };
        }
      );
    }

    function mailBody(payload) {
      if (!payload.encrypted) {
        return payload.body;
      }
      return (
        "AETHRYONEXIS — end-to-end encrypted inquiry.\n" +
        "Decrypt with crypto/decrypt.html and your private key.\n\n" +
        payload.body
      );
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
        copyStatus.textContent = cryptoAvailable() ? "Encrypting…" : "Sending…";
      }

      buildPayload(plaintext).then(function (payload) {
        const subject = payload.encrypted
          ? "[AETHRYONEXIS] Encrypted inquiry"
          : "[SCOPE] " +
            state.answers.domain +
            " · " +
            state.answers.stage +
            " · " +
            state.answers.timeline;

        function finish(fallbackNote) {
          if (submitBtn) {
            submitBtn.disabled = false;
          }
          if (copyStatus) {
            copyStatus.textContent = fallbackNote ? "Network hiccup — opening your mail app instead." : "";
          }
          if (confirmation) {
            confirmation.hidden = false;
          }
        }

        if (!CONFIG.formTarget || typeof window.fetch !== "function") {
          finish(false);
          window.location.href = mailtoHref(subject, mailBody(payload));
          return;
        }

        relaySend(subject, payload.body).then(function (ok) {
          if (ok) {
            finish(false);
          } else {
            finish(true);
            window.location.href = mailtoHref(subject, mailBody(payload));
          }
        });
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
})();
