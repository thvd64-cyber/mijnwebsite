// =============================================================================
// auth.js — Supabase Authentication Module
// MyFamTreeCollab v2.0.0
// -----------------------------------------------------------------------------
// Handles user registration, login, logout and session management.
// Exposes window.AuthModule for use across all pages.
//
// Dependencies: Supabase JS SDK (loaded via CDN in HTML before this script)
// Load order:   utils.js → auth.js → [page].js
// =============================================================================

(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // CONFIGURATION — replace these two values with your own Supabase project
  // ---------------------------------------------------------------------------
  const SUPABASE_URL  = "https://xpufzrjncivyzyukwcmn.supabase.co";   // bv. https://xyzxyz.supabase.co
  const SUPABASE_ANON = "sb_publishable_4Pg_TkSymTbA-uX29z0Zaw_d1A1c5lE";        // de lange 'anon public' sleutel

  // ---------------------------------------------------------------------------
  // Supabase client — initialised once, reused everywhere
  // ---------------------------------------------------------------------------
  const _client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

  // ---------------------------------------------------------------------------
  // Internal helper: normalise Supabase error into a readable string
  // ---------------------------------------------------------------------------
  function _errMsg(error) {
    // Return a human-readable Dutch error message where possible
    if (!error) return null;
    const msg = error.message || "Onbekende fout";
    if (msg.includes("Invalid login credentials")) return "E-mailadres of wachtwoord onjuist.";
    if (msg.includes("Email not confirmed"))       return "Bevestig eerst je e-mailadres via de ontvangen mail.";
    if (msg.includes("User already registered"))   return "Dit e-mailadres is al in gebruik.";
    if (msg.includes("Password should be"))        return "Wachtwoord moet minimaal 6 tekens bevatten.";
    return msg;
  }

  // ---------------------------------------------------------------------------
  // register(email, password)
  // Creates a new Supabase Auth user.
  // Returns { user, error } — error is null on success.
  // ---------------------------------------------------------------------------
  async function register(email, password) {
    // Validate inputs before sending to Supabase
    if (!email || !password) return { user: null, error: "Vul e-mailadres en wachtwoord in." };

    const { data, error } = await _client.auth.signUp({ email, password });

    if (error) return { user: null, error: _errMsg(error) };

    // data.user is set immediately; session may be null until email is confirmed
    return { user: data.user, error: null };
  }

  // ---------------------------------------------------------------------------
  // login(email, password)
  // Signs in an existing user and stores session in localStorage automatically.
  // Returns { user, error }
  // ---------------------------------------------------------------------------
  async function login(email, password) {
    if (!email || !password) return { user: null, error: "Vul e-mailadres en wachtwoord in." };

    const { data, error } = await _client.auth.signInWithPassword({ email, password });

    if (error) return { user: null, error: _errMsg(error) };

    return { user: data.user, error: null };
  }

  // ---------------------------------------------------------------------------
  // logout()
  // Signs out the current user and clears the Supabase session.
  // Returns { error } — error is null on success.
  // ---------------------------------------------------------------------------
  async function logout() {
    const { error } = await _client.auth.signOut();
    return { error: _errMsg(error) };
  }

  // ---------------------------------------------------------------------------
  // getSession()
  // Returns the current session object, or null if not logged in.
  // Use this on page load to check whether a user is authenticated.
  // ---------------------------------------------------------------------------
  async function getSession() {
    const { data } = await _client.auth.getSession();
    return data.session || null;
  }

  // ---------------------------------------------------------------------------
  // getUser()
  // Returns the current user object, or null if not logged in.
  // Shortcut around getSession().user for convenience.
  // ---------------------------------------------------------------------------
  async function getUser() {
    const session = await getSession();
    return session ? session.user : null;
  }

  // ---------------------------------------------------------------------------
  // onAuthChange(callback)
  // Subscribes to auth state changes (login, logout, token refresh).
  // callback receives (event, session) — event is 'SIGNED_IN' or 'SIGNED_OUT'.
  // Use this in the navbar to reactively update the UI.
  // ---------------------------------------------------------------------------
  function onAuthChange(callback) {
    _client.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }

  // ---------------------------------------------------------------------------
  // getClient()
  // Returns the raw Supabase client for use in other modules (e.g. cloudSync.js)
  // ---------------------------------------------------------------------------
  function getClient() {
    return _client;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  window.AuthModule = {
    register,     // (email, password) → { user, error }
    login,        // (email, password) → { user, error }
    logout,       // ()                → { error }
    getSession,   // ()                → session | null
    getUser,      // ()                → user | null
    onAuthChange, // (callback)        → unsubscribe fn
    getClient,    // ()                → supabase client
  };

})();
