/* ======================= manage.js v1.3.20 ======================= */
/* Drop-in, 14 kolommen, live search, add/save/refresh, export JSON & CSV, inline uitleg */

(function(){
'use strict';

/* ======================= HELPERS ======================= */
function safe(val){ return val ? String(val).trim() : ''; }                 // Zet waarde om naar string en trim spaties
function parseDate(d){ return d ? new Date(d.split('-').reverse().join('-')) : new Date(0); } // Parse NL datum

/* ======================= STORAGE ======================= */
const StamboomStorage = {                                                     
    get:()=> JSON.parse(localStorage.getItem('stamboomData')||'[]'),          // Haal dataset op
    set:(data)=> localStorage.setItem('stamboomData', JSON.stringify(data))   // Sla dataset op
};

/* ======================= KOLONNEN ======================= */
const COLUMNS=[
    {key:'Relatie',readonly:true},{key:'ID',readonly:true},{key:'Doopnaam',readonly:false},
    {key:'Roepnaam',readonly:false},{key:'Prefix',readonly:false},{key:'Achternaam',readonly:false},
    {key:'Geslacht',readonly:false},{key:'Geboortedatum',readonly:false},{key:'Geboorteplaats',readonly:false},
    {key:'Overlijdensdatum',readonly:false},{key:'Overlijdensplaats',readonly:false},{key:'VaderID',readonly:false},
    {key:'MoederID',readonly:false},{key:'PartnerID',readonly:false},{key:'Opmerkingen',readonly:false}
];

/* ======================= STATE ======================= */
let dataset = StamboomStorage.get();                                           // Laad dataset
let selectedHoofdId = null;                                                      // geen selectie bij laden
let tempRowCount=0;                                                             // Bij tijdelijke rijen

/* ======================= DOM ELEMENTEN ======================= */
const tableBody   = document.querySelector('#manageTable tbody');              // Table body
const theadRow    = document.querySelector('#manageTable thead tr');           // Table header row
const addBtn      = document.getElementById('addBtn');                          // Add row knop
const saveBtn     = document.getElementById('saveBtn');                         // Save dataset knop
const refreshBtn  = document.getElementById('refreshBtn');                      // Refresh tabel knop
const exportJsonBtn = document.getElementById('exportJson');                    // Export JSON knop
const exportCsvBtn  = document.getElementById('exportCsv');                     // Export CSV knop
const searchInput = document.getElementById('searchPerson');                    // Live search input

/* ======================= HEADER BOUWEN ======================= */
function buildHeader(){
    theadRow.innerHTML='';                                                      // Leeg header
    COLUMNS.forEach(col=>{                                                      // Voor elke kolom
        const th=document.createElement('th'); 
        th.textContent=col.key;                                                 // Zet kolomnaam
        theadRow.appendChild(th);                                               // Voeg toe
    });
}

/* ======================= RELATIE ENGINE ======================= */
function computeRelaties(data,hoofdId){
    if(!hoofdId) return [];                                                     // Stop bij geen selectie
    const hoofd = data.find(p=>safe(p.ID)===safe(hoofdId)); if(!hoofd) return [];
    const VHoofdID = safe(hoofd.VaderID), MHoofdID = safe(hoofd.MoederID), PHoofdID = safe(hoofd.PartnerID);
    const KindID = data.filter(p=>safe(p.VaderID)===hoofdId || safe(p.MoederID)===hoofdId).map(p=>p.ID);
    const BZID = data.filter(p=>{
        const pid=safe(p.ID); 
        if(pid===hoofdId || pid===PHoofdID || KindID.includes(pid)) return false;
        return (VHoofdID && safe(p.VaderID)===VHoofdID) || (MHoofdID && safe(p.MoederID)===MHoofdID);
    }).map(p=>p.ID);

    const KindPartnerID = KindID.map(id=>{ const k=data.find(p=>p.ID===id); return k && k.PartnerID ? k.PartnerID : null; }).filter(Boolean);
    const BZPartnerID = BZID.map(id=>{ const s=data.find(p=>p.ID===id); return s && s.PartnerID ? s.PartnerID : null; }).filter(Boolean);

    return data.map(p=>{
        const pid=safe(p.ID);
        const clone={...p}; clone.Relatie=''; clone._priority=99;
        if(pid===hoofdId){clone.Relatie='HoofdID'; clone._priority=1;}
        else if(pid===VHoofdID || pid===MHoofdID){clone.Relatie=pid===VHoofdID?'VHoofdID':'MHoofdID'; clone._priority=0;}
        else if(pid===PHoofdID){clone.Relatie='PHoofdID'; clone._priority=2;}
        else if(KindID.includes(pid)){clone.Relatie='KindID'; clone._priority=3;}
        else if(KindPartnerID.includes(pid)){clone.Relatie='KindPartnerID'; clone._priority=3.5;}
        else if(BZID.includes(pid)){clone.Relatie='BZID'; clone._priority=4;}
        else if(BZPartnerID.includes(pid)){clone.Relatie='BZPartnerID'; clone._priority=4.5;}
        return clone;
    }).sort((a,b)=>a._priority - b._priority);                                  // Sorteer op prioriteit
}

/* ======================= TEXT AREA HOOGTE ======================= */
function adjustTextareas(){
    tableBody.querySelectorAll('textarea').forEach(ta=>{
        ta.style.height='auto';                                                 // Reset hoogte
        const maxH=120; 
        if(ta.scrollHeight>maxH){ta.style.height=maxH+'px'; ta.style.overflowY='auto';} 
        else{ta.style.height=ta.scrollHeight+'px'; ta.style.overflowY='hidden';}
    });
}

/* ======================= RENDER TABLE ======================= */
function renderTable(ds){
    if(!selectedHoofdId){ showPlaceholder('Selecteer een persoon'); return; }
    const contextData = computeRelaties(ds,selectedHoofdId);
    if(!contextData.length){ showPlaceholder('Geen personen gevonden'); return; }

    tableBody.innerHTML='';                                                    // Leeg body
    const renderQueue=[];                                                       // Queue voor juiste volgorde

    // Ouder, hoofd, partner, kind, BZID
    contextData.filter(p=>p.Relatie==='VHoofdID'||p.Relatie==='MHoofdID').forEach(p=>renderQueue.push(p));
    const hoofd=contextData.find(p=>p.Relatie==='HoofdID'); if(hoofd) renderQueue.push(hoofd);
    contextData.filter(p=>p.Relatie==='PHoofdID').forEach(p=>renderQueue.push(p));
    contextData.filter(p=>p.Relatie==='KindID').forEach(k=>{
        renderQueue.push(k);
        const kp=contextData.find(p=>p.Relatie==='KindPartnerID' && p.ID===k.PartnerID); if(kp) renderQueue.push(kp);
    });
    contextData.filter(p=>p.Relatie==='BZID').forEach(s=>{
        renderQueue.push(s);
        const bzP=contextData.find(p=>p.Relatie==='BZPartnerID' && p.ID===s.PartnerID); if(bzP) renderQueue.push(bzP);
    });

    // Maak rijen
    renderQueue.forEach(p=>{
        const tr=document.createElement('tr');                                 
        let relatieLabel='';
        switch(p.Relatie){
            case 'VHoofdID': case 'MHoofdID': relatieLabel='Ouder'; break;
            case 'PHoofdID': case 'KindPartnerID': case 'BZPartnerID': relatieLabel='Partner'; break;
            case 'BZID': relatieLabel='Broer/Zus'; break;
            case 'HoofdID': relatieLabel='Hoofd'; break;
            case 'KindID': relatieLabel='Kind'; break;
            default: relatieLabel=p.Relatie||'-';
        }
        if(p.Relatie) tr.classList.add(p.Relatie);
        COLUMNS.forEach(col=>{
            const td=document.createElement('td');
            if(col.key==='Relatie'){td.textContent=relatieLabel;}
            else if(col.readonly){td.textContent=p[col.key]||'';}
            else{
                const ta=document.createElement('textarea');
                ta.value=p[col.key]||'';
                ta.dataset.field=col.key;
                ta.style.width='100%'; ta.style.boxSizing='border-box'; ta.style.resize='vertical';
                td.appendChild(ta);
            }
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });

    adjustTextareas();
}

/* ======================= PLACEHOLDER ======================= */
function showPlaceholder(msg){
    tableBody.innerHTML='';
    const tr=document.createElement('tr');
    const td=document.createElement('td'); 
    td.colSpan=COLUMNS.length; 
    td.textContent=msg;
    td.style.textAlign='center';
    tr.appendChild(td); 
    tableBody.appendChild(tr);
}

/* ======================= ADD ROW ======================= */
function addRow(){
    if(tempRowCount>=10){alert('Maximaal 10 rijen toegevoegd. Klik Opslaan.'); return;}
    const tr=document.createElement('tr');
    COLUMNS.forEach(col=>{
        const td=document.createElement('td');
        if(col.readonly){ td.textContent=''; } 
        else { 
            const ta=document.createElement('textarea');
            ta.value='';
            ta.dataset.field=col.key;
            ta.style.width='100%'; ta.style.boxSizing='border-box';
            ta.style.resize='vertical';
            td.appendChild(ta);
        }
        tr.appendChild(td);
    });
    tableBody.appendChild(tr);
    tempRowCount++;
    adjustTextareas();
}

/* ======================= SAVE DATASET ======================= */
function saveDatasetMerged(){
    try{
        const rows=tableBody.querySelectorAll('tr');
        const idMap=new Map(dataset.map(p=>[p.ID,p]));
        rows.forEach(tr=>{
            const persoon={};
            COLUMNS.forEach((col,i)=>{
                const cell=tr.cells[i];
                if(col.readonly){if(col.key==='ID') persoon.ID=safe(cell.textContent);}
                else{const ta=cell.querySelector('textarea'); persoon[col.key]=ta?ta.value.trim():'';}
            });
            if(!persoon.ID) persoon.ID=genereerCode(persoon, Array.from(idMap.values()));
            idMap.set(persoon.ID,{...idMap.get(persoon.ID),...persoon});
        });
        dataset=Array.from(idMap.values());
        StamboomStorage.set(dataset);
        tempRowCount=0;
        alert('Dataset succesvol opgeslagen');
    }catch(e){alert(`Opslaan mislukt: ${e.message}`);}
}

/* ======================= EXPORT JSON & CSV ======================= */
function exportJSON(){ 
    const data = JSON.stringify(dataset,null,2); 
    const blob=new Blob([data],{type:'application/json'}); 
    const url=URL.createObjectURL(blob); 
    const a=document.createElement('a'); 
    a.href=url; a.download='stamboom.json'; a.click(); 
    URL.revokeObjectURL(url);
}

function exportCSV(){
    const headers=COLUMNS.map(c=>c.key).join(',');
    const rows=dataset.map(p=>COLUMNS.map(c=>`"${(p[c.key]||'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const csv=headers+'\n'+rows;
    const blob=new Blob([csv],{type:'text/csv'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download='stamboom.csv'; a.click();
    URL.revokeObjectURL(url);
}

/* ======================= INIT ======================= */
function init(){
    // Bouw de kolomheaders
    buildHeader();

    // ======================= TABEL INIT =======================
    // Alleen renderen als er een geselecteerde hoofdID is
    if(selectedHoofdId){
        renderTable(dataset); // render tabel met hoofdID
    } else {
        // Toon placeholder instructie, geen persoon geselecteerd
        showPlaceholder('Selecteer een persoon via de zoekfunctie');
    }

    // ======================= KNOPPEN =======================
    addBtn.addEventListener('click', addRow);                     // Voeg nieuwe rij toe
    saveBtn.addEventListener('click', saveDatasetMerged);         // Sla dataset op
    refreshBtn.addEventListener('click', () => {
        if(selectedHoofdId) renderTable(dataset);                // Alleen renderen als hoofdID geselecteerd
        else showPlaceholder('Selecteer een persoon via de zoekfunctie'); // anders placeholder tonen
    });
    exportJsonBtn?.addEventListener('click', exportJSON);         // Exporteer JSON
    exportCsvBtn?.addEventListener('click', exportCSV);           // Exporteer CSV

  // ======================= LIVE SEARCH =======================
// Controleer of de functie initLiveSearch bestaat (defensief: voorkomt errors als script niet geladen is)
if (typeof initLiveSearch === 'function') {

    // Initialiseer de Live Search module
    initLiveSearch(
        searchInput, // Referentie naar het input veld (#searchPerson)
        dataset,     // Volledige dataset waarop gezocht wordt (array met personen)

        (selectedID) => { // Callback functie die wordt uitgevoerd bij selectie van een resultaat
            selectedHoofdId = selectedID; // Sla gekozen persoon op als actieve HoofdID
            renderTable(dataset);         // Render de tabel opnieuw op basis van nieuwe selectie
        }
    );

    // ======================= CLICK OUTSIDE HANDLER =======================
    // Event listener op hele document om klikken buiten de search popup te detecteren
    document.addEventListener('click', (e) => {

        const popup = document.getElementById('searchPopup'); // Zoek de huidige popup met resultaten

        // Controle:
        // - popup bestaat
        // - klik is NIET binnen popup
        // - klik is NIET op input veld zelf
        if (popup && !popup.contains(e.target) && e.target !== searchInput) {

            popup.remove(); // Verwijder popup → sluit zoekresultaten
        }
    });
}

// ======================= INIT START =======================
// Start de init functie zodra script geladen is
init(); // Verwacht dat init() eerder in bestand gedefinieerd is (setup + event binding)

/* ======================= ID GENERATOR ======================= */
function genereerCode(persoon,bestaande){
    const letters=(persoon.Doopnaam[0]||'')+(persoon.Roepnaam[0]||'')+(persoon.Achternaam[0]||'')+(persoon.Geslacht[0]||'X');
    const bestaandeIDs=new Set(bestaande.map(p=>p.ID));
    let code;
    do{ code=letters+Math.floor(100+Math.random()*900); } while(bestaandeIDs.has(code));
    return code;
}

})();
