// =============================================================================
// auth.js — Supabase Authentication Module
// MyFamTreeCollab v2.3.0
// -----------------------------------------------------------------------------
// Handles registration, login, logout, session management, profiles
// and password reset flow.
//
// Nieuw in v2.3.0:
// - getProfile() haalt nu ook tier, is_admin, is_premium op
// - getTier()    — handige shortcut die alleen de tier teruggeeft
//
// Nieuw in v2.2.0:
// - resetPassword(email)   — stuurt resetmail via Supabase
// - updatePassword(pwd)    — slaat nieuw wachtwoord op na reset
//
// Dependencies: Supabase JS SDK (loaded via CDN before this script)
// Load order:   utils.js → auth.js → topbar.js → [pagina].js
// =============================================================================

(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // CONFIGURATION
  // ---------------------------------------------------------------------------
  const SUPABASE_URL  = "https://xpufzrjncivyzyukwcmn.supabase.co";
  const SUPABASE_ANON = "sb_publishable_4Pg_TkSymTbA-uX29z0Zaw_d1A1c5lE";

  // ---------------------------------------------------------------------------
  // Supabase client — eenmalig aangemaakt, overal hergebruikt
  // ---------------------------------------------------------------------------
  const _client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

  // ---------------------------------------------------------------------------
  // _errMsg(error)
  // Vertaalt Supabase foutmeldingen naar leesbaar Nederlands
  // ---------------------------------------------------------------------------
  function _errMsg(error) {
    if (!error) return null;
    const msg = error.message || "Onbekende fout";
    if (msg.includes("Invalid login credentials"))  return "E-mailadres of wachtwoord onjuist.";
    if (msg.includes("Email not confirmed"))        return "Bevestig eerst je e-mailadres via de ontvangen mail.";
    if (msg.includes("User already registered"))    return "Dit e-mailadres is al in gebruik.";
    if (msg.includes("Password should be"))         return "Wachtwoord moet minimaal 6 tekens bevatten.";
    if (msg.includes("Email rate limit exceeded"))  return "Te veel pogingen. Probeer het later opnieuw.";
    return msg;
  }

  // ---------------------------------------------------------------------------
  // register(email, password, username)
  // ---------------------------------------------------------------------------
  async function register(email, password, username) {
    if (!email || !password || !username) {
      return { user: null, error: "Vul alle velden in." };
    }
    if (username.trim().length < 2) {
      return { user: null, error: "Gebruikersnaam moet minimaal 2 tekens bevatten." };
    }

    const { data, error } = await _client.auth.signUp({
      email,
      password,
      options: { data: { username: username.trim() } }
    });

    if (error) return { user: null, error: _errMsg(error) };
    return { user: data.user, error: null };
  }

  // ---------------------------------------------------------------------------
  // login(email, password)
  // ---------------------------------------------------------------------------
  async function login(email, password) {
    if (!email || !password) return { user: null, error: "Vul e-mailadres en wachtwoord in." };

    const { data, error } = await _client.auth.signInWithPassword({ email, password });

    if (error) return { user: null, error: _errMsg(error) };
    return { user: data.user, error: null };
  }

  // ---------------------------------------------------------------------------
  // logout()
  // ---------------------------------------------------------------------------
  async function logout() {
    const { error } = await _client.auth.signOut();
    return { error: _errMsg(error) };
  }

  // ---------------------------------------------------------------------------
  // resetPassword(email)
  // ---------------------------------------------------------------------------
  async function resetPassword(email) {
    if (!email) return { error: "Vul je e-mailadres in." };

    const { error } = await _client.auth.resetPasswordForEmail(email, {
      redirectTo: "https://thvd64-cyber.github.io/MyFamTreeCollab/home/reset.html"
    });

    if (error) return { error: _errMsg(error) };
    return { error: null };
  }

  // ---------------------------------------------------------------------------
  // updatePassword(newPassword)
  // ---------------------------------------------------------------------------
  async function updatePassword(newPassword) {
    if (!newPassword || newPassword.length < 6) {
      return { error: "Wachtwoord moet minimaal 6 tekens bevatten." };
    }

    const { error } = await _client.auth.updateUser({ password: newPassword });

    if (error) return { error: _errMsg(error) };
    return { error: null };
  }

  // ---------------------------------------------------------------------------
  // getSession()
  // ---------------------------------------------------------------------------
  async function getSession() {
    const { data } = await _client.auth.getSession();
    return data.session || null;
  }

  // ---------------------------------------------------------------------------
  // getUser()
  // ---------------------------------------------------------------------------
  async function getUser() {
    const session = await getSession();
    return session ? session.user : null;
  }

  // ---------------------------------------------------------------------------
  // getProfile()
  // Haalt het volledige profiel op inclusief tier, is_admin en is_premium.
  // Returns { profile, error }
  // profile bevat: username, avatar_id, tier, is_admin, is_premium, tier_until
  // ---------------------------------------------------------------------------
  async function getProfile() {
    const user = await getUser();
    if (!user) return { profile: null, error: "Niet ingelogd." };

    const { data, error } = await _client
      .from("profiles")
      .select("username, avatar_id, tier, is_admin, is_premium, tier_until")  // Nieuw: tier + rollen
      .eq("id", user.id)
      .single();

    if (error) return { profile: null, error: _errMsg(error) };
    return { profile: data, error: null };
  }

  // ---------------------------------------------------------------------------
  // getTier()
  // Handige shortcut — geeft alleen de tier string terug van de ingelogde gebruiker.
  // Geeft 'free' terug als niet ingelogd of bij fout.
  // Gebruikt door cloudSync.js en storage.js voor toegangscontrole.
  // Returns: 'free' | 'viewer' | 'supporter' | 'personal' | 'family' | 'researcher' | 'admin'
  // ---------------------------------------------------------------------------
  async function getTier() {
    const { profile, error } = await getProfile();
    if (error || !profile) return 'free';       // Niet ingelogd of fout → behandel als gratis
    return profile.tier || 'free';              // Fallback naar 'free' als kolom leeg is
  }

  // ---------------------------------------------------------------------------
  // updateUsername(username)
  // ---------------------------------------------------------------------------
  async function updateUsername(username) {
    const user = await getUser();
    if (!user) return { error: "Niet ingelogd." };
    if (!username || username.trim().length < 2) {
      return { error: "Gebruikersnaam moet minimaal 2 tekens bevatten." };
    }

    const { error } = await _client
      .from("profiles")
      .update({ username: username.trim() })
      .eq("id", user.id);

    return { error: _errMsg(error) };
  }

  // ---------------------------------------------------------------------------
  // onAuthChange(callback)
  // ---------------------------------------------------------------------------
  function onAuthChange(callback) {
    _client.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }

  // ---------------------------------------------------------------------------
  // getClient()
  // ---------------------------------------------------------------------------
  function getClient() {
    return _client;
  }

  // ---------------------------------------------------------------------------
  // Publieke API
  // ---------------------------------------------------------------------------
  window.AuthModule = {
    register,        // (email, password, username) → { user, error }
    login,           // (email, password)            → { user, error }
    logout,          // ()                           → { error }
    resetPassword,   // (email)                      → { error }
    updatePassword,  // (newPassword)                → { error }
    getSession,      // ()                           → session | null
    getUser,         // ()                           → user | null
    getProfile,      // ()                           → { profile, error }
    getTier,         // ()                           → tier string
    updateUsername,  // (username)                   → { error }
    onAuthChange,    // (callback)                   → void
    getClient,       // ()                           → supabase client
  };

})();
