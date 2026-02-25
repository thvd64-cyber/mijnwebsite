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

            // -------------------------------
            // CSV verwerken naar objecten
            // -------------------------------
            const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0); // Splits regels en verwijder lege
            const headers = lines.shift().split(","); // Eerste regel = headers
            let newData = []; // Array om alle personen in op te slaan
            lines.forEach(line => { // Loop door alle data-regels
                const values = line.split(","); // Splits regel in cellen
                let obj = {}; // Maak een object voor één persoon
                headers.forEach((header, i) => obj[header] = values[i] ? values[i].trim() : ""); // Map elke waarde naar header
                newData.push(obj); // Voeg object toe aan nieuwe dataset
            });

            // -------------------------------
            // Combineren met bestaande data
            // -------------------------------
            let existingData = StamboomStorage.get() || []; // Haal bestaande dataset op (of lege array)
            let combinedData = existingData.concat(newData); // Voeg nieuwe data toe aan bestaande
            StamboomStorage.set(combinedData); // Sla gecombineerde dataset op in centrale storage

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
