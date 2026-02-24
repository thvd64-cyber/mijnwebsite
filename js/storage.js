// storage.js
// Minimalistische opslagmodule v1 – alleen sessionStorage
(function () {
    'use strict'; // Activeert strikte modus voor veiligere JavaScript uitvoering
    const STORAGE_KEY = 'stamboomData'; // Sleutel waaronder de dataset in sessionStorage wordt opgeslagen
    /* =========================
       Interne helper: veilig JSON parsen
    ========================== */
    function safeParse(json) {
        try {
            return JSON.parse(json); // Probeert JSON-string om te zetten naar JavaScript object
        } catch (error) {
            console.warn('Storage bevat corrupte JSON. Dataset gereset.'); // Waarschuwing bij fout
            return []; // Bij fout altijd lege array teruggeven
        }
    }
    /* =========================
       Dataset ophalen
    ========================== */
    function get() {
        const raw = sessionStorage.getItem(STORAGE_KEY); // Haalt ruwe JSON-string op uit sessionStorage
        if (!raw) {
            return []; // Als niets opgeslagen is → lege array teruggeven
        }
        const parsed = safeParse(raw); // JSON veilig parsen
        if (!Array.isArray(parsed)) {
            return []; // Als data geen array is → lege array teruggeven
        }
        return parsed; // Geldige dataset teruggeven
    }
    /* =========================
       Dataset volledig vervangen
    ========================== */
    function set(dataset) {
        if (!Array.isArray(dataset)) {
            console.warn('set() verwacht een array. Actie geweigerd.'); // Bescherming tegen fout gebruik
            return false; // Stop als input geen array is
        }
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dataset)); // Dataset opslaan als JSON-string
        return true; // Succesmelding
    }
    /* =========================
       Persoon toevoegen
    ========================== */
    function add(person) {
        if (typeof person !== 'object' || person === null) {
            console.warn('add() verwacht een geldig object.'); // Bescherming tegen foutieve input
            return false; // Stop als geen object
        }
        const dataset = get(); // Huidige dataset ophalen
        dataset.push(person); // Nieuw persoon toevoegen aan array
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dataset)); // Geüpdatete dataset opslaan
        return true; // Succesmelding
    }
    /* =========================
       Storage volledig leegmaken
    ========================== */
    function clear() {
        sessionStorage.removeItem(STORAGE_KEY); // Verwijdert dataset uit sessionStorage
        return true; // Succesmelding
    }
    /* =========================
       Publieke API
    ========================== */
    window.StamboomStorage = {
        get: get,     // Haal dataset op
        set: set,     // Vervang volledige dataset
        add: add,     // Voeg persoon toe
        clear: clear  // Wis alles
    };
})();
