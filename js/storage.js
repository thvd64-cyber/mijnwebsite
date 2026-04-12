/* ======================= js/storage.js v2.0.1 =======================
   Persistente opslag voor MyFamTreeCollab via localStorage
   Exporteert: window.StamboomStorage (get, set, add, update, clear, replaceAll)
   Vereist: schema.js (voor veldnamen), idGenerator.js (voor ID-fallback)

   Wijzigingen v2.0.1:
   - replaceAll(array) toegevoegd — vereist door cloudSync.js (Fase A+)

   Wijzigingen v1.0.0 t.o.v. v0.0.4:
   - migrate() wordt niet meer bij élke get() aangeroepen — alleen bij add()
   - migrate() geeft null terug bij ongeldig record i.p.v. leeg object
   - console.log bij laden verwijderd
   - Inline commentaar toegevoegd op elke regel
   ======================================================================= */

(function () {                                                              // Zelfuitvoerende functie: alle variabelen blijven lokaal, niets lekt globaal
    'use strict';                                                           // Strikte modus: voorkomt stille JS-fouten

    /* ======================= CONSTANTEN ======================= */
    const STORAGE_KEY = 'stamboomData';                                    // De vaste sleutel waaronder alle stamboomdata in localStorage wordt opgeslagen

    /* ======================= VEILIGE JSON PARSING ======================= */

    /**
     * Parseert een JSON-string veilig naar een array.
     * Geeft een lege array terug als de string leeg of corrupt is.
     * @param  {string} json - De ruwe JSON-string uit localStorage
     * @returns {Array}      - Geparseerde array, of [] bij fout
     */
    function safeParse(json) {
        if (!json) return [];                                              // Lege of null waarde → geef direct lege array terug, geen verdere verwerking
        try {
            const parsed = JSON.parse(json);                              // Probeer de JSON-string om te zetten naar een JavaScript object/array
            return Array.isArray(parsed) ? parsed : [];                   // Alleen een array is geldig — geef lege array als het iets anders is
        } catch (e) {
            console.warn('storage.js: corrupte JSON in localStorage, dataset gereset.'); // Waarschuw in de console als de JSON onleesbaar is
            return [];                                                     // Geef lege array terug zodat de app gewoon door kan werken
        }
    }

    /* ======================= MIGRATIE FUNCTIE ======================= */

    /**
     * Zorgt dat een persoon-record alle velden uit het schema heeft.
     * Vult ontbrekende velden aan met een lege string.
     * Genereert een ID als dat ontbreekt.
     * Wordt alleen aangeroepen bij add() — NIET bij elke get().
     * @param  {Object} record - Het persoon-object om te migreren
     * @returns {Object|null}  - Gemigreerd object, of null als het record onbruikbaar is
     */
    function migrate(record) {
        if (!record || typeof record !== 'object') return null;            // Ongeldig record (null, string, getal) → geef null terug zodat de aanroeper het kan overslaan

        const migrated = { ...record };                                    // Maak een ondiepe kopie zodat het originele object niet gewijzigd wordt

        if (window.StamboomSchema && Array.isArray(window.StamboomSchema.fields)) { // Controleer of schema.js correct geladen is
            window.StamboomSchema.fields.forEach(field => {               // Loop door alle veldnamen uit het centrale schema
                if (!(field in migrated)) migrated[field] = '';           // Voeg het veld toe als het ontbreekt, met lege string als standaardwaarde
            });
        } else {
            console.warn('storage.js: StamboomSchema niet geladen — migratie overgeslagen.'); // Waarschuw als schema.js nog niet geladen is
        }

        if (!migrated.ID || migrated.ID.trim() === '') {                  // Controleer of het record een geldig ID heeft
            migrated.ID = window.genereerCode                             // Gebruik de centrale ID-generator als die beschikbaar is
                ? window.genereerCode(migrated, [])                       // Geef lege dataset mee: uniekheid t.o.v. bestaande records wordt elders geborgd
                : 'P' + Date.now();                                       // Noodoplossing als idGenerator.js niet geladen is: timestamp-gebaseerd ID
        }

        return migrated;                                                   // Geef het volledig gemigreerde record terug
    }

    /* ======================= GET ======================= */

    /**
     * Haalt de volledige dataset op uit localStorage.
     * Voert GEEN migratie uit — geeft de data terug zoals opgeslagen.
     * @returns {Array} - Array van persoon-objecten, of [] als er niets is
     */
    function get() {
        const raw    = localStorage.getItem(STORAGE_KEY);                 // Haal de ruwe JSON-string op uit localStorage
        const parsed = safeParse(raw);                                     // Parseer de JSON veilig naar een array
        return parsed;                                                     // Geef de array direct terug — geen migratie bij elke get()
    }

    /* ======================= SET ======================= */

    /**
     * Slaat een volledige dataset op in localStorage.
     * Overschrijft de bestaande data volledig.
     * @param  {Array}   dataset - De te bewaren array van persoon-objecten
     * @returns {boolean}        - true bij succes, false bij ongeldige invoer
     */
    function set(dataset) {
        if (!Array.isArray(dataset)) {                                     // Controleer of de invoer een array is
            console.warn('storage.js: set() verwacht een array.');        // Waarschuw als iemand per ongeluk een object of string meegeeft
            return false;                                                  // Geef false terug zodat de aanroeper weet dat opslaan mislukt is
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataset));       // Zet de array om naar JSON en sla op in localStorage
        return true;                                                       // Bevestig succesvolle opslag
    }

    /* ======================= ADD ======================= */

    /**
     * Voegt één nieuwe persoon toe aan de dataset.
     * Voert migratie uit op het nieuwe record zodat alle velden aanwezig zijn.
     * @param  {Object}  person - Het toe te voegen persoon-object
     * @returns {boolean}       - true bij succes, false bij ongeldige invoer
     */
    function add(person) {
        if (typeof person !== 'object' || person === null) {              // Controleer of de invoer een geldig object is
            console.warn('storage.js: add() verwacht een object.');       // Waarschuw bij ongeldige invoer
            return false;                                                  // Geef false terug zodat de aanroeper weet dat toevoegen mislukt is
        }

        const migrated = migrate(person);                                  // Voer migratie uit: vul ontbrekende velden aan en genereer ID indien nodig
        if (!migrated) {                                                   // migrate() geeft null terug als het record onbruikbaar is
            console.warn('storage.js: add() ongeldig record, niet opgeslagen.'); // Waarschuw dat het record overgeslagen wordt
            return false;                                                  // Geef false terug
        }

        const dataset = get();                                             // Haal de huidige dataset op
        dataset.push(migrated);                                            // Voeg het gemigreerde record toe aan het einde van de array
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataset));       // Sla de bijgewerkte dataset direct op (geen set() aanroep om dubbele validatie te vermijden)
        return true;                                                       // Bevestig succesvolle toevoeging
    }

    /* ======================= UPDATE ======================= */

    /**
     * Werkt één bestaand persoon-record bij met nieuwe veldwaarden.
     * Bestaande velden die niet in updates staan blijven ongewijzigd.
     * @param  {string}  personID - Het ID van de te updaten persoon
     * @param  {Object}  updates  - Object met de te wijzigen velden en hun nieuwe waarden
     * @returns {boolean}         - true als de persoon gevonden en bijgewerkt is, false als niet gevonden
     */
    function update(personID, updates) {
        const dataset = get();                                             // Haal de huidige dataset op
        const idx = dataset.findIndex(p => p.ID === personID);            // Zoek de index van de persoon met het opgegeven ID
        if (idx === -1) {                                                  // Persoon niet gevonden in de dataset
            console.warn(`storage.js: update() persoon ${personID} niet gevonden.`); // Waarschuw met het ID zodat debuggen makkelijker is
            return false;                                                  // Geef false terug zodat de aanroeper weet dat de update mislukt is
        }
        dataset[idx] = { ...dataset[idx], ...updates };                   // Merge: bewaar alle bestaande velden en overschrijf met de nieuwe waarden
        set(dataset);                                                      // Sla de bijgewerkte dataset op via set() zodat validatie plaatsvindt
        return true;                                                       // Bevestig succesvolle update
    }

    /* ======================= CLEAR ======================= */

    /**
     * Verwijdert de volledige stamboomdataset uit localStorage.
     * Kan niet ongedaan gemaakt worden — gebruik alleen na bevestiging van de gebruiker.
     * @returns {boolean} - Altijd true (localStorage.removeItem gooit geen fouten)
     */
    function clear() {
        localStorage.removeItem(STORAGE_KEY);                             // Verwijder de stamboomdata-sleutel volledig uit localStorage
        return true;                                                       // Bevestig dat de data verwijderd is
    }

    /* ======================= REPLACE ALL ======================= */

    /**
     * Overschrijft de volledige localStorage dataset met een nieuwe array.
     * Gebruikt door cloudSync.js bij het laden van een cloud backup.
     * Valideert de invoer vóór het wegschrijven — schrijft nooit ongeldige data.
     * @param  {Array}   dataset - De array van persoon-objecten uit de cloud
     * @returns {boolean}        - true bij succes, false bij ongeldige invoer of schrijffout
     */
    function replaceAll(dataset) {
        if (!Array.isArray(dataset)) {                                     // Controleer of de invoer een array is — cloudSync levert altijd een array, maar valideer defensief
            console.error('storage.js: replaceAll() verwacht een array.');// Fout in console: dit is een programmeerfout, geen gebruikersfout
            return false;                                                  // Geef false terug zodat cloudSync.js de fout kan doorgeven aan de UI
        }

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dataset));   // Schrijf de cloud-array rechtstreeks naar localStorage onder dezelfde sleutel als get()/set()
            return true;                                                   // Bevestig succesvolle overschrijving
        } catch (e) {
            console.error('storage.js: replaceAll() localStorage schrijffout:', e); // Kan falen bij volle opslag (QuotaExceededError) — log de oorzaak
            return false;                                                  // Geef false terug zodat de UI een foutmelding kan tonen
        }
    }

    /* ======================= PUBLIEKE API ======================= */
    window.StamboomStorage = {                                             // Exporteer alle functies onder één globaal object
        get,                                                               // window.StamboomStorage.get()                     — volledige dataset ophalen
        set,                                                               // window.StamboomStorage.set(dataset)              — dataset volledig overschrijven
        add,                                                               // window.StamboomStorage.add(person)               — één persoon toevoegen
        update,                                                            // window.StamboomStorage.update(id, updates)       — één persoon bijwerken
        clear,                                                             // window.StamboomStorage.clear()                   — alle data verwijderen
        replaceAll,                                                        // window.StamboomStorage.replaceAll(dataset)       — cloud backup inladen (Fase A+)
        version: 'v2.0.1'                                                  // Versienummer voor gebruik in storage.html info-balk
    };

})();                                                                      // Sluit en voer de zelfuitvoerende functie direct uit
