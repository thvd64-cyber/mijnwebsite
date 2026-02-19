// =======================================
// manage.js
// Toon alle personen vanuit sessionStorage met volledige kolommen
// =======================================

let stamboomData = JSON.parse(sessionStorage.getItem('stamboomData') || '[]');
const tableBody = document.querySelector('#manageTable tbody');
const loadBtn = document.getElementById('loadBtn');
const searchInput = document.getElementById('searchPerson');
const saveBtn = document.getElementById('saveBtn');
const refreshBtn = document.getElementById('refreshBtn');
const addBtn = document.getElementById('addBtn');

// Kleurcodering per relatie
function getRowClass(p) {
    switch(p.Relatie) {
        case 'Ouder': return 'ouders';
        case 'Hoofd-ID': return 'hoofd-id';
        case 'Partner': return 'partner';
        case 'Kind': return 'kind';
        case 'Ex-Partner': return 'ex-partner';
        case 'Broer/Zus': return 'broerzus';
        case 'Partner-Kind': return 'partner-kind';
        default: return '';
    }
}

// Alle kolommen
const fields = ['Relatie','ID','Doopnaam','Roepnaam','Prefix','Achternaam','Geslacht',
    'Geboortedatum','Geboorteplaats','Overlijdensdatum','Overlijdensplaats',
    'VaderID','MoederID','PartnerID','Huwelijksdatum','Huwelijksplaats',
    'Opmerkingen','Adres','ContactInfo','URL'];

// =======================
// Tabel renderen
// =======================
function renderTable(data = stamboomData) {
    tableBody.innerHTML = '';

    if(data.length === 0){
        tableBody.innerHTML = '<tr><td colspan="20">Geen personen toegevoegd.</td></tr>';
        return;
    }

    data.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = getRowClass(p);

        fields.forEach(f => {
            const td = document.createElement('td');
            if(f === 'ID' || f === 'Relatie'){
                td.textContent = p[f] || '';
            } else {
                const input = document.createElement('input');
                input.value = p[f] || '';
                input.addEventListener('change', e => { p[f] = e.target.value; });
                td.appendChild(input);
            }
            tr.appendChild(td);
        });

        tableBody.appendChild(tr);
    });
}

// =======================
// Zoek persoon
// =======================
function loadPerson() {
    const term = searchInput.value.toLowerCase();
    const filtered = stamboomData.filter(p =>
        p.ID.toLowerCase() === term ||
        p.Roepnaam?.toLowerCase() === term ||
        p.Doopnaam?.toLowerCase() === term
    );
    if(filtered.length === 0) alert('Persoon niet gevonden');
    else renderTable(filtered);
}

// =======================
// Opslaan
// =======================
function saveData() {
    sessionStorage.setItem('stamboomData', JSON.stringify(stamboomData));
    alert('Wijzigingen opgeslagen!');
}

// =======================
// Voeg lege persoon toe
// =======================
function addNewPerson() {
    const emptyPerson = {};
    fields.forEach(f => emptyPerson[f] = (f === 'VaderID' || f === 'MoederID' || f === 'PartnerID') ? null : '');
    emptyPerson.Relatie = 'Hoofd-ID';
    renderTable([emptyPerson].concat(stamboomData));
}

// Event listeners
loadBtn.addEventListener('click', loadPerson);
saveBtn.addEventListener('click', saveData);
refreshBtn.addEventListener('click', () => renderTable());
addBtn.addEventListener('click', addNewPerson);

// Init render
renderTable();
