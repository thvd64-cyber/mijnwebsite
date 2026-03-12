/* ======================= js/export.js v1.2.5 ======================= */
/* CSV-export van stamboomData inclusief extra kolommen tot veld 22
   - Compatibel met moderne en oudere browsers
   - Veilig gebruik van showSaveFilePicker zonder SecurityError
   - Extra kolommen 15-22 krijgen originele headers indien aanwezig
   - Inline uitleg bij elke regel voor makkelijk onderhoud
*/

function escapeCSV(value) { // functie om waarden correct te escapen voor CSV
    if (value == null) return ""; // null of undefined wordt lege string
    const str = String(value).replace(/"/g, '""'); // dubbele quotes verdubbelen
    return `"${str}"`; // waarde tussen dubbele quotes plaatsen
}

document.getElementById("exportBtn").addEventListener("click", async function () { // click-handler voor export knop
    const status = document.getElementById("exportStatus"); // element om status te tonen
    const data = StamboomStorage.get(); // haal alle personen uit storage

    if (!data.length) { // geen data om te exporteren
        status.innerHTML = "❌ Geen data om te exporteren."; // meld gebruiker
        status.style.color = "red"; // rood tonen
        return; // stop verder uitvoeren
    }

    // ======================= VASTE + EXTRA HEADERS =======================
    const baseHeaders = window.StamboomSchema.fields.slice(0,14); // eerste 14 velden volgens schema
    let extraHeaders = []; // array voor extra kolommen

    // neem originele headers uit _extra van de eerste persoon die _extra heeft
    const firstExtra = data.find(p => p._extra && p._extra.length>0); 
    if(firstExtra) {
        for(let i=0;i<firstExtra._extra.length;i++){
            extraHeaders.push(firstExtra._extra[i] || `Extra${i+15}`); // gebruik originele header of fallback
        }
    }
    // vul aan tot maximaal 8 extra kolommen (totaal 22)
    while(extraHeaders.length<8) extraHeaders.push(`Extra${14+extraHeaders.length+1}`); 

    const headers = baseHeaders.concat(extraHeaders); // totaal 22 kolommen

    // ======================= CSV CONTENT BOUW =======================
    let csvContent = headers.map(escapeCSV).join(",") + "\n"; // eerste rij = headers

    data.forEach(person => { // loop door alle personen
        const row = []; // nieuwe rij array
        // eerste 14 velden
        baseHeaders.forEach(h => row.push(escapeCSV(person[h] ?? ""))); // null/undefined → lege string
        // extra kolommen 15-22
        for(let i=0;i<8;i++){ 
            row.push(escapeCSV(person._extra && person._extra[i] ? person._extra[i] : "")); // lege string indien _extra ontbreekt
        }
        csvContent += row.join(",") + "\n"; // voeg rij toe aan CSV content
    });

    // ======================= BESTANDSNAAM =======================
    const now = new Date(); // huidige datum voor standaard naam
    const defaultName = `stamboom_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}.csv`; // YYYYMMDD
    const fileName = defaultName; // gebruik standaard naam (geen prompt, voorkomt SecurityError)

    try {
        if (window.showSaveFilePicker) { // moderne browsers
            const fileHandle = await window.showSaveFilePicker({ // open file picker
                suggestedName: fileName, // standaard naam
                types: [{ description: "CSV bestand", accept: {"text/csv": [".csv"]} }] // alleen CSV
            });
            const writable = await fileHandle.createWritable(); // open schrijfbare stream
            await writable.write(csvContent); // schrijf CSV content
            await writable.close(); // sluit bestand
        } else { // fallback voor oudere browsers
            const blob = new Blob([csvContent], {type: "text/csv"}); // maak CSV blob
            const url = URL.createObjectURL(blob); // maak tijdelijke URL
            const a = document.createElement("a"); // link element
            a.href = url; // link naar blob
            a.download = fileName; // download naam
            document.body.appendChild(a); // voeg toe aan DOM
            a.click(); // trigger download
            document.body.removeChild(a); // verwijder link
            URL.revokeObjectURL(url); // cleanup
        }

        status.innerHTML = "✅ CSV succesvol geëxporteerd als " + fileName; // succesmelding
        status.style.color = "green"; // groen
    } catch (error) {
        console.error(error); // log fout
        status.innerHTML = "❌ Export geannuleerd of mislukt."; // foutmelding
        status.style.color = "red"; // rood
    }
});
