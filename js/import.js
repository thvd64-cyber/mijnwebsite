// =======================================
// import.js v1.0.2
// Controleer of CSV de juiste kolommen bevat
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

            // ======================= CSV verwerken met automatische delimiter en lege cellen =======================
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
            let newData = [];
            const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
            const headers = lines[0].split(delimiter).map(h => h.trim()); // header keys

// ======================= HEADER VALIDATOR =======================
const requiredHeaders = [
    "ID",
    "Roepnaam",
    "Prefix",
    "Achternaam",
    "Geboortedatum",
    "VaderID",
    "MoederID",
    "PartnerID"
]; // lijst met verplichte velden

// Zoek ontbrekende kolommen
const missingHeaders = requiredHeaders.filter(h => !headers.includes(h)); 

// Als er kolommen ontbreken → import stoppen
if (missingHeaders.length > 0) {

    status.innerHTML =
        "❌ CSV header fout. Ontbrekende kolommen: " +
        missingHeaders.join(", ");

    status.style.color = "red";

    console.error("CSV header fout. Ontbrekend:", missingHeaders);
    
    return; // stop import
}
            
            lines.slice(1).forEach(line => { // loop over alle regels behalve header
                let values = []; 
                let current = '';
                let insideQuotes = false;

                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') insideQuotes = !insideQuotes; // toggle quotes
                    else if (char === delimiter && !insideQuotes) { // delimiter buiten quotes
                        values.push(current); // voeg huidige waarde toe
                        current = ''; // reset voor volgende cel
                    } else {
                        current += char; // voeg karakter toe aan huidige cel
                    }
                }
                values.push(current); // laatste waarde toevoegen

                // verwijder eventuele quotes rond waarde
                values = values.map(v => v.replace(/^"(.*)"$/, '$1').trim());

                // object aanmaken
                let obj = {};
                headers.forEach((header, i) => obj[header] = values[i] !== undefined ? values[i] : "");
                newData.push(obj); // voeg object toe aan nieuwe data
            });

            // -------------------------------
            // Combineren met bestaande data en ID genereren
            // -------------------------------
            let existingData = StamboomStorage.get ? StamboomStorage.get() : []; // Haal bestaande dataset op (of lege array)

            // Loop over nieuwe data en genereer ID als deze ontbreekt
            newData.forEach(item => {
                if (!item.ID || item.ID.trim() === "") { // Check of ID leeg is
                    // Genereer unieke ID met idGenerator op basis van bestaande dataset + nieuwe data
                    item.ID = window.genereerCode(item, existingData.concat(newData));
                }
            });

            // Voeg nieuwe data toe aan bestaande data
            let combinedData = existingData.concat(newData);

            // Sla gecombineerde dataset op in centrale storage
            if (StamboomStorage.set) StamboomStorage.set(combinedData);

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
