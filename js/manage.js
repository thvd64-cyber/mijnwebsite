// ======================= manage.js v1.3.14 =======================
// Wrap text in bewerkbare cellen met <textarea> + dynamische hoogte + scroll
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
    { key: 'Huisadressen', readonly: false },
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
// Relatie-engine (aangepast)
// =======================
function computeRelaties(data, hoofdId){
    const hoofdID = safe(hoofdId); // Veilige versie van hoofdID
    if(!hoofdID) return []; // stop als geen hoofd

    const hoofd = data.find(p => safe(p.ID) === hoofdID); // zoek hoofd
    if(!hoofd) return []; // stop als hoofd niet gevonden

    const VHoofdID = safe(hoofd.VaderID); // vader ID
    const MHoofdID = safe(hoofd.MoederID); // moeder ID
    const PHoofdID = safe(hoofd.PartnerID); // partner ID

    const KindID = data.filter(p =>
        safe(p.VaderID) === hoofdID || 
        safe(p.MoederID) === hoofdID || 
        (PHoofdID && (safe(p.VaderID) === PHoofdID || safe(p.MoederID) === PHoofdID))
    ).map(p => p.ID); // kinderen + partner kinderen

    const BZID = data.filter(p => {
        const pid = safe(p.ID);
        if(pid === hoofdID) return false; 
        if(KindID.includes(pid)) return false;
        if(pid === PHoofdID) return false;
        const sameVader = VHoofdID && safe(p.VaderID) === VHoofdID;
        const sameMoeder = MHoofdID && safe(p.MoederID) === MHoofdID;
        return sameVader || sameMoeder; 
    }).map(p => p.ID); // broers/zussen

    const KindPartnerID = KindID
        .map(id => {
            const k = data.find(p => safe(p.ID) === id);
            return k && k.PartnerID ? safe(k.PartnerID) : null;
        })
        .filter(Boolean); // partners van kinderen

    const BZPartnerID = BZID
        .map(id => {
            const s = data.find(p => safe(p.ID) === id);
            return s && s.PartnerID ? safe(s.PartnerID) : null;
        })
        .filter(Boolean); // partners van broers/zussen

    return data.map(p=>{
        const pid = safe(p.ID);
        const clone = {...p}; // clone object
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
    }).sort((a,b)=>a._priority - b._priority); // sorteer op prioriteit
}

// =======================
// Dynamische textarea hoogte functie
// =======================
function adjustTextareas() {
    const textareas = tableBody.querySelectorAll('textarea'); // alle textareas in table
    textareas.forEach(ta => {
        ta.style.height = 'auto'; // reset height eerst
        const maxHeight = 120; // maximale hoogte per cel
        if(ta.scrollHeight > maxHeight){ // als inhoud te groot
            ta.style.height = maxHeight + 'px'; // zet max hoogte
            ta.style.overflowY = 'auto'; // scroll zichtbaar
        } else {
            ta.style.height = ta.scrollHeight + 'px'; // pas hoogte aan inhoud
            ta.style.overflowY = 'hidden'; // geen scroll nodig
        }
    });
}

// =======================
// Render Table (ouders boven hoofd, leesbare labels)
// =======================
function renderTable(dataset){
    if(!selectedHoofdId){ showPlaceholder('Selecteer een persoon'); return; } // geen hoofd
    const contextData = computeRelaties(dataset, selectedHoofdId); // bereken relaties
    if(!contextData.length){ showPlaceholder('Geen personen gevonden'); return; } // geen data

    tableBody.innerHTML = ''; 
    const renderQueue = []; 

    // ouders eerst
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
                const textarea = document.createElement('textarea'); // vervang input door textarea
                textarea.value = p[col.key]||''; 
                textarea.dataset.field = col.key; 
                textarea.style.width='100%'; 
                textarea.style.boxSizing='border-box'; 
                textarea.style.resize='vertical'; 
                td.appendChild(textarea); 
            }

            tr.appendChild(td); 
        });

        tableBody.appendChild(tr); 
    });

    adjustTextareas(); // pas dynamische hoogte en scroll toe na render
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
    if(tempRowCount>=10){ 
        alert('Maximaal 10 rijen toegevoegd. Klik Opslaan om verder te gaan.');
        return;
    }
    const tr = document.createElement('tr'); 
    COLUMNS.forEach(col=>{
        const td = document.createElement('td');
        if(col.readonly){ td.textContent=''; } 
        else { 
            const textarea = document.createElement('textarea'); // vervang input door textarea
            textarea.value=''; 
            textarea.dataset.field = col.key;
            textarea.style.width='100%'; 
            textarea.style.boxSizing='border-box'; 
            textarea.style.resize='vertical'; 
            td.appendChild(textarea); 
        }
        tr.appendChild(td);
    });
    tableBody.appendChild(tr); 
    tempRowCount++; 
    adjustTextareas(); // dynamische hoogte toepassen voor nieuwe rij
}

// =======================
// Save (merged) dataset + ID generator
// =======================
function saveDatasetMerged(){
    try {
        const rows = tableBody.querySelectorAll('tr');
        let bestaandeData = window.StamboomStorage.get() || [];
        const idMap = new Map(bestaandeData.map(p => [p.ID,p]));

        rows.forEach(tr=>{
            const persoon={};
            COLUMNS.forEach((col,index)=>{
                const cell = tr.cells[index];
                if(col.readonly){ 
                    if(col.key==='ID') persoon.ID = safe(cell.textContent); 
                } else { 
                    const textarea=cell.querySelector('textarea'); // textarea ipv input
                    persoon[col.key]=textarea?textarea.value.trim():''; 
                }
            });

            if(!persoon.ID){
                persoon.ID = genereerCode(persoon, Array.from(idMap.values()));
            }

            idMap.set(persoon.ID,{...idMap.get(persoon.ID),...persoon});
        });

        dataset = Array.from(idMap.values());
        window.StamboomStorage.set(dataset);
        tempRowCount=0;
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
    if(!selectedHoofdId && dataset.length>0) selectedHoofdId = dataset[0].ID; 
    renderTable(dataset);
}

// =======================
// LIVE SEARCH (Popup met grotere letters)
// =======================
function liveSearch(){
    const term = safe(searchInput.value).toLowerCase();      // Zoekterm
    document.getElementById('searchPopup')?.remove();        // Verwijder oude popup
    if(!term) return;                                        // Stop bij lege input

    const results = dataset.filter(p =>
        safe(p.ID).toLowerCase().includes(term) ||
        safe(p.Roepnaam).toLowerCase().includes(term) ||
        safe(p.Achternaam).toLowerCase().includes(term)
    );

    const rect = searchInput.getBoundingClientRect();        // Positie input
    const popup = document.createElement('div');             // Popup container
    popup.id='searchPopup';
    popup.style.position='absolute';
    popup.style.background='#fff';
    popup.style.border='1px solid #999';
    popup.style.zIndex=1000;

    // ======================= Positie en Grootte =======================
    popup.style.top = rect.bottom + window.scrollY + 'px';
    popup.style.left = Math.max(rect.left + window.scrollX, 5) + 'px'; // 5px vanaf kant
    popup.style.width = rect.width + 'px';
    popup.style.maxHeight = '300px';
    popup.style.overflowY = 'auto';
    popup.style.fontSize = '1.3rem';       // grotere letters in popup
    popup.style.padding = '8px';           // meer padding

    if(results.length === 0){
        const row = document.createElement('div');
        row.textContent = 'Geen resultaten';
        row.style.padding = '8px';
        row.style.fontSize = '1.3rem';     // grotere tekst voor lege melding
        popup.appendChild(row);
    } else {
        results.forEach(p => {
            const row = document.createElement('div');
            row.textContent = `${p.ID} | ${p.Roepnaam} | ${p.Achternaam}`;
            row.style.padding = '8px';     // comfortabele padding
            row.style.cursor = 'pointer';
            row.style.fontSize = '1.3rem'; // grotere letters per regel
            row.addEventListener('click', ()=>{
                selectedHoofdId = safe(p.ID); // Pas selectie toe bij klik
                popup.remove();               // Verwijder popup
                renderTree();                 // Bouw boom
            });
            popup.appendChild(row);
        });
    }

    document.body.appendChild(popup); // Voeg popup toe aan DOM
}
// =======================
// Init
// =======================
buildHeader(); 
renderTable(dataset); 
searchInput.addEventListener('input',liveSearch);
addBtn.addEventListener('click',addRow); 
saveBtn.addEventListener('click',saveDatasetMerged);
refreshBtn.addEventListener('click',refreshTable);

// =======================
// Sluit popup bij klik buiten
// =======================
document.addEventListener('click',e=>{
    const popup=document.getElementById('searchPopup');
    if(popup && !popup.contains(e.target) && e.target!==searchInput) popup.remove();
});

})();
