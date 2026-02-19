// =======================================
// create.js
// Beheer van de create-pagina: toevoegen van eerste persoon
// =======================================

// Gebruik sessionStorage zodat data verdwijnt bij sluiten van het tabblad
let stamboomData = JSON.parse(sessionStorage.getItem('stamboomData') || '[]');

const form = document.getElementById('addPersonForm');
const statusMessage = document.getElementById('statusMessage');

// =======================
// ID-generator
// =======================
function genereerCode(doopnaam, roepnaam, achternaam, geslacht) {
    return (doopnaam[0] || '') + (roepnaam[0] || '') + (achternaam[0] || '') + (geslacht[0] || 'X') + Date.now();
}

// =======================
// Form submit handler
// =======================
form.addEventListener('submit', function(e) {
    e.preventDefault();

    const doopnaam = document.getElementById('doopnaam').value.trim();
    const roepnaam = document.getElementById('roepnaam').value.trim();
    const prefix = document.getElementById('prefix').value.trim();
    const achternaam = document.getElementById('achternaam').value.trim();
    const geboorte = document.getElementById('geboorte').value;
    const geslacht = document.getElementById('geslacht').value;

    const uniekeID = genereerCode(doopnaam, roepnaam, achternaam, geslacht);

    // Vul alle kolommen, lege velden met '' of null
    const person = {
        ID: uniekeID,
        Relatie: 'Hoofd-ID',
        Doopnaam: doopnaam,
        Roepnaam: roepnaam,
        Prefix: prefix,
        Achternaam: achternaam,
        Geslacht: geslacht,
        Geboortedatum: geboorte,
        Geboorteplaats: '',
        Overlijdensdatum: '',
        Overlijdensplaats: '',
        VaderID: null,
        MoederID: null,
        PartnerID: null,
        Huwelijksdatum: '',
        Huwelijksplaats: '',
        Opmerkingen: '',
        Adres: '',
        ContactInfo: '',
        URL: ''
    };

    stamboomData.push(person);
    sessionStorage.setItem('stamboomData', JSON.stringify(stamboomData));

    form.reset();

    // Statusmelding
    statusMessage.style.display = 'block';
    statusMessage.style.backgroundColor = '#d4edda';
    statusMessage.style.color = '#155724';
    statusMessage.textContent = `${doopnaam} is toegevoegd!`;

    setTimeout(() => { statusMessage.style.display = 'none'; }, 3000);

    // Optioneel: automatisch naar Manage-pagina
    // window.location.href = '../manage/manage.html';
});
