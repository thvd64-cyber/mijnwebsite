// storage.js
// Centrale opslagmodule – lean, schema-driven, future-proof
(function () {
    'use strict'; // Strikte modus voor veiligere JS

    const STORAGE_KEY = 'stamboomData';          // Key voor dataset in localStorage
    const VERSION_KEY = 'stamboomDataVersion';   // Key voor versie van storage
    const STORAGE_VERSION = '3.0.0';             // Huidige versie van storage

    // Controle of schema geladen is
    if (!window.StamboomSchema) {               // Check of window.StamboomSchema bestaat
        console.error('StamboomSchema niet geladen. Laad schema.js vóór storage.js'); // Foutmelding
        return;                                 // Stop uitvoeren als schema ontbreekt
    }

    /* =========================
       Veilig JSON parsen
    ========================== */
    function safeParse(json) {
        try {
            return JSON.parse(json);             // Probeer JSON te parsen
        } catch (error) {
            console.error('JSON parse fout:', error); // Log fout
            return null;                         // Geef null terug bij fout
        }
    }

    /* =========================
       Dataset validatie
    ========================== */
    function validateDataset(data) {
        if (!Array.isArray(data)) return false;          // Moet een array zijn

        const requiredFields = window.StamboomSchema.fields; // Velden zoals gedefinieerd in schema

        for (let i = 0; i < data.length; i++) {          // Loop door elk record
            const persoon = data[i];                     // Huidig record

            for (let field of requiredFields) {          // Loop door alle verplichte velden
                if (!(field in persoon)) {               // Check of veld bestaat
                    console.warn(`Ontbrekend veld ${field} in record index ${i}`); // Waarschuwing
                    return false;                        // Ongeldige dataset
                }
            }

            if (!window.StamboomSchema.validate(persoon)) { // Schema-validatie per record
                console.warn(`Ongeldig persoon volgens schema op index ${i}`); // Waarschuwing
                return false;                              // Ongeldige dataset
            }
        }

        return true;                                      // Alles geldig
    }

    /* =========================
       Dataset ophalen
    ========================== */
    function getStamboomData() {
        const raw = localStorage.getItem(STORAGE_KEY);   // Haal ruwe data uit localStorage
        if (!raw) return [];                              // Als leeg → lege array

        const parsed = safeParse(raw);                    // Parse JSON veilig
        if (!parsed) {                                    // Fout bij parsen
            console.warn('Storage corrupt. Lege dataset teruggegeven.');
            return [];                                    // Lege array teruggeven
        }

        if (!validateDataset(parsed)) {                   // Controleer validiteit volgens schema
            console.warn('Dataset ongeldig volgens schema. Lege dataset teruggegeven.');
            return [];                                    // Leeg teruggeven bij invaliditeit
        }

        return parsed;                                    // Geldige data teruggeven
    }

    /* =========================
       Dataset wissen
    ========================== */
    function clearStamboomStorage() {
        localStorage.removeItem(STORAGE_KEY);            // Verwijder data
        localStorage.setItem(VERSION_KEY, STORAGE_VERSION); // Zet versie correct (typo gefixt)
        console.warn('Stamboom storage volledig gereset.'); // Log reset
        return true;                                     // Succes teruggeven
    }

    /* =========================
       Raw database tonen (read-only)
    ========================== */
    function showRaw() {
        const data = getStamboomData();                  // Haal dataset
        console.table(data);                             // Log in console tabel
        return data;                                     // Return data (read-only)
    }

    /* =========================
       Publieke API
    ========================== */
    window.StamboomStorage = {
        get: getStamboomData,    // Haalt volledige dataset op volgens schema
        clear: clearStamboomStorage, // Wis alles
        raw: showRaw,            // Toont raw dataset
        version: STORAGE_VERSION // Versie van storage
    };

})();
