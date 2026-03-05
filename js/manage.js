// ======================= manage.js v1.3.14 =======================
// Wrap text in bewerkbare cellen met <textarea> + autosize
// =================================================================
(function(){
'use strict'; // activeer strict mode

// =======================
// DOM-elementen
// =======================
const tableBody   = document.querySelector('#manageTable tbody'); // tbody van de tabel
const theadRow    = document.querySelector('#manageTable thead tr'); // header rij
const addBtn      = document.getElementById('addBtn'); // knop om rij toe te voegen
const saveBtn     = document.getElementById('saveBtn'); // knop om dataset op te slaan
const refreshBtn  = document.getElementById('refreshBtn'); // knop om tabel te verversen
const searchInput = document.getElementById('searchPerson'); // zoekveld

// =======================
// State
// =======================
let dataset = window.StamboomStorage.get() || []; // laad bestaande data of lege array
let selectedHoofdId = null; // huidig geselecteerd hoofd
let tempRowCount = 0; // teller voor tijdelijk toegevoegde rijen

// =======================
// Helpers
// =======================
function safe(val){ return val ? String(val).trim() : ''; } // veilige string conversie
function parseDate(d){ 
    if(!d) return new Date(0); // fallback datum
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
    const letters = (persoon.Doopnaam[0]||'') + (persoon.Roepnaam[0]||'') + (persoon.Achternaam[0]||'') + (persoon.Geslacht[0]||'X'); // basisletters
    let code;
    const bestaandeIDs = new Set(bestaande.map(p=>p.ID)); // bestaande IDs
    do {
        const cijfers = Math.floor(100 + Math.random()*900); // random 3 cijfers
        code = letters + cijfers; // combineer
    } while(bestaandeIDs.has(code)); // voorkom duplicaten
    return code; // return unieke code
}

// =======================
// Build Table Header
// =======================
function buildHeader(){ 
    theadRow.innerHTML = ''; // leeg header
    COLUMNS.forEach(col=>{
        const th = document.createElement('th'); // nieuwe header cel
        th.textContent = col.key; // naam kolom
        theadRow.appendChild(th); // voeg toe aan rij
    });
}

// =======================
// Relatie-engine (ongewijzigd)
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
    const BZID = data.filter(p => {
        const pid = safe(p.ID);
        if(pid === hoofdID) return false; 
        if(KindID.includes(pid)) return false;
        if(pid === PHoofdID) return false;
        const sameVader = VHoofdID && safe(p.VaderID) === VHoofdID;
        const sameMoeder = MHoofdID && safe(p.MoederID) === MHoofdID;
        return sameVader || sameMoeder; 
    }).map(p => p.ID); 
    const KindPartnerID = KindID
        .map(id => {
            const k = data.find(p => safe(p.ID) === id);
            return k && k.PartnerID ? safe(k.PartnerID) : null;
        })
        .filter(Boolean); 
    const BZPartnerID = BZID
        .map(id => {
            const s = data.find(p => safe(p.ID) === id);
            return s && s.PartnerID ? safe(s.PartnerID) : null;
        })
        .filter(Boolean); 
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
        else if(KindPartnerID.includes(pid)){ clone.Relatie='KindPartnerID'; clone._priority=3.5; }
        else if(BZID.includes(pid)){ clone.Relatie='BZID'; clone._priority=4; }
        else if(BZPartnerID.includes(pid)){ clone.Relatie='BZPartnerID'; clone._priority=4.5; }
        return clone;
    }).sort((a,b)=>a._priority - b._priority); 
}

// =======================
// Render Table met autosize <textarea>
// =======================
function renderTable(dataset){
    if(!selectedHoofdId){ showPlaceholder('Selecteer een persoon'); return; } 
    const contextData = computeRelaties(dataset, selectedHoofdId); 
    if(!contextData.length){ showPlaceholder('Geen personen gevonden'); return; } 
    tableBody.innerHTML = ''; 
    const renderQueue = []; 

    // ouders, hoofd, partner, kinderen, broers/zussen
    contextData
        .filter(p => p.Relatie==='VHoofdID' || p.Relatie==='MHoofdID')
        .forEach(p => renderQueue.push(p)); 
    const hoofd = contextData.find(p => p.Relatie==='HoofdID'); 
    if(hoofd) renderQueue.push(hoofd); 
    contextData
        .filter(p => p.Relatie==='PHoofdID') 
        .forEach(p => renderQueue.push(p)); 
    contextData
        .filter(p => p.Relatie==='KindID') 
        .forEach(kind=>{
            renderQueue.push(kind); 
            const kp = contextData.find(p => p.Relatie==='KindPartnerID' && safe(p.ID)===safe(kind.PartnerID));
            if(kp) renderQueue.push(kp); 
        });
    contextData
        .filter(p => p.Relatie==='BZID') 
        .forEach(sib=>{
            renderQueue.push(sib); 
            const bzP = contextData.find(p => p.Relatie==='BZPartnerID' && safe(p.ID)===safe(sib.PartnerID));
            if(bzP) renderQueue.push(bzP); 
        });

    renderQueue.forEach(p=>{
        const tr = document.createElement('tr'); 
        let relatieLabel = '';
        switch(p.Relatie){
            case 'VHoofdID':
            case 'MHoofdID': relatieLabel='Ouder'; break;
            case 'PHoofdID':
            case 'KindPartnerID':
            case 'BZPartnerID': relatieLabel='Partner'; break;
            case 'BZID': relatieLabel='Broer/Zus'; break;
            case 'HoofdID': relatieLabel='Hoofd'; break;
            case 'KindID': relatieLabel='Kind'; break;
            default: relatieLabel=p.Relatie||'-';
        }
        if(p.Relatie) tr.classList.add(`rel-${p.Relatie.toLowerCase()}`); 

        COLUMNS.forEach(col=>{
            const td = document.createElement('td');
            if(col.key==='Relatie'){ 
                td.textContent = relatieLabel; 
            } else if(col.readonly){ 
                td.textContent = p[col.key]||''; 
            } else { 
                const textarea = document.createElement('textarea'); 
                textarea.value = p[col.key]||''; 
                textarea.dataset.field = col.key; 
                textarea.style.width='100%'; 
                textarea.style.boxSizing='border-box'; 
                textarea.style.resize='vertical'; 

                // ====== AUTOSIZE ======
                textarea.style.overflow='hidden'; // geen scrollbars
                textarea.addEventListener('input', e=>{
                    e.target.style.height='auto'; // reset hoogte
                    e.target.style.height=e.target.scrollHeight+'px'; // height aanpassen naar content
                });
                // initial resize bij render
                textarea.style.height=textarea.scrollHeight+'px';

                td.appendChild(textarea); 
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
// Voeg lege rij toe (autosize textarea)
// =======================
function addRow(){
    if(tempRowCount>=10){ 
        alert('Maximaal 10 rijen toegevoegd. Klik Opslaan om verder te gaan.');
        return;
    }
    const tr = document.createElement('tr'); 
    COLUMNS.forEach(col=>{
        const td = document.createElement('td');
        if(col.readonly){ td.textContent=''; } 
        else { 
            const textarea = document.createElement('textarea'); 
            textarea.value=''; 
            textarea.dataset.field = col.key;
            textarea.style.width='100%'; 
            textarea.style.boxSizing='border-box'; 
            textarea.style.resize='vertical'; 
            textarea.style.overflow='hidden'; // geen scroll
            textarea.addEventListener('input', e=>{
                e.target.style.height='auto';
                e.target.style.height=e.target.scrollHeight+'px';
            });
            textarea.style.height=textarea.scrollHeight+'px'; // initial autosize
            td.appendChild(textarea); 
        }
        tr.appendChild(td);
    });
    tableBody.appendChild(tr); 
    tempRowCount++; 
}

// =======================
// Save, Refresh, LiveSearch, Init, Sluit popup (ongewijzigd)
// =======================
function saveDatasetMerged(){ /* ... blijft zoals eerder ... */ }
function refreshTable(){ /* ... blijft zoals eerder ... */ }
function liveSearch(){ /* ... blijft zoals eerder ... */ }

buildHeader(); 
renderTable(dataset); 
searchInput.addEventListener('input',liveSearch);
addBtn.addEventListener('click',addRow); 
saveBtn.addEventListener('click',saveDatasetMerged);
refreshBtn.addEventListener('click',refreshTable);

document.addEventListener('click',e=>{
    const popup=document.getElementById('searchPopup');
    if(popup && !popup.contains(e.target) && e.target!==searchInput) popup.remove();
});

})();
