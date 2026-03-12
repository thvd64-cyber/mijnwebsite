// ======================================= js/import.js v1.0.4 =======================================
// Drop-in upgrade v1.0.4: Veilige check StamboomStorage + DOMContentLoaded + inline uitleg

/* ======================= DOM READY INIT ======================= */
document.addEventListener('DOMContentLoaded', () => {

    // Haal de import-knop en status-element op
    const importBtn = document.getElementById("importBtn");
    const status = document.getElementById("importStatus");

    if (!importBtn || !status) {
        console.error("❌ Import knop of status-element niet gevonden op de pagina.");
        return;
    }

    /* ======================= IMPORT CLICK HANDLER ======================= */
    importBtn.addEventListener("click", async function () {

        // -------------------------------
        // Check of StamboomStorage bestaat
        // -------------------------------
        if (typeof window.StamboomStorage === "undefined") {
            status.innerHTML = "❌ StamboomStorage niet beschikbaar. Laad eerst storage.js!";
            status.style.color = "red";
            console.error("StamboomStorage is undefined. Zorg dat storage.js vóór import.js geladen wordt.");
            return; // stop hier
        }

        // -------------------------------
        // Bestand ophalen uit file input
        // -------------------------------
        const fileInput = document.getElementById("importFile");
        const file = fileInput ? fileInput.files[0] : null;

        if (!file) {
            status.innerHTML = "❌ Geen bestand geselecteerd.";
            status.style.color = "red";
            return;
        }

        // -------------------------------
        // CSV lezen met FileReader
        // -------------------------------
        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;

            // -------------------------------
            // Detecteer delimiter automatisch (; , \t)
            // -------------------------------
            function detectDelimiter(csvText) {
                const firstLine = csvText.split("\n")[0];
                const delimiters = [';', ',', '\t'];
                let maxCount = 0, chosen = ',';
                delimiters.forEach(d => {
                    const count = firstLine.split(d).length;
                    if (count > maxCount) { maxCount = count; chosen = d; }
                });
                return chosen;
            }

            const delimiter = detectDelimiter(text);

            // -------------------------------
            // CSV splitsen in regels
            // -------------------------------
            const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
            if (lines.length < 2) {
                status.innerHTML = "❌ CSV bevat geen data.";
                status.style.color = "red";
                return;
            }

            // Header
            const headers = lines[0].split(delimiter).map(h => h.trim());

            // -------------------------------
            // Controle verplichte velden uit schema
            // -------------------------------
            const requiredHeaders = window.StamboomSchema?.fields || [];
            const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
            if (missingHeaders.length > 0) {
                status.innerHTML = "❌ CSV header fout. Ontbrekende kolommen: " + missingHeaders.join(", ");
                status.style.color = "red";
                console.error("CSV header fout. Ontbrekend:", missingHeaders);
                return;
            }

            // -------------------------------
            // Parse CSV naar objecten
            // -------------------------------
            let newData = [];

            lines.slice(1).forEach(line => {
                let values = [];
                let current = '';
                let insideQuotes = false;

                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') insideQuotes = !insideQuotes;
                    else if (char === delimiter && !insideQuotes) {
                        values.push(current);
                        current = '';
                    } else {
                        current += char;
                    }
                }
                values.push(current);

                values = values.map(v => v.replace(/^"(.*)"$/, '$1').trim());

                // Maak object volgens schema
                const obj = window.StamboomSchema?.empty?.() || {};
                headers.forEach((header, i) => {
                    if (header in obj) obj[header] = values[i] !== undefined ? values[i] : "";
                });

                newData.push(obj);
            });

            // -------------------------------
            // Bestaande data ophalen
            // -------------------------------
            let existingData = StamboomStorage.get ? StamboomStorage.get() : [];

            // -------------------------------
            // ID genereren indien leeg
            // -------------------------------
            newData.forEach(item => {
                if (!item.ID || item.ID.trim() === "") {
                    item.ID = window.genereerCode ? window.genereerCode(item, existingData.concat(newData)) : "ID-LEEG";
                }
            });

            // -------------------------------
            // Combineren en opslaan
            // -------------------------------
            const combinedData = existingData.concat(newData);
            if (StamboomStorage.set) StamboomStorage.set(combinedData);

            // -------------------------------
            // Succesmelding
            // -------------------------------
            status.innerHTML = `✅ CSV succesvol geïmporteerd. ${newData.length} rijen toegevoegd.`;
            status.style.color = "green";
            console.log("CSV import completed:", newData);
        };

        reader.readAsText(file);
    });
});
