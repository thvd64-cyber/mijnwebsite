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

// ======================= CSV verwerken met PapaParse =======================
// Zorg dat PapaParse beschikbaar is via <script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"></script> in je HTML

let newData = []; // array voor nieuwe records

Papa.parse(file, {
    header: true, // eerste rij = headers
    skipEmptyLines: true, // lege regels overslaan
    dynamicTyping: false, // alles als string houden
    delimiter: "", // lege string => PapaParse detecteert automatisch
    complete: function(results) {
        // results.data bevat array van objecten
        newData = results.data.map(row => {
            // eventuele lege cellen als lege string forceren
            Object.keys(row).forEach(k => {
                if (row[k] === null || row[k] === undefined) row[k] = "";
                else row[k] = String(row[k]).trim();
            });
            return row;
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
