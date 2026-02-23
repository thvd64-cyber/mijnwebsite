// storage.js
// Centrale opslagmodule – lean, schema-driven, future-proof

(function () {
    'use strict';

    const STORAGE_KEY = 'stamboomData';
    const VERSION_KEY = 'stamboomDataVersion';
    const STORAGE_VERSION = '3.0.0';

    if (!window.StamboomSchema) {
        console.error('StamboomSchema niet geladen. Laad schema.js vóór storage.js');
        return;
    }

    /* =========================
       Veilig JSON parsen
    ========================== */
    function safeParse(json) {
        try {
            return JSON.parse(json);
        } catch (error) {
            console.error('JSON parse fout:', error);
            return null;
        }
    }

    /* =========================
       Dataset validatie
    ========================== */
    function validateDataset(data) {

        if (!Array.isArray(data)) return false;

        const requiredFields = window.StamboomSchema.fields;

        for (let i = 0; i < data.length; i++) {

            const persoon = data[i];

            // Check of alle velden bestaan volgens schema
            for (let field of requiredFields) {
                if (!(field in persoon)) {
                    console.warn(`Ontbrekend veld ${field} in record index ${i}`);
                    return false;
                }
            }

            // Gebruik schema validatie
            if (!window.StamboomSchema.validate(persoon)) {
                console.warn(`Ongeldig persoon volgens schema op index ${i}`);
                return false;
            }
        }

        return true;
    }

    /* =========================
       Dataset ophalen
    ========================== */
    function getStamboomData() {

        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw) return [];

        const parsed = safeParse(raw);

        if (!parsed) {
            console.warn('Storage corrupt. Lege dataset teruggegeven.');
            return [];
        }

        if (!validateDataset(parsed)) {
            console.warn('Dataset ongeldig volgens schema. Lege dataset teruggegeven.');
            return [];
        }

        return parsed;
    }

    /* =========================
       Dataset wissen
    ========================== */
    function clearStamboomStorage() {

        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem(VERSON_KEY = VERSION_KEY, STORAGE_VERSION);

        console.warn('Stamboom storage volledig gereset.');
        return true;
    }

    /* =========================
       Raw database tonen (read-only)
    ========================== */
    function showRaw() {
        const data = getStamboomData();
        console.table(data);
        return data;
    }

    /* =========================
       Publieke API
    ========================== */
    window.StamboomStorage = {
        get: getStamboomData,   // haalt volledige dataset op volgens schema
        clear: clearStamboomStorage, // wist alles
        raw: showRaw,          // toont raw dataset volgens schema
        version: STORAGE_VERSION
    };

})();
