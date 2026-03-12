/* ======================= manage.js v1.3.17 ======================= */
/* Drop-in, 14 kolommen, INIT + live search fix + popup + CSV compatible */

(function(){
'use strict';

/* ======================= HELPERS ======================= */
function safe(val){ return val ? String(val).trim() : ''; } // veilige string
function parseDate(d){ 
    if(!d) return new Date(0); 
    const parts = d.split('-'); 
    if(parts.length!==3) return new Date(0); 
    return new Date(parts.reverse().join('-')); 
}

/* ======================= STORAGE ======================= */
const StamboomStorage = {
    get:()=> JSON.parse(localStorage.getItem('stamboom_v0_0_2')||'[]'),
    set:(data)=> localStorage.setItem('stamboom_v0_0_2', JSON.stringify(data))
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
let dataset = StamboomStorage.get(); 
let selectedHoofdId = dataset.length>0?dataset[0].ID:null; 
let tempRowCount=0; 

/* ======================= MIGRATIE ======================= */
function migrateDataset(oldData){
    return oldData.map(p=>{
        const clone = {...p};
        COLUMNS.forEach(c=>{ if(!(c.key in clone)) clone[c.key]=''; });
        return clone;
    });
}
dataset = migrateDataset(dataset); 
StamboomStorage.set(dataset);

/* ======================= ID GENERATOR ======================= */
function genereerCode(persoon,bestaande){
    const letters = (persoon.Doopnaam[0]||'') + (persoon.Roepnaam[0]||'') + (persoon.Achternaam[0]||'') + (persoon.Geslacht[0]||'X');
    const bestaandeIDs=new Set(bestaande.map(p=>p.ID));
    let code;
    do { code = letters + Math.floor(100+Math.random()*900); } 
    while(bestaandeIDs.has(code));
    return code;
}

/* ======================= DOM ELEMENTEN ======================= */
const tableBody   = document.querySelector('#manageTable tbody');
const theadRow    = document.querySelector('#manageTable thead tr');
const addBtn      = document.getElementById('addBtn');
const saveBtn     = document.getElementById('saveBtn');
const refreshBtn  = document.getElementById('refreshBtn');
const searchInput = document.getElementById('searchPerson');

/* ======================= BUILD HEADER ======================= */
function buildHeader(){
    theadRow.innerHTML='';
    COLUMNS.forEach(col=>{
        const th=document.createElement('th');
        th.textContent=col.key;
        theadRow.appendChild(th);
    });
}

/* ======================= RELATIE ENGINE ======================= */
function computeRelaties(data,hoofdId){
    if(!hoofdId) return [];
    const hoofd = data.find(p=>p.ID===hoofdId); if(!hoofd) return [];
    const VHoofdID=hoofd.VaderID,MHoofdID=hoofd.MoederID,PHoofdID=hoofd.PartnerID;
    const KindID=data.filter(p=>p.VaderID===hoofdId || p.MoederID===hoofdId || (PHoofdID && (p.VaderID===PHoofdID||p.MoederID===PHoofdID))).map(p=>p.ID);
    const BZID=data.filter(p=>{ const pid=p.ID; if(pid===hoofdId || KindID.includes(pid)||pid===PHoofdID) return false; return (VHoofdID && p.VaderID===VHoofdID) || (MHoofdID && p.MoederID===MHoofdID); }).map(p=>p.ID);
    const KindPartnerID=KindID.map(id=>{const k=data.find(p=>p.ID===id); return k&&k.PartnerID?k.PartnerID:null;}).filter(Boolean);
    const BZPartnerID=BZID.map(id=>{const s=data.find(p=>p.ID===id); return s&&s.PartnerID?s.PartnerID:null;}).filter(Boolean);
    return data.map(p=>{
        const pid=p.ID, clone={...p}; clone.Relatie=''; clone._priority=99;
        if(pid===hoofdId){clone.Relatie='HoofdID'; clone._priority=1;}
        else if(pid===VHoofdID||pid===MHoofdID){clone.Relatie=pid===VHoofdID?'VHoofdID':'MHoofdID'; clone._priority=0;}
        else if(pid===PHoofdID){clone.Relatie='PHoofdID'; clone._priority=2;}
        else if(KindID.includes(pid)){clone.Relatie='KindID'; clone._priority=3;}
        else if(KindPartnerID.includes(pid)){clone.Relatie='KindPartnerID'; clone._priority=3.5;}
        else if(BZID.includes(pid)){clone.Relatie='BZID'; clone._priority=4;}
        else if(BZPartnerID.includes(pid)){clone.Relatie='BZPartnerID'; clone._priority=4.5;}
        return clone;
    }).sort((a,b)=>a._priority-b._priority);
}

/* ======================= DYNAMISCHE TEXTAREA HOOGTE ======================= */
function adjustTextareas(){
    tableBody.querySelectorAll('textarea').forEach(ta=>{
        ta.style.height='auto';
        const maxH=120;
        if(ta.scrollHeight>maxH){ta.style.height=maxH+'px'; ta.style.overflowY='auto';}
        else{ta.style.height=ta.scrollHeight+'px'; ta.style.overflowY='hidden';}
    });
}

/* ======================= RENDER TABLE ======================= */
function renderTable(dataset){
    if(!selectedHoofdId){ showPlaceholder('Selecteer een persoon'); return; }
    const contextData=computeRelaties(dataset,selectedHoofdId);
    if(!contextData.length){ showPlaceholder('Geen personen gevonden'); return; }

    tableBody.innerHTML='';
    const renderQueue=[];

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
    if(tempRowCount>=10){alert('Maximaal 10 rijen toegevoegd. Klik Opslaan om verder te gaan.'); return;}
    const tr=document.createElement('tr');
    COLUMNS.forEach(col=>{
        const td=document.createElement('td');
        if(col.readonly){ td.textContent=''; } 
        else { 
            const ta=document.createElement('textarea'); 
            ta.value=''; 
            ta.dataset.field=col.key; 
            ta.style.width='100%'; 
            ta.style.boxSizing='border-box'; 
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
        alert('Dataset succesvol opgeslagen (merged met bestaande data)');
    }catch(e){alert(`Opslaan mislukt: ${e.message}`); console.error(e);}
}

/* ======================= REFRESH ======================= */
function refreshTable(){ 
    dataset=StamboomStorage.get(); 
    if(!selectedHoofdId && dataset.length>0) selectedHoofdId=dataset[0].ID; 
    renderTable(dataset); 
}

/* ======================= LIVE SEARCH ======================= */
function liveSearch(){
    const term=safe(searchInput.value).toLowerCase(); 

    // verwijder oude popup
    document.getElementById('searchPopup')?.remove(); 

    if(!term) return;

    // filter dataset
    const results=dataset.filter(p=>safe(p.ID).toLowerCase().includes(term) 
        || safe(p.Roepnaam).toLowerCase().includes(term) 
        || safe(p.Achternaam).toLowerCase().includes(term));

    // input positie
    const rect=searchInput.getBoundingClientRect();

    const popup=document.createElement('div'); 
    popup.id='searchPopup'; 
    popup.style.position='absolute';
    popup.style.background='#fff'; 
    popup.style.border='1px solid #999';
    popup.style.zIndex=1000;
    popup.style.top=rect.bottom+window.scrollY+'px';
    popup.style.left=Math.max(rect.left+window.scrollX,5)+'px';
    popup.style.width=rect.width+'px';
    popup.style.maxHeight='300px';
    popup.style.overflowY='auto';
    popup.style.fontSize='1.3rem';
    popup.style.padding='8px';
    popup.style.borderRadius='5px';
    popup.style.boxShadow='0 3px 6px rgba(0,0,0,0.2)';

    if(results.length===0){
        const row=document.createElement('div'); 
        row.textContent='Geen resultaten'; 
        row.style.padding='8px'; 
        row.style.fontSize='1.3rem';
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

    // event listeners
    searchInput.addEventListener('input',liveSearch);
    addBtn.addEventListener('click',addRow);
    saveBtn.addEventListener('click',saveDatasetMerged);
    refreshBtn.addEventListener('click',refreshTable);

    // klik buiten popup sluit
    document.addEventListener('click',e=>{
        const popup=document.getElementById('searchPopup'); 
        if(popup && !popup.contains(e.target) && e.target!==searchInput) popup.remove();
    });
}

init();

})();
