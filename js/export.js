// =======================================
// export.js
// Exporteer stamboomData naar CSV
// =======================================

// Alle bekende kolommen (vaste volgorde)
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
    "Adres",
    "ContactInfo",
    "URL"
];

document.getElementById("exportBtn").addEventListener("click", function () {

    const status = document.getElementById("exportStatus");

    const data = JSON.parse(localStorage.getItem("stamboomData") || "[]");

    if (data.length === 0) {
        status.innerHTML = "❌ Geen data om te exporteren.";
        status.style.color = "red";
        return;
    }

    let csvContent = "";

    // Header rij
    csvContent += headers.join(",") + "\n";

    // Data rijen
    data.forEach(person => {

        const row = headers.map(header => {
            return person[header] ? person[header] : "";
        });

        csvContent += row.join(",") + "\n";
    });

    // Maak downloadbaar bestand
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "stamboom_export.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    status.innerHTML = "✅ CSV succesvol geëxporteerd.";
    status.style.color = "green";
});

