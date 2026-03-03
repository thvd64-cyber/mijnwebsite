// ======================= manage.js v1.3.6 =======================
// Beheer module: Hoofd + Ouders + Partner + Kinderen + Broer/Zus
// Features:
// - Opslaan: merge met bestaande localStorage
// - Refresh: reload dataset & relaties herberekenen, behoud centrale persoon
// - Live Search: filteren, selecteer centrale persoon, relaties intact
// =================================================================
(function(){
'use strict';

// =======================
// DOM-elementen
// =======================
const tableBody   = document.querySelector('#manageTable tbody'); // referentie tbody
const theadRow    = document.querySelector('#manageTable thead tr'); // header rij
const addBtn      = document.getElementById('addBtn'); // knop nieuwe persoon
const saveBtn     = document.getElementById('saveBtn'); // opslaan knop
const refreshBtn  = document.getElementById('refreshBtn'); // refresh knop
const searchInput = document.getElementById('searchPerson'); // zoekveld

// =======================
// State
// =======================
let dataset = window.StamboomStorage.get() || []; // laad dataset uit localStorage
let selectedHoofdId = null; // centrale geselecteerde persoon (Hoofd)

// =======================
// Helpers (null-safe)
// =======================
function safe(val){ return val ? String(val).trim() : ''; } // converteer naar string of lege string
function parseDate(d){ 
    if(!d) return new Date(0); // fallback
    const parts = d.split('-'); 
    if(parts.length !==3) return new Date(0); 
    return new Date(parts.reverse().join('-')); // dd-mm-jjjj -> Date
}

// =======================
// Kolomdefinitie
// =======================
const COLUMNS = [
    { key: 'Relatie', readonly: true }, 
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
        const th = document.createElement('th'); 
        th.textContent = col.key; 
        theadRow.appendChild(th); 
    });
}

// =======================
// Relatie-engine
// =======================
function computeRelaties(data, hoofdId){
    const hoofdID = safe(hoofdId); 
    if(!hoofdID) return [];

    const hoofd = data.find(p => safe(p.ID) === hoofdID);
    if(!hoofd) return [];

    const VHoofdID = safe(hoofd.VaderID);
    const MHoofdID = safe(hoofd.MoederID);
    const PHoofdID = safe(hoofd.PartnerID);

    const KindID = data.filter(p =>
        safe(p.VaderID) === hoofdID ||
        safe(p.MoederID) === hoofdID ||
        (PHoofdID && (safe(p.VaderID) === PHoofdID || safe(p.MoederID) === PHoofdID))
    ).map(p => p.ID);

    const PKPartnerID = data.filter(p =>
        KindID.includes(safe(p.VaderID)) || KindID.includes(safe(p.MoederID))
    ).filter(p => p.PartnerID).map(p => safe(p.PartnerID));

    const BZID = data.filter(p =>
        (safe(p.VaderID) === VHoofdID || safe(p.MoederID) === MHoofdID) &&
        safe(p.ID) !== hoofdID &&
        !KindID.includes(safe(p.ID))
    ).map(p => p.ID);

    const BZPartnerID = data.filter(p =>
        BZID.includes(safe(p.VaderID)) || BZID.includes(safe(p.MoederID))
    ).filter(p => p.PartnerID).map(p => safe(p.PartnerID));

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
    }).sort((a,b)=>a._priority - b._priority);
}

// =======================
// Render Table
// =======================
function renderTable(dataset){
    if(!selectedHoofdId){ showPlaceholder('Selecteer een persoon'); return; }

    const contextData = computeRelaties(dataset, selectedHoofdId);
    if(!contextData.length){ showPlaceholder('Geen personen gevonden'); return; }

    tableBody.innerHTML = '';
    const renderQueue = [];

    const hoofd = contextData.find(p => p.Relatie==='HoofdID');
    if(hoofd) renderQueue.push(hoofd);

    contextData.filter(p => p.Relatie==='VHoofdID'||p.Relatie==='MHoofdID').forEach(p=>renderQueue.push(p));
    contextData.filter(p => p.Relatie==='PHoofdID').forEach(p=>renderQueue.push(p));

    contextData.filter(p => p.Relatie==='KindID').forEach(kind=>{
        renderQueue.push(kind);
        const pk = contextData.find(p => p.Relatie==='PKPartnerID' &&
                                         (p.VaderID===kind.ID||p.MoederID===kind.ID||safe(p.PartnerID)===kind.ID));
        if(pk) renderQueue.push(pk);
    });

    contextData.filter(p => p.Relatie==='BZID').forEach(sib=>{
        renderQueue.push(sib);
        const bzPartner = contextData.find(p => p.Relatie==='BZPartnerID' &&
                                                (p.VaderID===sib.ID||p.MoederID===sib.ID||safe(p.PartnerID)===sib.ID));
        if(bzPartner) renderQueue.push(bzPartner);
    });

    renderQueue.forEach(p=>{
        const tr = document.createElement('tr');
        if(p.Relatie) tr.classList.add(`rel-${p.Relatie.toLowerCase()}`);
        COLUMNS.forEach(col=>{
            const td = document.createElement('td');
            if(col.readonly){ td.textContent=p[col.key]||''; }
            else{ 
                const input=document.createElement('input'); 
                input.value=p[col.key]||''; 
                input.dataset.field=col.key; 
                td.appendChild(input); 
            }
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
// Add persoon
// =======================
function addPersoon(){ 
    const nieuw={}; 
    COLUMNS.forEach(col=>nieuw[col.key]=''); 
    nieuw.ID = window.genereerCode(nieuw,dataset); 
    dataset.push(nieuw);
    selectedHoofdId = nieuw.ID; 
    window.StamboomStorage.set(dataset); 
    renderTable(dataset);
}

// =======================
// Save (merged) dataset
// =======================
function saveDatasetMerged(){
    try {
        const rows = tableBody.querySelectorAll('tr');
        let bestaandeData = window.StamboomStorage.get() || [];
        const idMap = new Map(bestaandeData.map(p => [p.ID, p]));

        rows.forEach(tr=>{
            const persoon = {};
            COLUMNS.forEach((col,index)=>{
                const cell = tr.cells[index];
                if(col.readonly){ 
                    if(col.key==='ID') persoon.ID = safe(cell.textContent); 
                } else { 
                    const input=cell.querySelector('input'); 
                    persoon[col.key]=input?input.value.trim():''; 
                }
            });

            if(!persoon.ID) throw new Error('ID ontbreekt');

            idMap.set(persoon.ID, {...idMap.get(persoon.ID), ...persoon}); // merge
        });

        const mergedDataset = Array.from(idMap.values());
        dataset = mergedDataset;
        window.StamboomStorage.set(dataset);
        alert('Dataset succesvol opgeslagen (merged met bestaande data)');
    } catch(e){
        alert(`Opslaan mislukt: ${e.message}`);
        console.error(e);
    }
}

// =======================
// Refresh Table
// =======================
function refreshTable(){
    dataset = window.StamboomStorage.get() || [];
    if(!selectedHoofdId && dataset.length>0){
        selectedHoofdId = dataset[0].ID; // fallback centrale persoon
    }
    renderTable(dataset);
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
            selectedHoofdId = safe(p.ID); // update centrale persoon
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
// Init
// =======================
buildHeader(); 
renderTable(dataset); 
searchInput.addEventListener('input', liveSearch);
addBtn.addEventListener('click', addPersoon);
saveBtn.addEventListener('click', saveDatasetMerged);
refreshBtn.addEventListener('click', refreshTable);

// =======================
// Sluit popup bij klik buiten
// =======================
document.addEventListener('click', e=>{
    const popup=document.getElementById('searchPopup');
    if(popup && !popup.contains(e.target) && e.target!==searchInput) popup.remove();
});

})();
