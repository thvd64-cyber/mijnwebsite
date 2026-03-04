// ======================= manage.js v1.3.11 =======================
// Beheer module: Hoofd + Ouders + Partner + Kinderen + Broer/Zus
// Features v1.3.10:
// - addRow: max 10 rijen
// - SaveDatasetMerged: lege rijen krijgen unieke ID via letters+3 cijfers, bestaande behouden
// - Refresh: relaod + relaties herberekenen
// - Live Search: filter + selecteer centrale persoon, relaties intact
// - Correcte weergave: BZID + partner, PKPartnerID direct onder KindID
// =================================================================
(function(){
'use strict'; // activeer strict mode

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
// ID GENERATOR (letters + 3 cijfers, uniek)
// =======================
function genereerCode(persoon, bestaande){
    const letters = (persoon.Doopnaam[0]||'') + (persoon.Roepnaam[0]||'') + (persoon.Achternaam[0]||'') + (persoon.Geslacht[0]||'X');
    let code;
    const bestaandeIDs = new Set(bestaande.map(p=>p.ID));
    do {
        const cijfers = Math.floor(100 + Math.random()*900);
        code = letters + cijfers;
    } while(bestaandeIDs.has(code)); // voorkom duplicaten
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
// Relatie-engine (aangepast)
// =======================
function computeRelaties(data, hoofdId){
    const hoofdID = safe(hoofdId); // Veilige versie van het hoofd ID
    if(!hoofdID) return []; // Als er geen hoofdID is, stop

    const hoofd = data.find(p => safe(p.ID) === hoofdID); // Zoek het hoofd in de dataset
    if(!hoofd) return []; // Stop als hoofd niet gevonden

    const VHoofdID = safe(hoofd.VaderID); // Vader ID van hoofd
    const MHoofdID = safe(hoofd.MoederID); // Moeder ID van hoofd
    const PHoofdID = safe(hoofd.PartnerID); // Partner ID van hoofd

    // Alle kinderen van hoofd of partner
    const KindID = data.filter(p =>
        safe(p.VaderID) === hoofdID ||           // Vader is hoofd
        safe(p.MoederID) === hoofdID ||          // Moeder is hoofd
        (PHoofdID && (safe(p.VaderID) === PHoofdID || safe(p.MoederID) === PHoofdID)) // Vader of moeder is partner van hoofd
    ).map(p => p.ID);

    // Broers/Zussen (zelfde ouders als hoofd, exclusief hoofd en kinderen)
    const BZID = data.filter(p =>
        (safe(p.VaderID) === VHoofdID || safe(p.MoederID) === MHoofdID) &&
        safe(p.ID) !== hoofdID &&
        !KindID.includes(safe(p.ID))
    ).map(p => p.ID);

    // Partners van kinderen
    const KindPartnerID = KindID
        .map(id => {
            const k = data.find(p => safe(p.ID) === id);
            return k && k.PartnerID ? safe(k.PartnerID) : null;
        })
        .filter(Boolean); // Filter nulls

    // Partners van broers/zussen (toegevoegd)
    const BZPartnerID = BZID
        .map(id => {
            const s = data.find(p => safe(p.ID) === id); // Zoek de broer/zus
            return s && s.PartnerID ? safe(s.PartnerID) : null; // Voeg partner toe als die bestaat
        })
        .filter(Boolean);

    // Maak een nieuwe dataset met Relatie en prioriteit
    return data.map(p=>{
        const pid = safe(p.ID);
        const clone = {...p};
        clone.Relatie = '';      // Init lege relatie
        clone._priority = 99;    // Init lage prioriteit

        // Relaties toewijzen
        if(pid === hoofdID){ 
            clone.Relatie='HoofdID'; clone._priority=1; // Hoofd zelf
        }
        else if(pid === VHoofdID){ 
            clone.Relatie='VHoofdID'; clone._priority=0; // Vader
        }
        else if(pid === MHoofdID){ 
            clone.Relatie='MHoofdID'; clone._priority=0; // Moeder
        }
        else if(pid === PHoofdID){ 
            clone.Relatie='PHoofdID'; clone._priority=2; // Partner van hoofd
        }
        else if(KindID.includes(pid)){ 
            clone.Relatie='KindID'; clone._priority=3; // Kind
        }
        else if(KindPartnerID.includes(pid)){ 
            clone.Relatie='KindPartnerID'; clone._priority=3.5; // Partner van kind
        }
        else if(BZID.includes(pid)){ 
            clone.Relatie='BZID'; clone._priority=4; // Broer/zus
        }
        else if(BZPartnerID.includes(pid)){ 
            clone.Relatie='BZPartnerID'; clone._priority=4.5; // Partner van broer/zus
        }

        return clone;
    }).sort((a,b)=>a._priority - b._priority); // Sorteer op prioriteit
}

// =======================
// Render Table (aangepast)
// =======================
function renderTable(dataset){
    if(!selectedHoofdId){ showPlaceholder('Selecteer een persoon'); return; }

    const contextData = computeRelaties(dataset, selectedHoofdId);
    if(!contextData.length){ showPlaceholder('Geen personen gevonden'); return; }

    tableBody.innerHTML = ''; 
    const renderQueue = [];

    // Eerst hoofd
    const hoofd = contextData.find(p => p.Relatie==='HoofdID');
    if(hoofd) renderQueue.push(hoofd);

    // Vader en moeder
    contextData.filter(p => p.Relatie==='VHoofdID'||p.Relatie==='MHoofdID').forEach(p=>renderQueue.push(p));

    // Partner hoofd
    contextData.filter(p => p.Relatie==='PHoofdID').forEach(p=>renderQueue.push(p));

    // Kinderen + partner van kind
    contextData.filter(p => p.Relatie==='KindID').forEach(kind=>{
        renderQueue.push(kind);
        const kp = contextData.find(p => p.Relatie==='KindPartnerID' && safe(p.ID)===safe(kind.PartnerID));
        if(kp) renderQueue.push(kp);
    });

    // Broer/Zus + partner van broer/zus
    contextData.filter(p => p.Relatie==='BZID').forEach(sib=>{
        renderQueue.push(sib);
        const bzP = contextData.find(p => p.Relatie==='BZPartnerID' && safe(p.ID)===safe(sib.PartnerID));
        if(bzP) renderQueue.push(bzP);
    });

    // Render rijen
    renderQueue.forEach(p=>{
        const tr = document.createElement('tr');
        if(p.Relatie) tr.classList.add(`rel-${p.Relatie.toLowerCase()}`); // CSS class op basis van relatie
        COLUMNS.forEach(col=>{
            const td = document.createElement('td');
            if(col.readonly){ 
                td.textContent = p[col.key]||''; // Alleen lezen
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

            // genereer unieke ID indien leeg
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
