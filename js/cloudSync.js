// ========================= js/cloudSync.js v1.1.0 =========================
// Cloud backup module for MyFamTreeCollab
// Saves and loads family tree data to/from Supabase (table: stambomen)
// Requires: auth.js (window.AuthModule), storage.js (window.StamboomStorage)
// Exported as: window.CloudSync
//
// Nieuw in v1.1.0:
// - Tiercontrole: alleen premium/admin mag opslaan in cloud
// - Gratis gebruikers krijgen 'no_cloud_access' fout
// - Admin heeft geen persoonslimiet
// ==========================================================================

(function () {
    'use strict';

    // Tiers die cloud backup mogen gebruiken (behalve admin — die wordt apart gecheckt)
    var CLOUD_TIERS = ['supporter', 'personal', 'family', 'researcher', 'admin'];

    // Maximum aantal personen voor niet-admin cloud gebruikers
    // Admin heeft geen limiet
    var MAX_PERSONS = 500;

    // Naam van de Supabase tabel voor cloud opslag
    var TABLE = 'stambomen';

    // -----------------------------------------------------------------------
    // _getClient
    // Geeft de Supabase client terug via AuthModule.
    // -----------------------------------------------------------------------
    function _getClient() {
        if (!window.AuthModule || typeof window.AuthModule.getClient !== 'function') {
            console.error('[cloudSync] AuthModule niet beschikbaar');
            return null;
        }
        return window.AuthModule.getClient();
    }

    // -----------------------------------------------------------------------
    // _getCurrentUserId
    // Geeft het UUID van de ingelogde gebruiker, of null als niet ingelogd.
    // -----------------------------------------------------------------------
    async function _getCurrentUserId() {
        var client = _getClient();
        if (!client) return null;

        var sessionResult = await client.auth.getSession();                // Haal sessie op uit Supabase
        var session = sessionResult.data && sessionResult.data.session;    // Pak het sessie-object
        if (!session || !session.user) return null;                        // Geen sessie = niet ingelogd

        return session.user.id;                                            // Geef het UUID terug
    }

    // -----------------------------------------------------------------------
    // _checkCloudAccess
    // Controleert of de ingelogde gebruiker cloud backup mag gebruiken.
    // Returns: { allowed: true, isAdmin: bool } of { allowed: false, error: string }
    // -----------------------------------------------------------------------
    async function _checkCloudAccess() {
        // Haal tier op via AuthModule — geeft 'free' als niet ingelogd
        if (!window.AuthModule || typeof window.AuthModule.getTier !== 'function') {
            return { allowed: false, error: 'not_logged_in' };
        }

        var tier = await window.AuthModule.getTier();                      // Haal tier op uit profiles tabel

        if (tier === 'free') {
            // Gratis gebruikers hebben geen cloud toegang
            return { allowed: false, error: 'no_cloud_access', tier: tier };
        }

        if (!CLOUD_TIERS.includes(tier)) {
            // Onbekende tier — blokkeer als voorzorgsmaatregel
            return { allowed: false, error: 'no_cloud_access', tier: tier };
        }

        return {
            allowed: true,
            isAdmin: tier === 'admin',                                     // Admin heeft geen persoonslimiet
            tier: tier
        };
    }

    // -----------------------------------------------------------------------
    // saveToCloud
    // Slaat de lokale stamboom op in Supabase.
    // Controleert eerst tier en persoonslimiet.
    // Returns: { success: true } of { success: false, error: string }
    // -----------------------------------------------------------------------
    async function saveToCloud() {
        // Stap 1: controleer login
        var userId = await _getCurrentUserId();
        if (!userId) {
            return { success: false, error: 'not_logged_in' };
        }

        // Stap 2: controleer cloud toegang op basis van tier
        var access = await _checkCloudAccess();
        if (!access.allowed) {
            return { success: false, error: access.error, tier: access.tier };
        }

        // Stap 3: haal lokale data op
        if (!window.StamboomStorage) {
            return { success: false, error: 'storage_unavailable' };
        }
        var allPersons = window.StamboomStorage.get();                     // Array van persoon-objecten

        // Stap 4: controleer persoonslimiet — admin heeft geen limiet
        if (!access.isAdmin && allPersons.length > MAX_PERSONS) {
            return {
                success: false,
                error: 'limit_exceeded',
                count: allPersons.length,
                max: MAX_PERSONS
            };
        }

        // Stap 5: sla op via upsert — één rij per gebruiker
        var client = _getClient();
        var payload = {
            user_id:    userId,
            data:       allPersons,
            updated_at: new Date().toISOString()                           // Huidige timestamp
        };

        var result = await client
            .from(TABLE)
            .upsert(payload, { onConflict: 'user_id' });                   // Update als rij al bestaat

        if (result.error) {
            console.error('[cloudSync] saveToCloud fout:', result.error);
            return { success: false, error: result.error.message };
        }

        return { success: true, count: allPersons.length };
    }

    // -----------------------------------------------------------------------
    // loadFromCloud
    // Laadt de cloud backup naar localStorage — overschrijft lokale data.
    // Returns: { success: true, count, updatedAt } of { success: false, error: string }
    // -----------------------------------------------------------------------
    async function loadFromCloud() {
        // Controleer login
        var userId = await _getCurrentUserId();
        if (!userId) {
            return { success: false, error: 'not_logged_in' };
        }

        // Controleer cloud toegang
        var access = await _checkCloudAccess();
        if (!access.allowed) {
            return { success: false, error: access.error, tier: access.tier };
        }

        var client = _getClient();

        // Haal de rij op voor deze gebruiker
        var result = await client
            .from(TABLE)
            .select('data, updated_at')
            .eq('user_id', userId)
            .single();

        if (result.error) {
            if (result.error.code === 'PGRST116') {                        // PGRST116 = geen rij gevonden
                return { success: false, error: 'no_backup' };
            }
            console.error('[cloudSync] loadFromCloud fout:', result.error);
            return { success: false, error: result.error.message };
        }

        var cloudData = result.data.data;                                  // Array van persoon-objecten
        var updatedAt = result.data.updated_at;                            // Timestamp van laatste opslag

        // Valideer dat we een array ontvangen hebben
        if (!Array.isArray(cloudData)) {
            return { success: false, error: 'invalid_data' };
        }

        // Overschrijf localStorage met cloud data
        if (!window.StamboomStorage) {
            return { success: false, error: 'storage_unavailable' };
        }
        window.StamboomStorage.replaceAll(cloudData);

        return { success: true, count: cloudData.length, updatedAt: updatedAt };
    }

    // -----------------------------------------------------------------------
    // getCloudMeta
    // Geeft metadata over de bestaande cloud backup zonder data te laden.
    // Geeft ook aan of de gebruiker cloud toegang heeft.
    // Returns: { exists, count, updatedAt, hasAccess, tier }
    // -----------------------------------------------------------------------
    async function getCloudMeta() {
        // Controleer login
        var userId = await _getCurrentUserId();
        if (!userId) return { exists: false, hasAccess: false, error: 'not_logged_in' };

        // Controleer tier
        var access = await _checkCloudAccess();
        if (!access.allowed) {
            // Geen toegang — geef tier mee zodat UI juiste melding kan tonen
            return { exists: false, hasAccess: false, tier: access.tier, error: access.error };
        }

        var client = _getClient();

        // Haal metadata op — select alleen updated_at en data voor telling
        var result = await client
            .from(TABLE)
            .select('updated_at, data')
            .eq('user_id', userId)
            .single();

        if (result.error) {
            // Geen backup gevonden is geen fout — gewoon nog niet opgeslagen
            return { exists: false, hasAccess: true, tier: access.tier };
        }

        var count = Array.isArray(result.data.data) ? result.data.data.length : 0;

        return {
            exists:     true,
            hasAccess:  true,
            tier:       access.tier,
            isAdmin:    access.isAdmin,
            count:      count,
            updatedAt:  result.data.updated_at
        };
    }

    // -----------------------------------------------------------------------
    // Publieke API
    // -----------------------------------------------------------------------
    window.CloudSync = {
        saveToCloud:  saveToCloud,   // () → { success, count } of { success: false, error }
        loadFromCloud: loadFromCloud, // () → { success, count, updatedAt } of { success: false, error }
        getCloudMeta: getCloudMeta,  // () → { exists, hasAccess, tier, count, updatedAt }
        MAX_PERSONS:  MAX_PERSONS    // Persoonslimiet voor niet-admin gebruikers
    };

})();
