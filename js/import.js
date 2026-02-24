// ======================= import.js – CSV import + preview naar StamboomStorage =======================
document.addEventListener('DOMContentLoaded', () => { // Wacht tot DOM volledig geladen is

    // ======================= DOM ELEMENTEN =======================
    const fileInput = document.getElementById('csvFileInput');       // CSV file input
    const uploadBtn = document.getElementById('uploadBtn');          // Upload knop
    const status = document.getElementById('importStatus');          // statusmelding
    const previewDiv = document.getElementById('csvPreview');        // preview container
    const previewContent = document.getElementById('previewContent');// <pre> element voor preview
    const confirmBtn = document.getElementById('confirmBtn');        // bevestigingsknop
    const warningMessage = document.getElementById('warningMessage');// waarschuwing div

    // ======================= Upload & Verwerk CSV =======================
    uploadBtn.addEventListener('click', () => {
        const file = fileInput.files[0]; // pak geselecteerd CSV bestand
        if(!file){ 
            status.textContent = "⚠️ Selecteer eerst een CSV-bestand!"; // waarschuwing tonen
            return;
        }
        handleFile(file); // verwerk CSV
    });

    // ======================= Functie CSV Inlezen =======================
    function handleFile(file){
        const reader = new FileReader(); // FileReader object

        reader.onload = function(event){
            const text = event.target.result;                             // CSV tekst
            let lines = text.split(/\r?\n/).filter(l => l.trim() !== ""); // split in regels + verwijder lege regels
            const importedData = [];                                        // buffer nieuwe personen
            const existingData = JSON.parse(sessionStorage.getItem('stamboomData') || "[]"); // bestaande data

            // Limiet: max 500 rijen
            if(lines.length > 500){
                status.textContent = "⚠️ Alleen de eerste 500 rijen worden geïmporteerd.";
                lines = lines.slice(0,500);
            }

            // ======================= Verwerk elke regel =======================
            lines.forEach((line,index) => {
                const person = schema.fromCSV(line); // converteer CSV → object via schema
                if(!person){
                    console.warn(`Rij ${index+1} kon niet verwerkt worden.`);
                    return; // sla deze regel over
                }

                if(!person.PartnerID) person.PartnerID = schema.stringifyPartners([]); // lege partner array
                if(!person.Geslacht) person.Geslacht = 'X'; // default geslacht
                if(!person.ID || existingData.some(p => p.ID === person.ID)){
                    person.ID = window.genereerCode(person, existingData); // genereer unieke ID
                }

                // Voeg toe indien niet duplicaat
                if(!existingData.some(p => p.ID === person.ID)){
                    existingData.push(person);
                    importedData.push(person);
                }
            });

            // Opslaan in sessionStorage
            sessionStorage.setItem('stamboomData', JSON.stringify(existingData));

            // ======================= Preview tonen =======================
            if(importedData.length > 0){
                previewContent.textContent = JSON.stringify(importedData, null, 2); // JSON preview
                previewDiv.style.display = 'block'; // toon preview
                status.textContent = `✅ CSV geladen: ${importedData.length} personen klaar voor bevestiging.`;
            } else {
                previewDiv.style.display = 'none';
                status.textContent = "⚠️ Geen nieuwe personen toegevoegd.";
            }
        };

        reader.onerror = function(){
            status.textContent = "❌ Fout bij het lezen van het bestand.";
        };

        reader.readAsText(file); // start lezen CSV
    }

    // ======================= Confirm Button =======================
    confirmBtn.addEventListener('click', () => {
        const persons = JSON.parse(previewContent.textContent); // haal preview data
        persons.forEach(person => StamboomStorage.add(person)); // voeg alle personen toe
        warningMessage.style.display = 'none';
        previewDiv.style.display = 'none';
        status.textContent = `✅ ${persons.length} personen toegevoegd aan StamboomStorage.`;
    });

}); // einde DOMContentLoaded
