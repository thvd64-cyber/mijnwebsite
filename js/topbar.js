// =============================================================================
// topbar.js — TopBar Auth Modal & Status
// MyFamTreeCollab v2.0.0
// -----------------------------------------------------------------------------
// Manages the login/register modal triggered from the TopBar.
// Shows username + logout button when logged in, Login link when logged out.
//
// Dependencies: Supabase SDK, auth.js
// Load order:   utils.js → auth.js → topbar.js → [pagina].js
// HTML vereiste: id="top-auth" in TopBar.html, id="auth-modal-root" in <body>
// =============================================================================

(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // _injectModal()
  // Injects the modal HTML into the page once on load.
  // The modal contains two tabs: login and register.
  // ---------------------------------------------------------------------------
  function _injectModal() {
    // Avoid duplicate injection
    if (document.getElementById("auth-modal-root")) return;

    const root = document.createElement("div");
    root.id = "auth-modal-root";
    root.innerHTML = `
      <div id="auth-modal-backdrop" onclick="TopBarAuth.closeModal()"></div>
      <div id="auth-modal-box" role="dialog" aria-modal="true" aria-label="Inloggen">

        <!-- Close button -->
        <button id="auth-modal-close" onclick="TopBarAuth.closeModal()" aria-label="Sluiten">&times;</button>

        <!-- Tab switcher -->
        <div class="auth-tabs">
          <button class="auth-tab active" id="tab-btn-login"    onclick="TopBarAuth.switchTab('login')">Inloggen</button>
          <button class="auth-tab"        id="tab-btn-register" onclick="TopBarAuth.switchTab('register')">Account aanmaken</button>
        </div>

        <!-- LOGIN form -->
        <div class="auth-form-section active" id="auth-section-login">
          <div class="auth-field">
            <label for="auth-login-email">E-mailadres</label>
            <input type="email" id="auth-login-email" placeholder="naam@voorbeeld.nl" autocomplete="email" />
          </div>
          <div class="auth-field">
            <label for="auth-login-password">Wachtwoord</label>
            <input type="password" id="auth-login-password" placeholder="••••••••" autocomplete="current-password" />
          </div>
          <button class="auth-btn-primary" id="auth-btn-login" onclick="TopBarAuth.doLogin()">Inloggen</button>
          <div class="auth-msg" id="auth-msg-login"></div>
        </div>

        <!-- REGISTER form -->
        <div class="auth-form-section" id="auth-section-register">
          <div class="auth-field">
            <label for="auth-reg-username">Gebruikersnaam</label>
            <input type="text" id="auth-reg-username" placeholder="Hoe wil je heten?" autocomplete="nickname" maxlength="32" />
          </div>
          <div class="auth-field">
            <label for="auth-reg-email">E-mailadres</label>
            <input type="email" id="auth-reg-email" placeholder="naam@voorbeeld.nl" autocomplete="email" />
          </div>
          <div class="auth-field">
            <label for="auth-reg-password">Wachtwoord</label>
            <input type="password" id="auth-reg-password" placeholder="Minimaal 6 tekens" autocomplete="new-password" />
          </div>
          <div class="auth-field">
            <label for="auth-reg-password2">Wachtwoord herhalen</label>
            <input type="password" id="auth-reg-password2" placeholder="Herhaal wachtwoord" autocomplete="new-password" />
          </div>
          <button class="auth-btn-primary" id="auth-btn-register" onclick="TopBarAuth.doRegister()">Account aanmaken</button>
          <div class="auth-msg" id="auth-msg-register"></div>
        </div>

      </div>
    `;

    document.body.appendChild(root);
    _injectStyles();
  }

  // ---------------------------------------------------------------------------
  // _injectStyles()
  // Adds all modal and TopBar auth widget CSS to the page.
  // ---------------------------------------------------------------------------
  function _injectStyles() {
    if (document.getElementById("auth-modal-styles")) return;

    const style = document.createElement("style");
    style.id = "auth-modal-styles";
    style.textContent = `
      /* Backdrop */
      #auth-modal-backdrop {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.45);
        z-index: 1000;
      }

      /* Modal box */
      #auth-modal-box {
        display: none;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #ffffff;
        border-radius: 10px;
        padding: 28px 32px 24px;
        width: 100%;
        max-width: 400px;
        z-index: 1001;
        box-shadow: 0 8px 32px rgba(0,0,0,0.18);
        font-family: Arial, sans-serif;
      }

      /* Open state */
      #auth-modal-root.open #auth-modal-backdrop,
      #auth-modal-root.open #auth-modal-box {
        display: block;
      }

      /* Close button */
      #auth-modal-close {
        position: absolute;
        top: 12px;
        right: 16px;
        background: none;
        border: none;
        font-size: 1.4rem;
        cursor: pointer;
        color: #888;
        line-height: 1;
      }
      #auth-modal-close:hover { color: #333; }

      /* Tabs */
      .auth-tabs {
        display: flex;
        border-bottom: 2px solid #e5e7eb;
        margin-bottom: 20px;
      }
      .auth-tab {
        padding: 8px 20px;
        border: none;
        background: none;
        font-size: 0.92rem;
        cursor: pointer;
        color: #666;
        border-bottom: 2px solid transparent;
        margin-bottom: -2px;
        font-weight: bold;
      }
      .auth-tab.active {
        color: #2563eb;
        border-bottom-color: #2563eb;
      }

      /* Form sections */
      .auth-form-section        { display: none; }
      .auth-form-section.active { display: block; }

      /* Fields */
      .auth-field { margin-bottom: 14px; }
      .auth-field label {
        display: block;
        font-size: 0.88rem;
        font-weight: bold;
        margin-bottom: 4px;
        color: #333;
      }
      .auth-field input {
        width: 100%;
        padding: 8px 11px;
        font-size: 0.95rem;
        border: 1px solid #bbb;
        border-radius: 6px;
        box-sizing: border-box;
      }
      .auth-field input:focus {
        outline: none;
        border-color: #2563eb;
      }

      /* Primary button */
      .auth-btn-primary {
        width: 100%;
        padding: 9px;
        font-size: 0.92rem;
        font-weight: bold;
        background: #2563eb;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        margin-top: 4px;
      }
      .auth-btn-primary:hover     { background: #1d4ed8; }
      .auth-btn-primary:disabled  { background: #93c5fd; cursor: default; }

      /* Feedback messages */
      .auth-msg { margin-top: 12px; padding: 9px 13px; border-radius: 6px; font-size: 0.88rem; display: none; }
      .auth-msg.error   { background: #fee2e2; color: #991b1b; display: block; }
      .auth-msg.success { background: #dcfce7; color: #166534; display: block; }

      /* TopBar auth widget */
      #top-auth {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .top-auth-username {
        font-size: 0.88rem;
        color: #333;
        font-weight: bold;
        max-width: 140px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .top-auth-logout {
        padding: 4px 12px;
        font-size: 0.82rem;
        font-weight: bold;
        background: #e5e7eb;
        color: #374151;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      .top-auth-logout:hover { background: #d1d5db; }
      .top-auth-login {
        color: #000000;
        text-decoration: none;
        font-size: 0.9rem;
        cursor: pointer;
        background: none;
        border: none;
        padding: 0;
        font-family: Arial, sans-serif;
      }
      .top-auth-login:hover { text-decoration: underline; }
    `;

    document.head.appendChild(style);
  }

  // ---------------------------------------------------------------------------
  // _renderTopBar(profile)
  // Updates the #top-auth slot in the TopBar.
  // Shows username + logout when logged in, Login button when logged out.
  // ---------------------------------------------------------------------------
  function _renderTopBar(profile) {
    const slot = document.getElementById("top-auth");
    if (!slot) return;

    if (profile) {
      // Logged in: show username and logout button
      slot.innerHTML = `
        <span class="top-auth-username" title="${profile.username}">👤 ${profile.username}</span>
        <button class="top-auth-logout" id="btn-topbar-logout">Uitloggen</button>
      `;
      document.getElementById("btn-topbar-logout").addEventListener("click", async () => {
        await AuthModule.logout();
        // onAuthChange will re-render automatically
      });
    } else {
      // Logged out: show Login trigger button
      slot.innerHTML = `
        <button class="top-auth-login" onclick="TopBarAuth.openModal()">Login</button>
      `;
    }
  }

  // ---------------------------------------------------------------------------
  // openModal()
  // Opens the auth modal. Resets to login tab.
  // ---------------------------------------------------------------------------
  function openModal() {
    _injectModal();
    switchTab("login");
    document.getElementById("auth-modal-root").classList.add("open");
    // Focus first input for accessibility
    setTimeout(() => {
      const first = document.getElementById("auth-login-email");
      if (first) first.focus();
    }, 50);
  }

  // ---------------------------------------------------------------------------
  // closeModal()
  // Closes the auth modal and clears all feedback messages.
  // ---------------------------------------------------------------------------
  function closeModal() {
    const root = document.getElementById("auth-modal-root");
    if (root) root.classList.remove("open");
    // Clear feedback messages
    ["auth-msg-login", "auth-msg-register"].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = ""; el.className = "auth-msg"; }
    });
  }

  // ---------------------------------------------------------------------------
  // switchTab(tab)
  // Switches between 'login' and 'register' form sections.
  // ---------------------------------------------------------------------------
  function switchTab(tab) {
    const isLogin = tab === "login";

    // Update tab button active states
    document.getElementById("tab-btn-login")   .classList.toggle("active",  isLogin);
    document.getElementById("tab-btn-register").classList.toggle("active", !isLogin);

    // Show correct form section
    document.getElementById("auth-section-login")   .classList.toggle("active",  isLogin);
    document.getElementById("auth-section-register").classList.toggle("active", !isLogin);
  }

  // ---------------------------------------------------------------------------
  // _showMsg(id, text, type)
  // Displays a feedback message. type is 'error' or 'success'.
  // ---------------------------------------------------------------------------
  function _showMsg(id, text, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className   = "auth-msg " + type;
  }

  // ---------------------------------------------------------------------------
  // doLogin()
  // Reads login form, calls AuthModule.login(), closes modal on success.
  // ---------------------------------------------------------------------------
  async function doLogin() {
    const email    = document.getElementById("auth-login-email").value.trim();
    const password = document.getElementById("auth-login-password").value;
    const btn      = document.getElementById("auth-btn-login");

    btn.disabled    = true;
    btn.textContent = "Bezig…";

    const { user, error } = await AuthModule.login(email, password);

    if (error) {
      _showMsg("auth-msg-login", error, "error");
      btn.disabled    = false;
      btn.textContent = "Inloggen";
      return;
    }

    // Success: close modal — onAuthChange will update the TopBar
    _showMsg("auth-msg-login", "Ingelogd!", "success");
    setTimeout(() => closeModal(), 800);
    btn.disabled    = false;
    btn.textContent = "Inloggen";
  }

  // ---------------------------------------------------------------------------
  // doRegister()
  // Reads register form, validates, calls AuthModule.register().
  // On success: switches to login tab with a success message.
  // ---------------------------------------------------------------------------
  async function doRegister() {
    const username  = document.getElementById("auth-reg-username").value.trim();
    const email     = document.getElementById("auth-reg-email").value.trim();
    const password  = document.getElementById("auth-reg-password").value;
    const password2 = document.getElementById("auth-reg-password2").value;
    const btn       = document.getElementById("auth-btn-register");

    // Client-side validation
    if (password !== password2) {
      _showMsg("auth-msg-register", "Wachtwoorden komen niet overeen.", "error");
      return;
    }

    btn.disabled    = true;
    btn.textContent = "Bezig…";

    const { user, error } = await AuthModule.register(email, password, username);

    if (error) {
      _showMsg("auth-msg-register", error, "error");
      btn.disabled    = false;
      btn.textContent = "Account aanmaken";
      return;
    }

    // Success: switch to login tab with confirmation message
    switchTab("login");
    _showMsg("auth-msg-login",
      "Account aangemaakt! Controleer je e-mail en log daarna in.",
      "success"
    );
    btn.disabled    = false;
    btn.textContent = "Account aanmaken";
  }

  // ---------------------------------------------------------------------------
  // init()
  // Called once on DOMContentLoaded. Renders TopBar state and subscribes
  // to auth changes so the TopBar updates automatically on login/logout.
  // ---------------------------------------------------------------------------
  async function init() {
    _injectModal();

    // Render current state immediately to avoid flash
    const user = await AuthModule.getUser();
    if (user) {
      const { profile } = await AuthModule.getProfile();
      _renderTopBar(profile);
    } else {
      _renderTopBar(null);
    }

    // Subscribe to future auth changes
    AuthModule.onAuthChange(async (event, session) => {
      if (session) {
        // Just logged in: fetch profile and update TopBar
        const { profile } = await AuthModule.getProfile();
        _renderTopBar(profile);
      } else {
        // Just logged out: show Login button
        _renderTopBar(null);
      }
    });

    // Close modal on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });
  }

  // ---------------------------------------------------------------------------
  // Auto-init on DOMContentLoaded
  // ---------------------------------------------------------------------------
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // ---------------------------------------------------------------------------
  // Publieke API — aangeroepen vanuit inline onclick handlers in de modal HTML
  // ---------------------------------------------------------------------------
  window.TopBarAuth = {
    openModal,   // Opent de login modal
    closeModal,  // Sluit de login modal
    switchTab,   // Wisselt tussen login en register tab
    doLogin,     // Verwerkt het login formulier
    doRegister,  // Verwerkt het registratie formulier
  };

})();
