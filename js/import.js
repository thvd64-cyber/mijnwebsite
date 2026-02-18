// ======================= import.js =======================

// Elementen
const fileInput = document.getElementById('csvFileInput');
const status = document.getElementById('importStatus');

// Functie om CSV te lezen en te importeren
fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const text = event.target.result;
        const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");

        // Array voor stamboomData
        const importedData = [];

        lines.forEach((line, index) => {
            // Sla de eerste regel over als het headers zijn (optioneel)
            // Omdat we taal en headers negeren, gewoon elke rij als data behandelen
            const fields = line.split(",");

            // Zorg dat elke rij precies 19 velden heeft
            while (fields.length < 19) fields.push("");
            fields.length = 19; // Snijd overtollige velden af

            const person = {
                ID: fields[0].trim(),
                Doopnaam: fields[1].trim(),
                Roepnaam: fields[2].trim(),
                Prefix: fields[3].trim(),
                Achternaam: fields[4].trim(),
                Geslacht: fields[5].trim(),
                Geboortedatum: fields[6].trim(),
                Geboorteplaats: fields[7].trim(),
                Overlijdensdatum: fields[8].trim(),
                Overlijdensplaats: fields[9].trim(),
                Vader: fields[10].trim(),
                MoederID: fields[11].trim(),
                PartnerID: fields[12].trim(),
                Huwelijksdatum: fields[13].trim(),
                Huwelijksplaats: fields[14].trim(),
                Opmerkingen: fields[15].trim(),
                Adres: fields[16].trim(),
                ContactInfo: fields[17].trim(),
                URL: fields[18].trim()
            };

            importedData.push(person);
        });

        // Opslaan in localStorage
        if (importedData.length > 0) {
            // Bestaande data behouden en nieuwe rijen toevoegen
            const existingData = JSON.parse(localStorage.getItem('stamboomData') || '[]');

            // Voeg alleen nieuwe ID’s toe, bestaande ID’s niet overschrijven
            importedData.forEach(p => {
                if (!existingData.some(e => e.ID === p.ID)) {
                    existingData.push(p);
                }
            });

            localStorage.setItem('stamboomData', JSON.stringify(existingData));
            status.textContent = `✅ CSV geladen: ${importedData.length} personen toegevoegd.`;
        } else {
            status.textContent = "⚠️ Geen data gevonden in CSV.";
        }
    };

    reader.onerror = function() {
        status.textContent = "❌ Fout bij het lezen van het bestand.";
    };

    reader.readAsText(file);
});
