/* ======================= js/utils.js v1.0.0 =======================
   Centrale hulpfuncties voor MyFamTreeCollab
   Exporteert: window.FTUtils met safe(), formatDate(), parseBirthday()

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
     * Geeft new Date(0) terug als de datum leeg of ongeldig is (sorteert dan als oudste).
     * @param  {string} d - Datumstring in één van de ondersteunde formaten
     * @returns {Date}    - Date-object voor gebruik in .sort() vergelijkingen
     */
    function parseBirthday(d) {
        if (!d) return new Date(0);                                        // Geen datum opgegeven → geef 1 jan 1970 terug als veilige fallback voor sortering

        d = d.trim();                                                       // Verwijder eventuele spaties voor/achter de datumstring

        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {                              // Formaat: "1954-03-12" (ISO 8601)
            return new Date(d);                                             // Direct parsen, JavaScript kent dit formaat

        } else if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(d)) {                 // Formaat: "12-03-1954" of "12/03/1954" (Nederlands)
            const parts = d.split(/[-/]/);                                  // Split op koppelteken of schuine streep → ["12","03","1954"]
            return new Date(parts[2], parts[1] - 1, parts[0]);             // new Date(jaar, maand-1, dag) — maand is 0-gebaseerd in JavaScript

        } else if (/^\d{4}$/.test(d)) {                                    // Formaat: "1954" (alleen een jaartal)
            return new Date(d + '-01-01');                                  // Gebruik 1 januari van dat jaar als benadering

        } else {
            const fallback = new Date(d);                                   // Onbekend formaat: laat JavaScript het proberen
            return isNaN(fallback.getTime()) ? new Date(0) : fallback;      // Als parsing mislukt → fallback naar 1 jan 1970
        }
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
