// ========================= js/cloudSync.js v2.1.0 =========================
// Cloud sync module for MyFamTreeCollab
// Manages multiple family trees per user in Supabase (table: stambomen)
// Requires: auth.js (window.AuthModule), storage.js (window.StamboomStorage)
//           versionControl.js (window.VersionControl) — optional, non-fatal if absent
// Exported as: window.CloudSync
//
// Nieuw in v2.1.0 (F5-06):
// - saveToCloud() slaat na elke succesvolle opslag een versie-snapshot op
// - enforceLimit() wordt aangeroepen na elke saveToCloud() (max 20 versies)
// - Vereist: versionControl.js geladen vóór cloudSync.js in HTML
//
// Nieuw in v2.0.0 (F5-07):
// - Meerdere stambomen per gebruiker (niet langer één rij per user_id)
// - saveToCloud(naam, stamboumId) — opslaan als nieuw of bestaande overschrijven
// - loadFromCloud(stamboumId)     — laad specifieke stamboom op UUID
// - listStambomen()               — geeft alle stambomen van de gebruiker
// - deleteFromCloud(stamboumId)   — verwijdert één stamboom uit de cloud
// - getCloudMeta()                — geeft lijst-overzicht (vervangt single-check)
//
// Verwijderd in v2.0.0:
// - upsert op user_id (was één rij per gebruiker)
// ==========================================================================

(function () {
    'use strict';

    // Tiers die cloud backup mogen gebruiken
    var CLOUD_TIERS = ['supporter', 'personal', 'family', 'researcher', 'admin'];

    // Maximum aantal personen per stamboom voor niet-admin gebruikers
    var MAX_PERSONS = 500;

    // Naam van de Supabase tabel
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
        return window.AuthModule.getClient();                              // Supabase client instantie
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
    // Returns: { allowed: true, isAdmin: bool, tier: string }
    //       of { allowed: false, error: string, tier: string }
    // -----------------------------------------------------------------------
    async function _checkCloudAccess() {
        if (!window.AuthModule || typeof window.AuthModule.getTier !== 'function') {
            return { allowed: false, error: 'not_logged_in' };
        }

        var tier = await window.AuthModule.getTier();                      // Haal tier op uit profiles tabel

        if (tier === 'free') {
            return { allowed: false, error: 'no_cloud_access', tier: tier };
        }

        if (!CLOUD_TIERS.includes(tier)) {
            return { allowed: false, error: 'no_cloud_access', tier: tier };
        }

        return {
            allowed: true,
            isAdmin: tier === 'admin',                                     // Admin heeft geen persoonslimiet
            tier:    tier
        };
    }

    // -----------------------------------------------------------------------
    // listStambomen
    // Geeft een lijst van alle cloud stambomen van de ingelogde gebruiker.
    // Elke entry bevat: id, naam, updated_at, aantal_personen
    // Returns: { success: true, stambomen: [...] }
    //       of { success: false, error: string }
    // -----------------------------------------------------------------------
    async function listStambomen() {
        var userId = await _getCurrentUserId();
        if (!userId) return { success: false, error: 'not_logged_in' };

        var access = await _checkCloudAccess();
        if (!access.allowed) return { success: false, error: access.error, tier: access.tier };

        var client = _getClient();

        // Haal alle rijen op voor deze gebruiker — data niet ophalen (te groot), alleen metadata
        var result = await client
            .from(TABLE)
            .select('id, naam, updated_at, data')                          // data nodig voor telling
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });                    // Nieuwste bovenaan

        if (result.error) {
            console.error('[cloudSync] listStambomen fout:', result.error);
            return { success: false, error: result.error.message };
        }

        // Bouw een compacte lijst met telling maar zonder de volledige data
        var stambomen = (result.data || []).map(function(rij) {
            return {
                id:             rij.id,                                    // UUID van de rij
                naam:           rij.naam || 'Naamloos',                   // Naam van de stamboom
                updatedAt:      rij.updated_at,                            // Laatste wijzigingstijd
                aantalPersonen: Array.isArray(rij.data) ? rij.data.length : 0  // Aantal personen
            };
        });

        return { success: true, stambomen: stambomen, isAdmin: access.isAdmin, tier: access.tier };
    }

    // -----------------------------------------------------------------------
    // saveToCloud(naam, stamboumId)
    // Slaat de huidige lokale stamboom op in de cloud.
    // - naam:        naam voor de stamboom (verplicht bij nieuw aanmaken)
    // - stamboumId:  UUID van bestaande rij om te overschrijven (optioneel)
    //                Als leeg → nieuwe rij aanmaken
    // Na elke succesvolle opslag wordt automatisch een versie-snapshot aangemaakt
    // via window.VersionControl (F5-06). Versie-fouten zijn niet-fataal.
    // Returns: { success: true, id, naam, count }
    //       of { success: false, error: string }
    // -----------------------------------------------------------------------
    async function saveToCloud(naam, stamboumId) {
        // Stap 1: controleer login
        var userId = await _getCurrentUserId();
        if (!userId) return { success: false, error: 'not_logged_in' };

        // Stap 2: controleer cloud toegang op basis van tier
        var access = await _checkCloudAccess();
        if (!access.allowed) return { success: false, error: access.error, tier: access.tier };

        // Stap 3: haal lokale data op
        if (!window.StamboomStorage) return { success: false, error: 'storage_unavailable' };
        var allPersons = window.StamboomStorage.get();                     // Array van persoon-objecten

        // Stap 4: controleer persoonslimiet — admin heeft geen limiet
        if (!access.isAdmin && allPersons.length > MAX_PERSONS) {
            return { success: false, error: 'limit_exceeded', count: allPersons.length, max: MAX_PERSONS };
        }

        var client   = _getClient();
        var stamNaam = (naam || '').trim() || 'Mijn stamboom';            // Fallback naam
        var nu       = new Date().toISOString();                           // Huidige timestamp

        var result;

        if (stamboumId) {
            // ---- Bestaande stamboom overschrijven ----
            // Filter op id + user_id (extra veiligheid naast RLS)
            result = await client
                .from(TABLE)
                .update({
                    naam:       stamNaam,                                  // Naam bijwerken
                    data:       allPersons,                                // Personen bijwerken
                    updated_at: nu                                         // Timestamp bijwerken
                })
                .eq('id', stamboumId)
                .eq('user_id', userId);                                    // Eigen rij gegarandeerd

        } else {
            // ---- Nieuwe stamboom aanmaken ----
            result = await client
                .from(TABLE)
                .insert({
                    user_id:    userId,                                    // Koppel aan ingelogde gebruiker
                    naam:       stamNaam,                                  // Naam van de stamboom
                    data:       allPersons,                                // Stamboom data
                    updated_at: nu                                         // Aanmaaktijdstip
                })
                .select('id')                                              // Geef het nieuwe UUID terug
                .single();
        }

        if (result.error) {
            console.error('[cloudSync] saveToCloud fout:', result.error);
            return { success: false, error: result.error.message };
        }

        // Bij insert: sla het nieuwe UUID op als actieve stamboom
        var nieuwId = stamboumId || (result.data && result.data.id);
        if (nieuwId) {
            window.StamboomStorage.setActiveTreeId(nieuwId);              // Onthoud welke stamboom actief is
        }

        // ── F5-06: versie-snapshot aanmaken na elke succesvolle cloud-opslag ──
        // window.VersionControl is optioneel — fouten zijn niet-fataal zodat
        // de gewone opslag nooit geblokkeerd wordt door een versie-fout.
        if (window.VersionControl) {
            try {
                // Sla een snapshot op in stamboom_versies
                await window.VersionControl.saveVersion(
                    nieuwId,     // UUID van de zojuist opgeslagen stamboom
                    allPersons,  // de data die naar de cloud is geschreven
                    null         // label: null = auto-gegenereerd door saveVersion()
                );

                // Verwijder oudste versies als het maximum van 20 bereikt is
                await window.VersionControl.enforceLimit(nieuwId);

                console.log('[cloudSync] Versie-snapshot aangemaakt voor stamboom:', nieuwId);
            } catch (versionErr) {
                // Niet-fataal: log de fout maar geef de opslag als geslaagd terug
                console.warn('[cloudSync] Versie-snapshot mislukt (niet-fataal):', versionErr.message);
            }
        }
        // ── Einde F5-06 integratie ─────────────────────────────────────────────

        return { success: true, id: nieuwId, naam: stamNaam, count: allPersons.length };
    }

    // -----------------------------------------------------------------------
    // loadFromCloud(stamboumId)
    // Laadt een specifieke cloud stamboom naar localStorage.
    // Overschrijft de huidige lokale data.
    // Returns: { success: true, naam, count, updatedAt }
    //       of { success: false, error: string }
    // -----------------------------------------------------------------------
    async function loadFromCloud(stamboumId) {
        if (!stamboumId) return { success: false, error: 'geen_id' };

        var userId = await _getCurrentUserId();
        if (!userId) return { success: false, error: 'not_logged_in' };

        var access = await _checkCloudAccess();
        if (!access.allowed) return { success: false, error: access.error, tier: access.tier };

        var client = _getClient();

        // Haal de specifieke rij op — RLS garandeert dat het van de gebruiker is
        var result = await client
            .from(TABLE)
            .select('id, naam, data, updated_at')                          // Volledige data ophalen
            .eq('id', stamboumId)
            .eq('user_id', userId)                                         // Extra check naast RLS
            .single();

        if (result.error) {
            console.error('[cloudSync] loadFromCloud fout:', result.error);
            return { success: false, error: result.error.message };
        }

        var cloudData = result.data.data;                                  // Array van persoon-objecten
        var stamNaam  = result.data.naam;
        var updatedAt = result.data.updated_at;

        if (!Array.isArray(cloudData)) {
            return { success: false, error: 'invalid_data' };
        }

        if (!window.StamboomStorage) return { success: false, error: 'storage_unavailable' };

        // Overschrijf localStorage met de gekozen stamboom
        window.StamboomStorage.replaceAll(cloudData);                     // Schrijf personen weg
        window.StamboomStorage.setActiveTreeId(stamboumId);               // Onthoud actieve stamboom
        window.StamboomStorage.setActiveTreeName(stamNaam);               // Onthoud naam

        return { success: true, naam: stamNaam, count: cloudData.length, updatedAt: updatedAt };
    }

    // -----------------------------------------------------------------------
    // deleteFromCloud(stamboumId)
    // Verwijdert één stamboom uit de cloud (alleen eigen stambomen via RLS).
    // Returns: { success: true } of { success: false, error: string }
    // -----------------------------------------------------------------------
    async function deleteFromCloud(stamboumId) {
        if (!stamboumId) return { success: false, error: 'geen_id' };

        var userId = await _getCurrentUserId();
        if (!userId) return { success: false, error: 'not_logged_in' };

        var access = await _checkCloudAccess();
        if (!access.allowed) return { success: false, error: access.error, tier: access.tier };

        var client = _getClient();

        var result = await client
            .from(TABLE)
            .delete()
            .eq('id', stamboumId)                                          // Specifieke stamboom
            .eq('user_id', userId);                                        // Alleen eigen stambomen

        if (result.error) {
            console.error('[cloudSync] deleteFromCloud fout:', result.error);
            return { success: false, error: result.error.message };
        }

        // Als de verwijderde stamboom de actieve was, wis dan de actieve ID
        var actieveId = window.StamboomStorage.getActiveTreeId();
        if (actieveId === stamboumId) {
            window.StamboomStorage.setActiveTreeId(null);                  // Geen actieve stamboom meer
            window.StamboomStorage.setActiveTreeName(null);
        }

        return { success: true };
    }

    // -----------------------------------------------------------------------
    // getCloudMeta
    // Geeft een overzicht van de cloud stambomen zonder volledige data te laden.
    // Vervangt de oude single-stamboom versie.
    // Returns: { hasAccess, tier, stambomen: [...] }
    //       of { hasAccess: false, error, tier }
    // -----------------------------------------------------------------------
    async function getCloudMeta() {
        var userId = await _getCurrentUserId();
        if (!userId) return { hasAccess: false, error: 'not_logged_in' };

        var access = await _checkCloudAccess();
        if (!access.allowed) {
            return { hasAccess: false, tier: access.tier, error: access.error };
        }

        var lijst = await listStambomen();                                 // Haal lijst op

        if (!lijst.success) {
            return { hasAccess: true, tier: access.tier, stambomen: [], error: lijst.error };
        }

        return {
            hasAccess:  true,
            tier:       access.tier,
            isAdmin:    access.isAdmin,
            stambomen:  lijst.stambomen                                    // Array van stamboom-objecten
        };
    }

    // -----------------------------------------------------------------------
    // Publieke API
    // -----------------------------------------------------------------------
    window.CloudSync = {
        saveToCloud:     saveToCloud,     // (naam, id?) → { success, id, naam, count }
        loadFromCloud:   loadFromCloud,   // (id)        → { success, naam, count, updatedAt }
        deleteFromCloud: deleteFromCloud, // (id)        → { success }
        listStambomen:   listStambomen,   // ()          → { success, stambomen }
        getCloudMeta:    getCloudMeta,    // ()          → { hasAccess, tier, stambomen }
        MAX_PERSONS:     MAX_PERSONS      // Persoonslimiet voor niet-admin gebruikers
    };

})();
