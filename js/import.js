// ======================= import.js =======================
document.addEventListener('DOMContentLoaded', () => { // Wacht tot DOM en dependencies geladen zijn

    // DOM-elementen ophalen
    const fileInput = document.getElementById('csvFileInput'); // file input element
    const uploadBtn = document.getElementById('uploadBtn');    // upload knop element
    const status = document.getElementById('importStatus');    // element voor status feedback

    // Functie om CSV-bestand te verwerken
    function handleFile(file){
        if(!file) return;                                      // stop als er geen bestand is geselecteerd
        const reader = new FileReader();                       // maak FileReader object

        reader.onload = function(event){                       // callback bij laden bestand
            const text = event.target.result;                  // haal CSV tekst op
            let lines = text.split(/\r?\n/).filter(l => l.trim() !== ""); // split in regels en verwijder lege
            const importedData = [];                            // buffer voor nieuwe personen
            const existingData = JSON.parse(sessionStorage.getItem('stamboomData') || "[]"); // huidige dataset

            if(lines.length > 500){                             // limiet max 500 rijen
                status.textContent = `⚠️ CSV bevat meer dan 500 rijen. Alleen de eerste 500 worden geïmporteerd.`;
                lines = lines.slice(0,500);                     // behoud eerste 500 regels
            }

            // Verwerk elke CSV regel
            lines.forEach((line,index) => {
                const person = schema.fromCSV(line);           // converteer CSV naar object via schema
                if(!person){ 
                    console.warn(`Rij ${index+1} kon niet verwerkt worden.`); // log waarschuwing
                    return;                                     // sla deze rij over
                }
                if(!person.PartnerID) person.PartnerID = schema.stringifyPartners([]); // lege partnerlijst
                if(!person.Geslacht) person.Geslacht = 'X';      // default geslacht
                if(!person.ID || existingData.some(p=>p.ID===person.ID)) person.ID = window.genereerCode(person, existingData); // unieke ID
                if(!existingData.some(p=>p.ID===person.ID)){ existingData.push(person); importedData.push(person); } // toevoegen
            });

            sessionStorage.setItem('stamboomData', JSON.stringify(existingData)); // opslaan
            status.textContent = importedData.length
                ? `✅ CSV geladen: ${importedData.length} personen toegevoegd.` // positief bericht
                : `⚠️ Geen nieuwe personen toegevoegd.`;                     // waarschuwing
        };

        reader.onerror = ()=>{ status.textContent = "❌ Fout bij het lezen van het bestand."; }; // foutmelding
        reader.readAsText(file); // start lezen CSV
    }

    uploadBtn.addEventListener('click', () => {          // klik handler upload knop
        const file = fileInput.files[0];                 // pak geselecteerd bestand
        handleFile(file);                                // verwerk CSV
    });

});
