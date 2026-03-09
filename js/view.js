// ======================= view.js v1.5.1 =======================
// Boom rendering + Live search + Kind/Partner + BZID + kleur/shading + geboortedatum zichtbaar
// Nodes zijn klikbaar zodat je door de stamboom kan navigeren

(function(){
'use strict'; // voorkomt onbedoelde globale variabelen

// =======================
// DOM-elementen
// =======================
const treeBox      = document.getElementById('treeContainer');   // container waar de boom wordt opgebouwd
const BZBox        = document.getElementById('BZBox');           // container waar BZID nodes worden getoond
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

// formatteer geboortedatum naar dd-mmm-jjjj
function formatDate(d){
    if(!d) return '';
    d = String(d).trim();

    let date =
        /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d) :
        /^\d{2}[-/]\d{2}[-/]\d{4}$/.test(d) ? new Date(d.replace(/(\d{2})[-/](\d{2})[-/](\d{4})/,'$3-$2-$1')) :
        /^\d{4}-\d{2}$/.test(d) ? new Date(d+'-01') :
        /^\d{4}$/.test(d) ? new Date(d+'-01-01') :
        new Date(d);

    if(isNaN(date.getTime())) return d;
    const options = { day:'2-digit', month:'short', year:'numeric' };
    return date.toLocaleDateString('nl-NL', options).replace(/\./g,'');
}

// =======================
// NODE CREATOR (Boom-nodes)
// =======================
function createTreeNode(p, rel, color){
    const div = document.createElement('div');                   // Maak een nieuwe <div> voor de node
    div.className = 'tree-node';                                  // Voeg standaard class toe voor styling
    if(rel) div.classList.add(rel);                                // Voeg optioneel relatie-class toe (bv. rel-hoofd, rel-kindid)

    // =======================
    // Naam en geboortedatum
    // =======================
    const fullName = [safe(p.Roepnaam), safe(p.Prefix), safe(p.Achternaam)] // Roepnaam + tussenvoegsel + achternaam
                     .filter(Boolean).join(' ').trim();                  // filter lege waarden, voeg samen
    const birth = formatDate(p.GeboorteDatum);                        // Format de geboortedatum

    // =======================
    // Flexbox layout node
    // =======================
    div.style.display = 'flex';               // Flexbox layout voor verticale inhoud
    div.style.flexDirection = 'column';       // Plaats naam en datum onder elkaar
    div.style.alignItems = 'center';          // Horizontaal centreren
    div.style.justifyContent = 'flex-start';  // Verticaal bovenaan uitlijnen
    div.style.height = '120px';               // Vaste hoogte voor consistente node
    div.style.paddingTop = '5px';             // Padding bovenaan

    // =======================
    // HTML inhoud van de node
    // =======================
    div.innerHTML = `
        <span style="font-size:0.85rem;">${safe(p.ID)}</span>          <!-- ID bovenaan -->
        <span style="font-weight:600;">${fullName}</span>               <!-- Naam semi-bold -->
        <span style="font-size:0.8rem; color:#555; margin-top:4px;">${birth}</span>  <!-- Geboortedatum -->
    `;

    // =======================
    // Extra styling en data
    // =======================
    if(color) div.style.color = color;         // Tekstkleur als meegegeven
    div.dataset.id = p.ID;                     // ID opslaan als dataset attribuut

    // =======================
    // Klik event voor selectie
    // =======================
    div.addEventListener('click', () => {
        selectedHoofdId = p.ID;                // Zet geselecteerde hoofdID
        renderTree();                          // Her-render de boom
    });

    return div;                                // Node teruggeven
}

// =======================
// DATA HELPERS
// =======================
function findPerson(id){
    return dataset.find(p => safe(p.ID) === safe(id)); // Zoek persoon op ID
}

// =======================
// RELATIE ENGINE
// =======================
function computeRelaties(data, hoofdId){
    const hoofdID = safe(hoofdId); 
    if(!hoofdID) return [];

    const hoofd = findPerson(hoofdID);
    if(!hoofd) return [];

    const VHoofdID = safe(hoofd.VaderID);
    const MHoofdID = safe(hoofd.MoederID);
    const PHoofdID = safe(hoofd.PartnerID);

    const KindID = data.filter(p => 
        (safe(p.VaderID) === hoofdID || safe(p.MoederID) === hoofdID)
    ).map(p => p.ID);

    // BZID wordt berekend maar niet als siblingsList meer
    const BZID = data.filter(p=>{
        const pid = safe(p.ID);
        if(pid === hoofdID) return false;
        if(KindID.includes(pid)) return false;
        if(pid === PHoofdID) return false;
        const sameVader = VHoofdID && safe(p.VaderID) === VHoofdID;
        const sameMoeder = MHoofdID && safe(p.MoederID) === MHoofdID;
        return sameVader || sameMoeder;
    }).map(p=>p.ID);

    return data.map(p=>{
        const pid = safe(p.ID);
        const clone = {...p};
        clone.Relatie = ''; 
        clone._priority = 99; 
        clone._textColor = null;
        clone._shade = null;

        if(pid === hoofdID){ clone.Relatie='HoofdID'; clone._priority=1; }
        else if(pid === VHoofdID){ clone.Relatie='VHoofdID'; clone._priority=0; }
        else if(pid === MHoofdID){ clone.Relatie='MHoofdID'; clone._priority=0; }
        else if(pid === PHoofdID){ clone.Relatie='PHoofdID'; clone._priority=2; }
        else if(KindID.includes(pid)){ 
            clone.Relatie='KindID'; clone._priority=3;
            const kind = findPerson(pid);
            const hasHoofd = kind && (safe(kind.VaderID) === hoofdID || safe(kind.MoederID) === hoofdID);
            const hasPartner = kind && safe(kind.PartnerID) !== '';
            if(hasHoofd && hasPartner) clone._shade = 'full';      
            else if(hasHoofd) clone._shade = 'halfHoofd';          
            else if(hasPartner) clone._shade = 'halfPartner';      
        }
        else if(BZID.includes(pid)){
            clone.Relatie='BZID'; clone._priority=4;
            const bz = findPerson(pid);
            const sameVader = bz && VHoofdID && safe(bz.VaderID) === VHoofdID;
            const sameMoeder = bz && MHoofdID && safe(bz.MoederID) === MHoofdID;
            if(sameVader && sameMoeder) clone._textColor = 'black';        
            else if(sameVader) clone._textColor = 'darkgrey';              
            else if(sameMoeder) clone._textColor = 'grey';                 
        }

        return clone;
    }).sort((a,b)=>a._priority - b._priority);
}

// =======================
// BOOM BUILDER
// =======================
function buildTree(rootID){
    treeBox.innerHTML = '';  // Clear bestaande boom
    BZBox.innerHTML = '';    // Clear BZBox

    if(!rootID){
        treeBox.textContent = 'Selecteer een persoon'; // fallback message
        return;
    }

    const root = findPerson(rootID);
    if(!root){
        treeBox.textContent = 'Persoon niet gevonden';
        return;
    }

    const dataRel = computeRelaties(dataset, rootID);

// =======================
// Hoofd node + partner
// =======================
const rootWrapper = document.createElement('div');     // wrapper div voor hoofd + partner
rootWrapper.className = 'tree-root-main';             // CSS regelt flexbox naast elkaar

// maak hoofd node
const rootNode = createTreeNode(root,'rel-hoofd');    
rootWrapper.appendChild(rootNode);                    // voeg hoofd node toe aan wrapper

// voeg partner van hoofd toe, indien aanwezig
if(root.PartnerID){
    const partner = findPerson(root.PartnerID);       // zoek partner
    if(partner){
        const partnerNode = createTreeNode(partner,'rel-phoofdid'); // maak partner node
        rootWrapper.appendChild(partnerNode);        // voeg partner toe naast hoofd in wrapper
    }
}

// voeg wrapper toe aan de tree container
treeBox.appendChild(rootWrapper);                    
    

    // =======================
    // Ouders
    // =======================
    const parents = document.createElement('div');
    parents.className = 'tree-parents';

    if(root.VaderID){
        const v = findPerson(root.VaderID);
        if(v) parents.appendChild(createTreeNode(v,'rel-vhoofdid'));
    }

    if(root.MoederID){
        const m = findPerson(root.MoederID);
        if(m) parents.appendChild(createTreeNode(m,'rel-mhoofdid'));
    }

    if(parents.children.length > 0){
        treeBox.prepend(parents); // ouders boven hoofd
    }

    // =======================
    // Kinderen + partners
    // =======================
    const children = dataRel.filter(d => d.Relatie === 'KindID');
    if(children.length > 0){
        const kidsWrap = document.createElement('div');
        kidsWrap.className = 'tree-children';

        children.forEach(k=>{
            const kidGroup = document.createElement('div');
            kidGroup.style.display = 'flex';
            kidGroup.style.alignItems = 'center';
            kidGroup.style.gap = '5px';

            const shadeClass = k._shade === 'full' ? 'rel-kindid' :
                               k._shade === 'halfHoofd' ? 'rel-kindid-halfHoofd' :
                               'rel-kindid-halfPartner';
            kidGroup.appendChild(createTreeNode(k, shadeClass));

            if(k.PartnerID){
                const kPartner = findPerson(k.PartnerID);
                if(kPartner){
                    kidGroup.appendChild(createTreeNode(kPartner,'rel-pkpartnerid'));
                }
            }

            kidsWrap.appendChild(kidGroup);
        });

        treeBox.appendChild(kidsWrap);
    }

    // =======================
    // BZID nodes in BZBox
    // =======================
    const bzNodes = dataRel.filter(d => d.Relatie === 'BZID');   
    bzNodes.forEach(b=>{
        BZBox.appendChild(createTreeNode(b,null,b._textColor)); // kleur afhankelijk van vader/moeder
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
        selectedHoofdId = safe(results[0].ID);                 
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
function renderTree(){ buildTree(selectedHoofdId); }          
function refreshView(){
    dataset = window.StamboomStorage.get() || [];
    selectedHoofdId = null;                                   
    renderTree();
}

refreshView();                                               
searchInput.addEventListener('input', liveSearch);          

})();
