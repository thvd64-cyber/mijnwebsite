// =============================================================================
// auth.js — Supabase Authentication Module
// MyFamTreeCollab v2.1.0
// -----------------------------------------------------------------------------
// Handles registration, login, logout, session management and user profiles.
// Exposes window.AuthModule for use across all pages.
//
// Dependencies: Supabase JS SDK (loaded via CDN before this script)
// Load order:   utils.js → auth.js → topbar.js → [pagina].js
// =============================================================================

(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // CONFIGURATION — vul hier je eigen Supabase gegevens in
  // ---------------------------------------------------------------------------
  const SUPABASE_URL  = "https://xpufzrjncivyzyukwcmn.supabase.co";
  const SUPABASE_ANON = "sb_publishable_Gx4Qtmo85SbzfbLdwq-zFw_mBDuKjDQ";

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
    if (msg.includes("Invalid login credentials")) return "E-mailadres of wachtwoord onjuist.";
    if (msg.includes("Email not confirmed"))       return "Bevestig eerst je e-mailadres via de ontvangen mail.";
    if (msg.includes("User already registered"))   return "Dit e-mailadres is al in gebruik.";
    if (msg.includes("Password should be"))        return "Wachtwoord moet minimaal 6 tekens bevatten.";
    return msg;
  }

  // ---------------------------------------------------------------------------
  // register(email, password, username)
  // Maakt een nieuw account aan. Username wordt via metadata doorgegeven
  // aan de database trigger die het opslaat in de profiles tabel.
  // Returns { user, error }
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
      options: {
        // Username in metadata — database trigger leest dit uit
        data: { username: username.trim() }
      }
    });

    if (error) return { user: null, error: _errMsg(error) };
    return { user: data.user, error: null };
  }

  // ---------------------------------------------------------------------------
  // login(email, password)
  // Logt een bestaande gebruiker in. Sessie wordt automatisch opgeslagen.
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
  // Logt de huidige gebruiker uit en wist de sessie.
  // Returns { error }
  // ---------------------------------------------------------------------------
  async function logout() {
    const { error } = await _client.auth.signOut();
    return { error: _errMsg(error) };
  }

  // ---------------------------------------------------------------------------
  // getSession()
  // Geeft het huidige sessie-object terug, of null als niet ingelogd.
  // ---------------------------------------------------------------------------
  async function getSession() {
    const { data } = await _client.auth.getSession();
    return data.session || null;
  }

  // ---------------------------------------------------------------------------
  // getUser()
  // Geeft het huidige gebruikersobject terug, of null als niet ingelogd.
  // ---------------------------------------------------------------------------
  async function getUser() {
    const session = await getSession();
    return session ? session.user : null;
  }

  // ---------------------------------------------------------------------------
  // getProfile()
  // Haalt username en avatar_id op uit de profiles tabel.
  // Returns { profile, error }
  // ---------------------------------------------------------------------------
  async function getProfile() {
    const user = await getUser();
    if (!user) return { profile: null, error: "Niet ingelogd." };

    const { data, error } = await _client
      .from("profiles")
      .select("username, avatar_id")
      .eq("id", user.id)
      .single();

    if (error) return { profile: null, error: _errMsg(error) };
    return { profile: data, error: null };
  }

  // ---------------------------------------------------------------------------
  // updateUsername(username)
  // Past de gebruikersnaam aan in de profiles tabel.
  // Returns { error }
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
  // Abonneert op auth-statuswijzigingen (login, logout, token refresh).
  // callback ontvangt (event, session)
  // ---------------------------------------------------------------------------
  function onAuthChange(callback) {
    _client.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }

  // ---------------------------------------------------------------------------
  // getClient()
  // Geeft de ruwe Supabase client terug voor gebruik in andere modules.
  // ---------------------------------------------------------------------------
  function getClient() {
    return _client;
  }

  // ---------------------------------------------------------------------------
  // Publieke API
  // ---------------------------------------------------------------------------
  window.AuthModule = {
    register,       // (email, password, username) → { user, error }
    login,          // (email, password)            → { user, error }
    logout,         // ()                           → { error }
    getSession,     // ()                           → session | null
    getUser,        // ()                           → user | null
    getProfile,     // ()                           → { profile, error }
    updateUsername, // (username)                   → { error }
    onAuthChange,   // (callback)                   → void
    getClient,      // ()                           → supabase client
  };

})();
