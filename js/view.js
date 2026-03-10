// ======================= stamboom/view.js v1.5.6 =======================
// Boom rendering + Live search + Kind/Partner + BZID + PBZID
// Kleuren/shading volledig via CSS, JS wijst geen kleuren toe
(function(){
'use strict';

// =======================
// DOM-elementen
// =======================
const treeBox      = document.getElementById('treeContainer'); // Container voor hoofdtak van de stamboom
const BZBox        = document.getElementById('BZBox');        // Container voor Broers/Zussen tak
const searchInput  = document.getElementById('searchPerson'); // Input veld voor live search

// =======================
// State
// =======================
let dataset = window.StamboomStorage.get() || [];  // Haal volledige dataset op uit local storage
let selectedHoofdId = null;                        // Huidige geselecteerde root node

// =======================
// Helpers
// =======================
function safe(val){ return val ? String(val).trim() : ''; } // Zorg dat waarde altijd string is

function formatDate(d){                                     // Formatteer datum naar NL formaat
    if(!d) return '';
    d = String(d).trim();

    // Controleer op verschillende datumformaten
    let date =
        /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d) :
        /^\d{2}[-/]\d{2}[-/]\d{4}$/.test(d) ? new Date(d.replace(/(\d{2})[-/](\d{2})[-/](\d{4})/,'$3-$2-$1')) :
        /^\d{4}-\d{2}$/.test(d) ? new Date(d+'-01') :
        /^\d{4}$/.test(d) ? new Date(d+'-01-01') :
        new Date(d);

    if(isNaN(date.getTime())) return d;                     // Ongeldige datum teruggeven
    const options = { day:'2-digit', month:'short', year:'numeric' };
    return date.toLocaleDateString('nl-NL', options).replace(/\./g,''); // NL notatie
}

// =======================
// NODE CREATOR
// =======================
function createTreeNode(p, rel){                          // Maak een node voor persoon p met relatie rel
    const div = document.createElement('div');            // Nieuwe div
    div.className = 'tree-node';                          // Basis layout (padding, breedte, hoogte)
    if(rel) div.classList.add(rel);                       // Voeg relatie-specifieke class toe voor CSS

    // Combineer naamvelden
    const fullName = [safe(p.Roepnaam), safe(p.Prefix), safe(p.Achternaam)].filter(Boolean).join(' ').trim();
    const birth = formatDate(p.GeboorteDatum);           // Formatteer geboortedatum

    // Node inhoud (ID, naam, geboortedatum)
    div.innerHTML = `
        <span class="id">${safe(p.ID)}</span>             <!-- ID -->
        <span class="name">${fullName}</span>            <!-- Naam -->
        <span class="birth">${birth}</span>              <!-- Geboortedatum -->
    `;

    div.dataset.id = p.ID;                                // Bewaar ID in dataset

    // Klik event: maak deze node de root
    div.addEventListener('click', () => {
        selectedHoofdId = p.ID;                           // Update geselecteerde root
        renderTree();                                     // Her-render de boom
    });

    return div;                                           // Retourneer de node
}

// =======================
// DATA HELPERS
// =======================
function findPerson(id){ return dataset.find(p => safe(p.ID) === safe(id)); } // Zoek persoon op ID

// =======================
// RELATIE ENGINE
// =======================
function computeRelaties(data, hoofdId){
    const hoofdID = safe(hoofdId);
    if(!hoofdID) return [];

    const hoofd = findPerson(hoofdID);
    if(!hoofd) return [];

    const VHoodID = safe(hoofd.VaderID);                // Vader
    const MHoofdID = safe(hoofd.MoederID);              // Moeder
    const PHoofdID = safe(hoofd.PartnerID);             // Partner

    const KindID = data.filter(p => (safe(p.VaderID) === hoofdID || safe(p.MoederID) === hoofdID)).map(p => p.ID); // Kinder IDs

    const BZID = data.filter(p=>{
        const pid = safe(p.ID);
        if(pid === hoofdID || KindID.includes(pid) || pid === PHoofdID) return false; // Hoofd/Partner/Kind uitsluiten
        const sameVader = VHoodID && safe(p.VaderID) === VHoodID;
        const sameMoeder = MHoofdID && safe(p.MoederID) === MHoofdID;
        return sameVader || sameMoeder;                   // Broer/zus identificatie
    }).map(p=>p.ID);

    // Clone elk persoon object en voeg Relatie toe
    return data.map(p=>{
        const pid = safe(p.ID);
        const clone = {...p};
        clone.Relatie = '';    // Default relatie
        clone._priority = 99;  // Sorteer prioriteit
        clone._shade = null;   // CSS classes bepalen shade
        clone._textColor = null; // Tekstkleur via CSS

        // Bepaal type
        if(pid === hoofdID){ clone.Relatie='HoofdID'; clone._priority=1; }
        else if(pid === VHoodID){ clone.Relatie='VHoodID'; clone._priority=0; }
        else if(pid === MHoofdID){ clone.Relatie='MHoofdID'; clone._priority=0; }
        else if(pid === PHoofdID){ clone.Relatie='PHoofdID'; clone._priority=2; }
        else if(KindID.includes(pid)){
            clone.Relatie='KindID'; clone._priority=3;
            const kind = findPerson(pid);
            const hasHoofd = kind && (safe(kind.VaderID) === hoofdID || safe(kind.MoederID) === hoofdID);
            const hasPartnerHoofd = kind && safe(PHoofdID) !== '';
            if(hasHoofd && hasPartnerHoofd) clone.Relatie='rel-kindid';
            else if(hasHoofd) clone.Relatie='rel-kindid-halfHoofd';
            else if(hasPartnerHoofd) clone.Relatie='rel-kindid-halfPartner';
        }
        else if(BZID.includes(pid)){
            clone.Relatie='BZID'; clone._priority=4;
        }

        return clone;
    }).sort((a,b)=>a._priority - b._priority);           // Sorteer op prioriteit
}

// =======================
// BOOM BUILDER
// =======================
function buildTree(rootID){
    treeBox.innerHTML = '';  // Clear main tree
    BZBox.innerHTML = '';    // Clear BZ

    if(!rootID){ treeBox.textContent='Selecteer een persoon'; return; }
    const root = findPerson(rootID);
    if(!root){ treeBox.textContent='Persoon niet gevonden'; return; }

    const dataRel = computeRelaties(dataset, rootID); // Bereken relaties

    // HoofdID + PHoofdID naast elkaar
    const rootWrapper = document.createElement('div');
    rootWrapper.className='tree-root-main';              // CSS flex naast elkaar

    rootWrapper.appendChild(createTreeNode(root,'HoofdID'));
    if(root.PartnerID){
        const partner = findPerson(root.PartnerID);
        if(partner) rootWrapper.appendChild(createTreeNode(partner,'PHoofdID'));
    }
    treeBox.appendChild(rootWrapper);

    // Ouders naast elkaar
    const parents = document.createElement('div');
    parents.className='tree-parents';                     // Flex via CSS
    if(root.VaderID){ const v = findPerson(root.VaderID); if(v) parents.appendChild(createTreeNode(v,'VHoodID')); }
    if(root.MoederID){ const m = findPerson(root.MoederID); if(m) parents.appendChild(createTreeNode(m,'MHoofdID')); }
    if(parents.children.length>0) treeBox.prepend(parents);

    // Kinderen + Partner Kind
    const children = dataRel.filter(d => d.Relatie.includes('KindID') || d.Relatie.includes('rel-kindid'));
    if(children.length>0){
        const kidsWrap = document.createElement('div');
        kidsWrap.className='tree-children';
        children.forEach(k=>{
            const kidGroup = document.createElement('div');
            kidGroup.className='tree-kid-group';            // Flex + gap

            kidGroup.appendChild(createTreeNode(k,k.Relatie)); // Kind node

            if(k.PartnerID){
                const kPartner = findPerson(k.PartnerID);
                if(kPartner) kidGroup.appendChild(createTreeNode(kPartner,'PKindID'));
            }

            kidsWrap.appendChild(kidGroup);
        });
        treeBox.appendChild(kidsWrap);
    }

    // BZID + PBZID
    const bzNodes = dataRel.filter(d => d.Relatie==='BZID');
    bzNodes.forEach(b=>{ BZBox.appendChild(createTreeNode(b,'BZID')); });
}

// =======================
// LIVE SEARCH
// =======================
function liveSearch(){
    const term = safe(searchInput.value).toLowerCase();
    document.getElementById('searchPopup')?.remove();       // Verwijder oude popup
    if(!term) return;

    const results = dataset.filter(p =>
        safe(p.ID).toLowerCase().includes(term) ||
        safe(p.Roepnaam).toLowerCase().includes(term) ||
        safe(p.Achternaam).toLowerCase().includes(term)
    );

    if(results.length>0 && !selectedHoofdId){
        selectedHoofdId = safe(results[0].ID);
        renderTree();
    }

    const rect = searchInput.getBoundingClientRect();       // Positie input
    const popup = document.createElement('div');            // Popup container
    popup.id = 'searchPopup';
    popup.style.position='absolute';
    popup.style.background='#fff';
    popup.style.border='1px solid #999';
    popup.style.zIndex = 1000;
    popup.style.top = rect.bottom+window.scrollY+'px';
    popup.style.left = rect.left+window.scrollX+'px';
    popup.style.width = rect.width+'px';
    popup.style.maxHeight='200px';
    popup.style.overflowY='auto';

    results.forEach(p=>{
        const row = document.createElement('div');
        row.textContent=`${p.ID} | ${p.Roepnaam} | ${p.Achternaam}`;
        row.style.padding='5px';
        row.style.cursor='pointer';
        row.addEventListener('click',()=>{
            selectedHoofdId = safe(p.ID);
            popup.remove();
            renderTree();
        });
        popup.appendChild(row);
    });

    if(results.length===0){
        const row = document.createElement('div');
        row.textContent='Geen resultaten';
        row.style.padding='5px';
        popup.appendChild(row);
    }

    document.body.appendChild(popup);                     // Voeg popup toe
}

// =======================
// INIT
// =======================
function renderTree(){ buildTree(selectedHoofdId); } // Render de boom
function refreshView(){
    dataset = window.StamboomStorage.get()||[];       // Refresh dataset
    selectedHoofdId = null;
    renderTree();
}

refreshView();
searchInput.addEventListener('input',liveSearch);      // Live search event

})();
