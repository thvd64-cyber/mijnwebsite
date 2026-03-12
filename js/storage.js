// ======================= js/storage.js v0.0.2 =======================
// Persistent storage voor MyFamTreeCollab
// Compatibel met schema.js v0.0.2
// Features:
// - Migratie van oude 19 kolommen → nieuwe 14 kolommen (FIELDS uit schema.js)
// - Dynamische ID-generatie bij ontbrekende IDs
// - Veilige JSON parsing + fallback
// - Publieke API: get, set, add, update, clear
// ======================= versiebeheer =======================
// v0.0.2 - 2026-03-12
// - Kolommen dynamisch via schema.js
// - Migratie oude CSV records
// - Integratie ID-generator window.genereerCode

(function(){ 
    'use strict'; // strikte modus voor veiligere JS uitvoering

    const STORAGE_KEY = 'stamboomData'; // localStorage sleutel

    // =========================
    // interne helper: veilig JSON parsen
    // =========================
    function safeParse(json){
        try { return JSON.parse(json); }
        catch(e){ console.warn('Storage corrupte JSON. Reset.'); return []; }
    }

    // =========================
    // migratie functie oude records
    // =========================
    function migrateLegacy(record) {
        const migrated = {};
        // FIELDS komt uit schema.js v0.0.2
        if (!window.StamboomSchema || !window.StamboomSchema.fields) {
            console.error("StamboomSchema niet geladen!");
            return {};
        }
        window.StamboomSchema.fields.forEach(field => {
            migrated[field] = record[field] ?? ""; // vul lege velden
        });
        return migrated;
    }

    // =========================
    // dataset ophalen
    // =========================
    function get() {
        const raw = localStorage.getItem(STORAGE_KEY);
        let parsed = safeParse(raw);
        if (!Array.isArray(parsed)) parsed = [];
        // voer migratie uit op alle records
        parsed = parsed.map(migrateLegacy);
        // genereer ID als ontbrekend
        parsed.forEach(item => {
            if (!item.ID || item.ID.trim() === "") {
                item.ID = window.genereerCode ? window.genereerCode(item, parsed) : 'P'+Date.now();
            }
        });
        return parsed;
    }

    // =========================
    // volledige dataset vervangen
    // =========================
    function set(dataset){
        if (!Array.isArray(dataset)){ 
            console.warn('set() verwacht array'); 
            return false; 
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataset));
        return true;
    }

    // =========================
    // persoon toevoegen
    // =========================
    function add(person){
        if(typeof person !== 'object' || person===null){ console.warn('add() verwacht object'); return false; }
        const dataset = get();
        if(!person.ID || person.ID.trim() === "") {
            person.ID = window.genereerCode ? window.genereerCode(person, dataset) : 'P'+Date.now();
        }
        dataset.push(person);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataset));
        return true;
    }

    // =========================
    // persoon updaten op basis van ID
    // =========================
    function update(personID, updates){
        const dataset = get();
        const idx = dataset.findIndex(p => p.ID === personID);
        if(idx === -1) return false;
        dataset[idx] = {...dataset[idx], ...updates};
        set(dataset);
        return true;
    }

    // =========================
    // volledige storage leegmaken
    // =========================
    function clear(){
        localStorage.removeItem(STORAGE_KEY);
        return true;
    }

    // =========================
    // publieke API
    // =========================
    window.StamboomStorage = {
        get,
        set,
        add,
        update,
        clear,
        version: "v0.0.2"
    };
})();
