// ======================= view.js v1.2.7 =======================
// vis-network voor stamboom
// Live search + eerste match auto-select + Broers/Zussen lijst
(function(){
'use strict';

// =======================
// DOM-elementen
// =======================
const treeBox      = document.getElementById('treeContainer'); 
const siblingsList = document.getElementById('siblingsList');  
const searchInput  = document.getElementById('searchPerson'); 
const refreshBtn   = document.getElementById('refreshBtn');   

// =======================
// State
// =======================
let dataset = window.StamboomStorage.get() || []; 
let selectedHoofdId = null; 

// =======================
// Helpers
// =======================
function safe(val){ return val ? String(val).trim() : ''; } 

// =======================
// BOOM ENGINE
// =======================
function nodeLabel(p){ 
    return `${safe(p.Roepnaam)} ${safe(p.Achternaam)} (${safe(p.ID)})`; 
}

function createNode(p){ 
    const div = document.createElement('div'); 
    div.className = 'tree-node'; 
    div.textContent = nodeLabel(p); 
    div.dataset.id = p.ID; 
    return div; 
}

function findPerson(id){ 
    return dataset.find(p => safe(p.ID) === safe(id)); 
}

function findChildren(id){ 
    return dataset.filter(p => safe(p.VaderID) === safe(id) || safe(p.MoederID) === safe(id)); 
}

function buildTree(rootID){ 
    treeBox.innerHTML = ''; 
    if(!rootID){ 
        treeBox.textContent = 'Selecteer een persoon'; 
        return; 
    } 
    const root = findPerson(rootID); 
    if(!root){ 
        treeBox.textContent = 'Persoon niet gevonden'; 
        return; 
    } 

    const rootNode = createNode(root); 
    const rootWrapper = document.createElement('div'); 
    rootWrapper.className = 'tree-root'; 
    rootWrapper.appendChild(rootNode); 
    treeBox.appendChild(rootWrapper); 

    const parents = document.createElement('div'); 
    parents.className = 'tree-parents';
    if(root.VaderID){ const v = findPerson(root.VaderID); if(v) parents.appendChild(createNode(v)); }
    if(root.MoederID){ const m = findPerson(root.MoederID); if(m) parents.appendChild(createNode(m)); }
    if(parents.children.length>0){ treeBox.prepend(parents); }

    if(root.PartnerID){ const partner = findPerson(root.PartnerID); if(partner) rootWrapper.appendChild(createNode(partner)); }

    const kids = findChildren(rootID);
    if(kids.length>0){
        const kidsWrap = document.createElement('div'); 
        kidsWrap.className = 'tree-children';
        kids.forEach(k => kidsWrap.appendChild(createNode(k)));
        treeBox.appendChild(kidsWrap);
    }

    renderSiblings(rootID); 
}

function renderTree(){ buildTree(selectedHoofdId); }

// =======================
// Broers/Zussen lijst
// =======================
function renderSiblings(rootID){ 
    siblingsList.innerHTML = ''; 
    if(!rootID) return; 
    const persoon = findPerson(rootID); 
    if(!persoon) return; 

    const siblings = dataset.filter(p =>
        (safe(p.VaderID) === safe(persoon.VaderID) && safe(p.MoederID) === safe(persoon.MoederID)) &&
        safe(p.ID) !== safe(rootID)
    );

    if(siblings.length === 0){ 
        const li = document.createElement('li'); 
        li.textContent = 'Geen broers/zussen'; 
        siblingsList.appendChild(li); 
        return;
    }

    siblings.forEach(s => {
        const li = document.createElement('li'); 
        li.textContent = `${safe(s.Roepnaam)} ${safe(s.Achternaam)} (${safe(s.ID)})`; 
        li.addEventListener('click', () => {
            selectedHoofdId = s.ID; 
            renderTree(); 
        }); 
        siblingsList.appendChild(li); 
    });
}

// =======================
// Live Search + auto-select eerste match
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

    if(results.length > 0 && !selectedHoofdId){
        selectedHoofdId = safe(results[0].ID); // eerste match auto-select
        renderTree(); 
    }

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

    results.forEach(p => { 
        const row = document.createElement('div'); 
        row.textContent = `${p.ID} | ${p.Roepnaam} | ${p.Achternaam}`; 
        row.style.padding = '5px'; 
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => {
            selectedHoofdId = safe(p.ID); 
            popup.remove(); 
            renderTree(); 
        }); 
        popup.appendChild(row);
    });

    if(results.length === 0){ 
        const row = document.createElement('div'); 
        row.textContent = 'Geen resultaten'; 
        row.style.padding = '5px'; 
        popup.appendChild(row); 
    }

    document.body.appendChild(popup); 
}

// =======================
// Init
// =======================
function refreshView(){ 
    dataset = window.StamboomStorage.get() || []; 
    if(!selectedHoofdId && dataset.length > 0){ selectedHoofdId = dataset[0].ID; } 
    renderTree(); 
}

refreshView(); 
searchInput.addEventListener('input', liveSearch); 
refreshBtn.addEventListener('click', refreshView); 

})();
