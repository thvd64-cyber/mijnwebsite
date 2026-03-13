/* ======================= js/export.js v1.2.7 ======================= */
/* Robuuste CSV-export van de volledige dataset
   - Neemt letterlijk alles uit StamboomStorage.get()
   - Dynamische headers uit de dataset
   - Compatibel met showSaveFilePicker of fallback via <a download>
   - Gebruiker kan bestandsnaam en locatie kiezen
*/

document.getElementById("exportBtn").addEventListener("click", async function () {
    const status = document.getElementById("exportStatus"); // element voor statusmeldingen

    try {
        /* ======================= HAAL DATA OP ======================= */
        const data = StamboomStorage.get(); // alle objecten uit storage ophalen
        if (!data || !data.length) { // check of er data is
            status.innerHTML = "❌ Geen data om te exporteren."; 
            status.style.color = "red";
            return;
        }

        /* ======================= DYNAMISCHE HEADERS ======================= */
        // Verzamel alle unieke keys uit de dataset voor CSV headers
        const headers = Array.from(
            new Set(data.flatMap(obj => Object.keys(obj))) // flatMap alle keys en unique maken
        );

        /* ======================= HELPER: CSV ESCAPE ======================= */
        function escapeCSV(value) {
            if (value == null) return ""; // null of undefined wordt leeg
            const str = String(value).replace(/"/g, '""'); // dubbele quotes escapen
            return `"${str}"`; // altijd quotes om waarde
        }

        /* ======================= CSV CONTENT OPBOUWEN ======================= */
        let csvContent = headers.map(escapeCSV).join(",") + "\n"; // header rij

        data.forEach(obj => {
            const row = headers.map(h => escapeCSV(obj[h] ?? "")); // lege cel als key ontbreekt
            csvContent += row.join(",") + "\n"; // voeg rij toe
        });

        /* ======================= BESTANDSNAAM ======================= */
        const now = new Date(); // huidige datum
        const defaultName = `stamboom_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}.csv`; // standaard naam
        let userFileName = prompt("Voer bestandsnaam in (zonder .csv):", defaultName.replace(".csv","")); // prompt voor naam
        if (!userFileName) userFileName = defaultName.replace(".csv",""); // fallback
        const fileName = `${userFileName}.csv`; // uiteindelijke bestandsnaam

        /* ======================= OPSLAAN ======================= */
        if (window.showSaveFilePicker) { // moderne API
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [{ description: "CSV bestand", accept: {"text/csv": [".csv"]} }]
            });
            const writable = await fileHandle.createWritable(); // maak schrijfbaar bestand
            await writable.write(csvContent); // schrijf CSV
            await writable.close(); // sluit bestand
        } else { // fallback voor oudere browsers
            const blob = new Blob([csvContent], {type: "text/csv"}); // blob maken
            const url = URL.createObjectURL(blob); // tijdelijke URL
            const a = document.createElement("a"); // anchor element
            a.href = url;
            a.download = fileName; // download attribuut
            document.body.appendChild(a); // toevoegen aan DOM
            a.click(); // trigger download
            document.body.removeChild(a); // opruimen
            URL.revokeObjectURL(url); // memory cleanup
        }

        /* ======================= SUCCESS ======================= */
        status.innerHTML = "✅ CSV succesvol geëxporteerd als " + fileName;
        status.style.color = "green";

    } catch (error) {
        /* ======================= FOUTAFHANDELING ======================= */
        console.error(error);
        status.innerHTML = "❌ Export geannuleerd of mislukt.";
        status.style.color = "red";
    }
});
