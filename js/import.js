// ======================= import.js – CSV import + preview =======================
document.addEventListener('DOMContentLoaded', () => { // wacht tot DOM volledig geladen is

    // ======================= DOM ELEMENTEN =======================
    const importForm = document.getElementById('importForm');      // formulier element
    const fileInput = document.getElementById('csvFileInput');     // CSV bestand input
    const status = document.getElementById('importStatus');        // statusmelding naar gebruiker
    const previewDiv = document.getElementById('personPreview');   // container voor preview
    const previewContent = document.getElementById('previewContent'); // <pre> element preview

    // ======================= FORM SUBMIT HANDLER =======================
    importForm.addEventListener('submit', function(e){
        e.preventDefault(); // voorkom reload van pagina

        const file = fileInput.files[0]; // pak geselecteerd CSV bestand
        if(!file){ 
            status.textContent = "⚠️ Selecteer eerst een CSV-bestand!"; // waarschuwing tonen
            return;
        }

        handleFile(file); // verwerk CSV bestand
    });

    // ======================= CSV VERWERK FUNCTIE =======================
    function handleFile(file){
        const reader = new FileReader(); // FileReader om CSV in te lezen

        reader.onload = function(event){
            const text = event.target.result; // CSV tekst ophalen
            let lines = text.split(/\r?\n/).filter(l => l.trim() !== ""); // split en filter lege regels
            const importedData = []; // buffer voor nieuwe personen
            const existingData = StamboomStorage.get(); // huidige dataset ophalen

            // max 500 rijen import
            if(lines.length > 500){
                status.textContent = `⚠️ CSV bevat meer dan 500 rijen. Alleen de eerste 500 worden geïmporteerd.`; 
                lines = lines.slice(0,500);
            }

            // ======================= Verwerk elke CSV regel =======================
            lines.forEach((line,index)=>{
                const person = schema.fromCSV(line); // converteer CSV naar object via globaal schema
                if(!person){ 
                    console.warn(`Rij ${index+1} kon niet verwerkt worden.`); 
                    return; // sla deze rij over
                }

                // default waarden
                if(!person.PartnerID) person.PartnerID = schema.stringifyPartners([]);
                if(!person.Geslacht) person.Geslacht = 'X';

                // unieke ID genereren als nog niet aanwezig of duplicaat
                if(!person.ID || existingData.some(p => p.ID === person.ID)){
                    person.ID = window.genereerCode(person, existingData);
                }

                // voeg toe aan dataset als niet duplicaat
                if(!existingData.some(p => p.ID === person.ID)){
                    existingData.push(person);
                    importedData.push(person);
                }
            });

            // ======================= Opslaan in storage =======================
            StamboomStorage.set(existingData); // gebruik centrale storage

            // ======================= Preview tonen =======================
            if(importedData.length > 0){
                previewContent.textContent = JSON.stringify(importedData, null, 2); // JSON leesbaar
                previewDiv.style.display = 'block'; // preview zichtbaar
                status.textContent = `✅ CSV geladen: ${importedData.length} personen toegevoegd.`; // status
            } else {
                previewContent.textContent = "";
                previewDiv.style.display = 'none';
                status.textContent = `⚠️ Geen nieuwe personen toegevoegd.`; 
            }
        };

        reader.onerror = function(){
            status.textContent = "❌ Fout bij het lezen van het bestand."; // foutmelding
        };

        reader.readAsText(file); // start lezen CSV als tekst
    }

}); // einde DOMContentLoaded
