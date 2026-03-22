/* ======================= js/idGenerator.js v2.0.0 =======================
   Centrale ID-generator voor MyFamTreeCollab
   Exporteert: window.genereerCode(persoon, bestaandeDataset)
   Wordt geladen door: create.html, manage.html, storage.js
   ======================================================================= */

(function () {                                                          // Zelfuitvoerende functie: voorkomt dat variabelen globaal lekken
    'use strict';                                                       // Strikte modus: JS geeft fouten bij slordig code i.p.v. stil falen

    /**
     * Genereert een uniek ID voor een persoon.
     * @param {Object} persoon       - Object met Doopnaam, Roepnaam, Achternaam, Geslacht
     * @param {Array}  bestaandeData - Huidige dataset (array van persoon-objecten met .ID)
     * @returns {string}             - Uniek ID, bijv. "JJJM423"
     */
    function genereerCode(persoon, bestaandeData) {

        const data = Array.isArray(bestaandeData) ? bestaandeData : []; // Veiligheidscheck: als bestaandeData geen array is, gebruik lege array

        const letters =                                                 // Bouw het lettergedeelte van het ID op uit naamvelden
            ((persoon.Doopnaam   || '')[0] || 'X').toUpperCase() +     // Eerste letter Doopnaam, hoofdletter, fallback 'X' als leeg
            ((persoon.Roepnaam   || '')[0] || 'X').toUpperCase() +     // Eerste letter Roepnaam, hoofdletter, fallback 'X' als leeg
            ((persoon.Achternaam || '')[0] || 'X').toUpperCase() +     // Eerste letter Achternaam, hoofdletter, fallback 'X' als leeg
            ((persoon.Geslacht   || '')[0] || 'X').toUpperCase();      // Eerste letter Geslacht (M/V/X), hoofdletter, fallback 'X'

        const bestaandeIDs = new Set(data.map(p => p.ID));             // Zet alle bestaande ID's in een Set voor snelle O(1) opzoektijd

        let code;                                                       // Variabele voor het gegenereerde ID, nog leeg
        let pogingen = 0;                                               // Teller om eindeloze lussen te voorkomen

        do {
            const cijfers = Math.floor(100 + Math.random() * 900);     // Genereer willekeurig getal 100-999 (altijd 3 cijfers)
            code = letters + cijfers;                                   // Combineer letters + cijfers tot ID, bijv. "JJJM423"
            pogingen++;                                                 // Verhoog teller met 1 na elke poging

            if (pogingen > 1000) {                                      // Na 1000 mislukte pogingen (vrijwel onmogelijk) stoppen we
                code = letters + Date.now().toString().slice(-6);       // Fallback: gebruik laatste 6 cijfers van timestamp als noodoplossing
                break;                                                  // Verlaat de do-while lus direct
            }
        } while (bestaandeIDs.has(code));                               // Blijf herhalen zolang het gegenereerde ID al bestaat in de dataset

        return code;                                                    // Geef het unieke ID terug aan de aanroeper
    }

    window.genereerCode = genereerCode;                                 // Exporteer functie globaal zodat alle andere scripts hem kunnen aanroepen

})();                                                                   // Sluit en voer de zelfuitvoerende functie direct uit
