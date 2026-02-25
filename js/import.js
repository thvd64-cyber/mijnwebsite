// =======================================
// import.js
// CSV import met PapaParse
// Ondersteunt automatische delimiter detectie
// Ondersteunt lege cellen (;;)
// Ondersteunt Excel CSV UTF-8
// Slaat data op via StamboomStorage
// =======================================

// Voeg click event toe aan import knop
document.getElementById("importBtn").addEventListener("click", function () { // start import wanneer gebruiker op knop klikt

    const status = document.getElementById("importStatus"); // element voor statusmeldingen

    try {

        // Controleer of storage beschikbaar is
        if (typeof StamboomStorage === "undefined") { // check of storage.js geladen is
            status.innerHTML = "❌ storage.js niet geladen"; // toon foutmelding
            status.style.color = "red"; // kleur rood bij fout
            return; // stop uitvoering
        }

        // Haal file input op
        const fileInput = document.getElementById("importFile"); // file input element
        const file = fileInput.files[0]; // eerste geselecteerde file

        if (!file) { // als geen file geselecteerd
            status.innerHTML = "❌ Selecteer eerst een CSV bestand"; // toon fout
            status.style.color = "red"; // kleur rood
            return; // stop uitvoering
        }

        // Toon bezig melding
        status.innerHTML = "⏳ Importeren..."; // toon bezig status
        status.style.color = "blue"; // blauw tijdens verwerking

        // Gebruik PapaParse om CSV te lezen
        Papa.parse(file, {

            header: true, // eerste rij bevat kolomnamen

            skipEmptyLines: true, // sla lege regels over

            dynamicTyping: false, // alles als tekst bewaren (veilig voor ID's)

            delimiter: "", // auto detect delimiter (PapaParse detecteert automatisch ; , of tab)

            quoteChar: '"', // herken quotes correct

            encoding: "UTF-8", // correct voor Excel UTF-8

            complete: function (results) { // wordt uitgevoerd wanneer parsing klaar is

                let newData = []; // array voor nieuwe records

                results.data.forEach(row => { // loop door alle geïmporteerde rijen

                    let obj = {}; // nieuw object per persoon

                    Object.keys(row).forEach(key => { // loop door alle kolommen

                        obj[key.trim()] = row[key] !== null ? String(row[key]).trim() : ""; // zet waarde of lege string

                    });

                    newData.push(obj); // voeg toe aan dataset

                });

                // haal bestaande data op
                let existingData = StamboomStorage.get ? StamboomStorage.get() : []; // laad huidige storage

                // combineer datasets
                let combinedData = existingData.concat(newData); // voeg nieuwe data toe

                // sla op in storage
                if (StamboomStorage.set) StamboomStorage.set(combinedData); // opslaan

                // succesmelding
                status.innerHTML = "✅ " + newData.length + " records geïmporteerd"; // toon aantal geïmporteerde records
                status.style.color = "green"; // groen bij succes

                // console debug info
                console.log("Import succesvol:", newData); // toon geïmporteerde data

            },

            error: function (error) { // als parsing fout geeft

                status.innerHTML = "❌ CSV leesfout"; // toon foutmelding
                status.style.color = "red"; // rood bij fout
                console.error(error); // toon fout in console

            }

        });

    } catch (error) { // vang onverwachte fouten

        status.innerHTML = "❌ Import mislukt"; // toon foutmelding
        status.style.color = "red"; // rood
        console.error(error); // log fout

    }

});
