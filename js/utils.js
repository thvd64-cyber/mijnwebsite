/* ======================= js/utils.js v2.0.0 =======================
   Centrale hulpfuncties voor MyFamTreeCollab
   Exporteert: window.FTUtils met safe(), formatDate(), parseBirthday()

   Wijzigingen v2.0.0 t.o.v. v1.0.0:
     - parseBirthday() ondersteunt alle 4 notaties:
         dd-mm-jjjj | jjjj-mm-dd | dd-mmm-jjjj | jjjj-mmm-dd
       Scheidingstekens: - / . of spatie
     - Vraagtekens → naar BOVEN afgerond: "197?" → 1979, "180?" → 1809
     - Onbekende/ongeldige dag of maand → fallback naar 1

   Vervangt lokale kopieën in:
     - view.js        (safe, formatDate, parseBirthday)
     - timeline.js    (safe, formatDate, parseBirthday)
     - manage.js      (safe)
     - LiveSearch.js  (safe)
     - relatieEngine.js (safe)

   Laadvolgorde in HTML: altijd als EERSTE script vóór alle andere js-bestanden
   =================================================================== */

(function () {                                                              // Zelfuitvoerende functie: voorkomt globale variabelen buiten window.FTUtils
    'use strict';                                                           // Strikte modus: JS meldt fouten die anders stil falen

    /* ======================= SAFE ======================= */

    /**
     * Zet elke waarde veilig om naar een getrimde string.
     * Voorkomt dat null/undefined crashes veroorzaken bij stringbewerkingen.
     * @param  {*}      val - Elke waarde: string, number, null, undefined, ...
     * @returns {string}    - Getrimde string, of lege string als val leeg/null/undefined is
     */
    function safe(val) {
        return val ? String(val).trim() : '';                               // Als val truthy is: omzetten naar string en trimmen, anders lege string teruggeven
    }

    /* ======================= FORMAT DATE ======================= */

    /**
     * Zet een datumstring om naar een leesbare Nederlandse weergave.
     * Herkent meerdere invoerformaten: iso, nl, jaar-maand, alleen jaar.
     * @param  {string} d - Datumstring in één van de ondersteunde formaten
     * @returns {string}  - Bijv. "12 mrt 1954", of de originele string als parsing mislukt
     */
    function formatDate(d) {
        if (!d) return '';                                                  // Lege/null datum → geef lege string terug, geen verdere verwerking

        d = String(d).trim();                                               // Zet datum om naar string en verwijder spaties voor/achter

        let date;                                                           // Variabele voor het geparseerde Date-object

        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {                              // Formaat: "2024-03-12" (ISO 8601, meest voorkomend)
            date = new Date(d);                                             // JavaScript herkent dit formaat direct

        } else if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(d)) {                 // Formaat: "12-03-1954" of "12/03/1954" (Nederlands formaat)
            date = new Date(                                                // Herorden de delen naar ISO zodat new Date() correct werkt
                d.replace(/(\d{2})[-/](\d{2})[-/](\d{4})/, '$3-$2-$1')    // Regex: dag-maand-jaar → jaar-maand-dag
            );

        } else if (/^\d{4}-\d{2}$/.test(d)) {                             // Formaat: "1954-03" (jaar + maand zonder dag)
            date = new Date(d + '-01');                                     // Voeg dag 1 toe zodat new Date() een geldig object maakt

        } else if (/^\d{4}$/.test(d)) {                                    // Formaat: "1954" (alleen een jaartal)
            date = new Date(d + '-01-01');                                  // Voeg maand 1 en dag 1 toe als standaardwaarden

        } else {
            date = new Date(d);                                             // Onbekend formaat: laat JavaScript het proberen te parsen
        }

        if (isNaN(date.getTime())) return d;                               // Als parsing mislukt (ongeldige datum) → geef de originele string terug

        const options = { day: '2-digit', month: 'short', year: 'numeric' }; // Opmaakopties voor de Nederlandse datumweergave
        return date                                                         // Formatteer de datum naar bijv. "12 mrt 1954"
            .toLocaleDateString('nl-NL', options)                          // Gebruik Nederlandse taalinstellingen
            .replace(/\./g, '');                                           // Verwijder punten die sommige browsers toevoegen na maandafkortingen
    }

    /* ======================= PARSE BIRTHDAY ======================= */

    /**
     * Zet een datumstring om naar een JavaScript Date-object voor sortering.
     * Ondersteunt alle 4 notaties: dd-mm-jjjj | jjjj-mm-dd | dd-mmm-jjjj | jjjj-mmm-dd
     * Scheidingstekens: - / . of spatie
     * Vraagtekens worden naar BOVEN afgerond: "197?" → 1979, "180?" → 1809
     * Onbekende/ongeldige dag → 1 | Onbekende/ongeldige maand → 1 (januari)
     * Geeft new Date(0) terug als de datum leeg of ongeldig is.
     * @param  {string} d - Datumstring in één van de ondersteunde formaten
     * @returns {Date}    - Date-object voor gebruik in .sort() vergelijkingen
     */
    function parseBirthday(d) {
        if (!d) return new Date(0);                                        // Geen datum → fallback naar 1 jan 1970

        d = String(d).trim();                                              // Zet om naar string en trim spaties

        /* -- Maandnamen tabel: Nederlands + Engels, volledig + afkorting -- */
        const MONTHS = {                                                   // Maandnaam → 0-gebaseerde index
            jan:0, feb:1, mar:2, mrt:2, apr:3, mei:4, may:4, jun:5,
            jul:6, aug:7, sep:8, okt:9, oct:9, nov:10, dec:11,
            januari:0, februari:1, maart:2, march:2, april:3,
            juni:5, juli:6, augustus:7, september:8, oktober:9,
            november:10, december:11, january:0, february:1,
            june:5, july:6, august:7, october:9,
        };

        /* -- Hulpfuncties -- */
        // Vervangt '?' door '9' zodat onbekende cijfers naar boven worden afgerond
        function resolveQ(s) { return String(s).replace(/\?/g, '9'); }    // "197?" → "1979", "180?" → "1809"

        // Parst een numeriek token met mogelijke vraagtekens; fallback als het niet lukt
        function parseNum(token, fallback) {
            if (!token || String(token).trim() === '') return fallback;    // Leeg → gebruik fallback
            const n = parseInt(resolveQ(String(token).trim()), 10);       // Vervang ? en parse
            return isNaN(n) ? fallback : n;                                // Ongeldig getal → fallback
        }

        // Parst een maandtoken: cijfer ("03") of naam ("jan", "maart")
        function parseMonth(token) {
            if (!token || String(token).trim() === '') return 0;           // Leeg → januari (index 0)
            const t = String(token).trim();
            if (/^[\d?]+$/.test(t)) {                                      // Numerieke maand zoals "03" of "0?"
                const m = parseNum(t, 1);                                  // Onbekend → maand 1
                return Math.max(1, Math.min(12, m)) - 1;                   // Clamp 1-12, omzetten naar 0-basis
            }
            const key = t.toLowerCase().replace(/[^a-z]/g, '');           // Maandnaam: verwijder niet-letters
            return MONTHS[key] !== undefined ? MONTHS[key]                 // Volledige naam gevonden?
                 : MONTHS[key.slice(0, 3)] !== undefined ? MONTHS[key.slice(0, 3)] // 3-letter afkorting?
                 : 0;                                                      // Niet herkend → januari
        }

        /* -- Splits datum op alle bekende scheidingstekens -- */
        const parts = d.split(/[-/.\s]+/);                                 // Splits op - / . of spatie

        let year, monthToken, dayToken;

        if (parts.length === 1) {                                          // Alleen een jaar: "1954" of "197?"
            year = parseNum(parts[0], null);
            monthToken = null; dayToken = null;

        } else if (parts.length === 2) {                                   // Twee delen: jjjj-mm of mm-jjjj
            if (/^[\d?]{4}/.test(parts[0])) {                             // Eerste deel is jaar (4 tekens)
                year = parseNum(parts[0], null); monthToken = parts[1]; dayToken = null;
            } else {                                                       // Laatste deel is jaar
                year = parseNum(parts[1], null); monthToken = parts[0]; dayToken = null;
            }

        } else {                                                           // Drie of meer delen
            if (/^[\d?]{4}/.test(parts[0])) {                             // jjjj-mm-dd of jjjj-mmm-dd
                year = parseNum(parts[0], null); monthToken = parts[1]; dayToken = parts[2];
            } else {                                                       // dd-mm-jjjj of dd-mmm-jjjj
                dayToken = parts[0]; monthToken = parts[1];
                year = parseNum(parts[parts.length - 1], null);           // Jaar staat altijd als laatste
            }
        }

        /* -- Valideer jaar -- */
        if (year === null || year < 100 || year > new Date().getFullYear() + 5) {
            return new Date(0);                                            // Ongeldig jaar → fallback
        }

        /* -- Verwerk maand en dag met fallback naar 1 -- */
        const monthIndex = monthToken ? parseMonth(monthToken) : 0;       // Onbekende maand → januari
        const day = dayToken ? Math.max(1, Math.min(31, parseNum(dayToken, 1))) : 1; // Onbekende dag → 1

        return new Date(year, monthIndex, day);                            // Bouw Date-object op
    }

    /* ======================= EXPORTEER ALS GLOBAAL OBJECT ======================= */
    window.FTUtils = {                                                      // Exporteer alle functies onder één globaal namespace-object
        safe,                                                               // window.FTUtils.safe(val)      — veilige string conversie
        formatDate,                                                         // window.FTUtils.formatDate(d)  — leesbare NL datumweergave
        parseBirthday                                                       // window.FTUtils.parseBirthday(d) — Date-object voor sortering
    };

    /* Handige afkortingen zodat bestaande code zo min mogelijk hoeft te veranderen */
    window.ftSafe         = safe;                                           // Directe alias: window.ftSafe(val)
    window.ftFormatDate   = formatDate;                                     // Directe alias: window.ftFormatDate(d)
    window.ftParseBirthday = parseBirthday;                                 // Directe alias: window.ftParseBirthday(d)

})();                                                                       // Sluit en voer de zelfuitvoerende functie direct uit
