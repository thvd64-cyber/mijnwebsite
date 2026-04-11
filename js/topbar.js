// =============================================================================
// topbar.js — TopBar Auth Modal & Status
// MyFamTreeCollab v2.0.2
// -----------------------------------------------------------------------------
// Nieuw in v2.0.2:
// - "Wachtwoord vergeten?" link in de login tab
// - Aparte "vergeten" sectie in de modal met e-mailinvoer + verzendknop
// - doForgotPassword() — roept AuthModule.resetPassword() aan
//
// Dependencies: Supabase SDK, auth.js
// Load order:   utils.js → auth.js → topbar.js → [pagina].js
// =============================================================================

(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // _injectModal()
  // Injects the modal HTML into the page once on load.
  // Bevat drie secties: login, register, forgot (wachtwoord vergeten)
  // ---------------------------------------------------------------------------
  function _injectModal() {
    // Voorkom dubbele injectie als script twee keer geladen wordt
    if (document.getElementById("auth-modal-root")) return;

    const root = document.createElement("div");
    root.id = "auth-modal-root";
    root.innerHTML = `
      <div id="auth-modal-backdrop" onclick="TopBarAuth.closeModal()"></div>
      <div id="auth-modal-box" role="dialog" aria-modal="true" aria-label="Inloggen">

        <!-- Sluitknop rechtsboven in de modal -->
        <button id="auth-modal-close" onclick="TopBarAuth.closeModal()" aria-label="Sluiten">&times;</button>

        <!-- Tab-navigatie: alleen zichtbaar bij login en register -->
        <div class="auth-tabs" id="auth-tabs">
          <button class="auth-tab active" id="tab-btn-login"    onclick="TopBarAuth.switchTab('login')">Inloggen</button>
          <button class="auth-tab"        id="tab-btn-register" onclick="TopBarAuth.switchTab('register')">Account aanmaken</button>
        </div>

        <!-- ===== LOGIN sectie ===== -->
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
          <!-- Link naar wachtwoord vergeten sectie -->
          <p class="auth-forgot-link">
            <a href="#" onclick="TopBarAuth.switchTab('forgot'); return false;">Wachtwoord vergeten?</a>
          </p>
          <div class="auth-msg" id="auth-msg-login"></div>
        </div>

        <!-- ===== REGISTER sectie ===== -->
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

        <!-- ===== FORGOT PASSWORD sectie ===== -->
        <!-- Verborgen tab — wordt zichtbaar via switchTab('forgot') -->
        <div class="auth-form-section" id="auth-section-forgot">
          <!-- Terugknop naar de login tab -->
          <p class="auth-back-link">
            <a href="#" onclick="TopBarAuth.switchTab('login'); return false;">← Terug naar inloggen</a>
          </p>
          <p class="auth-forgot-intro">
            Vul je e-mailadres in. Je ontvangt een link om een nieuw wachtwoord in te stellen.
          </p>
          <div class="auth-field">
            <label for="auth-forgot-email">E-mailadres</label>
            <input type="email" id="auth-forgot-email" placeholder="naam@voorbeeld.nl" autocomplete="email" />
          </div>
          <button class="auth-btn-primary" id="auth-btn-forgot" onclick="TopBarAuth.doForgotPassword()">Resetlink versturen</button>
          <div class="auth-msg" id="auth-msg-forgot"></div>
        </div>

      </div>
    `;

    document.body.appendChild(root);
    _injectStyles(); // CSS toevoegen nadat de HTML in de DOM zit
  }

  // ---------------------------------------------------------------------------
  // _injectStyles()
  // Voegt alle modal- en TopBar-stijlen toe aan de pagina.
  // Wordt maar één keer uitgevoerd dankzij de id-check.
  // ---------------------------------------------------------------------------
  function _injectStyles() {
    // Voorkom dubbele stijlinjectie
    if (document.getElementById("auth-modal-styles")) return;

    const style = document.createElement("style");
    style.id = "auth-modal-styles";
    style.textContent = `

      /* ===== BACKDROP: donkere overlay achter de modal ===== */
      #auth-modal-backdrop {
        display: none;
        position: fixed;
        inset: 0;                          /* vult het hele scherm */
        background: rgba(0,0,0,0.45);
        z-index: 1000;
      }

      /* ===== MODAL BOX ===== */
      #auth-modal-box {
        display: none;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);  /* exact gecentreerd */
        background: #ffffff;
        border-radius: 10px;
        padding: 28px 32px 24px;
        width: 100%;
        max-width: 400px;
        z-index: 1001;
        box-shadow: 0 8px 32px rgba(0,0,0,0.18);
        font-family: Arial, sans-serif;
      }

      /* Modal zichtbaar als root de 'open' class heeft */
      #auth-modal-root.open #auth-modal-backdrop,
      #auth-modal-root.open #auth-modal-box {
        display: block;
      }

      /* ===== SLUITKNOP ===== */
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

      /* ===== TABS ===== */
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

      /* ===== FORM SECTIES ===== */
      .auth-form-section        { display: none; }   /* standaard verborgen */
      .auth-form-section.active { display: block; }  /* zichtbaar als active */

      /* ===== VELDEN ===== */
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
        font-weight: normal;
      }
      .auth-field input:focus {
        outline: none;
        border-color: #2563eb;
      }

      /* ===== PRIMAIRE KNOP ===== */
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
      .auth-btn-primary:hover    { background: #1d4ed8; }
      .auth-btn-primary:disabled { background: #93c5fd; cursor: default; }

      /* ===== FEEDBACK BERICHTEN ===== */
      .auth-msg {
        margin-top: 12px;
        padding: 9px 13px;
        border-radius: 6px;
        font-size: 0.88rem;
        display: none;               /* verborgen tot er een bericht is */
      }
      .auth-msg.error   { background: #fee2e2; color: #991b1b; display: block; }
      .auth-msg.success { background: #dcfce7; color: #166534; display: block; }

      /* ===== WACHTWOORD VERGETEN LINK ===== */
      .auth-forgot-link {
        margin-top: 10px;
        font-size: 0.85rem;
        text-align: right;
      }
      .auth-forgot-link a { color: #2563eb; text-decoration: none; }
      .auth-forgot-link a:hover { text-decoration: underline; }

      /* ===== TERUGLINK IN FORGOT SECTIE ===== */
      .auth-back-link {
        font-size: 0.85rem;
        margin-bottom: 12px;
      }
      .auth-back-link a { color: #2563eb; text-decoration: none; }
      .auth-back-link a:hover { text-decoration: underline; }

      /* ===== INTRO TEKST IN FORGOT SECTIE ===== */
      .auth-forgot-intro {
        font-size: 0.88rem;
        color: #555;
        margin-bottom: 14px;
        line-height: 1.5;
      }

      /* ===== TOPBAR AUTH WIDGET ===== */
      #top-auth {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      /* Gebruikersnaam label in de TopBar */
      .top-auth-username {
        font-size: 0.88rem;
        color: #333;
        font-weight: bold;
        max-width: 140px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* Uitlogknop in de TopBar */
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

      /* Login knop in de TopBar — zelfde stijl als originele link */
      .top-auth-login {
        color: #000000;
        text-decoration: none;
        font-size: 0.9rem;
        cursor: pointer;
        background: none;
        border: none;
        padding: 0;
        font-family: Arial, sans-serif;
        font-weight: normal;         /* expliciet normaal — voorkomt overerving van bold */
      }
      .top-auth-login:hover { text-decoration: underline; }
    `;

    document.head.appendChild(style);
  }

  // ---------------------------------------------------------------------------
  // _renderTopBar(username)
  // Toont gebruikersnaam + uitloggen als ingelogd, Login knop als uitgelogd.
  // Ontvangt een string (username) of null.
  // ---------------------------------------------------------------------------
  function _renderTopBar(username) {
    const slot = document.getElementById("top-auth");
    if (!slot) return; // TopBar nog niet geladen — stil terugkeren

    if (username) {
      // Ingelogd: toon gebruikersnaam en uitlogknop
      slot.innerHTML = `
        <span class="top-auth-username" title="${username}">👤 ${username}</span>
        <button class="top-auth-logout" id="btn-topbar-logout">Uitloggen</button>
      `;
      // Uitlogknop handler — na logout update onAuthChange de TopBar automatisch
      document.getElementById("btn-topbar-logout").addEventListener("click", async () => {
        await AuthModule.logout();
      });
    } else {
      // Uitgelogd: toon Login knop die de modal opent
      slot.innerHTML = `
        <button class="top-auth-login" onclick="TopBarAuth.openModal()">Login</button>
      `;
    }
  }

  // ---------------------------------------------------------------------------
  // _getUsernameFromSession(session)
  // Haalt username op uit profiles tabel.
  // Fallback naar e-mailadres vóór @ als profile nog niet bestaat.
  // Gooit nooit een error — altijd een string of null terug.
  // ---------------------------------------------------------------------------
  async function _getUsernameFromSession(session) {
    if (!session) return null;

    try {
      // Probeer profiel op te halen — kan falen als trigger nog bezig is
      const { profile } = await AuthModule.getProfile();
      if (profile && profile.username) return profile.username;
    } catch (e) {
      // Profiel bestaat nog niet — geen probleem, gebruik fallback
    }

    // Fallback: gebruik het deel vóór @ in het e-mailadres
    const email = session.user.email || "";
    return email.split("@")[0] || "Gebruiker";
  }

  // ---------------------------------------------------------------------------
  // openModal()
  // Opent de auth modal en reset naar de login tab.
  // ---------------------------------------------------------------------------
  function openModal() {
    _injectModal();
    switchTab("login");
    document.getElementById("auth-modal-root").classList.add("open");
    // Focus eerste invoerveld voor toegankelijkheid
    setTimeout(() => {
      const first = document.getElementById("auth-login-email");
      if (first) first.focus();
    }, 50);
  }

  // ---------------------------------------------------------------------------
  // closeModal()
  // Sluit de modal en wist alle feedback berichten.
  // ---------------------------------------------------------------------------
  function closeModal() {
    const root = document.getElementById("auth-modal-root");
    if (root) root.classList.remove("open");
    // Wis alle feedback berichten in alle secties
    ["auth-msg-login", "auth-msg-register", "auth-msg-forgot"].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = ""; el.className = "auth-msg"; }
    });
  }

  // ---------------------------------------------------------------------------
  // switchTab(tab)
  // Wisselt tussen 'login', 'register' en 'forgot' secties.
  // Bij 'forgot' worden de tabs verborgen zodat alleen de teruglink zichtbaar is.
  // ---------------------------------------------------------------------------
  function switchTab(tab) {
    // Verberg alle form secties
    ["login", "register", "forgot"].forEach(function(name) {
      const section = document.getElementById("auth-section-" + name);
      if (section) section.classList.remove("active");
    });

    // Toon de gevraagde sectie
    const target = document.getElementById("auth-section-" + tab);
    if (target) target.classList.add("active");

    // Tabs alleen tonen bij login en register — verbergen bij forgot
    const tabs = document.getElementById("auth-tabs");
    if (tabs) tabs.style.display = (tab === "forgot") ? "none" : "flex";

    // Update actieve tab knop stijl
    const loginBtn    = document.getElementById("tab-btn-login");
    const registerBtn = document.getElementById("tab-btn-register");
    if (loginBtn)    loginBtn.classList.toggle("active",    tab === "login");
    if (registerBtn) registerBtn.classList.toggle("active", tab === "register");
  }

  // ---------------------------------------------------------------------------
  // _showMsg(id, text, type)
  // Toont een feedback bericht. type is 'error' of 'success'.
  // ---------------------------------------------------------------------------
  function _showMsg(id, text, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className   = "auth-msg " + type;
  }

  // ---------------------------------------------------------------------------
  // doLogin()
  // Leest het loginformulier, roept AuthModule.login() aan.
  // Knop wordt altijd teruggezet na success of error.
  // ---------------------------------------------------------------------------
  async function doLogin() {
    const email    = document.getElementById("auth-login-email").value.trim();
    const password = document.getElementById("auth-login-password").value;
    const btn      = document.getElementById("auth-btn-login");

    // Knop uitschakelen tijdens het verzoek
    btn.disabled    = true;
    btn.textContent = "Bezig…";

    const { user, error } = await AuthModule.login(email, password);

    // Knop altijd terugzetten — ongeacht resultaat
    btn.disabled    = false;
    btn.textContent = "Inloggen";

    if (error) {
      _showMsg("auth-msg-login", error, "error");
      return;
    }

    // Succes: toon bevestiging en sluit modal na korte pauze
    _showMsg("auth-msg-login", "Ingelogd!", "success");
    setTimeout(() => closeModal(), 800);
  }

  // ---------------------------------------------------------------------------
  // doRegister()
  // Leest het registratieformulier, valideert wachtwoorden, roept register() aan.
  // Knop wordt altijd teruggezet na success of error.
  // ---------------------------------------------------------------------------
  async function doRegister() {
    const username  = document.getElementById("auth-reg-username").value.trim();
    const email     = document.getElementById("auth-reg-email").value.trim();
    const password  = document.getElementById("auth-reg-password").value;
    const password2 = document.getElementById("auth-reg-password2").value;
    const btn       = document.getElementById("auth-btn-register");

    // Client-side validatie: wachtwoorden moeten overeenkomen
    if (password !== password2) {
      _showMsg("auth-msg-register", "Wachtwoorden komen niet overeen.", "error");
      return;
    }

    // Knop uitschakelen tijdens het verzoek
    btn.disabled    = true;
    btn.textContent = "Bezig…";

    const { user, error } = await AuthModule.register(email, password, username);

    // Knop altijd terugzetten — ongeacht resultaat
    btn.disabled    = false;
    btn.textContent = "Account aanmaken";

    if (error) {
      _showMsg("auth-msg-register", error, "error");
      return;
    }

    // Succes: switch naar login tab met instructie voor e-mailbevestiging
    switchTab("login");
    _showMsg("auth-msg-login",
      "Account aangemaakt! Controleer je e-mail en bevestig je adres, log daarna in.",
      "success"
    );
  }

  // ---------------------------------------------------------------------------
  // doForgotPassword()
  // Leest het wachtwoord-vergeten formulier en verstuurt een resetmail.
  // Knop wordt altijd teruggezet na success of error.
  // ---------------------------------------------------------------------------
  async function doForgotPassword() {
    const email = document.getElementById("auth-forgot-email").value.trim();
    const btn   = document.getElementById("auth-btn-forgot");

    // Knop uitschakelen tijdens het verzoek
    btn.disabled    = true;
    btn.textContent = "Bezig…";

    const { error } = await AuthModule.resetPassword(email);

    // Knop altijd terugzetten — ongeacht resultaat
    btn.disabled    = false;
    btn.textContent = "Resetlink versturen";

    if (error) {
      _showMsg("auth-msg-forgot", error, "error");
      return;
    }

    // Succes: toon bevestiging — mail is verstuurd
    // Geen onderscheid of e-mail bestaat of niet (veiligheidsreden)
    _showMsg("auth-msg-forgot",
      "Als dit e-mailadres bekend is, ontvang je een resetlink. Controleer ook je spammap.",
      "success"
    );
  }

  // ---------------------------------------------------------------------------
  // init()
  // Eénmalig aangeroepen bij laden. Rendert huidige auth-status en
  // abonneert op toekomstige wijzigingen.
  // ---------------------------------------------------------------------------
  async function init() {
    _injectModal(); // Modal HTML en CSS in de DOM plaatsen

    // Render huidige status direct — voorkomt flicker bij paginalading
    const session = await AuthModule.getSession();
    if (session) {
      const username = await _getUsernameFromSession(session);
      _renderTopBar(username);
    } else {
      _renderTopBar(null);
    }

    // Reageer op toekomstige auth-wijzigingen (login, logout, token refresh)
    AuthModule.onAuthChange(async (event, session) => {
      if (session) {
        const username = await _getUsernameFromSession(session);
        _renderTopBar(username);
      } else {
        _renderTopBar(null);
      }
    });

    // Escape-toets sluit de modal
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });
  }

  // ---------------------------------------------------------------------------
  // Auto-init: wacht op DOM als die nog niet klaar is
  // ---------------------------------------------------------------------------
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init(); // DOM al klaar — direct initialiseren
  }

  // ---------------------------------------------------------------------------
  // Publieke API — aangeroepen vanuit onclick handlers in de modal HTML
  // ---------------------------------------------------------------------------
  window.TopBarAuth = {
    openModal,        // Opent de login modal
    closeModal,       // Sluit de login modal
    switchTab,        // Wisselt tussen login, register en forgot tab
    doLogin,          // Verwerkt het loginformulier
    doRegister,       // Verwerkt het registratieformulier
    doForgotPassword, // Verstuurt de wachtwoord-resetmail
  };

})();
