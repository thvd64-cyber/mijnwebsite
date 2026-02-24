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
