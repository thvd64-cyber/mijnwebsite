/* ======================= js/export.js v2.0.0 =======================
   Centrale export-module voor MyFamTreeCollab
   Exporteert: window.ExportModule met exportCSV() en exportJSON()
   Vereist: schema.js, storage.js (in die volgorde geladen vóór dit bestand)
   Gebruikt door: home/export.html, stamboom/storage.html
   ======================================================================= */

(function () {                                                              // Zelfuitvoerende functie: voorkomt globale variabelen buiten window.ExportModule
    'use strict';                                                           // Strikte modus: voorkomt stille JS-fouten

    /* ======================= HELPERS ======================= */

    /**
     * Maakt een waarde veilig voor gebruik in een CSV-cel.
     * Zet de waarde tussen aanhalingstekens en escapet interne aanhalingstekens.
     * @param  {*}      value - Elke waarde (string, number, null, undefined)
     * @returns {string}      - CSV-veilige string, altijd tussen dubbele aanhalingstekens
     */
    function escapeCSV(value) {
        if (value == null) return '""';                                     // Null of undefined → lege cel tussen aanhalingstekens
        const str = String(value).replace(/"/g, '""');                     // Zet om naar string en verdubbel eventuele aanhalingstekens (CSV-standaard)
        return `"${str}"`;                                                 // Wikkel de waarde in aanhalingstekens zodat komma's en enters geen problemen geven
    }

    /**
     * Genereert een datumstring voor in de bestandsnaam, bijv. "20240312".
     * @returns {string} - Huidige datum als JJJJMMDD
     */
    function datumVoorBestandsnaam() {
        const nu = new Date();                                             // Haal de huidige datum en tijd op
        const jaar  = nu.getFullYear();                                    // Haal het 4-cijferige jaartal op
        const maand = String(nu.getMonth() + 1).padStart(2, '0');          // Maand is 0-gebaseerd, +1 corrigeren en opvullen tot 2 cijfers
        const dag   = String(nu.getDate()).padStart(2, '0');               // Dag opvullen tot 2 cijfers (bijv. "05")
        return `${jaar}${maand}${dag}`;                                    // Combineer tot "JJJJMMDD" formaat (bijv. "20240312")
    }

    /* ======================= CSV EXPORT ======================= */

    /**
     * Exporteert de volledige stamboom als CSV-bestand.
     * Gebruikt de velden uit schema.js zodat de kolomvolgorde altijd klopt.
     * Op moderne browsers (Chrome/Edge + HTTPS): toont "Opslaan als" dialoog.
     * Op andere browsers: slaat op in de standaard downloadmap.
     * @param {HTMLElement} [statusEl] - Optioneel element om statusmelding in te tonen
     */
    async function exportCSV(statusEl) {
        const data = StamboomStorage.get();                                // Haal de volledige dataset op uit localStorage via storage.js

        if (!data.length) {                                                // Controleer of er überhaupt data is om te exporteren
            if (statusEl) {                                                // Als er een statuselement meegegeven is
                statusEl.textContent = '⚠️ Geen personen om te exporteren.'; // Toon een waarschuwing aan de gebruiker
                statusEl.style.color = 'red';                             // Kleur de melding rood zodat het opvalt
            }
            return;                                                        // Stop de functie, er is niets te exporteren
        }

        const velden = window.StamboomSchema                               // Haal de kolomnamen op uit het centrale schema
            ? [...window.StamboomSchema.fields]                            // Gebruik de officiële veldlijst als schema.js geladen is
            : Object.keys(data[0]);                                        // Fallback: gebruik de sleutels van het eerste persoon-object

        const standaardNaam = `stamboom_${datumVoorBestandsnaam()}`;       // Stel een standaard bestandsnaam in met de huidige datum (bijv. "stamboom_20240312")
        let bestandsnaam = prompt(                                         // Vraag de gebruiker om een bestandsnaam via een popup
            'Voer bestandsnaam in (zonder .csv):',                         // Instructietekst in de prompt
            standaardNaam                                                  // Vul de standaardnaam alvast in zodat gebruiker alleen hoeft te bevestigen
        );
        if (!bestandsnaam) bestandsnaam = standaardNaam;                   // Als de gebruiker annuleert of leeg laat: gebruik de standaardnaam
        const volledigeNaam = `${bestandsnaam}.csv`;                       // Voeg de .csv extensie toe aan de gekozen naam

        // Bouw de CSV-inhoud op regel voor regel
        const csvRegels = [];                                              // Lege array die we vullen met CSV-regels
        csvRegels.push(velden.map(escapeCSV).join(','));                   // Eerste regel: kolomnamen tussen aanhalingstekens gescheiden door komma's
        data.forEach(persoon => {                                          // Loop door elke persoon in de dataset
            const rij = velden.map(veld =>                                 // Loop door elk veld voor deze persoon
                escapeCSV(persoon[veld] ?? '')                             // Haal de waarde op, gebruik lege string als het veld niet bestaat
            );
            csvRegels.push(rij.join(','));                                  // Voeg de rij toe als kommagescheiden regel
        });
        const csvInhoud = csvRegels.join('\n');                            // Combineer alle regels tot één CSV-string, gescheiden door regeleindes

        try {
            if (window.showSaveFilePicker && location.protocol === 'https:') { // Controleer of de moderne File System API beschikbaar is (Chrome/Edge op HTTPS)
                const fileHandle = await window.showSaveFilePicker({       // Open de native "Opslaan als" dialoog van het besturingssysteem
                    suggestedName: volledigeNaam,                          // Vul de bestandsnaam alvast in in de dialoog
                    types: [{ description: 'CSV bestand', accept: { 'text/csv': ['.csv'] } }] // Beperk bestandstype tot .csv
                });
                const writable = await fileHandle.createWritable();        // Maak het bestand schrijfbaar
                await writable.write(csvInhoud);                           // Schrijf de CSV-inhoud naar het bestand
                await writable.close();                                    // Sluit het bestand zodat de schrijfactie definitief wordt
                if (statusEl) {
                    statusEl.textContent = `✅ Geëxporteerd als ${volledigeNaam} (locatie gekozen)`; // Bevestig succesvolle export met locatiekeuze
                    statusEl.style.color = 'green';                        // Groene kleur voor succesmelding
                }
            } else {                                                       // Fallback voor Firefox, Safari en browsers zonder showSaveFilePicker
                alert('⚠️ Deze browser ondersteunt geen locatiekeuze. Het bestand wordt opgeslagen in je downloadmap.'); // Informeer de gebruiker vooraf
                const blob = new Blob([csvInhoud], { type: 'text/csv' }); // Maak een downloadbaar bestandsobject van de CSV-inhoud
                const url  = URL.createObjectURL(blob);                    // Maak een tijdelijke download-URL aan voor het blob-object
                const a    = document.createElement('a');                  // Maak een onzichtbare downloadlink
                a.href     = url;                                          // Koppel de tijdelijke URL aan de link
                a.download = volledigeNaam;                                // Stel de bestandsnaam in voor de download
                document.body.appendChild(a);                             // Voeg de link tijdelijk toe aan de pagina (vereist voor Firefox)
                a.click();                                                 // Simuleer een klik om de download te starten
                document.body.removeChild(a);                             // Verwijder de link direct na het klikken
                URL.revokeObjectURL(url);                                  // Geef het geheugen van de tijdelijke URL vrij
                if (statusEl) {
                    statusEl.textContent = `✅ Geëxporteerd als ${volledigeNaam} (downloadmap)`; // Bevestig succesvolle export naar downloadmap
                    statusEl.style.color = 'green';                        // Groene kleur voor succesmelding
                }
            }
        } catch (err) {
            if (err.name === 'AbortError') {                               // Gebruiker heeft de "Opslaan als" dialoog geannuleerd
                if (statusEl) {
                    statusEl.textContent = 'Export geannuleerd.';          // Neutrale melding bij annulering
                    statusEl.style.color = 'gray';                         // Grijze kleur: geen fout, maar ook geen succes
                }
            } else {                                                       // Onverwachte fout tijdens het exporteren
                console.error('Export mislukt:', err);                     // Log de technische fout in de console voor debugging
                if (statusEl) {
                    statusEl.textContent = '❌ Export mislukt. Zie console voor details.'; // Toon foutmelding aan de gebruiker
                    statusEl.style.color = 'red';                          // Rode kleur voor foutmelding
                }
            }
        }
    }

    /* ======================= JSON EXPORT ======================= */

    /**
     * Exporteert de volledige stamboom als JSON-bestand.
     * Altijd via downloadmap (geen "Opslaan als" dialoog).
     * @param {HTMLElement} [statusEl] - Optioneel element om statusmelding in te tonen
     */
    function exportJSON(statusEl) {
        const data = StamboomStorage.get();                                // Haal de volledige dataset op uit localStorage

        if (!data.length) {                                                // Controleer of er data is
            if (statusEl) {
                statusEl.textContent = '⚠️ Geen personen om te exporteren.'; // Waarschuwing bij lege dataset
                statusEl.style.color = 'red';                             // Rode kleur voor waarschuwing
            }
            return;                                                        // Stop de functie
        }

        const standaardNaam = `stamboom_${datumVoorBestandsnaam()}.json`;  // Bestandsnaam met datum, bijv. "stamboom_20240312.json"
        const blob = new Blob(                                             // Maak een downloadbaar bestandsobject
            [JSON.stringify(data, null, 2)],                               // Zet dataset om naar leesbare JSON met 2 spaties inspringing
            { type: 'application/json' }                                   // Stel het bestandstype in als JSON
        );
        const url = URL.createObjectURL(blob);                             // Maak een tijdelijke download-URL
        const a   = document.createElement('a');                          // Maak een onzichtbare downloadlink
        a.href     = url;                                                  // Koppel de URL aan de link
        a.download = standaardNaam;                                        // Stel de bestandsnaam in
        document.body.appendChild(a);                                     // Voeg de link tijdelijk toe aan de pagina
        a.click();                                                         // Start de download
        document.body.removeChild(a);                                     // Verwijder de link
        URL.revokeObjectURL(url);                                          // Geef het geheugen vrij

        if (statusEl) {
            statusEl.textContent = `✅ Geëxporteerd als ${standaardNaam}`; // Bevestig succesvolle JSON-export
            statusEl.style.color = 'green';                               // Groene kleur voor succesmelding
        }
    }

    /* ======================= EXPORTEER ALS GLOBAAL OBJECT ======================= */
    window.ExportModule = {                                                // Exporteer beide functies onder één namespace
        exportCSV,                                                         // window.ExportModule.exportCSV(statusEl)
        exportJSON                                                         // window.ExportModule.exportJSON(statusEl)
    };

})();                                                                      // Sluit en voer de zelfuitvoerende functie direct uit
