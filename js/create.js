// =======================================
// create.js
// Beheer van de create-pagina: toevoegen van eerste persoon
// =======================================

// Haal bestaande stamboomdata op of start met lege array
let stamboomData = JSON.parse(localStorage.getItem('stamboomData') || '[]');

// Elementen
const form = document.getElementById('addPersonForm');
const statusMessage = document.getElementById('statusMessage');

// Eenvoudige ID-generator
function genereerCode(doopnaam, roepnaam, achternaam, geslacht) {
    // Bijvoorbeeld: eerste letters + timestamp
    const code = (doopnaam[0] || '') + (roepnaam[0] || '') + (achternaam[0] || '') + geslacht[0] + Date.now();
    return code.toUpperCase();
}

// Voeg persoon toe bij submit
form.addEventListener('submit', function(e){
    e.preventDefault();

    const doopnaam = document.getElementById('doopnaam').value;
    const roepnaam = document.getElementById('roepnaam').value;
    const prefix = document.getElementById('prefix').value;
    const achternaam = document.getElementById('achternaam').value;
    const geboorte = document.getElementById('geboorte').value;
    const geslacht = document.getElementById('geslacht').value;

    const uniekeID = genereerCode(doopnaam, roepnaam, achternaam, geslacht);

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
    localStorage.setItem('stamboomData', JSON.stringify(stamboomData));

    // Reset formulier
    form.reset();

    // Toon statusmelding
    statusMessage.style.display = 'block';
    statusMessage.style.backgroundColor = '#d4edda';
    statusMessage.style.color = '#155724';
    statusMessage.textContent = `${doopnaam} is toegevoegd!`;

    // Verberg na 3 seconden
    setTimeout(() => { statusMessage.style.display = 'none'; }, 3000);
});
