// =======================================
// import.js
// Importeer CSV naar stamboomData
// Zelfde structuur als export
// =======================================

const headers = [ // Kolommen exact gelijk aan export
    "ID",
    "Doopnaam",
    "Roepnaam",
    "Prefix",
    "Achternaam",
    "Geslacht",
    "Geboortedatum",
    "Geboorteplaats",
    "Overlijdensdatum",
    "Overlijdensplaats",
    "Vader",
    "Moeder ID",
    "Partner ID",
    "Huwelijksdatum",
    "Huwelijksplaats",
    "Opmerkingen",
    "Adres",
    "ContactInfo",
    "URL"
];

document.getElementById("importBtn").addEventListener("click", async function () { // Klik event

    const fileInput = document.getElementById("importFile"); // Selecteer file input
    const status = document.getElementById("importStatus"); // Selecteer status element

    if (!fileInput.files.length) { // Controle of bestand gekozen is
        status.innerHTML = "❌ Geen bestand geselecteerd.";
        status.style.color = "red";
        return;
    }

    const file = fileInput.files[0]; // Pak eerste geselecteerde file
    const text = await file.text(); // Lees bestand als tekst

    const lines = text.split("\n").filter(line => line.trim() !== ""); // Splits op regels

    if (lines.length <= 1) { // Alleen header aanwezig
        status.innerHTML = "❌ Geen data gevonden in CSV.";
        status.style.color = "red";
        return;
    }

    const data = []; // Nieuwe array voor personen

    for (let i = 1; i < lines.length; i++) { // Start bij 1 (sla header over)

        const values = lines[i].split(","); // Splits regel op komma

        const person = {}; // Nieuw persoon object

        headers.forEach((header, index) => { // Loop over kolommen
            person[header] = values[index] ? values[index].replace(/^"|"$/g,"") : ""; // Koppel waarde aan kolom
        });

        data.push(person); // Voeg persoon toe aan array
    }

    localStorage.setItem("stamboomData", JSON.stringify(data)); // Sla data op in localStorage
    localStorage.setItem("importFileName", file.name); // Bewaar bestandsnaam voor toekomstige export

    status.innerHTML = "✅ Import succesvol: " + data.length + " personen geladen.";
    status.style.color = "green";
});
