// ======================= view.js v1.2.10 =======================
// Live search + siblings fix + init fix
(function(){
'use strict'; // voorkomt onbedoelde globale variabelen

// =======================
// DOM-elementen
// =======================
const treeBox      = document.getElementById('treeContainer');   // container waar de boom wordt opgebouwd
const siblingsList = document.getElementById('siblingsList');    // lijst met broers/zussen
const searchInput  = document.getElementById('searchPerson');    // live search input
const refreshBtn   = document.getElementById('refreshBtn');      // refresh knop (optioneel)

// =======================
// State
// =======================
let dataset = window.StamboomStorage.get() || []; // dataset ophalen uit storage
let selectedHoofdId = null;                       // hoofdpersoon start leeg, live search bepaalt wie

// =======================
// Helpers
// =======================
function safe(val){ return val ? String(val).trim() : ''; }   // voorkomt null of undefined
function nodeLabel(p){                                        // label voor node maken
    return `${safe(p.Roepnaam)} ${safe(p.Achternaam)} (${safe(p.ID)})`; // naam + ID
}

// =======================
// NODE CREATOR
// =======================
function createNode(p,rel){
    const div = document.createElement('div');              // maak een div element voor persoon
    div.className = 'tree-node';                            // basis CSS class
    if(rel) div.classList.add(rel);                         // voeg relatie class toe (kleur)
    div.textContent = nodeLabel(p);                         // label in node tonen
    div.dataset.id = p.ID;                                  // ID opslaan als dataset attribuut

    div.addEventListener('click', () => {                   // klik event op node
        selectedHoofdId = p.ID;                             // klik → nieuwe hoofdpersoon
        renderTree();                                       // boom renderen
    });

    return div;                                             // return de gemaakte node
}

// =======================
// DATA HELPERS
// =======================
function findPerson(id){
    return dataset.find(p => safe(p.ID) === safe(id));      // zoek persoon op ID
}
function findChildren(id){
    return dataset.filter(p =>
        safe(p.VaderID) === safe(id) ||                     // kinderen via vader
        safe(p.MoederID) === safe(id)                       // kinderen via moeder
    );
}

// =======================
// BOOM BUILDER
// =======================
function buildTree(rootID){
    treeBox.innerHTML = '';                                  // leegmaken container
    if(!rootID){                                             // geen hoofdpersoon geselecteerd
        treeBox.textContent = 'Selecteer een persoon';       // instructie tonen
        return;
    }

    const root = findPerson(rootID);                         // hoofdpersoon ophalen
    if(!root){                                               // controle of persoon bestaat
        treeBox.textContent = 'Persoon niet gevonden';
        return;
    }

    // ===== ROOT =====
    const rootNode = createNode(root,'rel-hoofd');           // maak node voor hoofdpersoon
    const rootWrapper = document.createElement('div');       // wrapper voor root + partner
    rootWrapper.className = 'tree-root';                     // CSS structuur
    rootWrapper.appendChild(rootNode);                       // node toevoegen aan wrapper
    treeBox.appendChild(rootWrapper);                        // wrapper in boom plaatsen

    // ===== OUDERS =====
    const parents = document.createElement('div');           // container ouders
    parents.className = 'tree-parents';
    if(root.VaderID){                                        // vader aanwezig?
        const v = findPerson(root.VaderID);
        if(v) parents.appendChild(createNode(v,'rel-vhoofdid')); // vader toevoegen
    }
    if(root.MoederID){                                       // moeder aanwezig?
        const m = findPerson(root.MoederID);
        if(m) parents.appendChild(createNode(m,'rel-mhoofdid')); // moeder toevoegen
    }
    if(parents.children.length > 0){
        treeBox.prepend(parents);                           // ouders tonen boven root
    }

    // ===== PARTNER =====
    if(root.PartnerID){                                      // partner aanwezig?
        const partner = findPerson(root.PartnerID);
        if(partner){
            rootWrapper.appendChild(createNode(partner,'rel-phoofdid')); // partner toevoegen
        }
    }

    // ===== KINDEREN =====
    const kids = findChildren(rootID);                       // kinderen ophalen
    if(kids.length > 0){
        const kidsWrap = document.createElement('div');      // container kinderen
        kidsWrap.className = 'tree-children';
        kids.forEach(k => {                                  // elk kind doorlopen
            kidsWrap.appendChild(createNode(k,'rel-kindid'));// kind node toevoegen
        });
        treeBox.appendChild(kidsWrap);                       // container toevoegen
    }

    renderSiblings(rootID);                                  // broers/zussen renderen
}

function renderTree(){ buildTree(selectedHoofdId); }         // wrapper functie voor render

// =======================
// BROERS / ZUSSEN
// =======================
function renderSiblings(rootID){
    siblingsList.innerHTML = '';                             // lijst leegmaken
    if(!rootID) return;                                      // geen hoofdpersoon
    const persoon = findPerson(rootID);                      // hoofdpersoon ophalen
    if(!persoon) return;

    const siblings = dataset.filter(p =>
        safe(p.VaderID) === safe(persoon.VaderID) &&
        safe(p.MoederID) === safe(persoon.MoederID) &&
        safe(p.ID) !== safe(rootID)                          // zichzelf uitsluiten
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
        li.addEventListener('click', () => {                 // klik → nieuwe hoofdpersoon
            selectedHoofdId = s.ID;
            renderTree();
        });
        siblingsList.appendChild(li);                        // li toevoegen aan lijst
    });
}

// =======================
// LIVE SEARCH
// =======================
function liveSearch(){
    const term = safe(searchInput.value).toLowerCase();      // zoekterm ophalen
    document.getElementById('searchPopup')?.remove();        // oude popup verwijderen

    if(!term) return;                                        // leeg zoekveld → niets doen

    const results = dataset.filter(p =>                      // filter dataset
        safe(p.ID).toLowerCase().includes(term) ||
        safe(p.Roepnaam).toLowerCase().includes(term) ||
        safe(p.Achternaam).toLowerCase().includes(term)
    );

    // ===== eerste match automatisch hoofdpersoon =====
    if(results.length > 0){
        selectedHoofdId = safe(results[0].ID);              // eerste match als hoofdpersoon
        renderTree();                                       // boom renderen
    }

    // ===== popup voor resultaten =====
    const rect = searchInput.getBoundingClientRect();       // positie zoekveld
    const popup = document.createElement('div');            // popup container
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
        const row = document.createElement('div');           // resultaat rij
        row.textContent = `${p.ID} | ${p.Roepnaam} | ${p.Achternaam}`;
        row.style.padding = '5px';
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => {               // klik → hoofdpersoon selecteren
            selectedHoofdId = safe(p.ID);
            popup.remove();
            renderTree();
        });
        popup.appendChild(row);                              // rij toevoegen
    });

    if(results.length === 0){                               // geen resultaten
        const row = document.createElement('div');
        row.textContent = 'Geen resultaten';
        row.style.padding = '5px';
        popup.appendChild(row);
    }

    document.body.appendChild(popup);                       // popup tonen
}

// =======================
// INIT
// =======================
function refreshView(){
    dataset = window.StamboomStorage.get() || [];            // dataset opnieuw laden
    renderTree();                                            // renderen zonder init hoofdpersoon
}

refreshView();                                               // eerste render
searchInput.addEventListener('input', liveSearch);          // live search activeren
if(refreshBtn) refreshBtn.addEventListener('click', refreshView); // refresh knop
})();
