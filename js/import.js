// ======================= import.js – CSV import naar sessionStorage =======================

// DOM-elementen ophalen
const fileInput = document.getElementById('csvFileInput');  // input-element voor CSV
const status = document.getElementById('importStatus');     // element om feedback/status naar gebruiker te tonen

// Event listener voor CSV selectie
fileInput.addEventListener('change', function(e){           // trigger wanneer gebruiker een bestand kiest
    const file = e.target.files[0];                        // pak het eerste geselecteerde bestand
    if (!file) return;                                     // stop als gebruiker geen bestand kiest

    const reader = new FileReader();                       // maak FileReader object aan

    // Callback wanneer CSV volledig ingeladen is
    reader.onload = function(event){
        const text = event.target.result;                  // haal CSV tekst op
        const lines = text.split(/\r?\n/)                  // splits tekst in regels
                          .filter(l => l.trim() !== "");   // verwijder lege regels
        const importedData = [];                            // tijdelijke buffer voor nieuwe personen

        // Haal bestaande dataset uit sessionStorage (of lege array)
        const existingData = JSON.parse(sessionStorage.getItem('stamboomData') || "[]");

        // Limiteer import tot 500 personen
        if(lines.length > 500){
            status.textContent = `⚠️ CSV bevat meer dan 500 rijen. Alleen de eerste 500 worden geïmporteerd.`;
            lines.splice(500); // verwijder rijen na 500
        }

        // Verwerk elke CSV regel
        lines.forEach((line, index) => {
            const person = StamboomSchema.fromCSV(line);   // converteer CSV naar object
            if(!person){                                   // parsing mislukt
                console.warn(`Rij ${index+1} kon niet worden verwerkt.`);
                return;
            }

            // Default waarden instellen
            if(!person.PartnerID) person.PartnerID = StamboomSchema.stringifyPartners([]); // lege partners
            if(!person.Geslacht) person.Geslacht = 'X';                                    // onbekend geslacht

            // Unieke ID genereren via IDGenerator als nog niet aanwezig
            if(!person.ID || existingData.some(p => p.ID === person.ID)){
                person.ID = window.genereerCode(person, existingData);
            }

            // Voeg persoon toe als niet duplicaat
            if(!existingData.some(p => p.ID === person.ID)){
                existingData.push(person);  // toevoegen aan centrale dataset
                importedData.push(person);  // toevoegen aan buffer voor statusmelding
            }
        });

        // Opslaan in sessionStorage voor de huidige sessie
        sessionStorage.setItem('stamboomData', JSON.stringify(existingData));

        // Statusmelding tonen
        status.textContent = importedData.length
            ? `✅ CSV geladen: ${importedData.length} personen toegevoegd.`
            : `⚠️ Geen nieuwe personen toegevoegd.`;
    };

    // Callback bij fout tijdens lezen bestand
    reader.onerror = function(){
        status.textContent = "❌ Fout bij het lezen van het bestand.";
    };

    // Start het lezen van CSV bestand als tekst
    reader.readAsText(file);
});
