// ======================= view.js v1.4.5 =======================
// Boom rendering + Live search + Kind/Partner + BZID + kleur/shading + geboortedatum zichtbaar
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

// ======================= // Visuele scheidingslijn in de code voor overzicht
// NODE CREATOR (Boom-nodes) // Titel van deze code sectie: functie die een persoon-node in de stamboom maakt
// ======================= // Visuele scheidingslijn

function createTreeNode(p, rel, color){ // Functie die een stamboom-node maakt op basis van persoon-object (p), relatie type (rel) en optionele tekstkleur (color)
    const div = document.createElement('div'); // Maak een nieuw HTML <div> element dat de node (persoon) zal voorstellen
    div.className = 'tree-node'; // Geef de div de CSS class 'tree-node' zodat standaard node styling uit CSS wordt toegepast
    if(rel) div.classList.add(rel); // Als er een relatie-type bestaat (bijv. kind, partner, broer/zus) voeg deze als extra CSS class toe

    const fullName = [safe(p.Roepnaam), safe(p.Prefix), safe(p.Achternaam)] // Maak een array met roepnaam, tussenvoegsel en achternaam (veilig gemaakt met safe())
                     .filter(Boolean).join(' ').trim(); // Verwijder lege waarden, voeg de overgebleven delen samen met een spatie en verwijder eventuele spaties aan begin/einde
    const birth = formatDate(p.GeboorteDatum); // Format de geboortedatum van de persoon naar een leesbare datum via formatDate()

    div.style.display = 'flex'; // Zet de node layout op Flexbox zodat de inhoud makkelijk verticaal uitgelijnd kan worden
    div.style.flexDirection = 'column'; // Plaats de inhoud van de node onder elkaar (verticale richting)
    div.style.alignItems = 'center'; // Centreer de inhoud horizontaal binnen de node
    div.style.justifyContent = 'center'; // Centreer de inhoud verticaal binnen de node

    // ✅ Voeg hier de hoogte toe zodat datum altijd zichtbaar is
    div.style.height = '80px';            // Vaste hoogte van de node

    // Vul de inhoud van de node met HTML
div.innerHTML = `
    <span style="font-size:0.85rem;">${safe(p.ID)}</span>
    <span style="font-weight:600;">${fullName}</span>
    <span style="font-size:0.8rem; color:#555;">${birth}</span>
`; // Einde van de HTML inhoud van de node

// Toelichting per regel (buiten backticks):
// Eerste span: ID van de persoon in iets kleinere tekst
// Tweede span: volledige naam in semi-bold
// Derde span: geboortedatum in kleinere grijze tekst

    if(color) div.style.color = color; // Als een kleur is meegegeven, pas deze toe op de tekstkleur van de node
    div.dataset.id = p.ID; // Sla het persoon-ID op in een HTML data-attribuut zodat scripts later kunnen weten welke persoon dit is

    div.addEventListener('click', () => { // Voeg een klik-event toe aan de node zodat de gebruiker erop kan klikken
        selectedHoofdId = p.ID; // Zet de aangeklikte persoon als nieuwe hoofdpersoon in de stamboom
        renderTree(); // Render de stamboom opnieuw zodat deze persoon centraal komt te staan
    }); // Einde van de click-event functie

    return div; // Geef de gemaakte node terug zodat deze in de stamboom kan worden geplaatst
} // Einde van de functie createTreeNode

// =======================
// DATA HELPERS
// =======================
function findPerson(id){
    return dataset.find(p => safe(p.ID) === safe(id));
}

// =======================
// RELATIE ENGINE
// =======================
function computeRelaties(data, hoofdId){
    const hoofdID = safe(hoofdId); 
    if(!hoofdID) return [];

    const hoofd = data.find(p => safe(p.ID) === hoofdID);
    if(!hoofd) return [];

    const VHoofdID = safe(hoofd.VaderID);
    const MHoofdID = safe(hoofd.MoederID);
    const PHoofdID = safe(hoofd.PartnerID);

    const KindID = data.filter(p => 
        (safe(p.VaderID) === hoofdID || safe(p.MoederID) === hoofdID)
    ).map(p => p.ID);

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
    treeBox.innerHTML = '';
    BZBox.innerHTML = '';

    if(!rootID){
        treeBox.textContent = 'Selecteer een persoon';
        return;
    }

    const root = findPerson(rootID);
    if(!root){
        treeBox.textContent = 'Persoon niet gevonden';
        return;
    }

    const dataRel = computeRelaties(dataset, rootID);

    const rootNode = createTreeNode(root,'rel-hoofd');
    const rootWrapper = document.createElement('div');
    rootWrapper.className = 'tree-root';
    rootWrapper.appendChild(rootNode);
    treeBox.appendChild(rootWrapper);

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
        treeBox.prepend(parents);
    }

    if(root.PartnerID){
        const partner = findPerson(root.PartnerID);
        if(partner){
            rootWrapper.appendChild(createTreeNode(partner,'rel-phoofdid'));
        }
    }

    // ======================= Kinderen + partners =======================
    const children = dataRel.filter(d => d.Relatie === 'KindID');
    if(children.length > 0){
        const kidsWrap = document.createElement('div');
        kidsWrap.className = 'tree-children';

        children.forEach(k=>{
            // maak groep voor kind + partner
            const kidGroup = document.createElement('div');
            kidGroup.style.display = 'flex';
            kidGroup.style.alignItems = 'center';
            kidGroup.style.gap = '5px'; // kleine ruimte tussen kind en partner

            // kind node
            const shadeClass = k._shade === 'full' ? 'rel-kindid' :
                               k._shade === 'halfHoofd' ? 'rel-kindid-halfHoofd' :
                               'rel-kindid-halfPartner';
            kidGroup.appendChild(createTreeNode(k, shadeClass));

            // partner van kind node
            if(k.PartnerID){
                const kPartner = findPerson(k.PartnerID);
                if(kPartner){
                    kidGroup.appendChild(createTreeNode(kPartner,'rel-pkpartnerid')); // grijs, italic
                }
            }

            kidsWrap.appendChild(kidGroup); // voeg groep toe aan wrapper
        });

        treeBox.appendChild(kidsWrap);
    }

    const bzNodes = dataRel.filter(d => d.Relatie === 'BZID');   
    bzNodes.forEach(b=>{
        BZBox.appendChild(createTreeNode(b,null,b._textColor));   
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
