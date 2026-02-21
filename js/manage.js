'use strict';

// =======================
// Configuratie & DOM
// =======================
let stamboomData = JSON.parse(localStorage.getItem('stamboomData') || '[]');
const tableBody = document.querySelector('#manageTable tbody');
const theadRow = document.querySelector('#manageTable thead tr');
const loadBtn = document.getElementById('loadBtn');
const searchInput = document.getElementById('searchPerson');
const saveBtn = document.getElementById('saveBtn');
const addBtn = document.getElementById('addBtn');

// Kolommen dynamisch vanuit schema
const fields = ['Relatie'].concat(window.StamboomSchema.fields);
theadRow.innerHTML = '';
fields.forEach(f => {
    const th = document.createElement('th');
    th.textContent = f;
    theadRow.appendChild(th);
});

// =======================
// Helper: row class
// =======================
function getRowClass(p) {
    if (!p.Relatie || p.Relatie === 'Onbekend') return ''; // geen kleur bij nieuwe rijen
    switch(p.Relatie){
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

// =======================
// Helper: sorteer hiërarchie
// =======================
function sortByHierarchy(data, hoofdID) {
    const result = [];
    const hoofd = data.find(p => p.ID === hoofdID);
    if(!hoofd) return result;

    // Ouders
    data.filter(p => p.ID === hoofd.VaderID || p.ID === hoofd.MoederID)
        .forEach(p => result.push(p));

    // Hoofd
    result.push(hoofd);

    // Partner
    if(hoofd.PartnerID) {
        const partner = data.find(p => p.ID === hoofd.PartnerID);
        if(partner) result.push(partner);
    }

    // Kinderen en partner-kind
    const children = data.filter(p => p.VaderID === hoofd.ID || p.MoederID === hoofd.ID);
    children.forEach(c => {
        result.push(c);
        if(c.PartnerID){
            const cPartner = data.find(p => p.ID === c.PartnerID);
            if(cPartner) result.push(cPartner);
        }
    });

    // Broer/Zus
    const siblings = data.filter(p => p.VaderID === hoofd.VaderID && p.MoederID === hoofd.MoederID && p.ID !== hoofd.ID);
    siblings.forEach(s => result.push(s));

    return result;
}

// =======================
// Render tabel
// =======================
function renderTable(data) {
    tableBody.innerHTML = '';
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
                input.addEventListener('change', e => p[f] = e.target.value);
                td.appendChild(input);
            }
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
}

// =======================
// Clear table
// =======================
function clearTable() {
    tableBody.innerHTML = '';
}

// =======================
// Zoek persoon
// =======================
function loadPerson() {
    clearTable();
    if(stamboomData.length === 0) return alert('Geen data beschikbaar.');

    const term = searchInput.value.trim();
    if(term.length < 3) return alert('Voer minimaal 3 letters/cijfers in.');

    const matches = stamboomData.filter(p =>
        (p.ID && p.ID.toLowerCase().includes(term.toLowerCase())) ||
        (p.Doopnaam && p.Doopnaam.toLowerCase().includes(term.toLowerCase())) ||
        (p.Achternaam && p.Achternaam.toLowerCase().includes(term.toLowerCase()))
    );

    if(matches.length === 0){
        alert('Geen persoon gevonden');
        return;
    }

    // 1 match: direct render
    if(matches.length === 1){
        const hierData = sortByHierarchy(stamboomData, matches[0].ID);
        renderTable(hierData);
        return;
    }

    // Meerdere matches → popup modal
    showPersonSelectionPopup(matches);
}

// =======================
// Popup selectie voor meerdere matches
// =======================
function showPersonSelectionPopup(matches){
    // Maak modal
    let modal = document.createElement('div');
    modal.className = 'modal-popup';
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.background = '#fff';
    modal.style.padding = '20px';
    modal.style.border = '1px solid #333';
    modal.style.zIndex = '1000';
    modal.style.maxHeight = '400px';
    modal.style.overflowY = 'auto';

    const title = document.createElement('h3');
    title.textContent = 'Kies de juiste persoon';
    modal.appendChild(title);

    const list = document.createElement('ul');
    matches.forEach(p => {
        const li = document.createElement('li');
        li.style.cursor = 'pointer';
        li.textContent = `${p.Doopnaam || ''} ${p.Prefix || ''} ${p.Achternaam || ''} (${p.Geboortedatum || ''})`;
        li.addEventListener('click', () => {
            const hierData = sortByHierarchy(stamboomData, p.ID);
            renderTable(hierData);
            document.body.removeChild(modal);
        });
        list.appendChild(li);
    });
    modal.appendChild(list);

    // Sluit knop
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Sluiten';
    closeBtn.addEventListener('click', () => document.body.removeChild(modal));
    modal.appendChild(closeBtn);

    document.body.appendChild(modal);
}

// =======================
// Genereer ID's voor lege velden
// =======================
function generateMissingIDs() {
    const existingIDs = new Set(stamboomData.map(p => p.ID));
    let duplicates = 0;

    stamboomData.forEach(p => {
        if(!p.ID){
            let newID;
            do {
                newID = idGenerator(p.Doopnaam, p.Roepnaam, p.Achternaam, p.Geslacht || '');
            } while(existingIDs.has(newID));
            p.ID = newID;
            existingIDs.add(newID);
        } else {
            if(existingIDs.has(p.ID)) duplicates++;
            existingIDs.add(p.ID);
        }
    });

    if(duplicates > 0){
        alert(`⚠️ Er zijn ${duplicates} dubbele ID(s) gevonden! Controleer de data.`);
    }
}

// =======================
// Opslaan
// =======================
function saveData() {
    generateMissingIDs();
    localStorage.setItem('stamboomData', JSON.stringify(stamboomData));
    alert('Wijzigingen opgeslagen!');
}

// =======================
// Voeg lege persoon toe
// =======================
function addNewPerson() {

    // Controle: maximaal 10 personen tegelijk tonen
    if (stamboomData.length >= 10) {
        alert('Maximaal 10 personen tegelijk toegestaan.');
        return;
    }
    // → voorkomt onbeperkte groei
    // → beschermt tegen dubbele lege invoer
    // → houdt UI overzichtelijk
    // → performance controle

    // Nieuw leeg persoon-object maken via schema
    const empty = window.StamboomSchema.empty();
    // → zorgt voor consistente veldstructuur
    // → voorkomt undefined properties

    // Relatie leeg zetten
    empty.Relatie = '';
    // → geen styling class
    // → neutrale nieuwe invoer

    // Geslacht leeg zetten
    empty.Geslacht = '';
    // → geen default waarde
    // → correcte ID generatie later

    // Tijdelijke unieke ID genereren
    empty.ID = 'TEMP_' + Date.now();
    // → gegarandeerd uniek
    // → voorkomt dubbele matches
    // → onderscheid nieuwe records

    // Nieuwe persoon vooraan plaatsen
    stamboomData.unshift(empty);
    // → nieuwste bovenaan
    // → direct beschikbaar in array

    // Alleen deze persoon tonen
    renderTable([empty]);
    // → tabel wordt eerst leeggemaakt
    // → voorkomt duplicatie
}

// =======================
// Event listeners
// =======================
loadBtn.addEventListener('click', loadPerson);
saveBtn.addEventListener('click', saveData);
addBtn.addEventListener('click', addNewPerson);

// === Pagina start ===
clearTable(); // tabel leeg bij openen

