// =======================================
// import.js
// Importeer stamboomData vanuit CSV
// CSV wordt verwerkt en toegevoegd aan de dataset
// Wijzigingen opslaan via StamboomStorage.set(dataset)
// Locatie: sectie // R/U = Read & Update
// =======================================

// Voeg click event toe aan import knop
document.getElementById("importBtn").addEventListener("click", async function () {

    // Status element voor berichten aan de gebruiker
    const status = document.getElementById("importStatus");

    try {

        // Open file picker om CSV te selecteren
        const [fileHandle] = await window.showOpenFilePicker({
            types: [{ description: "CSV bestand", accept: { "text/csv": [".csv"] } }],
            multiple: false
        });

        // Bestand openen en tekst uitlezen
        const file = await fileHandle.getFile();
        const text = await file.text();

        // Split CSV in rijen, eerste rij is headers
        const lines = text.split("\n").map(line => line.trim()).filter(line => line.length > 0);
        const headers = lines.shift().split(","); // Haal eerste rij als headers

        // Nieuwe dataset array
        let newData = [];

        // Loop door elke regel van CSV en maak objecten
        lines.forEach(line => {
            const values = line.split(",");
            let obj = {};
            headers.forEach((header, index) => {
                obj[header] = values[index] ? values[index].trim() : ""; // Map waarden op header
            });
            newData.push(obj); // Voeg persoon toe aan nieuwe dataset
        });

        // Voeg nieuwe data toe aan bestaande StamboomStorage dataset
        let existingData = StamboomStorage.get() || []; // Haal bestaande data op
        let combinedData = existingData.concat(newData); // Voeg CSV data toe

        // Opslaan van gecombineerde dataset
        StamboomStorage.set(combinedData);

        // Geef succesbericht
        status.innerHTML = "✅ CSV succesvol geïmporteerd en opgeslagen.";
        status.style.color = "green";

    } catch (error) {
        // Foutmelding indien import mislukt of geannuleerd
        status.innerHTML = "❌ Import geannuleerd of mislukt.";
        status.style.color = "red";
        console.error(error);
    }
});

// =======================
// Functie saveDataset() kan later worden gebruikt
// Om wijzigingen in tabel direct op te slaan via StamboomStorage.set(dataset)
// =======================
