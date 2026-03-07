// ======================= view.js v1.2.2 =======================
// vis-network voor stamboom
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
// BOOM ENGINE (±120 regels)
// =======================

// maak node label
function nodeLabel(p){ // maak leesbare naam
    return `${safe(p.Roepnaam)} ${safe(p.Achternaam)} (${safe(p.ID)})`; // combineer naam en ID
}

// maak HTML node
function createNode(p){ // genereer HTML element
    const div = document.createElement('div'); // maak div
    div.className = 'tree-node'; // css class
    div.textContent = nodeLabel(p); // toon naam
    div.dataset.id = p.ID; // bewaar ID in dataset
    return div; // return node
}

// vind persoon
function findPerson(id){ // zoek persoon in dataset
    return dataset.find(p=>safe(p.ID)===safe(id)); // return match
}

// kinderen ophalen
function findChildren(id){ // zoek kinderen van persoon
    return dataset.filter(p=> // filter dataset
        safe(p.VaderID)===safe(id) || // vader match
        safe(p.MoederID)===safe(id) // moeder match
    );
}

// bouw boom
function buildTree(rootID){ // hoofd functie voor boom
    treeBox.innerHTML=''; // leeg container

    if(!rootID){ // geen persoon geselecteerd
        treeBox.textContent='Selecteer een persoon'; // toon melding
        return; // stop
    }

    const root = findPerson(rootID); // zoek hoofd
    if(!root){ // controle
        treeBox.textContent='Persoon niet gevonden'; // foutmelding
        return; // stop
    }

    const rootNode = createNode(root); // maak node
    const rootWrapper = document.createElement('div'); // wrapper
    rootWrapper.className='tree-root'; // css class
    rootWrapper.appendChild(rootNode); // voeg node toe

    treeBox.appendChild(rootWrapper); // plaats in container

    // ouders
    const parents = document.createElement('div'); // container ouders
    parents.className='tree-parents'; // css class

    if(root.VaderID){ // check vader
        const v = findPerson(root.VaderID); // zoek vader
        if(v) parents.appendChild(createNode(v)); // voeg toe
    }

    if(root.MoederID){ // check moeder
        const m = findPerson(root.MoederID); // zoek moeder
        if(m) parents.appendChild(createNode(m)); // voeg toe
    }

    if(parents.children.length>0){ // als ouders bestaan
        treeBox.prepend(parents); // plaats boven root
    }

    // partner
    if(root.PartnerID){ // check partner
        const partner = findPerson(root.PartnerID); // zoek partner
        if(partner){ // controle
            const pNode = createNode(partner); // node partner
            rootWrapper.appendChild(pNode); // naast root plaatsen
        }
    }

    // kinderen
    const kids = findChildren(rootID); // haal kinderen op

    if(kids.length>0){ // als kinderen bestaan
        const kidsWrap = document.createElement('div'); // container
        kidsWrap.className='tree-children'; // css class

        kids.forEach(k=>{ // loop kinderen
            const kNode = createNode(k); // maak node
            kidsWrap.appendChild(kNode); // voeg toe
        });

        treeBox.appendChild(kidsWrap); // plaats onder root
    }
}

// redraw boom
function renderTree(){ // aparte render functie
    buildTree(selectedHoofdId); // teken boom voor geselecteerde persoon
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
function buildHeader(){
    theadRow.innerHTML=''; // reset header
    COLUMNS.forEach(col=>{ // loop kolommen
        const th=document.createElement('th'); // nieuwe cel
        th.textContent=col.key; // naam kolom
        theadRow.appendChild(th); // toevoegen
    });
}

// =======================
// Render Table
// =======================
function renderTable(dataset){
    if(!selectedHoofdId){ // geen selectie
        showPlaceholder('Selecteer een persoon'); // melding
        renderTree(); // update boom
        return;
    }

    const persoon = dataset.find(p=>safe(p.ID)===safe(selectedHoofdId)); // zoek persoon

    tableBody.innerHTML=''; // reset tabel

    if(!persoon){ // controle
        showPlaceholder('Geen persoon'); // melding
        renderTree(); // update boom
        return;
    }

    const tr=document.createElement('tr'); // rij

    COLUMNS.forEach(col=>{ // kolommen
        const td=document.createElement('td'); // cel

        if(col.readonly){ // readonly kolom
            td.textContent=persoon[col.key]||''; // toon waarde
        } else { // editable
            const textarea=document.createElement('textarea'); // textarea
            textarea.value=persoon[col.key]||''; // vul waarde
            textarea.dataset.field=col.key; // veldnaam
            td.appendChild(textarea); // toevoegen
        }

        tr.appendChild(td); // voeg cel toe
    });

    tableBody.appendChild(tr); // voeg rij toe

    renderTree(); // teken genealogische boom
}

// =======================
// Placeholder
// =======================
function showPlaceholder(msg){
    tableBody.innerHTML=''; // reset tabel
    const tr=document.createElement('tr'); // rij
    const td=document.createElement('td'); // cel
    td.colSpan=COLUMNS.length; // span kolommen
    td.textContent=msg; // toon tekst
    td.style.textAlign='center'; // center
    tr.appendChild(td); // toevoegen
    tableBody.appendChild(tr); // toevoegen
}

// =======================
// Refresh
// =======================
function refreshTable(){
    dataset=window.StamboomStorage.get()||[]; // herlaad dataset
    if(!selectedHoofdId && dataset.length>0) // fallback selectie
        selectedHoofdId=dataset[0].ID; // eerste persoon
    renderTable(dataset); // render tabel
}

// =======================
// Live Search
// =======================
function liveSearch(){
    const term=safe(searchInput.value).toLowerCase(); // zoekterm
    document.getElementById('searchPopup')?.remove(); // oude popup weg
    if(!term) return; // stop bij leeg

    const results=dataset.filter(p=> // filter dataset
        safe(p.ID).toLowerCase().includes(term) || // match ID
        safe(p.Roepnaam).toLowerCase().includes(term) || // match roepnaam
        safe(p.Achternaam).toLowerCase().includes(term) // match achternaam
    );

    const rect=searchInput.getBoundingClientRect(); // positie zoekveld
    const popup=document.createElement('div'); // popup
    popup.id='searchPopup'; // id

    popup.style.position='absolute'; // absolute positie
    popup.style.background='#fff'; // witte achtergrond
    popup.style.border='1px solid #999'; // rand
    popup.style.zIndex=1000; // boven andere elementen
    popup.style.top=rect.bottom+window.scrollY+'px'; // plaats onder zoekveld
    popup.style.left=rect.left+window.scrollX+'px'; // uitlijnen links
    popup.style.width=rect.width+'px'; // zelfde breedte

    results.forEach(p=>{ // loop resultaten
        const row=document.createElement('div'); // resultaat rij
        row.textContent=`${p.ID} | ${p.Roepnaam} | ${p.Achternaam}`; // label
        row.style.padding='5px'; // spacing
        row.style.cursor='pointer'; // klik cursor

        row.addEventListener('click',()=>{ // klik event
            selectedHoofdId=safe(p.ID); // selecteer persoon
            popup.remove(); // sluit popup
            renderTable(dataset); // render tabel + boom
        });

        popup.appendChild(row); // voeg toe
    });

    document.body.appendChild(popup); // plaats popup
}

// =======================
// Init
// =======================
buildHeader(); // bouw header
refreshTable(); // laad tabel
searchInput.addEventListener('input',liveSearch); // activeer live search
refreshBtn.addEventListener('click',refreshTable); // refresh knop

})();
