// ======================= manage.js v1.3.0 =======================
// Beheer module: Hoofd + Ouders + Partner + Kinderen + Broer/Zus
// Visualisatie: Ouders → Hoofd+Partner → Kinderen +partner → Broer/Zus +partner
// Robust: Null-safe, header fix, partner links
// =================================================================
(function(){ 
'use strict'; // Strikte modus

// =======================
// DOM-elementen
// =======================
const tableBody   = document.querySelector('#manageTable tbody');
const searchInput = document.getElementById('searchPerson');
const addBtn      = document.getElementById('addBtn');
const saveBtn     = document.getElementById('saveBtn');
const refreshBtn  = document.getElementById('refreshBtn');

// =======================
// State
// =======================
let dataset = window.StamboomStorage.get() || [];
let selectedHoofdId = null;

// =======================
// Helpers (null-safe)
// =======================
function safe(val){ return val ? String(val).trim() : ''; }
function parseDate(d){ 
    if(!d) return new Date(0);
    const parts = d.split('-');
    if(parts.length !==3) return new Date(0);
    return new Date(parts.reverse().join('-'));
}

// =======================
// Kolommen
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
    let table = document.getElementById('manageTable');
    let thead = table.querySelector('thead');
    if(!thead){
        thead = document.createElement('thead');
        table.prepend(thead);
    }

    let theadRow = thead.querySelector('tr');
    if(!theadRow){
        theadRow = document.createElement('tr');
        thead.appendChild(theadRow);
    }

    theadRow.innerHTML = '';
    COLUMNS.forEach(col=>{
        const th = document.createElement('th');
        th.textContent = col.key;
        theadRow.appendChild(th);
    });
}

// =======================
// Relatie-engine v1.3.1
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

        if(pid === hoofdIdStr) return true;                   // Hoofd
        if(pid === vaderId || pid === moederId) return true;  // Ouders
        if(pid === partnerId) return true;                    // Partner

        // Kinderen
        if(safe(p.VaderID) === hoofdIdStr || safe(p.MoederID) === hoofdIdStr) return true;
        if(partnerId && (safe(p.VaderID) === partnerId || safe(p.MoederID) === partnerId)) return true;

        // Broer/Zus
        const zelfdeVader  = vaderId  && safe(p.VaderID)  === vaderId;
        const zelfdeMoeder = moederId && safe(p.MoederID) === moederId;
        if(pid!==hoofdIdStr && (zelfdeVader || zelfdeMoeder)) return true;

        // Partner van kind
        if(data.some(k => (safe(k.VaderID)===hoofdIdStr || safe(k.MoederID)===hoofdIdStr) && safe(k.PartnerID)===pid)) return true;

        // Partner van sibling
        if(data.some(k => ((vaderId && safe(k.VaderID)===vaderId) || (moederId && safe(k.MoederID)===moederId)) && safe(k.ID)!==hoofdIdStr && safe(k.PartnerID)===pid)) return true;

        return false;
    });

    const mapped = contextData.map(p=>{
        const clone = { ...p };
        const pid = safe(p.ID);
        clone._priority = 99; clone._scenario = 0; clone._linkedTo = '';

        // Ouders
        if(pid === vaderId || pid === moederId){ clone.Relatie='Ouder'; clone._priority=0; return clone; }
        // Hoofd
        if(pid === hoofdIdStr){ clone.Relatie='Hoofd'; clone._priority=1; return clone; }
        // Partner
        if(pid === partnerId){ clone.Relatie='Partner'; clone._priority=2; return clone; }

        // Kind
        const isKindHoofd = safe(p.VaderID)===hoofdIdStr || safe(p.MoederID)===hoofdIdStr;
        const isKindPartner = partnerId && (safe(p.VaderID)===partnerId || safe(p.MoederID)===partnerId);
        if(isKindHoofd || isKindPartner){
            clone.Relatie='Kind';
            clone._priority=3;
            clone._scenario = isKindHoofd && isKindPartner ? 1 : isKindHoofd ? 2 : 3;
            return clone;
        }

        // Partner van kind
        const childLinked = data.find(k => (safe(k.VaderID)===hoofdIdStr || safe(k.MoederID)===hoofdIdStr) && safe(k.PartnerID)===pid);
        if(childLinked){ clone.Relatie='kind-partner'; clone._priority=3; clone._scenario=4; clone._linkedTo=safe(childLinked.ID); return clone; }

        // Broer/Zus
        const zelfdeVader  = vaderId  && safe(p.VaderID)  === vaderId;
        const zelfdeMoeder = moederId && safe(p.MoederID) === moederId;
        if(pid!==hoofdIdStr && (zelfdeVader || zelfdeMoeder)){ 
            clone.Relatie='broer-zus'; clone._priority=4; 
            clone._scenario = zelfdeVader && zelfdeMoeder ? 1 : zelfdeVader ? 2 : 3;
            return clone;
        }

        // Partner van broer/zus
        const siblingLinked = data.find(k => ((vaderId && safe(k.VaderID)===vaderId) || (moederId && safe(k.MoederID)===moederId)) && safe(k.ID)!==hoofdIdStr && safe(k.PartnerID)===pid);
        if(siblingLinked){ clone.Relatie='sibling-partner'; clone._priority=4; clone._scenario=4; clone._linkedTo=safe(siblingLinked.ID); return clone; }

        return clone;
    });

    // Sortering
    return mapped.sort((a,b)=>{
        if(a._priority!==b._priority) return a._priority-b._priority;
        if(a._linkedTo===b.ID) return 1;
        if(b._linkedTo===a.ID) return -1;
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
    const rows=tableBody.querySelectorAll('tr'); 
    const nieuweDataset=[]; 
    const idSet=new Set();
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
    dataset=nieuweDataset; 
    window.StamboomStorage.set(dataset);
    alert('Dataset succesvol opgeslagen');
}

function refreshTable(){ dataset=window.StamboomStorage.get()||[]; renderTable(dataset); }

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
// Init
// =======================
buildHeader();                   // header fix
renderTable(dataset);
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
