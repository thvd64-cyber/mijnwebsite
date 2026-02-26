// ======================= CREATE.JS – lean integratie met storage.js =======================
// Referenties naar DOM elementen
const form = document.getElementById('addPersonForm');
const previewDiv = document.getElementById('personPreview');
const previewContent = document.getElementById('previewContent');
const confirmBtn = document.getElementById('confirmBtn');
const warningMessage = document.getElementById('warningMessage');
// ======================= ID GENERATOR =======================
function genereerCode(doopnaam, roepnaam, achternaam, geslacht) {
    return (doopnaam[0]||'') + (roepnaam[0]||'') + (achternaam[0]||'') + (geslacht[0]||'X') + Date.now();
}
// ======================= FORM SUBMIT =======================
form.addEventListener('submit', function(e){
    e.preventDefault();
    const dataset = StamboomStorage.get(); // haal dataset via storage
    // Controleer of er al data is
    if(dataset.length > 0){
        warningMessage.textContent = "Er staat al een persoon in de stamboom. Nieuwe invoer kan hier niet toegevoegd worden.";
        warningMessage.style.display = 'block';
        previewDiv.style.display = 'none';
        return;
document.addEventListener('DOMContentLoaded', () => { // Wacht tot de volledige DOM is geladen voordat je elementen ophaalt

    // ======================= DOM ELEMENTEN =======================
    const form = document.getElementById('persoonForm');          // Formulier waar gebruiker gegevens invult
    const previewDiv = document.getElementById('personPreview');  // Container voor JSON preview
    const previewContent = document.getElementById('previewContent'); // <pre> element waar preview wordt getoond
    const confirmBtn = document.getElementById('confirmBtn');     // Knop om bevestiging te geven en data op te slaan
    const warningMessage = document.getElementById('warningMessage'); // Div voor waarschuwingen

    // ======================= ID GENERATOR =======================
    function genereerCode(doopnaam, roepnaam, achternaam, geslacht) {
        // Unieke ID: eerste letters van doopnaam, roepnaam, achternaam, geslacht, + timestamp
        return (doopnaam[0] || '') + (roepnaam[0] || '') + (achternaam[0] || '') + (geslacht[0] || 'X') + Date.now();
    }
    // Formulierwaarden
    const doopnaam = document.getElementById('doopnaam').value.trim();
    const roepnaam = document.getElementById('roepnaam').value.trim();
    const prefix = document.getElementById('prefix').value.trim();
    const achternaam = document.getElementById('achternaam').value.trim();
    const geboorte = document.getElementById('geboortedatum').value;
    const geslacht = document.getElementById('geslacht').value;
    // Nieuwe persoon
    const person = {
        ID: genereerCode(doopnaam, roepnaam, achternaam, geslacht),
        Doopnaam: doopnaam,
        Roepnaam: roepnaam,
        Prefix: prefix,
        Achternaam: achternaam,
        Geslacht: geslacht,
        Geboortedatum: geboorte,
        Relatie: 'Hoofd-ID',
        PartnerID: []
    };
    // Preview tonen
    previewContent.textContent = JSON.stringify(person, null, 2);
    previewDiv.style.display = 'block';
});
// ======================= CONFIRM HANDLER =======================
confirmBtn.addEventListener('click', function(){
    const person = JSON.parse(previewContent.textContent);
    StamboomStorage.add(person); // voeg toe via centrale storage
    // Ga naar Manage
    window.location.href = "https://thvd64-cyber.github.io/MyFamTreeCollab/stamboom/manage.html";
});

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
