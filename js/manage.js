// ======================= manage.js v1.3.12 =======================
// Visuele aanpas ouders boven hoofd
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

   // Broers/Zussen (zelfde ouders als hoofd, exclusief hoofd, kinderen en partner van hoofd)
    const BZID = data.filter(p => {
        const pid = safe(p.ID);
        if(pid === hoofdID) return false;               // sluit hoofd uit
        if(KindID.includes(pid)) return false;         // sluit kinderen uit
        if(pid === PHoofdID) return false;             // sluit partner hoofd uit
        const sameVader = VHoofdID && safe(p.VaderID) === VHoofdID;
        const sameMoeder = MHoofdID && safe(p.MoederID) === MHoofdID;
        return sameVader || sameMoeder;               // broer/zus als vader of moeder gelijk
    }).map(p => p.ID);

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
// Render Table (ouders boven hoofd, leesbare labels)
// =======================
function renderTable(dataset){
    // Controleer of er een geselecteerd hoofd is, anders placeholder tonen
    if(!selectedHoofdId){ showPlaceholder('Selecteer een persoon'); return; }

    // Bereken contextuele relaties (vader, moeder, partner, kinderen, etc.)
    const contextData = computeRelaties(dataset, selectedHoofdId);
    if(!contextData.length){ showPlaceholder('Geen personen gevonden'); return; }

    // Maak tbody leeg om opnieuw te vullen
    tableBody.innerHTML = ''; 
    const renderQueue = []; // queue waarin we rijen in juiste weergavevolgorde zetten

    // ======================
    // Vader en moeder eerst
    // ======================
    contextData
        .filter(p => p.Relatie==='VHoofdID' || p.Relatie==='MHoofdID') // filter ouders
        .forEach(p => renderQueue.push(p)); // voeg ouders toe aan queue

    // ======================
    // Daarna hoofd
    // ======================
    const hoofd = contextData.find(p => p.Relatie==='HoofdID'); // zoek hoofdpersoon
    if(hoofd) renderQueue.push(hoofd); // voeg hoofd toe na ouders

    // ======================
    // Partner hoofd
    // ======================
    contextData
        .filter(p => p.Relatie==='PHoofdID') // filter partner hoofd
        .forEach(p => renderQueue.push(p)); // voeg partner toe

    // ======================
    // Kinderen + partner van kind
    // ======================
    contextData
        .filter(p => p.Relatie==='KindID') // filter kinderen
        .forEach(kind=>{
            renderQueue.push(kind); // voeg kind toe
            const kp = contextData.find(p => p.Relatie==='KindPartnerID' && safe(p.ID)===safe(kind.PartnerID));
            if(kp) renderQueue.push(kp); // voeg partner van kind toe
        });

    // ======================
    // Broer/Zus + partner van broer/zus
    // ======================
    contextData
        .filter(p => p.Relatie==='BZID') // filter broer/zus
        .forEach(sib=>{
            renderQueue.push(sib); // voeg broer/zus toe
            const bzP = contextData.find(p => p.Relatie==='BZPartnerID' && safe(p.ID)===safe(sib.PartnerID));
            if(bzP) renderQueue.push(bzP); // voeg partner van broer/zus toe
        });

    // ======================
    // Render rijen in tabel
    // ======================
    renderQueue.forEach(p=>{
        const tr = document.createElement('tr'); // nieuwe tabelrij

        // Leesbare labels instellen
        let relatieLabel = '';
        switch(p.Relatie){
            case 'VHoofdID':
            case 'MHoofdID':
                relatieLabel = 'Ouder';
                break;
            case 'PHoofdID':
            case 'KindPartnerID':
            case 'BZPartnerID':
                relatieLabel = 'Partner';
                break;
            case 'BZID':
                relatieLabel = 'Broer/Zus';
                break;
            case 'HoofdID':
                relatieLabel = 'Hoofd';
                break;
            case 'KindID':
                relatieLabel = 'Kind';
                break;
            default:
                relatieLabel = p.Relatie || '-';
        }

        // CSS class op basis van originele relatie (voor styling)
        if(p.Relatie) tr.classList.add(`rel-${p.Relatie.toLowerCase()}`);

        // Vul kolommen
        COLUMNS.forEach(col=>{
            const td = document.createElement('td');

            if(col.key === 'Relatie'){ 
                td.textContent = relatieLabel; // vervang interne code door leesbaar label
            } else if(col.readonly){ 
                td.textContent = p[col.key]||''; // alleen-lezen veld
            } else { 
                const input = document.createElement('input'); // bewerkbare cel
                input.value = p[col.key]||''; 
                input.dataset.field = col.key; 
                td.appendChild(input); 
            }

            tr.appendChild(td); // voeg cel toe aan rij
        });

        tableBody.appendChild(tr); // voeg rij toe aan tabel
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
