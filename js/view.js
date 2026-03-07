// ======================= view.js v1.2.4 =======================
// vis-network voor stamboom
// live search manage geplaatst + Broers/Zussen lijst
(function(){
'use strict'; // activeer strict mode zodat JS veiliger werkt

// =======================
// DOM-elementen
// =======================
const tableBody   = document.querySelector('#viewTable tbody'); // tbody van tabel
const theadRow    = document.querySelector('#viewTable thead tr'); // header rij
const addBtn      = document.getElementById('addBtn'); // knop nieuwe rij
const saveBtn     = document.getElementById('saveBtn'); // knop opslaan
const refreshBtn  = document.getElementById('refreshBtn'); // knop refresh
const searchInput = document.getElementById('searchPerson'); // zoekveld
const treeBox     = document.getElementById('treeContainer'); // container voor genealogische boom
const siblingsList = document.getElementById('siblingsList'); // container voor broer/zus lijst

// =======================
// State
// =======================
let dataset = window.StamboomStorage.get() || []; // laad dataset uit storage
let selectedHoofdId = null; // geselecteerde persoon
let tempRowCount = 0; // teller voor nieuwe rijen

// =======================
// Helpers
// =======================
function safe(val){ return val ? String(val).trim() : ''; } // voorkomt undefined errors

// =======================
// BOOM ENGINE
// =======================
function nodeLabel(p){ // maak leesbare naam
    return `${safe(p.Roepnaam)} ${safe(p.Achternaam)} (${safe(p.ID)})`; // combineer naam en ID
}

function createNode(p){ // genereer HTML element
    const div = document.createElement('div'); // maak div
    div.className = 'tree-node'; // css class
    div.textContent = nodeLabel(p); // toon naam
    div.dataset.id = p.ID; // bewaar ID in dataset
    return div; // return node
}

function findPerson(id){ // zoek persoon in dataset
    return dataset.find(p=>safe(p.ID)===safe(id)); // return match
}

function findChildren(id){ // zoek kinderen van persoon
    return dataset.filter(p=>safe(p.VaderID)===safe(id)||safe(p.MoederID)===safe(id)); // filter dataset
}

function buildTree(rootID){ // hoofd functie voor boom
    treeBox.innerHTML=''; // leeg container
    if(!rootID){ treeBox.textContent='Selecteer een persoon'; return; } // geen selectie
    const root = findPerson(rootID); if(!root){ treeBox.textContent='Persoon niet gevonden'; return; } // controle

    const rootNode = createNode(root); // maak node
    const rootWrapper = document.createElement('div'); rootWrapper.className='tree-root'; rootWrapper.appendChild(rootNode); // wrapper + root

    treeBox.appendChild(rootWrapper); // plaats in container

    // ouders
    const parents = document.createElement('div'); parents.className='tree-parents';
    if(root.VaderID){ const v = findPerson(root.VaderID); if(v) parents.appendChild(createNode(v)); }
    if(root.MoederID){ const m = findPerson(root.MoederID); if(m) parents.appendChild(createNode(m)); }
    if(parents.children.length>0){ treeBox.prepend(parents); }

    // partner
    if(root.PartnerID){ const partner = findPerson(root.PartnerID); if(partner){ rootWrapper.appendChild(createNode(partner)); } }

    // kinderen
    const kids = findChildren(rootID);
    if(kids.length>0){
        const kidsWrap = document.createElement('div'); kidsWrap.className='tree-children';
        kids.forEach(k=>kidsWrap.appendChild(createNode(k)));
        treeBox.appendChild(kidsWrap);
    }

    renderSiblings(rootID); // update broer/zus lijst naast boom
}

// redraw boom
function renderTree(){ buildTree(selectedHoofdId); } // teken boom

// =======================
// Broers/Zussen lijst
// =======================
function renderSiblings(rootID){ // toon broers/zussen
    siblingsList.innerHTML=''; // leeg lijst
    if(!rootID) return; // geen selectie
    const persoon = findPerson(rootID); // huidige persoon
    if(!persoon) return; // check

    // broers/zussen vinden: zelfde ouders, andere ID
    const siblings = dataset.filter(p=>
        (safe(p.VaderID)===safe(persoon.VaderID) && safe(p.MoederID)===safe(persoon.MoederID)) &&
        safe(p.ID)!==safe(rootID)
    );

    if(siblings.length===0){ 
        const li = document.createElement('li'); li.textContent='Geen broers/zussen'; siblingsList.appendChild(li); return;
    }

    siblings.forEach(s=>{
        const li = document.createElement('li'); // maak list item
        li.textContent=`${safe(s.Roepnaam)} ${safe(s.Achternaam)} (${safe(s.ID)})`; // label
        li.addEventListener('click',()=>{ selectedHoofdId=s.ID; renderTree(); }); // klik selecteert
        siblingsList.appendChild(li); // toevoegen aan lijst
    });
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
];

// =======================
// Header
// =======================
function buildHeader(){ theadRow.innerHTML=''; COLUMNS.forEach(col=>{ const th=document.createElement('th'); th.textContent=col.key; theadRow.appendChild(th); }); }

// =======================
// Render Table
// =======================
function renderTable(dataset){
    if(!selectedHoofdId){ showPlaceholder('Selecteer een persoon'); renderTree(); return; }
    const persoon = dataset.find(p=>safe(p.ID)===safe(selectedHoofdId));
    tableBody.innerHTML='';
    if(!persoon){ showPlaceholder('Geen persoon'); renderTree(); return; }

    const tr=document.createElement('tr');
    COLUMNS.forEach(col=>{
        const td=document.createElement('td');
        if(col.readonly){ td.textContent=persoon[col.key]||''; } 
        else{ const textarea=document.createElement('textarea'); textarea.value=persoon[col.key]||''; textarea.dataset.field=col.key; td.appendChild(textarea); }
        tr.appendChild(td);
    });
    tableBody.appendChild(tr);
    renderTree(); // update boom + B/Z
}

// =======================
// Placeholder
// =======================
function showPlaceholder(msg){ const tr=document.createElement('tr'); const td=document.createElement('td'); td.colSpan=COLUMNS.length; td.textContent=msg; td.style.textAlign='center'; tr.appendChild(td); tableBody.appendChild(tr); }

// =======================
// Refresh
// =======================
function refreshTable(){ dataset=window.StamboomStorage.get()||[]; if(!selectedHoofdId && dataset.length>0) selectedHoofdId=dataset[0].ID; renderTable(dataset); }

// =======================
// Live Search
// =======================
function liveSearch(){
    const term = safe(searchInput.value).toLowerCase(); // zoekterm
    document.getElementById('searchPopup')?.remove(); // oude popup weg
    if(!term) return; // stop bij leeg

    const results = dataset.filter(p=> // filter dataset
        safe(p.ID).toLowerCase().includes(term) || 
        safe(p.Roepnaam).toLowerCase().includes(term) || 
        safe(p.Achternaam).toLowerCase().includes(term)
    );

    const rect = searchInput.getBoundingClientRect(); // positie zoekveld
    const popup = document.createElement('div'); popup.id='searchPopup'; popup.style.position='absolute';
    popup.style.background='#fff'; popup.style.border='1px solid #999'; popup.style.zIndex=1000;
    popup.style.top=rect.bottom+window.scrollY+'px'; popup.style.left=rect.left+window.scrollX+'px';
    popup.style.width=rect.width+'px'; popup.style.maxHeight='200px'; popup.style.overflowY='auto';

    results.forEach(p=>{ const row=document.createElement('div'); row.textContent=`${p.ID} | ${p.Roepnaam} | ${p.Achternaam}`; row.style.padding='5px'; row.style.cursor='pointer';
        row.addEventListener('click',()=>{ selectedHoofdId = safe(p.ID); popup.remove(); renderTable(dataset); }); popup.appendChild(row);
    });

    if(results.length===0){ const row=document.createElement('div'); row.textContent='Geen resultaten'; row.style.padding='5px'; popup.appendChild(row); }

    document.body.appendChild(popup); // toon popup
}

// =======================
// Init
// =======================
buildHeader(); // bouw header
refreshTable(); // laad tabel
searchInput.addEventListener('input',liveSearch); // activeer live search
refreshBtn.addEventListener('click',refreshTable); // refresh knop

})();
