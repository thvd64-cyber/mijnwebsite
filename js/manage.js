// ======================= manage.js v1.3.0 =======================
// Alle relaties zichtbaar: ouders, hoofd+partner, kind+partner, broer/zus+partner

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

// =======================
// Helpers
// =======================
function safe(val){ return val ? String(val).trim() : ''; }
function parseDate(d){
    if(!d) return new Date(0);
    const parts = d.split('-');
    if(parts.length!==3) return new Date(0);
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
// Build header
// =======================
function buildHeader(){
    theadRow.innerHTML='';
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
    const hoofdIdStr = safe(hoofdId); // nfo: hoofd ID veilig maken
    if(!hoofdIdStr) return []; // nfo: geen hoofd geselecteerd → lege lijst
    const hoofd = data.find(d=>safe(d.ID)===hoofdIdStr); // nfo: hoofd persoon vinden
    if(!hoofd) return []; // nfo: hoofd niet gevonden → lege lijst
    const vaderId = safe(hoofd.VaderID); // nfo: vader ID hoofd
    const moederId = safe(hoofd.MoederID); // nfo: moeder ID hoofd
    const partnerId = safe(hoofd.PartnerID); // nfo: partner ID hoofd

    // Context: filter alle relevante personen
    const contextData = data.filter(p=>{
        const pid = safe(p.ID); // nfo: persoon ID veilig maken

        // Hoofd, ouders, partner
        if(pid===hoofdIdStr || pid===vaderId || pid===moederId || pid===partnerId) return true; // nfo: altijd opnemen

        // Kinderen van hoofd of partner
        if(safe(p.VaderID)===hoofdIdStr || safe(p.MoederID)===hoofdIdStr) return true; // nfo: kind van hoofd
        if(partnerId && (safe(p.VaderID)===partnerId || safe(p.MoederID)===partnerId)) return true; // nfo: kind van partner

        // Broer/Zus
        const zelfdeVader = vaderId && safe(p.VaderID)===vaderId; // nfo: check zelfde vader
        const zelfdeMoeder = moederId && safe(p.MoederID)===moederId; // nfo: check zelfde moeder
        if(pid!==hoofdIdStr && (zelfdeVader || zelfdeMoeder)) return true; // nfo: sibling opnemen

        // Partner van siblings
        if(data.some(k => ((zelfdeVader || zelfdeMoeder) && safe(k.ID)!==hoofdIdStr && safe(k.PartnerID)===pid))) return true; // nfo: partner van broer/zus

        return false; // nfo: overige personen niet opnemen
    });

    // Mapping relaties
    const mapped = []; // nfo: array om relaties in op te slaan

    contextData.forEach(p=>{
        const clone = { ...p }; // nfo: clone object maken
        const pid = safe(p.ID); // nfo: persoon ID veilig maken
        clone._priority = 99; // nfo: default prioriteit
        clone._scenario = 0; // nfo: default scenario
        clone._linkedTo = ''; // nfo: default linkedTo

        // ===== Ouders =====
        if(pid === vaderId || pid === moederId){ 
            clone.Relatie='Ouder'; 
            clone._priority=0; 
            mapped.push(clone); 
            return; // nfo: ouder toevoegen en stoppen
        }

        // ===== Hoofd =====
        if(pid === hoofdIdStr){ 
            clone.Relatie='Hoofd'; 
            clone._priority=1; 
            mapped.push(clone); 
            return; // nfo: hoofd toevoegen en stoppen
        }

        // ===== Partner van hoofd =====
        if(pid === partnerId){ 
            clone.Relatie='Partner'; 
            clone._priority=2; 
            clone._linkedTo=hoofdIdStr; 
            mapped.push(clone); 
            return; // nfo: partner toevoegen en stoppen
        }

        // ===== Broer/Zus eerst =====
        const isSibling = pid!==hoofdIdStr && ((vaderId && safe(p.VaderID)===vaderId) || (moederId && safe(p.MoederID)===moederId)); // nfo: sibling check
        if(isSibling){
            clone.Relatie='broer-zus'; 
            clone._priority=4; 
            clone._scenario=(safe(p.VaderID)===vaderId && safe(p.MoederID)===moederId)?1:(safe(p.VaderID)===vaderId)?2:3; // nfo: 1=volle, 2=via vader, 3=via moeder
            mapped.push(clone); 
            return; // nfo: sibling toegevoegd
        }

        // ===== Kind (3 scenario's) + partner check =====
        const isKindHoofd = safe(p.VaderID)===hoofdIdStr || safe(p.MoederID)===hoofdIdStr; // nfo: kind van hoofd
        const isKindPartner = partnerId && (safe(p.VaderID)===partnerId || safe(p.MoederID)===partnerId); // nfo: kind van partner
        if(isKindHoofd || isKindPartner){
            clone.Relatie='Kind'; 
            clone._priority=3; 
            clone._scenario = isKindHoofd && isKindPartner ? 1 : isKindHoofd ? 2 : 3; // nfo: scenario 1,2,3

            // ===== Partner van kind toepassen =====
            const childPartner = data.find(k => safe(k.PartnerID)===pid); // nfo: zoek persoon die dit kind als partner heeft
            if(childPartner){
                clone._linkedTo = safe(childPartner.ID); // nfo: link naar partner voor kleur/lay-out
            }

            mapped.push(clone); // nfo: voeg kind toe
            return; // nfo: stop verdere checks
        }

        // ===== Partner van broer/zus =====
        const siblingLinked = data.find(s => s.ID!==hoofdIdStr && ((vaderId && safe(s.VaderID)===vaderId) || (moederId && safe(s.MoederID)===moederId)) && safe(s.PartnerID)===pid); // nfo: partner van sibling zoeken
        if(siblingLinked){
            clone.Relatie='sibling-partner'; 
            clone._priority=4; 
            clone._scenario=4; 
            clone._linkedTo=safe(siblingLinked.ID); 
            mapped.push(clone); 
            return; // nfo: partner sibling toegevoegd
        }
    });

    // Sortering: prioriteit -> linkedTo -> scenario -> leeftijd
    return mapped.sort((a,b)=>{
        if(a._priority!==b._priority) return a._priority-b._priority; // nfo: eerst prioriteit
        if(a._linkedTo===b.ID) return 1; // nfo: linkedTo check
        if(b._linkedTo===a.ID) return -1; // nfo: linkedTo check
        if(a._scenario!==b._scenario) return a._scenario-b._scenario; // nfo: scenario sortering
        return parseDate(a.Geboortedatum)-parseDate(b.Geboortedatum); // nfo: laatste sortering op leeftijd
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
// Live search
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
    const rows=tableBody.querySelectorAll('tr'); 
    const nieuweDataset=[]; 
    const idSet=new Set();
    rows.forEach(tr=>{
        const persoon={};
        COLUMNS.forEach((col,index)=>{
            const cell=tr.cells[index];
            if(col.readonly){ if(col.key==='ID') persoon.ID=safe(cell.textContent); }
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
// Init
// =======================
buildHeader();
renderTable(dataset);
searchInput.addEventListener('input', liveSearch);
addBtn.addEventListener('click', addPersoon);
saveBtn.addEventListener('click', saveDataset);
refreshBtn.addEventListener('click', refreshTable);
document.addEventListener('click', e=>{
    const popup=document.getElementById('searchPopup');
    if(popup && !popup.contains(e.target) && e.target!==searchInput) popup.remove();
});
})();
