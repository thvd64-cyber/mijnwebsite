// ======================= manage.js v1.2.7 =======================
// Beheer module: Hoofd + Ouders + Partner + Kinderen + Broer/Zus
// Production hardened: null-safe + selectedHoofdId state + header fix
// Visualisatie: Ouders → Hoofd+Partner → Kinderen → Broer/Zus
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
let dataset = window.StamboomStorage.get() || []; // dataset laden
let selectedHoofdId = null; // actieve geselecteerde persoon

// =======================
// Helpers (null-safe)
// =======================
function safe(val){ return val ? String(val).trim() : ''; } // null-safe string
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
    const hoofdIdStr = safe(hoofdId);
    if(!hoofdIdStr) return [];
    const hoofd = data.find(d => safe(d.ID) === hoofdIdStr);
    if(!hoofd) return [];

    const vaderId   = safe(hoofd.VaderID);
    const moederId  = safe(hoofd.MoederID);
    const partnerId = safe(hoofd.PartnerID);

    const contextData = data.filter(p=>{
        const pid = safe(p.ID);
        if(pid === hoofdIdStr) return true;
        if(pid === vaderId || pid === moederId) return true;
        if(pid === partnerId) return true;
        if(safe(p.VaderID) === hoofdIdStr || safe(p.MoederID) === hoofdIdStr) return true;
        if(partnerId && (safe(p.VaderID) === partnerId || safe(p.MoederID) === partnerId)) return true;

        const zelfdeVader  = vaderId  && safe(p.VaderID)  === vaderId;
        const zelfdeMoeder = moederId && safe(p.MoederID) === moederId;
        if(pid !== hoofdIdStr && (zelfdeVader || zelfdeMoeder)) return true;

        return false;
    });

    return contextData.map(p=>{
        const clone = { ...p };
        const pid = safe(p.ID);
        clone._priority = 99; clone._scenario = 0;

        // Ouders → Hoofd → Partner → Kind → Broer/Zus
        if(pid === vaderId || pid === moederId){ clone.Relatie='Ouder'; clone._priority=0; return clone; }
        if(pid === hoofdIdStr){ clone.Relatie='Hoofd'; clone._priority=1; return clone; }
        if(pid === partnerId){ clone.Relatie='Partner'; clone._priority=2; return clone; }

        const isKindHoofd = safe(p.VaderID) === hoofdIdStr || safe(p.MoederID) === hoofdIdStr;
        const isKindPartner = partnerId && (safe(p.VaderID) === partnerId || safe(p.MoederID) === partnerId);
        if(isKindHoofd || isKindPartner){
            clone.Relatie='Kind'; clone._priority=3;
            clone._scenario = isKindHoofd && isKindPartner ? 1 : isKindHoofd ? 2 : 3;
            return clone;
        }

        const zelfdeVader  = vaderId  && safe(p.VaderID)  === vaderId;
        const zelfdeMoeder = moederId && safe(p.MoederID) === moederId;
        if(zelfdeVader || zelfdeMoeder){
           clone.Relatie='broer-zus'; clone._priority=4;
            clone._scenario = zelfdeVader && zelfdeMoeder ? 1 : zelfdeVader ? 2 : 3;
            return clone;
        }

        return clone;
    }).sort((a,b)=>{
        if(a._priority!==b._priority) return a._priority-b._priority;
        if(a._scenario!==b._scenario) return a._scenario-b._scenario;
        return parseDate(a.Geboortedatum)-parseDate(b.Geboortedatum);
    });
}

// =======================
// Render Table
// =======================
function renderTable(data){
    if(!selectedHoofdId){ showPlaceholder('Selecteer een persoon'); return; }
    const contextData = computeRelaties(data, selectedHoofdId);
    tableBody.innerHTML='';
    if(!contextData.length){ showPlaceholder('Geen personen gevonden'); return; }

    contextData.forEach(p=>{
        const tr = document.createElement('tr');
        if(p.Relatie) tr.classList.add(`rel-${p.Relatie.toLowerCase()}`);
        if(p._scenario) tr.classList.add(`scenario-${p._scenario}`);
        COLUMNS.forEach(col=>{
            const td=document.createElement('td');
            if(col.readonly){ td.textContent=p[col.key]||''; }
            else { const input=document.createElement('input'); input.value=p[col.key]||''; input.dataset.field=col.key; td.appendChild(input); }
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
    const tr=document.createElement('tr');
    const td=document.createElement('td');
    td.colSpan=COLUMNS.length; td.textContent=msg; td.style.textAlign='center';
    tr.appendChild(td); tableBody.appendChild(tr);
}

// =======================
// Live Search
// =======================
function liveSearch(){
    const term = safe(searchInput.value).toLowerCase();
    document.getElementById('searchPopup')?.remove();
    if(!term) return;

    const results = dataset.filter(p=>safe(p.ID).toLowerCase().includes(term) || safe(p.Roepnaam).toLowerCase().includes(term) || safe(p.Achternaam).toLowerCase().includes(term));
    const rect = searchInput.getBoundingClientRect();
    const popup=document.createElement('div');
    popup.id='searchPopup'; popup.style.position='absolute'; popup.style.background='#fff';
    popup.style.border='1px solid #999'; popup.style.zIndex=1000;
    popup.style.top=rect.bottom+window.scrollY+'px'; popup.style.left=rect.left+window.scrollX+'px';
    popup.style.width=rect.width+'px'; popup.style.maxHeight='200px'; popup.style.overflowY='auto';

    results.forEach(p=>{
        const row=document.createElement('div'); row.textContent=`${p.ID} | ${p.Roepnaam} | ${p.Achternaam}`;
        row.style.padding='5px'; row.style.cursor='pointer';
        row.addEventListener('click', ()=>{
            selectedHoofdId = safe(p.ID); popup.remove(); renderTable(dataset);
        });
        popup.appendChild(row);
    });

    if(results.length===0){ const row=document.createElement('div'); row.textContent='Geen resultaten'; row.style.padding='5px'; popup.appendChild(row); }

    document.body.appendChild(popup);
}

// =======================
// Add / Save / Refresh
// =======================
function addPersoon(){ 
    const nieuw={}; COLUMNS.forEach(col=>nieuw[col.key]='');
    nieuw.ID = window.genereerCode(nieuw,dataset);
    dataset.push(nieuw);
    selectedHoofdId = nieuw.ID;
    window.StamboomStorage.set(dataset);
    renderTable(dataset);
}

function saveDataset(){
    const rows=tableBody.querySelectorAll('tr'); const nieuweDataset=[]; const idSet=new Set();
    rows.forEach(tr=>{
        const persoon={};
        COLUMNS.forEach((col,index)=>{
            const cell=tr.cells[index];
            if(col.readonly){ if(col.key==='ID') persoon.ID = safe(cell.textContent); }
            else { const input=cell.querySelector('input'); persoon[col.key]=input?input.value.trim():''; }
        });
        if(!persoon.ID) throw new Error('ID ontbreekt'); 
        if(idSet.has(persoon.ID)) throw new Error(`Duplicate ID: ${persoon.ID}`);
        idSet.add(persoon.ID);
        nieuweDataset.push(persoon);
    });
    dataset=nieuweDataset; window.StamboomStorage.set(dataset);
    alert('Dataset succesvol opgeslagen');
}

function refreshTable(){ dataset=window.StamboomStorage.get()||[]; renderTable(dataset); }

// =======================
// Init
// =======================
buildHeader();                   // ✅ header fix toegevoegd
renderTable(dataset);            // render tabel
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
