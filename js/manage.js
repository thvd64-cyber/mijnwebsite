// ======================= manage.js v1.3.9 =======================
// Beheer module: Hoofd + Ouders + Partner + Kinderen + Broer/Zus
// Features v1.3.9:
// - addRow: max 10 rijen
// - SaveDatasetMerged: lege rijen krijgen unieke ID via letters+3 cijfers, bestaande behouden
// - Refresh: relaod + relaties herberekenen
// - Live Search: filter + selecteer centrale persoon, relaties intact
// - PKPartnerID logica aangepast: partner direct onder KindID
// =================================================================
(function(){
'use strict'; 

// =======================
// DOM-elementen
// =======================
const tableBody   = document.querySelector('#manageTable tbody'); 
const theadRow    = document.querySelector('#manageTable thead tr'); 
const addBtn      = document.getElementById('addBtn'); 
const saveBtn     = document.getElementById('saveBtn'); 
const refreshBtn  = document.getElementById('refreshBtn'); 
const searchInput = document.getElementById('searchPerson'); 

// =======================
// State
// =======================
let dataset = window.StamboomStorage.get() || []; 
let selectedHoofdId = null; 
let tempRowCount = 0; 

// =======================
// Helpers
// =======================
function safe(val){ return val ? String(val).trim() : ''; }
function parseDate(d){ 
    if(!d) return new Date(0); 
    const parts = d.split('-'); 
    if(parts.length !==3) return new Date(0); 
    return new Date(parts.reverse().join('-')); 
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
// ID GENERATOR (letters + 3 cijfers)
// =======================
function genereerCode(persoon, bestaande){
    const letters = (persoon.Doopnaam[0]||'') + (persoon.Roepnaam[0]||'') + (persoon.Achternaam[0]||'') + (persoon.Geslacht[0]||'X');
    let code;
    const bestaandeIDs = new Set(bestaande.map(p=>p.ID));
    do {
        const cijfers = Math.floor(100 + Math.random()*900);
        code = letters + cijfers;
    } while(bestaandeIDs.has(code)); 
    return code;
}

// =======================
// Build Table Header
// =======================
function buildHeader(){ 
    theadRow.innerHTML = ''; 
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

    // Kinderen van hoofd of partner
    const KindID = data.filter(p =>
        safe(p.VaderID) === hoofdID ||
        safe(p.MoederID) === hoofdID ||
        (PHoofdID && (safe(p.VaderID) === PHoofdID || safe(p.MoederID) === PHoofdID))
    ).map(p => p.ID);

    // PKPartnerID: **alleen partner van het kind zelf**
    const PKPartnerID = data
        .filter(p => KindID.includes(safe(p.ID)))
        .map(p => safe(p.PartnerID))
        .filter(pid => pid);

    // Broers/Zussen van hoofd
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

    // Kind + partner direct onder kind
    contextData.filter(p => p.Relatie==='KindID').forEach(kind=>{
        renderQueue.push(kind); 
        if(kind.PartnerID){
            const pk = contextData.find(p => safe(p.ID) === safe(kind.PartnerID));
            if(pk) renderQueue.push(pk); // direct onder het kind
        }
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
            if(col.readonly){ 
                td.textContent = p[col.key]||''; 
            } else { 
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
// Voeg lege rij toe (max 10)
// =======================
function addRow(){
    if(tempRowCount >= 10){ 
        alert('Maximaal 10 rijen toegevoegd. Klik Opslaan om verder te gaan.');
        return;
    }
    const tr = document.createElement('tr'); 
    COLUMNS.forEach(col=>{
        const td = document.createElement('td');
        if(col.readonly){ td.textContent = ''; } 
        else { 
            const input = document.createElement('input');
            input.value = ''; 
            input.dataset.field = col.key;
            td.appendChild(input);
        }
        tr.appendChild(td);
    });
    tableBody.appendChild(tr); 
    tempRowCount++; 
}

// =======================
// Save (merged) dataset + ID generator
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

            if(!persoon.ID){
                persoon.ID = genereerCode(persoon, Array.from(idMap.values()));
            }

            idMap.set(persoon.ID, {...idMap.get(persoon.ID), ...persoon});
        });

        dataset = Array.from(idMap.values());
        window.StamboomStorage.set(dataset);
        tempRowCount = 0;
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
        selectedHoofdId = dataset[0].ID; 
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
// Init
// =======================
buildHeader(); 
renderTable(dataset); 
searchInput.addEventListener('input', liveSearch);
addBtn.addEventListener('click', addRow); 
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
