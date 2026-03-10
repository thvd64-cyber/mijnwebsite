// ======================= stamboom/view.js v1.5.5 =======================
// Boom rendering + Live search + Kind/Partner + BZID + PBZID
// Kleuren en shading volledig via CSS :root variabelen, JS wijst geen kleuren meer toe

(function(){
'use strict';

// =======================
// DOM-elementen
// =======================
const treeBox      = document.getElementById('treeContainer'); // Container voor boom nodes
const BZBox        = document.getElementById('BZBox');        // Container voor BZID nodes
const searchInput  = document.getElementById('searchPerson'); // Input voor live search

// =======================
// State
// =======================
let dataset = window.StamboomStorage.get() || [];  // Haal dataset uit local storage
let selectedHoofdId = null;                        // ID van huidige geselecteerde hoofd persoon

// =======================
// Helpers
// =======================
function safe(val){ return val ? String(val).trim() : ''; } // Zorgt dat waarde altijd string is

function formatDate(d){
    if(!d) return '';
    d = String(d).trim();

    // Controleer op verschillende datumformaten
    let date =
        /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d) :
        /^\d{2}[-/]\d{2}[-/]\d{4}$/.test(d) ? new Date(d.replace(/(\d{2})[-/](\d{2})[-/](\d{4})/,'$3-$2-$1')) :
        /^\d{4}-\d{2}$/.test(d) ? new Date(d+'-01') :
        /^\d{4}$/.test(d) ? new Date(d+'-01-01') :
        new Date(d);

    if(isNaN(date.getTime())) return d; // Ongeldige datum teruggeven als string
    const options = { day:'2-digit', month:'short', year:'numeric' };
    return date.toLocaleDateString('nl-NL', options).replace(/\./g,''); // NL datum formaat
}

// =======================
// NODE CREATOR
// =======================
function createTreeNode(p, rel){ // rel = class voor type node (HoofdID, KindID, PBZID, etc.)
    const div = document.createElement('div');      // Maak div element
    div.className = 'tree-node';                    // Voeg basis tree-node class toe (layout, padding, grootte)
    if(rel) div.classList.add(rel);                 // Voeg relatie-specifieke class toe (kleur via CSS)

    // Combineer volledige naam
    const fullName = [safe(p.Roepnaam), safe(p.Prefix), safe(p.Achternaam)].filter(Boolean).join(' ').trim();
    const birth = formatDate(p.GeboorteDatum);     // Format geboorte datum

    // InnerHTML content node
    div.innerHTML = `
        <span class="id">${safe(p.ID)}</span>        <!-- ID van persoon -->
        <span class="name">${fullName}</span>        <!-- Naam van persoon -->
        <span class="birth">${birth}</span>          <!-- Geboortedatum -->
    `;

    div.dataset.id = p.ID;                          // Bewaar ID in dataset

    // Klik event om persoon te selecteren
    div.addEventListener('click', () => {
        selectedHoofdId = p.ID;                     // Update geselecteerde hoofd persoon
        renderTree();                               // Her-render boom
    });

    return div;                                     // Retourneer de gemaakte node
}

// =======================
// DATA HELPERS
// =======================
function findPerson(id){
    return dataset.find(p => safe(p.ID) === safe(id)); // Zoek persoon op ID in dataset
}

// =======================
// RELATIE ENGINE
// =======================
function computeRelaties(data, hoofdId){
    const hoofdID = safe(hoofdId); 
    if(!hoofdID) return [];                          // Geen hoofd ID = lege array

    const hoofd = findPerson(hoofdID);
    if(!hoofd) return [];                            // Hoofd niet gevonden = lege array

    const VHoodID = safe(hoofd.VaderID);            // Vader ID
    const MHoofdID = safe(hoofd.MoederID);          // Moeder ID
    const PHoofdID = safe(hoofd.PartnerID);         // Partner ID

    const KindID = data.filter(p => (safe(p.VaderID) === hoofdID || safe(p.MoederID) === hoofdID)).map(p => p.ID); // Kinderen IDs

    const BZID = data.filter(p=>{
        const pid = safe(p.ID);
        if(pid === hoofdID || KindID.includes(pid) || pid === PHoofdID) return false; // Hoofd/Partner/Kind uitsluiten
        const sameVader = VHoodID && safe(p.VaderID) === VHoodID;
        const sameMoeder = MHoofdID && safe(p.MoederID) === MHoofdID;
        return sameVader || sameMoeder; // Broer/zus identificatie
    }).map(p=>p.ID);

    // Maak clone van elk persoon object met relatie label
    return data.map(p=>{
        const pid = safe(p.ID);
        const clone = {...p};
        clone.Relatie = '';    // Standaard geen relatie
        clone._priority = 99;  // Standaard laag
        clone._shade = null;   // Shade class wordt via CSS gebruikt
        clone._textColor = null; // TextColor wordt via CSS gebruikt

        // Expliciete labels voor alle types
        if(pid === hoofdID){ clone.Relatie='HoofdID'; clone._priority=1; }
        else if(pid === VHoodID){ clone.Relatie='VHoodID'; clone._priority=0; }
        else if(pid === MHoofdID){ clone.Relatie='MHoofdID'; clone._priority=0; }
        else if(pid === PHoofdID){ clone.Relatie='PHoofdID'; clone._priority=2; }
        else if(KindID.includes(pid)){
            clone.Relatie='KindID'; clone._priority=3;
            const kind = findPerson(pid);
            const hasHoofd = kind && (safe(kind.VaderID) === hoofdID || safe(kind.MoederID) === hoofdID);
            const hasPartnerHoofd = kind && safe(PHoofdID) !== '';
            // Shade class logica via CSS classes
            if(hasHoofd && hasPartnerHoofd) clone.Relatie='rel-kindid';       // Full
            else if(hasHoofd) clone.Relatie='rel-kindid-halfHoofd';          // Half hoofd aanwezig
            else if(hasPartnerHoofd) clone.Relatie='rel-kindid-halfPartner'; // Half partner aanwezig
        }
        else if(BZID.includes(pid)){
            clone.Relatie='BZID'; clone._priority=4;                         // Broer/Zus
        }

        return clone; // Retourneer clone
    }).sort((a,b)=>a._priority - b._priority); // Sorteer op prioriteit
}

// =======================
// BOOM BUILDER
// =======================
function buildTree(rootID){
    treeBox.innerHTML = ''; // Clear tree container
    BZBox.innerHTML = '';   // Clear BZ container

    if(!rootID){ treeBox.textContent='Selecteer een persoon'; return; }
    const root = findPerson(rootID);
    if(!root){ treeBox.textContent='Persoon niet gevonden'; return; }

    const dataRel = computeRelaties(dataset, rootID); // Bereken relaties

    // HoofdID + PHoofdID naast elkaar
    const rootWrapper = document.createElement('div');  
    rootWrapper.className='tree-root-main';             // CSS regelt flex naast elkaar

    rootWrapper.appendChild(createTreeNode(root,'HoofdID'));
    if(root.PartnerID){
        const partner = findPerson(root.PartnerID);
        if(partner) rootWrapper.appendChild(createTreeNode(partner,'PHoofdID'));
    }
    treeBox.appendChild(rootWrapper);

    // Ouders naast elkaar
    const parents = document.createElement('div');       
    parents.className='tree-parents';                    // CSS regelt layout

    if(root.VaderID){ const v = findPerson(root.VaderID); if(v) parents.appendChild(createTreeNode(v,'VHoodID')); }
    if(root.MoederID){ const m = findPerson(root.MoederID); if(m) parents.appendChild(createTreeNode(m,'MHoofdID')); }
    if(parents.children.length>0) treeBox.prepend(parents);

    // Kinderen + PKindID
    const children = dataRel.filter(d => d.Relatie.includes('KindID') || d.Relatie.includes('rel-kindid'));
    if(children.length>0){
        const kidsWrap=document.createElement('div');
        kidsWrap.className='tree-children';

        children.forEach(k=>{
            const kidGroup=document.createElement('div');
            kidGroup.className='tree-kid-group';                 // CSS regelt flex, align, gap

            kidGroup.appendChild(createTreeNode(k,k.Relatie));    // Node met class voor kleur/shade

            if(k.PartnerID){
                const kPartner=findPerson(k.PartnerID);
                if(kPartner) kidGroup.appendChild(createTreeNode(kPartner,'PKindID'));
            }

            kidsWrap.appendChild(kidGroup);
        });
        treeBox.appendChild(kidsWrap);
    }

    // BZID + PBZID
    const bzNodes = dataRel.filter(d => d.Relatie==='BZID');
    bzNodes.forEach(b=>{
        BZBox.appendChild(createTreeNode(b,'BZID'));              // CSS regelt kleur PBZID/BZID
    });
}

// =======================
// LIVE SEARCH
// =======================
function liveSearch(){
    const term=safe(searchInput.value).toLowerCase();
    document.getElementById('searchPopup')?.remove();
    if(!term) return;

    const results=dataset.filter(p =>
        safe(p.ID).toLowerCase().includes(term) ||
        safe(p.Roepnaam).toLowerCase().includes(term) ||
        safe(p.Achternaam).toLowerCase().includes(term)
    );

    if(results.length>0 && !selectedHoofdId){
        selectedHoofdId=safe(results[0].ID);
        renderTree();
    }

    const rect=searchInput.getBoundingClientRect();
    const popup=document.createElement('div');
    popup.id='searchPopup';
    popup.className='search-popup';       // CSS kan styling overnemen
    popup.style.top=rect.bottom+window.scrollY+'px';
    popup.style.left=rect.left+window.scrollX+'px';
    popup.style.width=rect.width+'px';

    results.forEach(p=>{
        const row=document.createElement('div');
        row.textContent=`${p.ID} | ${p.Roepnaam} | ${p.Achternaam}`;
        row.addEventListener('click',()=>{
            selectedHoofdId=safe(p.ID);
            popup.remove();
            renderTree();
        });
        popup.appendChild(row);
    });

    if(results.length===0){
        const row=document.createElement('div');
        row.textContent='Geen resultaten';
        popup.appendChild(row);
    }

    document.body.appendChild(popup);
}

// =======================
// INIT
// =======================
function renderTree(){ buildTree(selectedHoofdId); } // Render boom
function refreshView(){
    dataset=window.StamboomStorage.get()||[];           // Refresh dataset
    selectedHoofdId=null;
    renderTree();
}

refreshView();
searchInput.addEventListener('input',liveSearch); // Event listener voor live search

})();
