// ======================================= js/import.js v1.0.4 =======================================
// Drop-in voor schema.js v0.0.2
// Dynamische headers, ID generatie, Migratie oude CSV (extra velden worden genegeerd)
// Inclusief case-insensitive header check en robuuste CSV parsing

document.getElementById("importBtn").addEventListener("click", async function () {

    const status = document.getElementById("importStatus"); // element voor statusmeldingen

    try {

        // -------------------------------
        // Controle of storage beschikbaar is
        // -------------------------------
        if (typeof StamboomStorage === "undefined") {
            status.innerHTML = "❌ StamboomStorage niet beschikbaar. Laad eerst storage.js!";
            status.style.color = "red";
            console.error("StamboomStorage is undefined. Zorg dat storage.js vóór import.js geladen wordt.");
            return;
        }

        // -------------------------------
        // Bestand ophalen uit file input
        // -------------------------------
        const fileInput = document.getElementById("importFile");
        const file = fileInput.files[0];
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
            // CSV splitsen in regels en trimmen
            // -------------------------------
            const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
            if(lines.length < 2){
                status.innerHTML = "❌ CSV bevat geen data.";
                status.style.color = "red";
                return;
            }

            // -------------------------------
            // Header ophalen
            // -------------------------------
            const headers = lines[0].split(delimiter).map(h => h.trim());

            // -------------------------------
            // Controle verplichte velden uit schema (case-insensitive)
            // -------------------------------
            const requiredHeaders = window.StamboomSchema.fields.slice(); // dynamisch uit schema
            const missingHeaders = requiredHeaders.filter(rh => 
                !headers.some(h => h.trim().toLowerCase() === rh.trim().toLowerCase())
            );

            if (missingHeaders.length > 0) {
                status.innerHTML = "❌ CSV header fout. Ontbrekende kolommen: " + missingHeaders.join(", ");
                status.style.color = "red";
                console.error("CSV header fout. Ontbrekend:", missingHeaders);
                console.log("Detected headers:", headers);
                console.log("Required headers:", requiredHeaders);
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
                    if (char === '"') insideQuotes = !insideQuotes; // toggle quotes
                    else if (char === delimiter && !insideQuotes) {
                        values.push(current);
                        current = '';
                    } else {
                        current += char;
                    }
                }
                values.push(current); // laatste waarde toevoegen

                // verwijder quotes rond waarden en trim
                values = values.map(v => v.replace(/^"(.*)"$/, '$1').trim());

                // -------------------------------
                // Maak object volgens schema
                // -------------------------------
                const obj = window.StamboomSchema.empty(); // vult alle velden, default lege strings

                // vul alleen velden die in schema bestaan
                headers.forEach((header, i) => {
                    // match case-insensitive
                    const schemaKey = Object.keys(obj).find(k => k.toLowerCase() === header.toLowerCase());
                    if(schemaKey) obj[schemaKey] = values[i] !== undefined ? values[i] : "";
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
                if(!item.ID || item.ID.trim() === ""){
                    item.ID = window.genereerCode(item, existingData.concat(newData));
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

    } catch (error) {
        status.innerHTML = "❌ Import mislukt.";
        status.style.color = "red";
        console.error(error);
    }
});
