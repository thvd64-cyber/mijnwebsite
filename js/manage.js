// ======================= manage.js v1.2.3 =======================
// Beheer module: directe relaties (Hoofd + Ouders)
// search, laad, refresh, +Toeveogen, opslaan
// Relatie = visueel Hoofd / Ouder), .4 partner, geen andere personen tonen
// =================================================================
(function(){ // start IIFE – module scope
    'use strict'; // strikte modus aan

    // =======================
    // DOM-elementen
    // =======================
    const tableBody   = document.querySelector('#manageTable tbody'); // tbody van de tabel ophalen
    const theadRow    = document.querySelector('#manageTable thead tr'); // header rij ophalen
    const addBtn      = document.getElementById('addBtn'); // knop 'toevoegen'
    const saveBtn     = document.getElementById('saveBtn'); // knop 'opslaan'
    const refreshBtn  = document.getElementById('refreshBtn'); // knop 'refresh'
    const searchInput = document.getElementById('searchPerson'); // zoekveld input ophalen

    // =======================
    // Dataset
    // =======================
    let dataset = window.StamboomStorage.get() || []; // dataset ophalen uit storage of lege array

    // =======================
    // Kolomdefinitie
    // =======================
    const COLUMNS = [
        { key: 'Relatie', readonly: true }, // visuele relatie kolom
        { key: 'ID', readonly: true }, // unieke ID kolom
        { key: 'Doopnaam', readonly: false }, // editable veld
        { key: 'Roepnaam', readonly: false }, // editable veld
        { key: 'Prefix', readonly: false }, // editable veld
        { key: 'Achternaam', readonly: false }, // editable veld
        { key: 'Geslacht', readonly: false }, // editable veld
        { key: 'Geboortedatum', readonly: false }, // editable veld
        { key: 'Geboorteplaats', readonly: false }, // editable veld
        { key: 'Overlijdensdatum', readonly: false }, // editable veld
        { key: 'Overlijdensplaats', readonly: false }, // editable veld
        { key: 'VaderID', readonly: false }, // editable veld voor vaderID
        { key: 'MoederID', readonly: false }, // editable veld voor moederID
        { key: 'PartnerID', readonly: false }, // editable veld
        { key: 'Huwelijksdatum', readonly: false }, // editable veld
        { key: 'Huwelijksplaats', readonly: false }, // editable veld
        { key: 'Opmerkingen', readonly: false }, // editable veld
        { key: 'Adres', readonly: false }, // editable veld
        { key: 'ContactInfo', readonly: false }, // editable veld
        { key: 'UR', readonly: false } // editable veld
    ];


// =======================
// Event listener koppelen (alleen voor zoek/Laad)
// =======================
searchInput.addEventListener('input', liveSearch); // bij elk type-event → popup wordt bijgewerkt
    
 // =======================
// Relatieberekening (Hoofd + Ouders) – robuust
// =======================
function computeRelaties(data, hoofdId){
    if(!hoofdId) return [];

    // Haal het object van de hoofdpersoon
    const hoofd = data.find(d => d.ID == hoofdId);
    if(!hoofd) return [];

    // ID's van vader, moeder en partner
    const vaderId   = hoofd.VaderID   ? String(hoofd.VaderID)   : null;
    const moederId  = hoofd.MoederID  ? String(hoofd.MoederID)  : null;
    const partnerId = hoofd.PartnerID ? String(hoofd.PartnerID) : null;

    // ✅ Debug: toon hoofd, ouders, partner en dataset IDs
    console.log('Hoofd:', hoofdId, 'Vader:', vaderId, 'Moeder:', moederId, 'Partner:', partnerId, 'Alle IDs in dataset:', data.map(p=>p.ID));

   return data
    .filter(p => {
        const pid = String(p.ID).trim();

        const hoofdStr   = String(hoofdId).trim();
        const vaderStr   = vaderId   ? String(vaderId).trim()   : null;
        const moederStr  = moederId  ? String(moederId).trim()  : null;
        const partnerStr = partnerId ? String(partnerId).trim() : null;

        if(pid === hoofdStr) return true;
        if(vaderStr   && pid === vaderStr) return true;
        if(moederStr  && pid === moederStr) return true;
        if(partnerStr && pid === partnerStr) return true;

        return false;
    })
        .map(p => {
            const clone = { ...p };
            const pid = String(p.ID);

            // Relatie tekst instellen
            if(pid === String(hoofdId)) clone.Relatie = 'Hoofd';
            else if(pid === vaderId || pid === moederId) clone.Relatie = 'Ouder';
            else if(pid === partnerId) clone.Relatie = 'Partner';
            else clone.Relatie = 'Kind'; // uitzondering of overige

            return clone;
        });
}
    // =======================
    // Header
    // =======================
    function buildHeader(){ // bouw de tabelheader
        theadRow.innerHTML = ''; // header leegmaken
        COLUMNS.forEach(col=>{
            const th = document.createElement('th'); // maak nieuwe th aan
            th.textContent = col.key; // zet kolomnaam
            theadRow.appendChild(th); // voeg toe aan theadRow
        });
    }

    // =======================
    // Placeholder
    // =======================
    function showPlaceholder(message){ // toon bericht in tabel als geen data
        tableBody.innerHTML = ''; // tbody leegmaken
        const tr = document.createElement('tr'); // nieuwe rij
        const td = document.createElement('td'); // nieuwe cel
        td.colSpan = COLUMNS.length; // spreid over alle kolommen
        td.textContent = message; // bericht invullen
        td.style.textAlign = 'center'; // centreren
        tr.appendChild(td); // voeg cel toe aan rij
        tableBody.appendChild(tr); // voeg rij toe aan tbody
    }
// =======================
// Tabel renderen
// =======================
function renderTable(data, hoofdId){ // toon data in tabel + relatielogica
    const contextData = computeRelaties(data, hoofdId); // bereken visuele relaties

    tableBody.innerHTML = ''; // tbody leegmaken
    if(!contextData || contextData.length === 0){
        showPlaceholder('Geen personen gevonden'); // placeholder tonen
        return;
    }

    contextData.forEach(p=>{
        const tr = document.createElement('tr'); // nieuwe rij

        // ✅ Stel kleurklasse in op basis van relatie
        if (p.Relatie) tr.classList.add(`rel-${p.Relatie.toLowerCase()}`);

        // Voeg cellen toe
        COLUMNS.forEach(col=>{
            const td = document.createElement('td'); // nieuwe cel
            if(col.readonly){
                td.textContent = p[col.key] || ''; // readonly veld vullen
            } else {
                const input = document.createElement('input'); // maak input aan
                input.value = p[col.key] || ''; // zet waarde
                input.dataset.field = col.key; // dataset veldname
                td.appendChild(input); // voeg input toe
            }
            tr.appendChild(td); // voeg cel toe aan rij
        });

        tableBody.appendChild(tr); // voeg rij toe aan tbody
    });
}
// =======================
// Live search popup (alleen bij zoek/Laad, niet bij Refresh)
// =======================

// Functie: maakt het popup-element aan indien niet aanwezig
function createPopup(){ // maakt of retourneert bestaande popup
    let popup = document.getElementById('searchPopup'); // check of popup bestaat
    if(!popup){
        popup = document.createElement('div'); // nieuw div-element
        popup.id = 'searchPopup'; // id instellen
        popup.style.position = 'absolute'; // positionering
        popup.style.border = '1px solid #999'; // rand
        popup.style.background = '#fff'; // achtergrond
        popup.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)'; // schaduw
        popup.style.zIndex = 1000; // z-index
        popup.style.maxHeight = '200px'; // max hoogte
        popup.style.overflowY = 'auto'; // scroll
        popup.style.display = 'none'; // standaard verborgen
        document.body.appendChild(popup); // voeg toe aan body
    }
    return popup; // retourneer popup
} // einde createPopup – popup element maken indien niet aanwezig

// Functie: toont zoekresultaten in popup onder het inputveld
function showPopup(results, rect){ // render resultaten in popup
    const popup = createPopup();
    popup.innerHTML = ''; // leeg de inhoud

    results.forEach(p=>{
        const row = document.createElement('div'); // rij in popup
        row.style.padding = '5px 10px'; // padding
        row.style.cursor = 'pointer'; // pointer cursor
        row.style.borderBottom = '1px solid #eee'; // onderlijn
        row.textContent = `${p.ID} | ${p.Roepnaam} | ${p.Achternaam} | ${p.Geboortedatum || ''}`; // content

        // Klik: render alleen geselecteerde persoon + relatielogica
        row.addEventListener('click', ()=>{
    renderTable(dataset, p.ID); // ✅ gebruik volledige dataset, niet alleen [p]
    popup.style.display = 'none'; // sluit popup na klik
        });

        popup.appendChild(row); // voeg rij toe aan popup
    });

    if(results.length===0){
        const row = document.createElement('div'); // lege rij
        row.style.padding = '5px 10px';
        row.textContent = 'Geen resultaten'; // toon bericht
        popup.appendChild(row);
    }

    // Positioneer popup onder het inputveld
    popup.style.top = (rect.bottom + window.scrollY) + 'px'; // top
    popup.style.left = (rect.left + window.scrollX) + 'px'; // left
    popup.style.width = rect.width + 'px'; // breedte
    popup.style.display = 'block'; // toon popup
} // einde showPopup – toont zoekresultaten als popup

// Functie: live search voor de popup
function liveSearch(){ // zoek in dataset en toon popup
    const term = searchInput.value.trim().toLowerCase(); // zoekterm
    if(!term){
        createPopup().style.display='none'; // verberg popup als niets is ingevuld
        return;
    }

    // Filter op ID, Roepnaam of Achternaam
    const results = dataset.filter(p =>
        (p.ID && p.ID.toLowerCase().includes(term)) ||
        (p.Roepnaam && p.Roepnaam.toLowerCase().includes(term)) ||
        (p.Achternaam && p.Achternaam.toLowerCase().includes(term))
    );

    const rect = searchInput.getBoundingClientRect(); // positie input
    showPopup(results, rect); // toon resultaten in popup
}

    // =======================
    // Nieuwe persoon toevoegen
    // =======================
    function addPersoon(){ // maakt nieuw persoon object
        const nieuw = {};
        COLUMNS.forEach(col=> nieuw[col.key] = ''); // lege velden
        nieuw.ID = window.genereerCode(nieuw, dataset); // genereer ID
        dataset.push(nieuw); // voeg toe aan dataset
        window.StamboomStorage.set(dataset); // opslaan in storage
        renderTable(dataset, searchInput.value.trim()); // toon in tabel
    }

    // =======================
    // Dataset opslaan
    // =======================
    function saveDataset(){ // lees tabel en sla dataset op
        const rows = tableBody.querySelectorAll('tr'); // alle rijen
        const nieuweDataset = [];
        const idSet = new Set(); // set voor duplicate check

        rows.forEach(tr=>{
            const persoon = {};
            COLUMNS.forEach((col,index)=>{
                const cell = tr.cells[index]; // huidige cel
                if(col.readonly){
                    if(col.key === 'ID') persoon.ID = cell.textContent.trim(); // ID opslaan
                } else {
                    const input = cell.querySelector('input'); // input veld
                    persoon[col.key] = input ? input.value.trim() : ''; // waarde
                }
            });

            if(!persoon.ID) throw new Error('ID ontbreekt'); // check ID
            if(idSet.has(persoon.ID)) throw new Error(`Duplicate ID: ${persoon.ID}`); // check duplicaat
            idSet.add(persoon.ID); 
            nieuweDataset.push(persoon); // voeg toe aan nieuwe dataset
        });

        dataset = nieuweDataset; // vervang dataset
        window.StamboomStorage.set(dataset); // opslaan
        alert('Dataset succesvol opgeslagen'); // feedback
    }

    // =======================
    // Laad / Refresh
    // =======================
    function refreshTable(){ // laad dataset opnieuw en render
        dataset = window.StamboomStorage.get() || []; // dataset ophalen
        renderTable(dataset, searchInput.value.trim()); // render tabel
    }

       // =======================
    // Initialisatie
    // =======================
    buildHeader(); // maak tabelheader
    renderTable(dataset, searchInput.value.trim()); // render tabel bij load

    addBtn.addEventListener('click', addPersoon); // knop add
    saveBtn.addEventListener('click', saveDataset); // knop save
    refreshBtn.addEventListener('click', refreshTable); // knop refresh
    searchInput.addEventListener('input', liveSearch); // live search bij typen
    
// =======================
// Popup sluiten bij klik buiten
// =======================
document.addEventListener('click', e => { // klik buiten listener
    const popup = document.getElementById('searchPopup'); // haal popup op
    if (popup && !popup.contains(e.target) && e.target !== searchInput) {
        popup.style.display = 'none'; // sluit popup
    }
});

})(); // einde IIFE
