// ======================= import.js – lean integratie met StamboomStorage =======================

// DOM-elementen ophalen
const fileInput = document.getElementById('csvFileInput');  // input-element waar de gebruiker CSV kiest
const status = document.getElementById('importStatus');     // element om feedback/status naar gebruiker te tonen

// Event listener voor CSV selectie
fileInput.addEventListener('change', function(e){           // trigger wanneer gebruiker een bestand selecteert
    const file = e.target.files[0];                        // pak het eerste geselecteerde bestand
    if (!file) return;                                     // stop als gebruiker niets selecteert

    const reader = new FileReader();                       // maak een FileReader object om CSV in te lezen

    // Callback wanneer CSV volledig ingeladen is
    reader.onload = function(event){                       
        const text = event.target.result;                  // haal de tekstinhoud van CSV op
        const lines = text.split(/\r?\n/)                  // splits tekst in regels
                          .filter(l => l.trim() !== "");   // verwijder lege regels

        const importedData = [];                            // tijdelijke buffer voor succesvol verwerkte personen
        const existingData = StamboomStorage.get() || [];   // haal huidige dataset op via storage.js

        // Verwerk elke CSV regel
        lines.forEach((line, index) => {                   
            const person = StamboomSchema.fromCSV(line);   // converteer CSV naar object volgens schema
            if (!person) {                                 // controleer of parsing gelukt is
                console.warn(`Rij ${index+1} kon niet worden verwerkt.`); // log waarschuwing
                return;                                    // sla deze rij over
            }

            // Zorg dat PartnerID altijd een lege pipe-string heeft als niet aanwezig
            if (!person.PartnerID) person.PartnerID = StamboomSchema.stringifyPartners([]); // voorkomt format issues

            // Zorg dat Geslacht altijd een waarde heeft
            if (!person.Geslacht) person.Geslacht = 'X';   // default onbekend geslacht

            // Voeg alleen toe als ID nog niet bestaat in dataset
            if (!existingData.some(e => e.ID === person.ID)) { // check op duplicaten
                existingData.push(person);                   // voeg toe aan centrale dataset
                importedData.push(person);                   // voeg toe aan buffer voor statusmelding
            }
        });

        // Sla geüpdatete dataset op in centrale storage
        StamboomStorage.set(existingData);                  // update dataset in sessionStorage

        // Toon statusmelding naar gebruiker
        status.textContent = importedData.length            // controleer of er nieuwe personen zijn toegevoegd
            ? `✅ CSV geladen: ${importedData.length} personen toegevoegd.` // positief
            : `⚠️ Geen nieuwe personen toegevoegd.`;       // waarschuwing als geen nieuwe data
    };

    // Callback bij fout tijdens lezen bestand
    reader.onerror = function(){                           
        status.textContent = "❌ Fout bij het lezen van het bestand."; // toon foutmelding
    };

    // Start het lezen van CSV bestand als tekst
    reader.readAsText(file);                                
});
