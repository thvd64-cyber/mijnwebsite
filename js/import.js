// ======================= import.js – CSV import via StamboomStorage =======================
document.addEventListener('DOMContentLoaded', () => { // Wacht tot de DOM volledig geladen is

    // ======================= DOM ELEMENTEN =======================
    const importForm = document.getElementById('importForm');   // Form element voor CSV import
    const fileInput = document.getElementById('csvFileInput');  // File input element
    const status = document.getElementById('importStatus');     // Element om status/feedback te tonen

    // ======================= FORM SUBMIT HANDLER =======================
    importForm.addEventListener('submit', function(e){
        e.preventDefault(); // voorkom dat formulier de pagina reloadt

        const file = fileInput.files[0]; // pak geselecteerd CSV bestand
        if(!file){ 
            status.textContent = "⚠️ Selecteer eerst een CSV-bestand!"; // waarschuwing tonen
            return;
        }

        const reader = new FileReader(); // FileReader object om CSV in te lezen

        // Callback wanneer CSV volledig ingeladen is
        reader.onload = function(event){
            const text = event.target.result; // haal CSV tekst op
            let lines = text.split(/\r?\n/).filter(l => l.trim() !== ""); // split op regels en verwijder lege regels
            const importedData = [];                              // buffer voor nieuwe personen
            const existingData = StamboomStorage.get();          // haal huidige dataset op

            // Limiteer tot maximaal 500 rijen
            if(lines.length > 500){
                status.textContent = "⚠️ Alleen de eerste 500 rijen worden verwerkt.";
                lines = lines.slice(0,500); // behoud eerste 500
            }

            // ======================= CSV REGELS VERWERKEN =======================
            lines.forEach((line,index) => {
                const person = schema.fromCSV(line);  // converteer CSV regel naar object
                if(!person){                           // parsing mislukt
                    console.warn(`Rij ${index+1} kon niet worden verwerkt.`); // log waarschuwing
                    return;                            // sla deze rij over
                }

                // Default waarden instellen
                if(!person.PartnerID) person.PartnerID = []; // lege partners indien niet aanwezig
                if(!person.Geslacht) person.Geslacht = 'X';  // default onbekend geslacht

                // Unieke ID genereren als niet aanwezig of duplicaat
                if(!person.ID || existingData.some(p => p.ID === person.ID)){
                    person.ID = window.genereerCode(person, existingData); // unieke ID via idGenerator
                }

                // Voeg persoon toe als nog niet aanwezig
                if(!existingData.some(p => p.ID === person.ID)){
                    existingData.push(person);    // opslaan in centrale dataset
                    importedData.push(person);   // opslaan in buffer voor statusmelding
                }
            });

            // ======================= OPSLAAN EN STATUS =======================
            StamboomStorage.save(existingData); // opslaan in sessionStorage
            status.textContent = importedData.length
                ? `✅ CSV geladen: ${importedData.length} personen toegevoegd.`  // positief bericht
                : `⚠️ Geen nieuwe personen toegevoegd.`;                        // waarschuwing als geen nieuwe data
        };

        // Callback bij fout tijdens lezen bestand
        reader.onerror = function(){
            status.textContent = "❌ Fout bij het lezen van het bestand."; // foutmelding tonen
        };

        reader.readAsText(file); // start lezen CSV als tekst
    });

}); // einde DOMContentLoaded
