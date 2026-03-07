// ======================= view.js v1.4.0 =======================
// Boom rendering + Live search + Kind/Partner + BZID + kleur/shading
// Nodes zijn klikbaar zodat je door de stamboom kan navigeren

(function(){
'use strict'; // voorkomt onbedoelde globale variabelen

// =======================
// DOM-elementen
// =======================
const treeBox      = document.getElementById('treeContainer');   // container waar de boom wordt opgebouwd
const BZBox        = document.getElementById('siblingsList');    // lijst met BZID (Broer/Zus)
const searchInput  = document.getElementById('searchPerson');    // zoekveld

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
function createNode(p,rel,color){                        // node maken met relatie type en optionele tekstkleur
    const div = document.createElement('div');           // nieuwe div node maken
    div.className = 'tree-node';                         // basis CSS class
    if(rel) div.classList.add(rel);                      // relatie class toevoegen voor kleur / shading
    div.textContent = nodeLabel(p);                      // label tonen
    if(color) div.style.color = color;                  // tekstkleur toepassen als BZID
    div.dataset.id = p.ID;                               // ID opslaan in dataset attribuut

    div.addEventListener('click', () => {                // klik op node
        selectedHoofdId = p.ID;                          // nieuwe hoofd persoon zetten
        renderTree();                                    // boom opnieuw renderen
    });

    return div;                                          // node teruggeven
}

// =======================
// DATA HELPERS
// =======================
function findPerson(id){                                 // persoon zoeken op ID
    return dataset.find(p => safe(p.ID) === safe(id));
}
function findChildren(id){                               // kinderen zoeken
    return dataset.filter(p =>
        safe(p.VaderID) === safe(id) || 
        safe(p.MoederID) === safe(id)
    );
}

// =======================
// RELATIE ENGINE (voor shading + BZID kleur)
// =======================
function computeRelaties(data, hoofdId){
    const hoofdID = safe(hoofdId); 
    if(!hoofdID) return [];

    const hoofd = data.find(p => safe(p.ID) === hoofdID);
    if(!hoofd) return [];

    const VHoofdID = safe(hoofd.VaderID);
    const MHoofdID = safe(hoofd.MoederID);
    const PHoofdID = safe(hoofd.PartnerID);

    // Kinderen scenario: bepaal welke parent aanwezig is voor shading
    const KindID = data.filter(p => 
        (safe(p.VaderID) === hoofdID || safe(p.MoederID) === hoofdID)
    ).map(p => p.ID);

    // BZID scenario: alleen letterkleur, bepaal welke ouder(s) overeenkomen
    const BZID = data.filter(p=>{
        const pid = safe(p.ID);
        if(pid === hoofdID) return false; // hoofd zelf niet
        if(KindID.includes(pid)) return false; // kinderen niet
        if(pid === PHoofdID) return false; // partner niet
        const sameVader = VHoofdID && safe(p.VaderID) === VHoofdID;
        const sameMoeder = MHoofdID && safe(p.MoederID) === MHoofdID;
        return sameVader || sameMoeder;
    }).map(p=>p.ID);

    return data.map(p=>{
        const pid = safe(p.ID);
        const clone = {...p};
        clone.Relatie = ''; 
        clone._priority = 99; 
        clone._textColor = null; // optionele tekstkleur voor BZID

        // ===== Hoofd & ouders =====
        if(pid === hoofdID){ clone.Relatie='HoofdID'; clone._priority=1; }
        else if(pid === VHoofdID){ clone.Relatie='VHoofdID'; clone._priority=0; }
        else if(pid === MHoofdID){ clone.Relatie='MHoofdID'; clone._priority=0; }
        else if(pid === PHoofdID){ clone.Relatie='PHoofdID'; clone._priority=2; }

        // ===== Kinderen + partner shading =====
        else if(KindID.includes(pid)){ 
            clone.Relatie='KindID'; clone._priority=3;
            // bepaal shading
            const kind = findPerson(pid);
            const hasHoofd = kind && (safe(kind.VaderID) === hoofdID || safe(kind.MoederID) === hoofdID);
            const hasPartner = kind && (PHoofdID && (safe(kind.VaderID) === PHoofdID || safe(kind.MoederID) === PHoofdID));
            if(hasHoofd && hasPartner) clone._shade = 'full';      // scenario 1: beide aanwezig
            else if(hasHoofd) clone._shade = 'halfHoofd';          // scenario 2: alleen hoofd
            else if(hasPartner) clone._shade = 'halfPartner';      // scenario 3: alleen partner
        }

        // ===== BZID =====
        else if(BZID.includes(pid)){
            clone.Relatie='BZID'; clone._priority=4;
            const bz = findPerson(pid);
            const sameVader = bz && VHoofdID && safe(bz.VaderID) === VHoofdID;
            const sameMoeder = bz && MHoofdID && safe(bz.MoederID) === MHoofdID;
            if(sameVader && sameMoeder) clone._textColor = 'black';          // scenario 1: beide ouders
            else if(sameVader) clone._textColor = 'darkgrey';                // scenario 2: alleen vader
            else if(sameMoeder) clone._textColor = 'grey';                    // scenario 3: alleen moeder
        }

        return clone;
    }).sort((a,b)=>a._priority - b._priority); // sorteer op prioriteit
}

// =======================
// BOOM BUILDER
// =======================
function buildTree(rootID){
    treeBox.innerHTML = '';                                    // container leeg maken
    BZBox.innerHTML = '';                                      // BZID box leeg maken

    if(!rootID){                                               // geen hoofd persoon
        treeBox.textContent = 'Selecteer een persoon';
        return;
    }

    const root = findPerson(rootID);                           // hoofd persoon ophalen
    if(!root){
        treeBox.textContent = 'Persoon niet gevonden';
        return;
    }

    const dataRel = computeRelaties(dataset, rootID);         // alle relaties + shading

    // ===== ROOT =====
    const rootNode = createNode(root,'rel-hoofd');             // hoofd node
    const rootWrapper = document.createElement('div');         // wrapper root + partner
    rootWrapper.className = 'tree-root';
    rootWrapper.appendChild(rootNode);
    treeBox.appendChild(rootWrapper);

    // ===== OUDERS =====
    const parents = document.createElement('div');
    parents.className = 'tree-parents';
    if(root.VaderID){
        const v = findPerson(root.VaderID);
        if(v) parents.appendChild(createNode(v,'rel-vhoofdid'));
    }
    if(root.MoederID){
        const m = findPerson(root.MoederID);
        if(m) parents.appendChild(createNode(m,'rel-mhoofdid'));
    }
    if(parents.children.length > 0){
        treeBox.prepend(parents);
    }

    // ===== PARTNER =====
    if(root.PartnerID){
        const partner = findPerson(root.PartnerID);
        if(partner){
            rootWrapper.appendChild(
                createNode(partner,'rel-phoofdid')
            );
        }
    }

    // ===== KINDEREN =====
    const children = dataRel.filter(d => d.Relatie === 'KindID'); // alle kinderen
    if(children.length > 0){
        const kidsWrap = document.createElement('div');
        kidsWrap.className = 'tree-children';
        children.forEach(k=>{
            const shadeClass = k._shade === 'full' ? 'rel-kindid' :
                               k._shade === 'halfHoofd' ? 'rel-kindid-halfHoofd' :
                               'rel-kindid-halfPartner';
            kidsWrap.appendChild(createNode(k,shadeClass));
        });
        treeBox.appendChild(kidsWrap);
    }

    // ===== BZID =====
    const bzNodes = dataRel.filter(d => d.Relatie === 'BZID');   // BZID
    bzNodes.forEach(b=>{
        BZBox.appendChild(createNode(b,null,b._textColor));    // letterkleur toepassen
    });
}

// =======================
// LIVE SEARCH
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
        selectedHoofdId = safe(results[0].ID);                 // eerste match hoofd
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
function renderTree(){ buildTree(selectedHoofdId); }          // wrapper voor boom render
function refreshView(){
    dataset = window.StamboomStorage.get() || [];
    selectedHoofdId = null;                                   // start zonder default
    renderTree();
}

refreshView();                                               // eerste render
searchInput.addEventListener('input', liveSearch);          // live search activeren

})();
