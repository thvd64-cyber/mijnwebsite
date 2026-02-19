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

// Alle kolommen die Manage nodig heeft
const fields = ['ID','Relatie','Doopnaam','Roepnaam','Prefix','Achternaam','Geslacht',
    'Geboortedatum','Geboorteplaats','Overlijdensdatum','Overlijdensplaats',
    'VaderID','MoederID','PartnerID','Huwelijksdatum','Huwelijksplaats',
    'Opmerkingen','Adres','ContactInfo','URL'];

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
    const person = {};
    fields.forEach(f => {
        switch(f){
            case 'ID': person[f] = uniekeID; break;
            case 'Relatie': person[f] = 'Hoofd-ID'; break;
            case 'Doopnaam': person[f] = doopnaam; break;
            case 'Roepnaam': person[f] = roepnaam; break;
            case 'Prefix': person[f] = prefix; break;
            case 'Achternaam': person[f] = achternaam; break;
            case 'Geslacht': person[f] = geslacht; break;
            case 'Geboortedatum': person[f] = geboorte; break;
            case 'VaderID':
            case 'MoederID':
            case 'PartnerID': person[f] = null; break;
            default: person[f] = ''; break;
        }
    });

    stamboomData.push(person);
    sessionStorage.setItem('stamboomData', JSON.stringify(stamboomData));

    form.reset();

    // Statusmelding
    statusMessage.style.display = 'block';
    statusMessage.style.backgroundColor = '#d4edda';
    statusMessage.style.color = '#155724';
    statusMessage.textContent = `${doopnaam} is toegevoegd!`;

    setTimeout(() => { statusMessage.style.display = 'none'; }, 3000);
});
