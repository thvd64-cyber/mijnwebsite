// ======================= import.js – eenvoudige CSV import =======================
document.addEventListener('DOMContentLoaded', () => { // Wacht tot het volledige DOM geladen is

    // ======================= DOM ELEMENTEN OPHALEN =======================
    const fileInput = document.getElementById('csvFileInput'); // input element voor CSV-bestand
    const uploadBtn = document.getElementById('uploadBtn');    // upload knop
    const status = document.getElementById('importStatus');    // element voor status/feedback

    // ======================= FUNCTIE OM CSV TE VERWERKEN =======================
    function handleFile(file) {
        if (!file) return; // stop als er geen bestand geselecteerd is

        const reader = new FileReader(); // maak een FileReader om CSV te lezen

        reader.onload = function(event) {
            const text = event.target.result;               // haal CSV tekst op
            let lines = text.split(/\r?\n/).filter(l => l.trim() !== ""); // split in regels en verwijder lege regels

            if(lines.length < 2){                            // controleer of er minstens 2 regels zijn (header + data)
                status.textContent = "⚠️ CSV bevat geen data rijen.";
                return;
            }

            const data = [];                                 // buffer voor alle rijen

            // start vanaf index 1 om header over te slaan
            for(let i = 1; i < lines.length; i++){
                const cols = lines[i].split(',');           // split elke regel op komma
                const person = {};                           // nieuw object voor deze rij
                for(let j=0; j<19; j++){                     // verwacht 19 kolommen
                    person[`Kolom${j+1}`] = cols[j] || ""; // vul kolom, leeg als niet aanwezig
                }
                data.push(person);                            // voeg toe aan dataset
            }

            // opslaan in sessionStorage (kan vervangen door StamboomStorage.get/set als gewenst)
            sessionStorage.setItem('stamboomData', JSON.stringify(data));

            // statusmelding naar gebruiker
            status.textContent = `✅ CSV geladen: ${data.length} rijen toegevoegd.`;
        };

        reader.onerror = function(){
            status.textContent = "❌ Fout bij het lezen van het bestand."; // foutmelding
        };

        reader.readAsText(file); // start lezen CSV
    }

    // ======================= EVENT LISTENER UPLOAD KNOP =======================
    uploadBtn.addEventListener('click', () => {
        const file = fileInput.files[0]; // pak geselecteerd bestand
        handleFile(file);                 // verwerk CSV
    });

}); // einde DOMContentLoaded
