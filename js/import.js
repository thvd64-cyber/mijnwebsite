// ======================= import.js – CSV import naar sessionStorage =======================

// DOM-elementen ophalen
const fileInput = document.getElementById('csvFileInput');  // input-element voor CSV-bestand
const uploadBtn = document.getElementById('uploadBtn');     // upload knop element
const status = document.getElementById('importStatus');     // element om status/feedback aan gebruiker te tonen

// Functie om CSV-bestand te verwerken
function handleFile(file){
    if(!file) return;                                      // stop als er geen bestand is geselecteerd
    const reader = new FileReader();                       // maak een FileReader object om CSV in te lezen

    // Callback wanneer CSV volledig ingeladen is
    reader.onload = function(event){
        const text = event.target.result;                  // haal CSV tekst op
        let lines = text.split(/\r?\n/)                    // split CSV in afzonderlijke regels
                        .filter(l => l.trim() !== "");     // verwijder lege regels
        const importedData = [];                            // buffer voor nieuwe personen
        const existingData = JSON.parse(sessionStorage.getItem('stamboomData') || "[]"); // huidige dataset ophalen

        // Limiteer import tot maximaal 500 personen
        if(lines.length > 500){
            status.textContent = `⚠️ CSV bevat meer dan 500 rijen. Alleen de eerste 500 worden geïmporteerd.`; // waarschuwing
            lines = lines.slice(0,500);                    // behoud alleen eerste 500 regels
        }

        // Verwerk elke CSV regel
        lines.forEach((line,index)=>{
            const person = StamboomSchema.fromCSV(line);    // converteer CSV naar object volgens schema
            if(!person){                                    // parsing mislukt
                console.warn(`Rij ${index+1} kon niet worden verwerkt.`); // log waarschuwing
                return;                                     // sla deze rij over
            }

            // Default waarden instellen
            if(!person.PartnerID) person.PartnerID = StamboomSchema.stringifyPartners([]); // lege partners indien niet aanwezig
            if(!person.Geslacht) person.Geslacht = 'X';                                     // default onbekend geslacht

            // Unieke ID genereren via IDGenerator als nog niet aanwezig of duplicaat
            if(!person.ID || existingData.some(p => p.ID === person.ID)){
                person.ID = window.genereerCode(person, existingData);                     // genereer unieke ID
            }

            // Voeg persoon toe als niet duplicaat
            if(!existingData.some(p => p.ID === person.ID)){
                existingData.push(person);  // voeg toe aan centrale dataset
                importedData.push(person);  // voeg toe aan buffer voor statusmelding
            }
        });

        // Opslaan in sessionStorage (levensduur: huidige sessie/tab)
        sessionStorage.setItem('stamboomData', JSON.stringify(existingData));

        // Toon statusmelding naar gebruiker
        status.textContent = importedData.length
            ? `✅ CSV geladen: ${importedData.length} personen toegevoegd.`  // positief bericht
            : `⚠️ Geen nieuwe personen toegevoegd.`;                       // waarschuwing als geen nieuwe data
    };

    // Callback bij fout tijdens lezen bestand
    reader.onerror = function(){
        status.textContent = "❌ Fout bij het lezen van het bestand.";      // foutmelding tonen
    };

    reader.readAsText(file);                                               // start lezen CSV als tekst
}

// Event listener upload knop
uploadBtn.addEventListener('click', ()=>{
    const file = fileInput.files[0];   // pak geselecteerd bestand
    handleFile(file);                  // verwerk CSV via handleFile functie
});
