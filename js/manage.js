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
function computeRelaties(data, hoofdId){
    const hoofdIdStr = safe(hoofdId);                          // Null-safe hoofdID
    if(!hoofdIdStr) return [];

    const hoofd = data.find(d => safe(d.ID) === hoofdIdStr);   // Vind hoofd persoon
    if(!hoofd) return [];

    const vaderId   = safe(hoofd.VaderID);
    const moederId  = safe(hoofd.MoederID);
    const partnerId = safe(hoofd.PartnerID);

    return data.map(p=>{
        const clone = {...p};
        const pid = safe(p.ID);
        clone.Relatie = ''; // default leeg

        // ===== Ouders =====
        if(pid === vaderId) clone.Relatie = 'VHoofdID';
        if(pid === moederId) clone.Relatie = 'MHoofdID';

        // ===== Hoofd =====
        if(pid === hoofdIdStr) clone.Relatie = 'HoofdID';

        // ===== Partner hoofd =====
        if(pid === partnerId) clone.Relatie = 'PHoofdID';

        // ===== Kinderen =====
        if(safe(p.VaderID) === hoofdIdStr || safe(p.MoederID) === hoofdIdStr ||
           (partnerId && (safe(p.VaderID) === partnerId || safe(p.MoederID) === partnerId))){
            clone.Relatie = 'KindID';
        }

        // ===== Partner van Kind =====
        const isPK = data.some(k =>
            (safe(k.VaderID) === hoofdIdStr || safe(k.MoederID) === hoofdIdStr) &&
            safe(k.PartnerID) === pid
        );
        if(isPK) clone.Relatie = 'PKPartnerID';

        // ===== Broers/Zussen =====
        const zelfdeVader  = vaderId && safe(p.VaderID) === vaderId;
        const zelfdeMoeder = moederId && safe(p.MoederID) === moederId;
        if(pid!==hoofdIdStr && (zelfdeVader || zelfdeMoeder)){
            clone.Relatie = 'BZID';
        }

        // ===== Partner Broer/Zus =====
        const isBZPartner = data.some(k =>
            (vaderId && safe(k.VaderID)===vaderId || moederId && safe(k.MoederID)===moederId) &&
            pid!==hoofdIdStr &&
            safe(k.PartnerID)===pid
        );
        if(isBZPartner) clone.Relatie = 'BZPartnerID';

        return clone;
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
