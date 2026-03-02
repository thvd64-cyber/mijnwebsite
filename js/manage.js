// ======================= manage.js v1.3.3 =======================
// Beheer module: Hoofd + Ouders + Partner + Kinderen + Broer/Zus
// Production hardened: null-safe + selectedHoofdId state + header fix
// Visualisatie: HoofdID → VHoofdID / MHoofdID / PHoofdID → KindID → PKPartnerID → BZID → BZPartnerID
// =================================================================
(function(){ // IIFE start → voorkomt globale vervuiling
'use strict'; // strikte modus

// =======================
// DOM-elementen
// =======================
const tableBody   = document.querySelector('#manageTable tbody'); // tbody referentie
const theadRow    = document.querySelector('#manageTable thead tr'); // header rij
const addBtn      = document.getElementById('addBtn'); // toevoegen knop
const saveBtn     = document.getElementById('saveBtn'); // opslaan knop
const refreshBtn  = document.getElementById('refreshBtn'); // refresh knop
const searchInput = document.getElementById('searchPerson'); // zoekveld

// =======================
// State
// =======================
let dataset = window.StamboomStorage.get() || []; // dataset laden uit storage
let selectedHoofdId = null; // actieve geselecteerde persoon

// =======================
// Helpers (null-safe)
// =======================
function safe(val){ return val ? String(val).trim() : ''; } // converteer naar string of lege string
function parseDate(d){ 
    if(!d) return new Date(0); // fallback datum
    const parts = d.split('-'); // split op -
    if(parts.length !==3) return new Date(0); // fallback
    return new Date(parts.reverse().join('-')); // dd-mm-jjjj → Date object
}

// =======================
// Kolomdefinitie
// =======================
const COLUMNS = [
    { key: 'Relatie', readonly: true }, // toont relatie label
    { key: 'ID', readonly: true },
    { key: 'Doopnaam', readonly: false },
    { key: 'Roepnaam', readonly: false },
    { key: 'Prefix', readonly: false },
    { key: 'Achternaam', readonly: false },
    { key: 'Geslacht', readonly: false },
    { key: 'Geboortedatum', readonly: false },
    { key: 'Geboorteplaats', readonly: false },
    { key: 'Overlijdensdatum', readonly: false },
    { key: 'Overlijdensplaats', readonly: false },
    { key: 'VaderID', readonly: false },
    { key: 'MoederID', readonly: false },
    { key: 'PartnerID', readonly: false },
    { key: 'Huwelijksdatum', readonly: false },
    { key: 'Huwelijksplaats', readonly: false },
    { key: 'Opmerkingen', readonly: false },
    { key: 'Adres', readonly: false },
    { key: 'ContactInfo', readonly: false },
    { key: 'UR', readonly: false }
];

// =======================
// Build Table Header
// =======================
function buildHeader(){ 
    theadRow.innerHTML = ''; // leegmaken
    COLUMNS.forEach(col=>{
        const th = document.createElement('th'); // nieuwe th
        th.textContent = col.key; // kolomnaam
        theadRow.appendChild(th); // toevoegen aan header
    });
}

// =======================
// Relatie-engine v1.6 (correcte logica)
// =======================
function computeRelaties(data, hoofdId){
    const hoofdID = safe(hoofdId); // null-safe hoofdID
    if(!hoofdID) return [];

    // hoofd persoon
    const hoofd = data.find(p => safe(p.ID) === hoofdID);
    if(!hoofd) return [];

    // directe relaties
    const VHoofdID = safe(hoofd.VaderID);
    const MHoofdID = safe(hoofd.MoederID);
    const PHoofdID = safe(hoofd.PartnerID);

    // Kinderen
    const KindID = data.filter(p =>
        safe(p.VaderID) === hoofdID ||
        safe(p.MoederID) === hoofdID ||
        (PHoofdID && (safe(p.VaderID) === PHoofdID || safe(p.MoederID) === PHoofdID))
    ).map(p => p.ID);

    // Partner van Kind
    const PKPartnerID = data.filter(p =>
        KindID.includes(safe(p.VaderID)) || KindID.includes(safe(p.MoederID))
    ).filter(p => p.PartnerID).map(p => safe(p.PartnerID));

    // Broers/Zussen (excl. hoofd en kinderen)
    const BZID = data.filter(p =>
        (safe(p.VaderID) === VHoofdID || safe(p.MoederID) === MHoofdID) &&
        safe(p.ID) !== hoofdID &&
        !KindID.includes(safe(p.ID))
    ).map(p => p.ID);

    // Partner van Broer/Zus
    const BZPartnerID = data.filter(p =>
        BZID.includes(safe(p.VaderID)) || BZID.includes(safe(p.MoederID))
    ).filter(p => p.PartnerID).map(p => safe(p.PartnerID));

    // Maak flat lijst met relatie labels
    return data.map(p=>{
        const pid = safe(p.ID);
        const clone = {...p};
        clone.Relatie = '';
        clone._priority = 99;

        if(pid === hoofdID){ clone.Relatie='HoofdID'; clone._priority=1; }
        else if(pid === VHoofdID){ clone.Relatie='VHoofdID'; clone._priority=0; }
        else if(pid === MHoofdID){ clone.Relatie='MHoofdID'; clone._priority=0; }
        else if(pid === PHoofdID){ clone.Relatie='PHoofdID'; clone._priority=2; }
        else if(KindID.includes(pid)){ clone.Relatie='KindID'; clone._priority=3; }
        else if(PKPartnerID.includes(pid)){ clone.Relatie='PKPartnerID'; clone._priority=3; }
        else if(BZID.includes(pid)){ clone.Relatie='BZID'; clone._priority=4; }
        else if(BZPartnerID.includes(pid)){ clone.Relatie='BZPartnerID'; clone._priority=4; }

        return clone;
    }).sort((a,b)=>a._priority - b._priority); // sorteer voor visualisatie
}

// =======================
// Render Table v1.3.3 (boomstructuur)
// =======================
function renderTable(dataset){
    if(!selectedHoofdId){ showPlaceholder('Selecteer een persoon'); return; }

    const contextData = computeRelaties(dataset, selectedHoofdId);
    if(!contextData.length){ showPlaceholder('Geen personen gevonden'); return; }

    tableBody.innerHTML = '';
    const lookupByID = {};
    contextData.forEach(p => { lookupByID[p.ID] = p; }); // snelle lookup

    // queue voor render volgorde
    const renderQueue = [];

    // Hoofd
    const hoofd = contextData.find(p => p.Relatie==='HoofdID');
    if(hoofd) renderQueue.push(hoofd);

    // Ouders
    contextData.filter(p => p.Relatie==='VHoofdID'||p.Relatie==='MHoofdID').forEach(p=>renderQueue.push(p));

    // Partner hoofd
    contextData.filter(p => p.Relatie==='PHoofdID').forEach(p=>renderQueue.push(p));

    // Kinderen + PartnerKind
    contextData.filter(p => p.Relatie==='KindID').forEach(kind=>{
        renderQueue.push(kind);
        const pk = contextData.find(p => p.Relatie==='PKPartnerID' &&
                                         (p.VaderID===kind.ID||p.MoederID===kind.ID||safe(p.PartnerID)===kind.ID));
        if(pk) renderQueue.push(pk);
    });

    // Broers/Zussen + PartnerBroerZus
    contextData.filter(p => p.Relatie==='BZID').forEach(sib=>{
        renderQueue.push(sib);
        const bzPartner = contextData.find(p => p.Relatie==='BZPartnerID' &&
                                                (p.VaderID===sib.ID||p.MoederID===sib.ID||safe(p.PartnerID)===sib.ID));
        if(bzPartner) renderQueue.push(bzPartner);
    });

    // render elke rij
    renderQueue.forEach(p=>{
        const tr = document.createElement('tr');
        if(p.Relatie) tr.classList.add(`rel-${p.Relatie.toLowerCase()}`);
        COLUMNS.forEach(col=>{
            const td = document.createElement('td');
            if(col.readonly){ td.textContent=p[col.key]||''; }
            else{ const input=document.createElement('input'); input.value=p[col.key]||''; input.dataset.field=col.key; td.appendChild(input); }
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
}

// =======================
// Placeholder
// =======================
function showPlaceholder(msg){
    tableBody.innerHTML='';
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = COLUMNS.length;
    td.textContent = msg;
    td.style.textAlign='center';
    tr.appendChild(td);
    tableBody.appendChild(tr);
}

// =======================
// Live Search
// =======================
function liveSearch(){
    const term = safe(searchInput.value).toLowerCase();
    document.getElementById('searchPopup')?.remove();
    if(!term) return;

    const results = dataset.filter(p =>
        safe(p.ID).toLowerCase().includes(term) ||
        safe(p.Roepnaam).toLowerCase().includes(term) ||
        safe(p.Achternaam).toLowerCase().includes(term)
    );

    const rect = searchInput.getBoundingClientRect();
    const popup = document.createElement('div');
    popup.id = 'searchPopup';
    popup.style.position = 'absolute';
    popup.style.background = '#fff';
    popup.style.border = '1px solid #999';
    popup.style.zIndex = 1000;
    popup.style.top = rect.bottom + window.scrollY + 'px';
    popup.style.left = rect.left + window.scrollX + 'px';
    popup.style.width = rect.width + 'px';
    popup.style.maxHeight = '200px';
    popup.style.overflowY = 'auto';

    results.forEach(p=>{
        const row = document.createElement('div');
        row.textContent = `${p.ID} | ${p.Roepnaam} | ${p.Achternaam}`;
        row.style.padding='5px'; row.style.cursor='pointer';
        row.addEventListener('click', ()=>{
            selectedHoofdId = safe(p.ID);
            popup.remove();
            renderTable(dataset);
        });
        popup.appendChild(row);
    });

    if(results.length===0){ 
        const row = document.createElement('div'); 
        row.textContent='Geen resultaten'; 
        row.style.padding='5px'; 
        popup.appendChild(row); 
    }

    document.body.appendChild(popup);
}

// =======================
// Add / Save / Refresh
// =======================
function addPersoon(){ 
    const nieuw={}; 
    COLUMNS.forEach(col=>nieuw[col.key]=''); // lege velden
    nieuw.ID = window.genereerCode(nieuw,dataset); // genereer unieke ID
    dataset.push(nieuw);
    selectedHoofdId = nieuw.ID;
    window.StamboomStorage.set(dataset);
    renderTable(dataset);
}

function saveDataset(){
    const rows = tableBody.querySelectorAll('tr');
    const nieuweDataset = [];
    const idSet = new Set();

    rows.forEach(tr=>{
        const persoon = {};
        COLUMNS.forEach((col,index)=>{
            const cell = tr.cells[index];
            if(col.readonly){ if(col.key==='ID') persoon.ID = safe(cell.textContent); }
            else{ const input=cell.querySelector('input'); persoon[col.key]=input?input.value.trim():''; }
        });
        if(!persoon.ID) throw new Error('ID ontbreekt');
        if(idSet.has(persoon.ID)) throw new Error(`Duplicate ID: ${persoon.ID}`);
        idSet.add(persoon.ID);
        nieuweDataset.push(persoon);
    });

    dataset = nieuweDataset;
    window.StamboomStorage.set(dataset);
    alert('Dataset succesvol opgeslagen');
}

function refreshTable(){
    dataset = window.StamboomStorage.get() || [];
    renderTable(dataset);
}

// =======================
// Init
// =======================
buildHeader(); // bouw header
renderTable(dataset); // render tabel
searchInput.addEventListener('input', liveSearch);
addBtn.addEventListener('click', addPersoon);
saveBtn.addEventListener('click', saveDataset);
refreshBtn.addEventListener('click', refreshTable);

// =======================
// Sluit popup bij klik buiten
// =======================
document.addEventListener('click', e=>{
    const popup=document.getElementById('searchPopup');
    if(popup && !popup.contains(e.target) && e.target!==searchInput) popup.remove();
});

})();
