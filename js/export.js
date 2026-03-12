/* ======================= js/export.js v1.2.1 ======================= */
/* Robuuste CSV-export van stamboomData
   - Exporteert alle velden, inclusief extra kolommen
   - Compatibel met alle browsers
   - Gebruiker kan bestandsnaam kiezen
*/

function escapeCSV(value) {
    if (value == null) return "";
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
}

document.getElementById("exportBtn").addEventListener("click", async function () {
    const status = document.getElementById("exportStatus");
    const data = StamboomStorage.get(); // haalt alle velden op

    if (!data.length) {
        status.innerHTML = "❌ Geen data om te exporteren.";
        status.style.color = "red";
        return;
    }

    // Dynamische headers van alle velden in de dataset
    const headers = Object.keys(data.reduce((acc, obj) => ({...acc, ...obj}), {}));

    // CSV inhoud opbouwen
    let csvContent = headers.map(escapeCSV).join(",") + "\n";

    data.forEach(person => {
        const row = headers.map(h => escapeCSV(person[h] ?? ""));
        csvContent += row.join(",") + "\n";
    });

    // Standaard bestandsnaam
    const now = new Date();
    const defaultName = `stamboom_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}.csv`;
    let userFileName = prompt("Voer bestandsnaam in (zonder .csv):", defaultName.replace(".csv",""));
    if (!userFileName) userFileName = defaultName.replace(".csv",""); 
    const fileName = `${userFileName}.csv`;

    try {
        if (window.showSaveFilePicker) {
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [{ description: "CSV bestand", accept: {"text/csv": [".csv"]} }]
            });
            const writable = await fileHandle.createWritable();
            await writable.write(csvContent);
            await writable.close();
        } else {
            const blob = new Blob([csvContent], {type: "text/csv"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        status.innerHTML = "✅ CSV succesvol geëxporteerd als " + fileName;
        status.style.color = "green";
    } catch (error) {
        console.error(error);
        status.innerHTML = "❌ Export geannuleerd of mislukt.";
        status.style.color = "red";
    }
});
