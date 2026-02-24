// ======================= import.js – CSV import naar StamboomStorage =======================
document.addEventListener('DOMContentLoaded', () => { // Wacht tot DOM volledig geladen is

    // ======================= DOM ELEMENTEN =======================
    const fileInput = document.getElementById('csvFileInput');  // file input element
    const uploadBtn = document.getElementById('uploadBtn');     // upload knop
    const status = document.getElementById('importStatus');     // status / feedback element

    // ======================= FUNCTIE VOOR CSV VERWERKING =======================
    function handleFile(file){
        if(!file) return; // stop als geen bestand geselecteerd

        const reader = new FileReader(); // CSV lezen
        reader.onload = function(event){
            const text = event.target.result; // CSV tekst
            let lines = text.split(/\r?\n/).filter(l => l.trim() !== ""); // split in regels en verwijder lege regels
            const importedData = []; // buffer voor nieuwe personen
            const existingData = StamboomStorage.get() || []; // huidige dataset ophalen via StamboomStorage

            // Limiteer tot max 500 rijen
            if(lines.length > 500){ 
                lines = lines.slice(0,500);
                status.textContent = "⚠️ Alleen de eerste 500 rijen worden geïmporteerd."; 
            }

            // Verwerk elke CSV regel
            lines.forEach((line,index) => {
                const person = schema.fromCSV(line); // converteer CSV naar object via schema
                if(!person){ 
                    console.warn(`Rij ${index+1} kon niet verwerkt worden.`); 
                    return; // sla deze rij over
                }

                // Default waarden instellen
                if(!person.PartnerID) person.PartnerID = schema.stringifyPartners([]);
                if(!person.Geslacht) person.Geslacht = 'X';

                // Unieke ID genereren indien nodig
                if(!person.ID || existingData.some(p => p.ID === person.ID)){
                    person.ID = window.genereerCode(person, existingData); 
                }

                // Voeg toe als niet duplicaat
                if(!existingData.some(p => p.ID === person.ID)){
                    existingData.push(person);
                    importedData.push(person);
                }
            });

            // Opslaan via StamboomStorage
            StamboomStorage.set(existingData);

            // Statusmelding tonen
            status.textContent = importedData.length
                ? `✅ CSV geladen: ${importedData.length} personen toegevoegd.`
                : `⚠️ Geen nieuwe personen toegevoegd.`;
        };

        // Fout bij lezen bestand
        reader.onerror = function(){ 
            status.textContent = "❌ Fout bij het lezen van het bestand."; 
        };

        reader.readAsText(file); // start lezen CSV
    }

    // ======================= EVENT LISTENER =======================
    uploadBtn.addEventListener('click', () => {
        const file = fileInput.files[0]; // pak geselecteerd bestand
        handleFile(file); // verwerk CSV
    });

}); // einde DOMContentLoaded
