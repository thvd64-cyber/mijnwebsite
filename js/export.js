/* ======================= js/export.js v1.2.8 ======================= */
/* ======================= CSV EXPORT FUNCTION ======================= */
/* Functie die de lokale data ophaalt via get() en exporteert naar CSV */
function exportCSV(filename = "export.csv") {
    // 1. Haal alle records op uit localStorage
    const data = get();

    // 2. Stop als er geen data is
    if (!data.length) {
        alert("Geen data beschikbaar om te exporteren.");
        return;
    }

    // 3. Bepaal alle unieke kolomnamen (headers)
    const headers = Array.from(
        data.reduce((acc, row) => {
            Object.keys(row).forEach(key => acc.add(key));
            return acc;
        }, new Set())
    );

    // 4. Zet de data om naar CSV-regels
    const csvRows = [];
    csvRows.push(headers.join(",")); // eerste regel: kolomnamen

    data.forEach(row => {
        const values = headers.map(header => {
            let val = row[header] !== undefined ? row[header] : ""; // lege string als veld ontbreekt
            val = String(val).replace(/"/g, '""'); // dubbele quotes escapen
            if (val.includes(",") || val.includes('"') || val.includes("\n")) {
                val = `"${val}"`; // waarde tussen quotes als nodig
            }
            return val;
        });
        csvRows.push(values.join(","));
    });

    // 5. Maak een Blob van de CSV
    const csvBlob = new Blob([csvRows.join("\n")], { type: "text/csv" });

    // 6. Creëer een tijdelijke downloadlink en start de download
    const url = URL.createObjectURL(csvBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // opruimen
}

/* ======================= EXPORT KNOP LOGICA ======================= */
/* Koppelt de exportCSV functie aan de knop in je HTML */
document.addEventListener("DOMContentLoaded", () => {
    const exportBtn = document.getElementById("exportBtn"); // selecteer knop
    const status = document.getElementById("exportStatus"); // selecteer status element

    exportBtn.addEventListener("click", () => {
        // Optioneel: vraag gebruiker om een bestandsnaam
        let filename = prompt("Geef de bestandsnaam op voor je CSV", "export.csv");
        if (!filename) {
            status.textContent = "Export geannuleerd door gebruiker.";
            return;
        }

        try {
            // Start CSV-export
            exportCSV(filename);
            status.textContent = `CSV-export succesvol gestart: ${filename}`;
        } catch (e) {
            console.error(e);
            status.textContent = "Er is iets misgegaan bij de export.";
        }
    });
});
