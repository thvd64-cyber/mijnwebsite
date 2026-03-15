/* ======================= manage.js v1.3.20 ======================= */
/* Drop-in, 14 kolommen, live search, add/save/refresh, */

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
let selectedHoofdId = dataset.length>0 ? dataset[0].ID : null;                  // Init geselecteerde hoofdID
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
function computeRelaties(data, hoofdId){
    if(!hoofdId) return [];                                                     // Stop bij geen selectie
    const hoofd = data.find(p=>safe(p.ID)===safe(hoofdId)); if(!hoofd) return [];
    const VHoofdID = safe(hoofd.VaderID), MHoofdID = safe(hoofd.MoederID), PHoofdID = safe(hoofd.PartnerID);

    /* ======================= KIND / HKIND / PHKIND LOGICA ======================= */
    // 1️⃣ KindID → kind van hoofd + partner
    const KindID = data
        .filter(p => safe(p.VaderID) === hoofdId && safe(p.MoederID) === PHoofdID) // Alleen kinderen van beide
        .map(p => p.ID);                                                         // Haal ID's op

    // 2️⃣ HKindID → kind van hoofd alleen (niet partner)
    const HKindID = data
        .filter(p => safe(p.VaderID) === hoofdId && safe(p.MoederID) !== PHoofdID) // Alleen kinderen van hoofd
        .map(p => p.ID);

    // 3️⃣ PHKindID → partner van KindID
    const PHKindID = KindID.map(id => {                                           
        const k = data.find(p => p.ID === id);                                    // Zoek kind object
        return k && k.PartnerID ? k.PartnerID : null;                             // Geef partner ID of null
    }).filter(Boolean);                                                           // Verwijder nulls

    /* ======================= BROER/ZUS EN PARTNERS blijven ongewijzigd ======================= */
    const BZID = data.filter(p=>{
        const pid=safe(p.ID); 
        if(pid===hoofdId || pid===PHoofdID || KindID.includes(pid) || HKindID.includes(pid)) return false;
        return (VHoofdID && safe(p.VaderID)===VHoofdID) || (MHoofdID && safe(p.MoederID)===MHoofdID);
    }).map(p=>p.ID);

    const BZPartnerID = BZID.map(id=>{
        const s = data.find(p=>p.ID===id);
        return s && s.PartnerID ? s.PartnerID : null;
    }).filter(Boolean);

    /* ======================= BOUW RELATIE OBJECT ======================= */
    return data.map(p=>{
        const pid = safe(p.ID);
        const clone={...p}; clone.Relatie=''; clone._priority=99;        // Clone voor render, dataset blijft intact

        if(pid===hoofdId){clone.Relatie='HoofdID'; clone._priority=1;}
        else if(pid===PHoofdID){clone.Relatie='PHoofdID'; clone._priority=2;}
        else if(KindID.includes(pid)){clone.Relatie='KindID'; clone._priority=3;}
        else if(HKindID.includes(pid)){clone.Relatie='HKindID'; clone._priority=3.5;}
        else if(PHKindID.includes(pid)){clone.Relatie='PHKindID'; clone._priority=4;}
        else if(BZID.includes(pid)){clone.Relatie='BZID'; clone._priority=4.5;}
        else if(BZPartnerID.includes(pid)){clone.Relatie='BZPartnerID'; clone._priority=5;}

        return clone;
    }).sort((a,b)=>a._priority - b._priority);                                  // Sorteer op prioriteit
}

/* ======================= TEXTAREA HOOGTE ======================= */
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
        const kp=contextData.find(p=>p.Relatie==='PHKindID' && p.ID===k.PartnerID); if(kp) renderQueue.push(kp);
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
        if(p.Relatie) tr.classList.add(`rel-${p.Relatie.toLowerCase()}`);
        COLUMNS.forEach(col=>{
            const td=document.createElement('td');
            if(col.key==='Relatie'){td.textContent=relatieLabel;}
            else if(col.readonly){td.textContent=p[col.key]||'';}
            else{
                const ta=document.createElement('textarea');
                ta.value=p[col.key]||'';
                ta.dataset.field=col.key;
                ta.style.width='100%'; ta.style.boxSizing='border-box'; 
                ta.style.resize='vertical';
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
            ta.style.width='100%'; td.style.boxSizing='border-box';
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

/* ======================= LIVE SEARCH ======================= */
function liveSearch(){
    const term = safe(searchInput.value).toLowerCase();
    document.getElementById('searchPopup')?.remove();
    if(!term) return;

    const results = dataset.filter(p=>safe(p.ID).toLowerCase().includes(term)
        || safe(p.Roepnaam).toLowerCase().includes(term)
        || safe(p.Achternaam).toLowerCase().includes(term));

    const rect=searchInput.getBoundingClientRect();
    const popup=document.createElement('div');
    popup.id='searchPopup';
    popup.style.position='absolute';
    popup.style.background='#fff';
    popup.style.border='1px solid #999';
    popup.style.zIndex=1000;
    popup.style.top=rect.bottom+window.scrollY+5+'px';
    popup.style.left=Math.max(rect.left+window.scrollX,20)+'px';
    popup.style.width=(rect.width*1.2)+'px';
    popup.style.maxHeight='600px';
    popup.style.overflowY='auto';
    popup.style.fontSize='1.5rem';
    popup.style.padding='8px';
    popup.style.borderRadius='5px';
    popup.style.boxShadow='0 3px 6px rgba(0,0,0,0.2)';

    if(results.length===0){
        const row=document.createElement('div');
        row.textContent='Geen resultaten';
        row.style.padding='8px'; row.style.fontSize='1.3rem';
        popup.appendChild(row);
    } else {
        results.forEach(p=>{
            const row=document.createElement('div');
            row.textContent=`${p.ID} | ${p.Roepnaam} | ${p.Achternaam}`;
            row.style.padding='8px';
            row.style.cursor='pointer';
            row.style.fontSize='1.3rem';
            row.addEventListener('click',()=>{
                selectedHoofdId=safe(p.ID);
                popup.remove();
                renderTable(dataset);
            });
            popup.appendChild(row);
        });
    }
    document.body.appendChild(popup);
}

/* ======================= INIT ======================= */
function init(){
    buildHeader();
    renderTable(dataset);

    addBtn.addEventListener('click',addRow);
    saveBtn.addEventListener('click',saveDatasetMerged);
    refreshBtn.addEventListener('click',()=>renderTable(dataset));
    exportJsonBtn?.addEventListener('click',exportJSON);
    exportCsvBtn?.addEventListener('click',exportCSV);
    searchInput.addEventListener('input',liveSearch);

    document.addEventListener('click',e=>{
        const popup=document.getElementById('searchPopup');
        if(popup && !popup.contains(e.target) && e.target!==searchInput) popup.remove();
    });
}

init();

/* ======================= ID GENERATOR ======================= */
function genereerCode(persoon,bestaande){
    const letters=(persoon.Doopnaam[0]||'')+(persoon.Roepnaam[0]||'')+(persoon.Achternaam[0]||'')+(persoon.Geslacht[0]||'X');
    const bestaandeIDs=new Set(bestaande.map(p=>p.ID));
    let code;
    do{ code=letters+Math.floor(100+Math.random()*900); } while(bestaandeIDs.has(code));
    return code;
}

})();
