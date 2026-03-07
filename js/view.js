// ======================= view.js v1.4.0 =======================
// Boom rendering + Live search + Kind + Partner + BZID
// Nodes zijn klikbaar zodat je door de stamboom kan navigeren

(function(){
'use strict'; // voorkomt onbedoelde globale variabelen

// =======================
// DOM-elementen
// =======================
const treeBox      = document.getElementById('treeContainer');   // container waar de boom wordt opgebouwd
const siblingsList = document.getElementById('siblingsList');    // container voor BZID
const searchInput  = document.getElementById('searchPerson');    // live search input
const refreshBtn   = document.getElementById('refreshBtn');      // refresh knop (optioneel)

// =======================
// State
// =======================
let dataset = window.StamboomStorage.get() || []; // laad dataset uit storage
let selectedHoofdId = null;                       // huidige hoofdpersoon ID

// =======================
// Helpers
// =======================
function safe(val){ return val ? String(val).trim() : ''; } // voorkom null/undefined

function nodeLabel(p){                                      // maak label voor node
    return `${safe(p.Roepnaam)} ${safe(p.Achternaam)} (${safe(p.ID)})`; // naam + ID
}

// =======================
// NODE CREATOR
// =======================
function createNode(p,rel){                                  // maak visuele node
    const div = document.createElement('div');               // div element
    div.className = 'tree-node';                             // basis CSS class
    if(rel) div.classList.add(rel);                          // voeg relatie class toe (kleur)
    div.textContent = nodeLabel(p);                          // label in de node tonen
    div.dataset.id = p.ID;                                   // ID opslaan in data attribuut

    div.addEventListener('click', () => {                    // klik event op node
        selectedHoofdId = p.ID;                              // set nieuwe hoofdpersoon
        renderTree();                                        // boom opnieuw renderen
    });

    return div;                                              // geef node terug
}

// =======================
// DATA HELPERS
// =======================
function findPerson(id){                                     // zoek persoon op ID
    return dataset.find(p => safe(p.ID) === safe(id));
}

function findChildren(id){                                   // zoek kinderen van hoofdpersoon
    return dataset.filter(p =>
        safe(p.VaderID) === safe(id) ||
        safe(p.MoederID) === safe(id)
    );
}

// =======================
// BZID (Broer/zus ID) render
// =======================
function renderBZID(rootID){
    siblingsList.innerHTML = '';                              // clear lijst
    if(!rootID) return;                                      // geen hoofdID → stop

    const hoofd = findPerson(rootID);                        // haal hoofd op
    if(!hoofd) return;                                       // geen hoofd → stop

    const BZID = dataset.filter(p => {                       // filter broers/zussen
        const pid = safe(p.ID);
        if(pid === rootID) return false;                     // hoofd zelf niet
        const sameVader = hoofd.VaderID && safe(p.VaderID) === safe(hoofd.VaderID);
        const sameMoeder = hoofd.MoederID && safe(p.MoederID) === safe(hoofd.MoederID);
        return sameVader || sameMoeder;                     // selecteer op gedeelde ouder
    });

    if(BZID.length === 0){                                   // geen BZID
        const li = document.createElement('li');
        li.textContent = 'Geen broers/zussen';
        siblingsList.appendChild(li);
        return;
    }

    BZID.forEach(s => {                                      // loop door BZID
        const li = document.createElement('li');
        li.textContent = `${safe(s.Roepnaam)} ${safe(s.Achternaam)} (${safe(s.ID)})`;

        // kleur shading op basis van ouders
        if(s.VaderID && s.MoederID) li.style.color = '#000';       // zwart = beide ouders
        else if(s.VaderID || s.MoederID) li.style.color = '#555';  // donkergrijs = 1 ouder
        else li.style.color = '#999';                                // mid-grijs = geen ouders

        li.addEventListener('click', () => {              // klik → nieuwe hoofd persoon
            selectedHoofdId = s.ID;
            renderTree();
        });

        siblingsList.appendChild(li);                      // voeg li toe
    });
}

// =======================
// BOOM BUILDER
// =======================
function buildTree(rootID){
    treeBox.innerHTML = '';                                  // maak container leeg

    if(!rootID){                                             // check hoofdID
        treeBox.textContent = 'Selecteer een persoon';      // boodschap tonen
        return;
    }

    const root = findPerson(rootID);                         // haal hoofdpersoon
    if(!root){
        treeBox.textContent = 'Persoon niet gevonden';
        return;
    }

    // ===== ROOT NODE =====
    const rootNode = createNode(root,'rel-hoofd');           // maak hoofd node
    const rootWrapper = document.createElement('div');       // wrapper div voor root + partner
    rootWrapper.className = 'tree-root';                     // CSS class
    rootWrapper.appendChild(rootNode);                       // voeg hoofd node toe
    treeBox.appendChild(rootWrapper);                        // voeg wrapper aan boom toe

    // ===== OUDERS =====
    const parents = document.createElement('div');           // container voor ouders
    parents.className = 'tree-parents';
    if(root.VaderID){
        const vader = findPerson(root.VaderID);
        if(vader) parents.appendChild(createNode(vader,'rel-vhoofdid'));
    }
    if(root.MoederID){
        const moeder = findPerson(root.MoederID);
        if(moeder) parents.appendChild(createNode(moeder,'rel-mhoofdid'));
    }
    if(parents.children.length > 0){
        treeBox.prepend(parents);                            // voeg boven root toe
    }

    // ===== PARTNER VAN HOOFD =====
    if(root.PartnerID){
        const partner = findPerson(root.PartnerID);
        if(partner){
            rootWrapper.appendChild(createNode(partner,'rel-phoofdid'));
        }
    }

    // ===== KINDEREN + PARTNER VAN KIND =====
    const kids = findChildren(rootID);
    if(kids.length > 0){
        const kidsWrap = document.createElement('div');      // wrapper voor kinderen
        kidsWrap.className = 'tree-children';

        kids.forEach(k => {                                  // loop door kinderen
            const kindNode = createNode(k,'rel-kindid');    // kind node
            kidsWrap.appendChild(kindNode);

            if(k.PartnerID){                                // partner van kind
                const partner = findPerson(k.PartnerID);
                if(partner){
                    const partnerNode = createNode(partner,'rel-pkpartnerid'); // partner node
                    kidsWrap.appendChild(partnerNode);     // direct naast kind
                }
            }
        });

        treeBox.appendChild(kidsWrap);                      // voeg children wrapper toe
    }

    // ===== BROERS/ZUSSEN (BZID) =====
    renderBZID(rootID);                                      // render BZID lijst
}

// wrapper functie om huidige hoofdpersoon te renderen
function renderTree(){ buildTree(selectedHoofdId); }

// =======================
// LIVE SEARCH (onveranderd) 
// =======================
function liveSearch(){
    const term = safe(searchInput.value).toLowerCase();        // zoekterm ophalen
    document.getElementById('searchPopup')?.remove();          // bestaande popup verwijderen
    if(!term){ return; }                                       // leeg zoekveld → stop

    const results = dataset.filter(p =>                        // zoek in dataset
        safe(p.ID).toLowerCase().includes(term) ||
        safe(p.Roepnaam).toLowerCase().includes(term) ||
        safe(p.Achternaam).toLowerCase().includes(term)
    );

    if(results.length > 0 && !selectedHoofdId){
        selectedHoofdId = safe(results[0].ID);                 // eerste match selecteren
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
// INIT
// =======================
function refreshView(){
    dataset = window.StamboomStorage.get() || [];             // dataset opnieuw laden
    if(!selectedHoofdId && dataset.length > 0){               // eerste persoon selecteren als geen hoofd
        selectedHoofdId = dataset[0].ID;
    }
    renderTree();                                             // render de boom
}
refreshView();                                                // initial render
searchInput.addEventListener('input', liveSearch);           // activeer live search
refreshBtn?.addEventListener('click', refreshView);          // refresh knop event
})();
