// ======================= js/create.js v1.0.1 =======================
// Haal eerste letters van doopnaam, roepnaam, achternaam en geslacht (of ‘X’ als geslacht leeg is).
// Genereer een random 3-cijferig getal tussen 100 en 999.
// Combineer de letters en cijfers tot één string (bijv. JRDV123).
// Retourneer deze string als unieke ID voor de persoon.
// .1 Zorgt ervoor dat de ID 3-cijferige Date.now() variant en geschikt voor 457 miljoen unieke ID’s.
// ==============================================================
// ======================= CREATE.JS – lean integratie met storage.js =======================
document.addEventListener('DOMContentLoaded', () => { // Wacht tot de volledige DOM is geladen voordat je elementen ophaalt

    // ======================= DOM ELEMENTEN =======================
    const form = document.getElementById('persoonForm');          // Formulier waar gebruiker gegevens invult
    const previewDiv = document.getElementById('personPreview');  // Container voor JSON preview
    const previewContent = document.getElementById('previewContent'); // <pre> element waar preview wordt getoond
    const confirmBtn = document.getElementById('confirmBtn');     // Knop om bevestiging te geven en data op te slaan
    const warningMessage = document.getElementById('warningMessage'); // Div voor waarschuwingen

    // ======================= ID GENERATOR =======================
    function genereerCode(doopnaam, roepnaam, achternaam, geslacht) {
        // Unieke ID: eerste letters van doopnaam, roepnaam, achternaam, geslacht, + 3 cijfers
       const letters = (doopnaam[0] || '') + (roepnaam[0] || '') + (achternaam[0] || '') + (geslacht[0] || 'X');
    const cijfers = Math.floor(100 + Math.random() * 900); // random 3-cijferig getal van 100 t/m 999
    return letters + cijfers; // combineer letters + 3 cijfers

    // ======================= FORM SUBMIT HANDLER =======================
    form.addEventListener('submit', function(e){
        e.preventDefault(); // Voorkom dat formulier pagina reloadt

        const dataset = StamboomStorage.get(); // Haal huidige dataset uit centrale storage

        // Controleer of er al data aanwezig is
        if(dataset.length > 0){
            warningMessage.textContent = "Er staat al een persoon in de stamboom. Nieuwe invoer kan hier niet toegevoegd worden."; // waarschuwing tonen
            warningMessage.style.display = 'block'; // waarschuwing zichtbaar maken
            previewDiv.style.display = 'none';       // preview verbergen
            return; // stop verwerking
        }

        // ======================= FORMULIER WAARDEN OPHALEN =======================
        const doopnaam = document.getElementById('doopnaam').value.trim(); // doopnaam
        const roepnaam = document.getElementById('roepnaam').value.trim(); // roepnaam
        const prefix = document.getElementById('prefix').value.trim();     // prefix
        const achternaam = document.getElementById('achternaam').value.trim(); // achternaam
        const geboorte = document.getElementById('geboortedatum').value;   // geboortedatum
        const geslacht = document.getElementById('geslacht').value;        // geslacht

        // ======================= NIEUWE PERSOON OBJECT =======================
        const person = {
            ID: genereerCode(doopnaam, roepnaam, achternaam, geslacht), // unieke identifier
            Doopnaam: doopnaam,   // doopnaam
            Roepnaam: roepnaam,   // roepnaam
            Prefix: prefix,       // prefix
            Achternaam: achternaam, // achternaam
            Geslacht: geslacht,   // geslacht
            Geboortedatum: geboorte, // geboortedatum
            Relatie: 'Hoofd-ID',  // automatisch hoofd
            PartnerID: []         // start met lege partnerlijst
        };

        // ======================= PREVIEW TONEN =======================
        previewContent.textContent = JSON.stringify(person, null, 2); // JSON leesbaar maken in preview
        previewDiv.style.display = 'block'; // preview zichtbaar maken
    });

    // ======================= CONFIRM BUTTON HANDLER =======================
    confirmBtn.addEventListener('click', function(){
        const person = JSON.parse(previewContent.textContent); // haal persoon uit preview
        StamboomStorage.add(person); // voeg persoon toe aan centrale storage
        window.location.href = "https://thvd64-cyber.github.io/MyFamTreeCollab/stamboom/manage.html"; // ga naar Manage pagina
    });

}); // einde DOMContentLoaded
