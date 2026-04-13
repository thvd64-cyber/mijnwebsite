/* ======================= js/storage.js v2.0.2 =======================
   Persistente opslag voor MyFamTreeCollab via localStorage
   Exporteert: window.StamboomStorage (get, set, add, update, clear, replaceAll, canAdd)
   Vereist: schema.js (voor veldnamen), idGenerator.js (voor ID-fallback)

   Wijzigingen v2.0.2:
   - canAdd() toegevoegd — controleert lokaal persoonslimiet voor free gebruikers
   - add() controleert limiet via canAdd() voor free gebruikers
   - MAX_LOCAL_FREE exporteerd als constante

   Wijzigingen v2.0.1:
   - replaceAll(array) toegevoegd — vereist door cloudSync.js (Fase A+)

   Wijzigingen v1.0.0:
   - migrate() alleen bij add(), niet bij get()
   - migrate() geeft null bij ongeldig record
   - console.log bij laden verwijderd
   ======================================================================= */

(function () {
    'use strict';

    // Sleutel waaronder stamboomdata in localStorage staat
    var STORAGE_KEY = 'stamboomData';

    // Sleutel voor lokale wijzigingstimestamp — gebruikt door FA+-06 conflictmelding
    var MODIFIED_KEY = 'stamboomData_modified';

    // Maximum aantal personen voor gratis (niet-premium) gebruikers lokaal
    var MAX_LOCAL_FREE = 100;

    /* ======================= VEILIGE JSON PARSING ======================= */

    function safeParse(json) {
        if (!json) return [];                                              // Lege waarde → lege array
        try {
            var parsed = JSON.parse(json);                                // Parseer JSON string
            return Array.isArray(parsed) ? parsed : [];                   // Alleen arrays zijn geldig
        } catch (e) {
            console.warn('storage.js: corrupte JSON in localStorage, dataset gereset.');
            return [];
        }
    }

    /* ======================= MIGRATIE ======================= */

    function migrate(record) {
        if (!record || typeof record !== 'object') return null;           // Ongeldig record

        var migrated = Object.assign({}, record);                         // Ondiepe kopie

        if (window.StamboomSchema && Array.isArray(window.StamboomSchema.fields)) {
            window.StamboomSchema.fields.forEach(function(field) {
                if (!(field in migrated)) migrated[field] = '';           // Ontbrekend veld aanvullen
            });
        } else {
            console.warn('storage.js: StamboomSchema niet geladen — migratie overgeslagen.');
        }

        if (!migrated.ID || migrated.ID.trim() === '') {
            migrated.ID = window.genereerCode                             // ID genereren via centrale module
                ? window.genereerCode(migrated, [])
                : 'P' + Date.now();                                       // Noodoplossing zonder idGenerator
        }

        return migrated;
    }

    /* ======================= TIMESTAMP BIJWERKEN ======================= */

    // Schrijft de huidige tijd als ISO-string naar localStorage
    // Wordt aangeroepen bij elke wijziging (add, update, clear, replaceAll)
    function _updateModified() {
        try {
            localStorage.setItem(MODIFIED_KEY, new Date().toISOString()); // Sla huidige tijd op
        } catch (e) {
            console.warn('storage.js: kon modified timestamp niet opslaan:', e);
        }
    }

    /* ======================= GET ======================= */

    function get() {
        var raw = localStorage.getItem(STORAGE_KEY);                      // Haal ruwe JSON op
        return safeParse(raw);                                             // Parseer en geef terug
    }

    /* ======================= GET MODIFIED ======================= */

    // Geeft de timestamp van de laatste lokale wijziging terug, of null
    function getModified() {
        return localStorage.getItem(MODIFIED_KEY) || null;                // null als nog nooit gewijzigd
    }

    /* ======================= SET ======================= */

    function set(dataset) {
        if (!Array.isArray(dataset)) {
            console.warn('storage.js: set() verwacht een array.');
            return false;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataset));       // Sla op als JSON
        _updateModified();                                                 // Bijwerken timestamp
        return true;
    }

    /* ======================= CAN ADD ======================= */

    // Controleert of een nieuwe persoon toegevoegd mag worden.
    // Gratis gebruikers (tier 'free' of niet ingelogd) zijn beperkt tot MAX_LOCAL_FREE.
    // Premium en admin gebruikers hebben geen lokaal limiet.
    // Returns: { allowed: true } of { allowed: false, count, max }
    async function canAdd() {
        var current = get().length;                                        // Huidig aantal personen

        // Haal tier op — geeft 'free' als niet ingelogd of AuthModule niet beschikbaar
        var tier = 'free';
        if (window.AuthModule && typeof window.AuthModule.getTier === 'function') {
            tier = await window.AuthModule.getTier();                      // Wacht op tier uit Supabase
        }

        // Admin en premium tiers hebben geen lokaal limiet
        if (tier !== 'free') {
            return { allowed: true };
        }

        // Free gebruikers mogen maximaal MAX_LOCAL_FREE personen opslaan
        if (current >= MAX_LOCAL_FREE) {
            return { allowed: false, count: current, max: MAX_LOCAL_FREE };
        }

        return { allowed: true };
    }

    /* ======================= ADD ======================= */

    async function add(person) {
        if (typeof person !== 'object' || person === null) {
            console.warn('storage.js: add() verwacht een object.');
            return false;
        }

        // Controleer lokaal limiet voor gratis gebruikers
        var check = await canAdd();
        if (!check.allowed) {
            console.warn('storage.js: add() geblokkeerd — limiet bereikt (' + check.count + '/' + check.max + ')');
            return { blocked: true, count: check.count, max: check.max }; // Geef blockinfo terug voor UI
        }

        var migrated = migrate(person);                                    // Migreer het record
        if (!migrated) {
            console.warn('storage.js: add() ongeldig record, niet opgeslagen.');
            return false;
        }

        var dataset = get();                                               // Haal huidige dataset op
        dataset.push(migrated);                                            // Voeg toe aan array
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataset));       // Sla op
        _updateModified();                                                 // Bijwerken timestamp
        return true;
    }

    /* ======================= UPDATE ======================= */

    function update(personID, updates) {
        var dataset = get();
        var idx = dataset.findIndex(function(p) { return p.ID === personID; });
        if (idx === -1) {
            console.warn('storage.js: update() persoon ' + personID + ' niet gevonden.');
            return false;
        }
        dataset[idx] = Object.assign({}, dataset[idx], updates);          // Merge updates
        set(dataset);                                                      // Sla op + update timestamp
        return true;
    }

    /* ======================= CLEAR ======================= */

    function clear() {
        localStorage.removeItem(STORAGE_KEY);                             // Verwijder stamboomdata
        _updateModified();                                                 // Bijwerken timestamp
        return true;
    }

    /* ======================= REPLACE ALL ======================= */

    // Overschrijft de volledige localStorage dataset met een nieuwe array.
    // Gebruikt door cloudSync.js bij het laden van een cloud backup.
    function replaceAll(dataset) {
        if (!Array.isArray(dataset)) {
            console.error('storage.js: replaceAll() verwacht een array.');
            return false;
        }
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dataset));   // Schrijf cloud data weg
            _updateModified();                                             // Bijwerken timestamp
            return true;
        } catch (e) {
            console.error('storage.js: replaceAll() localStorage schrijffout:', e);
            return false;
        }
    }

    /* ======================= PUBLIEKE API ======================= */
    window.StamboomStorage = {
        get,                    // ()                  → Array
        set,                    // (dataset)           → boolean
        add,                    // (person)            → true | false | { blocked, count, max }
        update,                 // (id, updates)       → boolean
        clear,                  // ()                  → boolean
        replaceAll,             // (dataset)           → boolean
        canAdd,                 // ()                  → { allowed } of { allowed: false, count, max }
        getModified,            // ()                  → ISO string of null
        MAX_LOCAL_FREE,         // 100
        version: 'v2.0.2'
    };

})();
