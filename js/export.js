// ======================= js/export.js v0.0.0
// Exporteer stamboomData naar CSV
// Gebruikt import naam + datumtijd
// Overschrijft nooit bestanden
// =======================================

const headers = [
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
    "Huisadressen",
    "ContactInfo",
    "URL"
];

document.getElementById("exportBtn").addEventListener("click", async function () {

    const status = document.getElementById("exportStatus");
    const data = JSON.parse(localStorage.getItem("stamboomData") || "[]");

    if (data.length === 0) {
        status.innerHTML = "❌ Geen data om te exporteren.";
        status.style.color = "red";
        return;
    }

    // ===============================
    // Bestandsnaam bepalen
    // ===============================

    let baseName = localStorage.getItem("importFileName");

    if (baseName) {
        baseName = baseName.replace(".csv", "");
    } else {
        baseName = "stamboom_export";
    }

    const now = new Date();
    const dateTime =
        now.getFullYear() + "-" +
        String(now.getMonth() + 1).padStart(2, "0") + "-" +
        String(now.getDate()).padStart(2, "0") + "_" +
        String(now.getHours()).padStart(2, "0") + "-" +
        String(now.getMinutes()).padStart(2, "0") + "-" +
        String(now.getSeconds()).padStart(2, "0");

    const fileName = `${baseName}_${dateTime}.csv`;

    // ===============================
    // CSV opbouwen
    // ===============================

    let csvContent = headers.join(",") + "\n";

    data.forEach(person => {
        const row = headers.map(header => person[header] ? person[header] : "");
        csvContent += row.join(",") + "\n";
    });

    try {

        const fileHandle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [{
                description: "CSV bestand",
                accept: { "text/csv": [".csv"] }
            }]
        });

        const writable = await fileHandle.createWritable();
        await writable.write(csvContent);
        await writable.close();

        status.innerHTML = "✅ CSV succesvol geëxporteerd als " + fileName;
        status.style.color = "green";

    } catch (error) {

        status.innerHTML = "❌ Export geannuleerd of mislukt.";
        status.style.color = "red";
    }
});
