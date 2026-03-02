// ======================= manage.js v1.3.3 =======================
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
const addBtn      = document.getElementById('addBtn'); // knop om een nieuwe persoon toe te voegen
const saveBtn     = document.getElementById('saveBtn'); // knop om dataset op te slaan
const refreshBtn  = document.getElementById('refreshBtn'); // knop om tabel te verversen
const searchInput = document.getElementById('searchPerson'); // zoekveld voor personen

// =======================
// State
// =======================
let dataset = window.StamboomStorage.get() || []; // laad dataset uit storage, of lege array
let selectedHoofdId = null; // actieve geselecteerde persoon ID

// =======================
// Helpers (null-safe)
// =======================
function safe(val){ return val ? String(val).trim() : ''; } // null-safe string conversie
function parseDate(d){ 
    if(!d) return new Date(0); // lege datum = begin epoch
    const parts = d.split('-'); 
    if(parts.length !==3) return new Date(0); // foute datumformaat fallback
    return new Date(parts.reverse().join('-')); // dd-mm-yyyy → yyyy-mm-dd
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
    theadRow.innerHTML = ''; // header rij leegmaken
    COLUMNS.forEach(col=>{
        const th = document.createElement('th'); // maak nieuwe th
        th.textContent = col.key; // zet kolom naam
        theadRow.appendChild(th); // voeg toe aan thead
    });
}

// =======================
// Relatie-engine v1.6 (ouders boven hoofd)
// =======================
function computeRelaties(data, hoofdId){
    const hoofdIdStr = safe(hoofdId); // null-safe hoofdID
    if(!hoofdIdStr) return []; // stop als leeg

    const hoofd = data.find(d => safe(d.ID) === hoofdIdStr); // vind hoofd persoon
    if(!hoofd) return []; // stop als niet gevonden

    const vaderId   = safe(hoofd.VaderID); // vaderID van hoofd
    const moederId  = safe(hoofd.MoederID); // moederID van hoofd
    const partnerId = safe(hoofd.PartnerID); // partnerID van hoofd

    return data.map(p=>{
        const clone = {...p}; // clone persoon
        const pid = safe(p.ID);
        clone.Relatie = ''; // default lege relatie

        // ===== Ouders boven hoofd =====
        if(pid === vaderId) clone.Relatie = 'VHoofdID'; // vader
        if(pid === moederId) clone.Relatie = 'MHoofdID'; // moeder

        // ===== Hoofd =====
        if(pid === hoofdIdStr) clone.Relatie = 'HoofdID'; // hoofdID

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
// Render Table met expliciete volgorde
// =======================
function renderTable(dataset, filterData=null){
    // filterData: optioneel, als Live Search iets doorgeeft

    const dataToRender = filterData || computeRelaties(dataset, selectedHoofdId); // kies filterData of standaard computeRelaties
    if(!dataToRender.length){ 
        showPlaceholder('Geen personen gevonden'); 
        return; 
    }

    tableBody.innerHTML=''; // tbody leegmaken

    if(filterData){
        // ✅ Live Search modus: render exact wat gefilterd is, geen volgorde
        dataToRender.forEach(p=>{
            const tr = document.createElement('tr');
            if(p.Relatie) tr.classList.add(`rel-${p.Relatie.toLowerCase()}`);
            COLUMNS.forEach(col=>{
                const td = document.createElement('td');
                if(col.readonly){ td.textContent=p[col.key]||''; }
                else { 
                    const input=document.createElement('input');
                    input.value=p[col.key]||'';
                    input.dataset.field=col.key;
                    td.appendChild(input);
                }
                tr.appendChild(td);
            });
            tableBody.appendChild(tr);
        });
        return;
    }

    // Normale modus: volg renderOrder
    const renderOrder = [
        'VHoofdID','MHoofdID','HoofdID','PHoofdID','KindID','PKPartnerID','BZID','BZPartnerID'
    ];

    renderOrder.forEach(rel=>{
        dataToRender.filter(p=>p.Relatie===rel).forEach(p=>{
            const tr = document.createElement('tr'); 
            if(p.Relatie) tr.classList.add(`rel-${p.Relatie.toLowerCase()}`);
            COLUMNS.forEach(col=>{
                const td = document.createElement('td');
                if(col.readonly){ td.textContent=p[col.key]||''; }
                else { 
                    const input=document.createElement('input');
                    input.value=p[col.key]||'';
                    input.dataset.field=col.key;
                    td.appendChild(input);
                }
                tr.appendChild(td);
            });
            tableBody.appendChild(tr);
        });
    });
}
// =======================
// Placeholder
// =======================
function showPlaceholder(msg){
    tableBody.innerHTML=''; // tbody leegmaken
    const tr=document.createElement('tr'); // nieuwe rij
    const td=document.createElement('td'); // nieuwe cel
    td.colSpan=COLUMNS.length; // cel overspant alle kolommen
    td.textContent=msg; // tekst in cel
    td.style.textAlign='center'; // centreren
    tr.appendChild(td);
    tableBody.appendChild(tr); // toevoegen aan tbody
}

// =======================
// Live Search
// =======================
function liveSearch(){
    const term = safe(searchInput.value).toLowerCase(); // zoekterm
    document.getElementById('searchPopup')?.remove(); // verwijder oude popup
    if(!term) return;

    const results = dataset.filter(p=>safe(p.ID).toLowerCase().includes(term) || safe(p.Roepnaam).toLowerCase().includes(term) || safe(p.Achternaam).toLowerCase().includes(term)); // filteren
    const rect = searchInput.getBoundingClientRect(); // positie zoekveld
    const popup=document.createElement('div'); // popup div
    popup.id='searchPopup';
    popup.style.position='absolute';
    popup.style.background='#fff';
    popup.style.border='1px solid #999';
    popup.style.zIndex=1000;
    popup.style.top=rect.bottom+window.scrollY+'px';
    popup.style.left=rect.left+window.scrollX+'px';
    popup.style.width=rect.width+'px';
    popup.style.maxHeight='200px';
    popup.style.overflowY='auto';

    results.forEach(p=>{
        const row=document.createElement('div'); 
        row.textContent=`${p.ID} | ${p.Roepnaam} | ${p.Achternaam}`;
        row.style.padding='5px'; row.style.cursor='pointer';
        row.addEventListener('click', ()=>{
            selectedHoofdId = safe(p.ID); popup.remove(); renderTable(dataset);
        });
        popup.appendChild(row);
    });

    if(results.length===0){ 
        const row=document.createElement('div'); 
        row.textContent='Geen resultaten'; 
        row.style.padding='5px'; 
        popup.appendChild(row); 
    }

    document.body.appendChild(popup); // popup toevoegen aan body
}

// =======================
// Add / Save / Refresh
// =======================
function addPersoon(){ 
    const nieuw={}; COLUMNS.forEach(col=>nieuw[col.key]=''); // leeg object
    nieuw.ID = window.genereerCode(nieuw,dataset); // unieke ID genereren
    dataset.push(nieuw); // toevoegen aan dataset
    selectedHoofdId = nieuw.ID; // selecteer nieuw persoon
    window.StamboomStorage.set(dataset); // opslaan
    renderTable(dataset); // render tabel
}

function saveDataset(){
    const rows=tableBody.querySelectorAll('tr'); 
    const nieuweDataset=[]; 
    const idSet=new Set(); // controle op dubbele ID's
    rows.forEach(tr=>{
        const persoon={};
        COLUMNS.forEach((col,index)=>{
            const cell=tr.cells[index];
            if(col.readonly){ 
                if(col.key==='ID') persoon.ID = safe(cell.textContent); 
            } else { 
                const input=cell.querySelector('input'); 
                persoon[col.key]=input?input.value.trim():''; 
            }
        });
        if(!persoon.ID) throw new Error('ID ontbreekt'); 
        if(idSet.has(persoon.ID)) throw new Error(`Duplicate ID: ${persoon.ID}`);
        idSet.add(persoon.ID);
        nieuweDataset.push(persoon);
    });
    dataset=nieuweDataset; 
    window.StamboomStorage.set(dataset); // opslaan
    alert('Dataset succesvol opgeslagen');
}

function refreshTable(){ 
    dataset=window.StamboomStorage.get()||[]; // laad dataset
    renderTable(dataset); // render tabel
}

// =======================
// Init
// =======================
buildHeader();                   // build header
renderTable(dataset);            // render tabel
searchInput.addEventListener('input', liveSearch); // live search
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
