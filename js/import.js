// ======================= import.js (lean, schema-integratie, StamboomStorage) =======================

// Elementen ophalen
const fileInput = document.getElementById('csvFileInput');      // input element waar gebruiker CSV selecteert
const status = document.getElementById('importStatus');         // paragraaf element voor feedback/statusmeldingen

// Event listener voor CSV selectie
fileInput.addEventListener('change', function(e) {              // trigger functie wanneer bestand geselecteerd wordt
    const file = e.target.files[0];                             // pak het eerste geselecteerde bestand
    if (!file) return;                                          // stop als gebruiker niets selecteert

    const reader = new FileReader();                             // maak nieuwe FileReader aan voor het lezen van CSV
    reader.onload = function(event) {                             // callback wanneer CSV volledig is ingeladen
        const text = event.target.result;                         // tekstinhoud van het bestand ophalen
        const lines = text.split(/\r?\n/).filter(l => l.trim() !== ""); // splits op nieuwe regels, verwijder lege regels

        const importedData = [];                                  // buffer voor nieuwe personen die succesvol toegevoegd worden
        const existingData = window.StamboomStorage.get() || []; // haal bestaande dataset op via centrale storage (localStorage)

        // Verwerk elke CSV regel
        lines.forEach((line, index) => {                         // loop door alle niet-lege lijnen
            const person = StamboomSchema.fromCSV(line);         // converteer CSV regel naar object volgens schema
            if (!person) {                                       // controleer of parsing gelukt is
                console.warn(`Rij ${index+1} kon niet worden verwerkt.`); // log waarschuwing voor niet verwerkte rij
                return;                                         // skip deze rij
            }

            // PartnerID standaard leeg pipe als ontbreekt
            if (!person.PartnerID) person.PartnerID = StamboomSchema.stringifyPartners([]); // voorkomt undefined/format issues

            // Geslacht default als leeg
            if (!person.Geslacht) person.Geslacht = 'X';         // zet default onbekend geslacht

            // Voeg alleen toe als ID nog niet bestaat
            if (!existingData.some(e => e.ID === person.ID)) {  // check duplicaten op ID
                existingData.push(person);                      // voeg toe aan centrale dataset
                importedData.push(person);                      // voeg toe aan lijst voor statusmelding
            }
        });

        // Opslaan in centrale storage (localStorage via StamboomStorage)
        window.StamboomStorage.set(existingData);                // update centrale dataset met nieuwe personen

        // Statusmelding naar gebruiker
        status.textContent = importedData.length                // toon aantal succesvol geïmporteerde personen
            ? `✅ CSV geladen: ${importedData.length} personen toegevoegd.` // positieve melding
            : `⚠️ Geen nieuwe personen toegevoegd.`;           // waarschuwing als geen nieuwe data
    };

    // Callback voor fout bij lezen bestand
    reader.onerror = function() {                               // callback als bestand niet gelezen kan worden
        status.textContent = "❌ Fout bij het lezen van het bestand."; // toon foutmelding
    };

    reader.readAsText(file);                                    // start lezen van bestand als tekst
});
