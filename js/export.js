/* ======================= js/export.js v1.2.6 ======================= */
/* CSV-export van stamboomData
   - Eerste 14 kolommen strikt volgens StamboomSchema.fields
   - Alle overige kolommen 1-op-1 overgenomen uit dataset
   - Compatibel met moderne en oudere browsers
   - Inline uitleg bij elke regel
*/

function escapeCSV(value) { 
    // Zorgt dat waarden correct in CSV komen
    if (value == null) return ""; // null of undefined → lege string
    const str = String(value).replace(/"/g, '""'); // dubbele quotes verdubbelen
    return `"${str}"`; // waarde tussen dubbele quotes
}

document.getElementById("exportBtn").addEventListener("click", async function() { 
    // Event listener voor export knop
    const status = document.getElementById("exportStatus"); // element om status te tonen
    const data = StamboomStorage.get(); // haal alle personen uit storage

    if (!data.length) { // check of er data is
        status.innerHTML = "❌ Geen data om te exporteren."; 
        status.style.color = "red"; 
        return; // stop als geen data
    }

    // ======================= HEADER BOUW =======================
    const baseHeaders = window.StamboomSchema.fields.slice(0,14); 
    // eerste 14 kolommen exact volgens schema
    let extraHeaders = []; // array voor extra kolommen

    // bepaal extra kolommen dynamisch uit de eerste persoon die extra data heeft
    const firstPerson = data.find(p => Object.keys(p).length > 14); 
    if(firstPerson) {
        for (let key in firstPerson) {
            if (!baseHeaders.includes(key) && key !== "_extra") {
                extraHeaders.push(key); // voeg alle overige keys toe als extra kolommen
            }
        }
    }

    const headers = baseHeaders.concat(extraHeaders); // totaal 14+extra kolommen

    // CSV content starten met header rij
    let csvContent = headers.map(escapeCSV).join(",") + "\n"; 

    // ======================= RIJEN BOUW =======================
    data.forEach(person => { // loop door alle personen
        const row = []; // nieuwe rij array

        // eerste 14 kolommen volgens schema
        baseHeaders.forEach(h => row.push(escapeCSV(person[h] ?? ""))); 

        // extra kolommen, alles wat niet in de eerste 14 zit
        extraHeaders.forEach(h => row.push(escapeCSV(person[h] ?? ""))); 

        csvContent += row.join(",") + "\n"; // voeg rij toe aan CSV
    });

    // ======================= BESTANDSNAAM =======================
    const now = new Date();
    const defaultName = `stamboom_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}.csv`; 
    // standaard naam YYYYMMDD.csv
    const fileName = defaultName;

    // ======================= EXPORT =======================
    try {
        if (window.showSaveFilePicker) { 
            // moderne browsers
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [{ description: "CSV bestand", accept: {"text/csv": [".csv"]} }]
            });
            const writable = await fileHandle.createWritable();
            await writable.write(csvContent);
            await writable.close();
        } else { 
            // fallback voor oudere browsers
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
