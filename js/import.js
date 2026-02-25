// =======================================
// import.js
// Importeer CSV naar stamboomData via StamboomStorage
// =======================================

const headers = [ // Kolommen exact gelijk aan export
    "ID","Doopnaam","Roepnaam","Prefix","Achternaam","Geslacht",
    "Geboortedatum","Geboorteplaats","Overlijdensdatum","Overlijdensplaats",
    "Vader","Moeder ID","Partner ID","Huwelijksdatum","Huwelijksplaats",
    "Opmerkingen","Adres","ContactInfo","URL"
];

document.getElementById("importBtn").addEventListener("click", async function () {

    const fileInput = document.getElementById("importFile"); // file input
    const status = document.getElementById("importStatus"); // status element

    if (!fileInput.files.length) { // check of bestand is gekozen
        status.innerHTML = "❌ Geen bestand geselecteerd.";
        status.style.color = "red";
        return;
    }

    const file = fileInput.files[0]; // pak bestand
    const text = await file.text(); // lees als tekst

    const lines = text.split("\n").filter(line => line.trim() !== ""); // split op nieuwe lijnen
    if (lines.length <= 1) { // alleen header aanwezig
        status.innerHTML = "❌ Geen data gevonden in CSV.";
        status.style.color = "red";
        return;
    }

    const data = []; // nieuwe dataset

    for (let i = 1; i < lines.length; i++) { // start bij 1 (sla header over)
        const values = lines[i].split(","); // split op komma
        const persoon = {}; // nieuw persoon object
        headers.forEach((header, index) => {
            persoon[header] = values[index] ? values[index].replace(/^"|"$/g,"") : ""; // map kolommen
        });
        data.push(persoon); // voeg toe aan array
    }

    try {
        // ===============================
        // Opslaan via StamboomStorage
        // ===============================
        window.StamboomStorage.set(data); // volledig via StamboomStorage
        window.StamboomStorage.setImportFileName(file.name); // optioneel: bewaar naam bestand
        status.innerHTML = `✅ Import succesvol: ${data.length} personen geladen via StamboomStorage.`;
        status.style.color = "green";
    } catch (error) {
        console.error(error);
        status.innerHTML = "❌ Import mislukt.";
        status.style.color = "red";
    }
});
