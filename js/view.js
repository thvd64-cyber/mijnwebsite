```javascript
// ======================= view.js v1.2.8 =======================
// Boom rendering + Live search + Broers/Zussen + relatie kleuren
// Nodes zijn klikbaar zodat je door de stamboom kan navigeren

(function(){
'use strict'; // voorkomt onbedoelde globale variabelen

// =======================
// DOM-elementen
// =======================

const treeBox      = document.getElementById('treeContainer');   // container waar de boom wordt opgebouwd
const siblingsList = document.getElementById('siblingsList');    // lijst met broers/zussen
const searchInput  = document.getElementById('searchPerson');    // zoekveld
const refreshBtn   = document.getElementById('refreshBtn');      // refresh knop

// =======================
// State
// =======================

let dataset = window.StamboomStorage.get() || []; // dataset laden uit storage
let selectedHoofdId = null;                       // huidige hoofd persoon in de boom

// =======================
// Helpers
// =======================

function safe(val){ return val ? String(val).trim() : ''; } // voorkomt null/undefined problemen

function nodeLabel(p){                                      // label voor node maken
    return `${safe(p.Roepnaam)} ${safe(p.Achternaam)} (${safe(p.ID)})`; // naam + ID tonen
}

// =======================
// NODE CREATOR
// =======================

function createNode(p,rel){                                  // node maken met relatie type
    const div = document.createElement('div');               // nieuwe div node maken
    div.className = 'tree-node';                             // basis CSS class
    if(rel) div.classList.add(rel);                          // relatie class toevoegen voor kleur
    div.textContent = nodeLabel(p);                          // label tonen
    div.dataset.id = p.ID;                                   // ID opslaan in dataset attribuut

    div.addEventListener('click', () => {                    // klik op node
        selectedHoofdId = p.ID;                              // nieuwe hoofd persoon zetten
        renderTree();                                        // boom opnieuw renderen
    });

    return div;                                              // node teruggeven
}

// =======================
// DATA HELPERS
// =======================

function findPerson(id){                                     // persoon zoeken op ID
    return dataset.find(p => safe(p.ID) === safe(id));
}

function findChildren(id){                                   // kinderen zoeken
    return dataset.filter(p =>
        safe(p.VaderID) === safe(id) ||
        safe(p.MoederID) === safe(id)
    );
}

// =======================
// BOOM BUILDER
// =======================

function buildTree(rootID){

    treeBox.innerHTML = '';                                  // container leeg maken

    if(!rootID){                                             // geen hoofd persoon
        treeBox.textContent = 'Selecteer een persoon';
        return;
    }

    const root = findPerson(rootID);                         // hoofd persoon ophalen

    if(!root){                                               // controle of persoon bestaat
        treeBox.textContent = 'Persoon niet gevonden';
        return;
    }

    // ===== ROOT =====

    const rootNode = createNode(root,'rel-hoofd');           // hoofd node met kleur

    const rootWrapper = document.createElement('div');       // wrapper voor root + partner
    rootWrapper.className = 'tree-root';                     // CSS structuur
    rootWrapper.appendChild(rootNode);                       // root toevoegen

    treeBox.appendChild(rootWrapper);                        // wrapper in boom plaatsen


    // ===== OUDERS =====

    const parents = document.createElement('div');           // container ouders
    parents.className = 'tree-parents';

    if(root.VaderID){                                        // vader aanwezig?
        const v = findPerson(root.VaderID);                  // vader ophalen
        if(v) parents.appendChild(createNode(v,'rel-vhoofdid')); // vader node toevoegen
    }

    if(root.MoederID){                                       // moeder aanwezig?
        const m = findPerson(root.MoederID);                 // moeder ophalen
        if(m) parents.appendChild(createNode(m,'rel-mhoofdid')); // moeder node toevoegen
    }

    if(parents.children.length > 0){                         // alleen tonen als ouders bestaan
        treeBox.prepend(parents);
    }


    // ===== PARTNER =====

    if(root.PartnerID){                                      // partner aanwezig?
        const partner = findPerson(root.PartnerID);          // partner zoeken
        if(partner){
            rootWrapper.appendChild(
                createNode(partner,'rel-phoofdid')           // partner node toevoegen
            );
        }
    }


    // ===== KINDEREN =====

    const kids = findChildren(rootID);                       // kinderen ophalen

    if(kids.length > 0){

        const kidsWrap = document.createElement('div');      // container kinderen
        kidsWrap.className = 'tree-children';

        kids.forEach(k => {                                  // elk kind doorlopen
            kidsWrap.appendChild(
                createNode(k,'rel-kindid')                   // kind node toevoegen
            );
        });

        treeBox.appendChild(kidsWrap);                       // kinderen container toevoegen
    }

    renderSiblings(rootID);                                  // broers/zussen lijst verversen
}

function renderTree(){ buildTree(selectedHoofdId); }         // wrapper voor boom render

// =======================
// BROERS / ZUSSEN
// =======================

function renderSiblings(rootID){

    siblingsList.innerHTML = '';                             // lijst leeg maken

    if(!rootID) return;                                      // geen hoofd persoon

    const persoon = findPerson(rootID);                      // hoofd persoon ophalen
    if(!persoon) return;

    const siblings = dataset.filter(p =>                    // broers/zussen bepalen
        safe(p.VaderID) === safe(persoon.VaderID) &&
        safe(p.MoederID) === safe(persoon.MoederID) &&
        safe(p.ID) !== safe(rootID)
    );

    if(siblings.length === 0){                               // geen siblings gevonden
        const li = document.createElement('li');
        li.textContent = 'Geen broers/zussen';
        siblingsList.appendChild(li);
        return;
    }

    siblings.forEach(s => {                                  // elke sibling tonen
        const li = document.createElement('li');

        li.textContent = `${safe(s.Roepnaam)} ${safe(s.Achternaam)} (${safe(s.ID)})`;

        li.addEventListener('click', () => {                 // klik → nieuwe boom
            selectedHoofdId = s.ID;
            renderTree();
        });

        siblingsList.appendChild(li);
    });
}

// =======================
// LIVE SEARCH
// =======================
function liveSearch(){

    const term = safe(searchInput.value).toLowerCase();        // zoekterm ophalen

    document.getElementById('searchPopup')?.remove();          // bestaande popup verwijderen

    if(!term){                                                 // leeg zoekveld
        return;
    }

    const results = dataset.filter(p =>                        // zoeken in dataset
        safe(p.ID).toLowerCase().includes(term) ||
        safe(p.Roepnaam).toLowerCase().includes(term) ||
        safe(p.Achternaam).toLowerCase().includes(term)
    );

    // ===== eerste match automatisch selecteren =====
    if(results.length > 0 && !selectedHoofdId){
        selectedHoofdId = safe(results[0].ID);                 // eerste match hoofd maken
        renderTree();                                          // boom opnieuw tekenen
    }

    const rect = searchInput.getBoundingClientRect();          // positie zoekveld

    const popup = document.createElement('div');               // popup container maken
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

        const row = document.createElement('div');             // resultaat rij

        row.textContent = `${p.ID} | ${p.Roepnaam} | ${p.Achternaam}`;

        row.style.padding = '5px';
        row.style.cursor = 'pointer';

        row.addEventListener('click', () => {                  // klik resultaat

            selectedHoofdId = safe(p.ID);                      // nieuwe hoofd persoon
            popup.remove();                                    // popup sluiten
            renderTree();                                      // boom opnieuw tekenen
        });

        popup.appendChild(row);                                // rij toevoegen

    });

    if(results.length === 0){                                  // geen resultaten

        const row = document.createElement('div');
        row.textContent = 'Geen resultaten';
        row.style.padding = '5px';

        popup.appendChild(row);
    }

    document.body.appendChild(popup);                          // popup tonen
}

// =======================
// INIT
// =======================

function refreshView(){

    dataset = window.StamboomStorage.get() || [];            // dataset opnieuw laden

    if(!selectedHoofdId && dataset.length > 0){              // eerste persoon selecteren
        selectedHoofdId = dataset[0].ID;
    }

    renderTree();                                            // boom renderen
}

refreshView();                                               // eerste render

searchInput.addEventListener('input', liveSearch);           // live search activeren
refreshBtn.addEventListener('click', refreshView);           // refresh knop

})();
```
