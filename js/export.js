/* ======================= js/export.js v1.2.8 ======================= */
/* Robuuste dynamische CSV-export van stamboomData
   - Exporteert alle kolommen, inclusief extra kolommen (_extra of andere)
   - Veilig voor showSaveFilePicker
   - Fallback naar traditionele download via <a> als API niet beschikbaar
   - Inline uitleg per regel
*/

document.getElementById("exportBtn").addEventListener("click", async function () {
    const status = document.getElementById("exportStatus"); // element voor meldingen naar gebruiker

    try {
        /* ======================= DATA OPHALEN ======================= */
        const data = window.StamboomStorage.get(); // haal volledige dataset op via storage.js
        if(!data || data.length === 0){ // check of er data is
            status.innerHTML = "❌ Geen data om te exporteren."; 
            status.style.color = "red";
            return;
        }

        /* ======================= DYNAMISCHE HEADERS ======================= */
        // combineer alle object keys om volledige set kolommen te krijgen
        const headers = Object.keys(data.reduce((acc,obj) => ({...acc,...obj}), {}));

        /* ======================= CSV ESCAPE FUNCTIE ======================= */
        function escapeCSV(value){
            if(value == null) return ""; // null of undefined -> lege string
            const str = String(value).replace(/"/g, '""'); // dubbele aanhalingstekens escapen
            return `"${str}"`; // alles tussen dubbele quotes
        }

        /* ======================= CSV INHOUD OPBOUWEN ======================= */
        let csvContent = headers.map(escapeCSV).join(",") + "\n"; // eerste regel = headers
        data.forEach(person => {
            // alle kolommen dynamisch mappen naar CSV
            const row = headers.map(h => escapeCSV(person[h] ?? "")); // nullish coalescing naar lege string
            csvContent += row.join(",") + "\n"; // voeg regel toe
        });

        /* ======================= BESTANDSNAAM ======================= */
        const now = new Date(); // datum/tijd voor standaard bestandsnaam
        const defaultName = `stamboom_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}.csv`;
        let userFileName = prompt("Voer bestandsnaam in (zonder .csv):", defaultName.replace(".csv",""));
        if(!userFileName) userFileName = defaultName.replace(".csv",""); // fallback naar standaard
        const fileName = `${userFileName}.csv`; // voeg extensie toe

        /* ======================= BESTAND OPSLAAN ======================= */
        if(window.showSaveFilePicker){ // moderne API
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [{ description: "CSV bestand", accept: {"text/csv":[".csv"]} }]
            });
            const writable = await fileHandle.createWritable(); // open schrijfbare stream
            await writable.write(csvContent); // schrijf CSV
            await writable.close(); // sluit stream
        } else { // fallback oudere browsers
            const blob = new Blob([csvContent], {type:"text/csv"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click(); // trigger download
            document.body.removeChild(a);
            URL.revokeObjectURL(url); // release memory
        }

        /* ======================= SUCCES ======================= */
        status.innerHTML = `✅ CSV succesvol geëxporteerd als ${fileName}`;
        status.style.color = "green";
        console.log("CSV export completed:", data);

    } catch(error) {
        /* ======================= FOUTAFHANDELING ======================= */
        console.error(error);
        status.innerHTML = "❌ Export mislukt of geannuleerd.";
        status.style.color = "red";
    }
});
