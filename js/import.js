// ===============================
// import.js
// CSV import voor stamboom
// ===============================

// Vereiste kolommen (exacte volgorde)
const requiredHeaders = [
    "ID",
    "Doopnaam",
    "Roepnaam",
    "Prefix",
    "Achternaam",
    "Geslacht",
    "Geboortedatum",
    "Geboorteplaats",
    "Overlijdensdatum",
    "Overlijdensplaats",
    "Vader",
    "Moeder ID",
    "Partner ID",
    "Huwelijksdatum",
    "Huwelijksplaats",
    "Opmerkingen",
    "Adres",
    "ContactInfo",
    "URL"
];

document.getElementById("importBtn").addEventListener("click", function () {

    const fileInput = document.getElementById("csvFile");
    const status = document.getElementById("importStatus");

    if (!fileInput.files.length) {
        status.innerHTML = "❌ Geen bestand geselecteerd.";
        status.style.color = "red";
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {

        const text = e.target.result;
        const rows = text.split("\n").map(r => r.trim()).filter(r => r.length > 0);

        if (rows.length < 2) {
            status.innerHTML = "❌ CSV bevat geen data.";
            status.style.color = "red";
            return;
        }

        const headers = rows[0].split(",").map(h => h.trim());

        // Controleer of headers exact overeenkomen
        const isValid = requiredHeaders.every((header, index) => header === headers[index]);

        if (!isValid) {
            status.innerHTML = "❌ Kolommen komen niet overeen met vereiste structuur.";
            status.style.color = "red";
            return;
        }

        const data = [];

        for (let i = 1; i < rows.length; i++) {

            const values = rows[i].split(",").map(v => v.trim());

            const person = {};

            requiredHeaders.forEach((header, index) => {
                person[header] = values[index] || "";
            });

            data.push(person);
        }

        // Opslaan in localStorage
        localStorage.setItem("stamboomData", JSON.stringify(data));

        status.innerHTML = "✅ CSV succesvol geladen (" + data.length + " personen).";
        status.style.color = "green";
    };

    reader.readAsText(file);
});

