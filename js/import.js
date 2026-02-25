// =======================================
// import.js
// Importeer stamboomData vanuit CSV
// CSV wordt verwerkt en toegevoegd aan de dataset
// Wijzigingen opslaan via StamboomStorage.set(dataset)
// =======================================

// Voeg click event toe aan import knop
document.getElementById("importBtn").addEventListener("click", async function () {

    // Status element voor berichten aan de gebruiker
    const status = document.getElementById("importStatus");

    try {

        // -------------------------------
        // Controleer of StamboomStorage bestaat
        // -------------------------------
        if (typeof StamboomStorage === "undefined") { // Reference check
            status.innerHTML = "❌ StamboomStorage is niet beschikbaar. Laad eerst storage.js!";
            status.style.color = "red";
            console.error("StamboomStorage is undefined. Zorg dat storage.js vóór import.js geladen wordt.");
            return; // Stop de functie als storage niet bestaat
        }

        // -------------------------------
        // Gebruik bestand uit file input
        // -------------------------------
        const fileInput = document.getElementById("importFile"); // Haal de file input op
        const file = fileInput.files[0]; // Pak het eerste bestand in de input
        if (!file) { // Controleer of de gebruiker daadwerkelijk een bestand heeft geselecteerd
            status.innerHTML = "❌ Geen bestand geselecteerd."; // Toon foutmelding
            status.style.color = "red"; // Rood voor fout
            return; // Stop de functie
        }

        // -------------------------------
        // CSV lezen met FileReader
        // -------------------------------
        const reader = new FileReader(); // Maak een nieuwe FileReader aan
        reader.onload = function(e) {
            const text = e.target.result; // De inhoud van het CSV-bestand als tekst

            // ======================= CSV verwerken met automatische delimiter =======================
function detectDelimiter(csvText) {
    const firstLine = csvText.split("\n")[0]; // neem header
    const delimiters = [';', ',', '\t']; // mogelijke delimiters
    let maxCount = 0, chosen = ',';
    delimiters.forEach(d => {
        const count = firstLine.split(d).length;
        if (count > maxCount) { maxCount = count; chosen = d; }
    });
    return chosen;
}

const delimiter = detectDelimiter(text); // detecteer delimiter automatisch

let newData = []; // array voor nieuwe records
text.split("\n").map(l => l.trim()).filter(l => l.length > 0).forEach((line, index) => {
    if (index === 0) return; // skip header
    // Regex split die alleen scheiding op delimiter buiten quotes doet
    const values = line.match(new RegExp(`(".*?"|[^${delimiter}]+)(?=${delimiter}|$)`, "g")).map(v => v.replace(/^"(.*)"$/, '$1').trim());
    const headers = text.split("\n")[0].split(delimiter).map(h => h.trim()); // header keys
    let obj = {};
    headers.forEach((header, i) => obj[header] = values[i] ? values[i].trim() : "");
    newData.push(obj);
});
            // -------------------------------
            // Combineren met bestaande data
            // -------------------------------
            let existingData = StamboomStorage.get ? StamboomStorage.get() : []; // Haal bestaande dataset op (of lege array)
            let combinedData = existingData.concat(newData); // Voeg nieuwe data toe aan bestaande
            if (StamboomStorage.set) StamboomStorage.set(combinedData); // Sla gecombineerde dataset op in centrale storage

            // -------------------------------
            // Statusmelding
            // -------------------------------
            status.innerHTML = "✅ CSV succesvol geïmporteerd en opgeslagen."; // Toon succesmelding
            status.style.color = "green"; // Groen voor succes
        };
        reader.readAsText(file); // Start het uitlezen van het CSV-bestand

    } catch (error) {

        // Fallback voor onverwachte fouten
        status.innerHTML = "❌ Import mislukt."; // Toon foutmelding
        status.style.color = "red"; // Rood voor fout
        console.error(error); // Log de fout in console voor debugging
    }
});
