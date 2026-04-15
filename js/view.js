// ======================= js/view.js v1.8.0 =======================
// Boom rendering + Live search >> in LiveSearch.js + optimezed code structure
// Relatie logica komt nu uit externe relatieEngine.js en partner kind voor BZID verwijderd
// Wijziging v1.8.0: SVG verbindingslijnen toegevoegd (F3-53)
// - drawLines() tekent lijnen tussen ouders→hoofd, hoofd↔partner, hoofd→kinderen
// - SVG overlay (#treeSVG) wordt na elke buildTree() opnieuw opgebouwd
// - ResizeObserver hertekent lijnen bij schermgrootte wijziging
// Wijziging v1.7.0: meerdere partners ondersteuning via pipe-gescheiden PartnerID (F3-48)
// - Hoofdpersoon: alle partners uit PartnerID als aparte PHoofdID-nodes naast hoofd
// - Kinderen: PartnerID split op | zodat alle partners als aparte PKindID-node worden getoond
// - Broers/zussen: zelfde split-logica voor hun partners
// Wijziging v1.6.4: lokale sortering verwijderd — relatieEngine.js sorteert nu centraal

(function(){
'use strict'; // Dwingt strikte JavaScript modus af (voorkomt stille fouten)

// =======================
// DOM-elementen
// =======================
const treeBox      = document.getElementById('treeContainer'); // Container voor hoofdboom
const BZBox        = document.getElementById('BZBox');         // Container voor broer/zus nodes
const searchInput  = document.getElementById('searchPerson');  // Zoekveld voor live search

// =======================
// State
// =======================
let dataset = window.StamboomStorage.get() || [];  // Dataset uit storage
let selectedHoofdId = null;                        // ID van geselecteerde hoofd persoon

// =======================
// HELPERS
// =======================
function safe(val){ 
    return val ? String(val).trim() : ''; // Zorgt dat null/undefined nooit errors geven
}

// Formatteer datum naar Nederlands formaat
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

// Parse geboortedatum naar Date object voor sortering
function parseBirthday(d){
    if(!d) return new Date(0);               
    d = d.trim();

    if(/^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(d);           
    if(/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(d)){                        
        const parts = d.split(/[-/]/);
        return new Date(parts[2], parts[1]-1, parts[0]);           
    }
    if(/^\d{4}$/.test(d)) return new Date(d+'-01-01');             
    const fallback = new Date(d);                                   
    return isNaN(fallback.getTime()) ? new Date(0) : fallback;      
}

// Zoek persoon in dataset
function findPerson(id){
    return dataset.find(p => safe(p.ID) === safe(id)); 
}

// =======================
// NODE CREATOR
// =======================
function createTreeNode(p, rel){

    const div = document.createElement('div');   // Maak nieuwe DOM node
    div.className = 'tree-node';                 // Basis CSS class

    if(rel) div.classList.add(rel);              // Voeg relatie class toe voor kleur styling

    const fullName = [safe(p.Roepnaam), safe(p.Prefix), safe(p.Achternaam)]
                     .filter(Boolean).join(' ').trim(); // Bouw volledige naam

    const birth = formatDate(p.Geboortedatum);  // Formatteer geboortedatum

    div.innerHTML = `
        <span class="id">${safe(p.ID)}</span>
        <span class="name">${fullName}</span> 
        <span class="birth">${birth}</span>
    `;

    div.dataset.id = p.ID;                      // Bewaar ID in dataset attribuut

    div.addEventListener('click', () => {       // Klik op node maakt deze nieuwe hoofd persoon
        selectedHoofdId = safe(p.ID);
        renderTree();                           // Bouw boom opnieuw
    });

    return div;                                 // Geef node terug
}

// =======================
// BOOM BUILDER
// =======================
function buildTree(rootID){

    treeBox.innerHTML=''; // Reset boom container
    BZBox.innerHTML='';   // Reset BZ container

    if(!rootID){
        treeBox.textContent='Selecteer een persoon'; 
        return;
    }

    const root = findPerson(rootID);                 
    if(!root){
        treeBox.textContent='Persoon niet gevonden'; 
        return;
    }

    // =======================
    // RELATIE ENGINE CALL
    // =======================
    const dataRel = window.RelatieEngine.computeRelaties(dataset, rootID);

    // =======================
    // HOOFD + PARTNER
    // =======================
    const rootWrapper=document.createElement('div'); 
    rootWrapper.className='tree-root-main';

    rootWrapper.appendChild(createTreeNode(root,'HoofdID')); 

    if(root.PartnerID){
        root.PartnerID.split('|')                                         // Splits op pipe: meerdere partners mogelijk
            .map(id => id.trim())                                         // Witruimte rondom elk ID verwijderen
            .filter(Boolean)                                              // Lege strings na split verwijderen
            .forEach(pid => {                                             // Loop door elk partner-ID
                const partner = findPerson(pid);                         // Zoek partner in dataset
                if(partner) rootWrapper.appendChild(createTreeNode(partner,'PHoofdID')); // Voeg elke partner als node toe
            });
    }

    treeBox.appendChild(rootWrapper);

    // =======================
    // OUDERS
    // =======================
    const parents=document.createElement('div');
    parents.className='tree-parents';

    if(root.VaderID){
        const v=findPerson(safe(root.VaderID));
        if(v) parents.appendChild(createTreeNode(v,'VHoofdID'));
    }

    if(root.MoederID){
        const m=findPerson(safe(root.MoederID));
        if(m) parents.appendChild(createTreeNode(m,'MHoofdID'));
    }

    if(parents.children.length>0) treeBox.prepend(parents);

    // =======================
// KINDEREN + partner (volgorde via relatieEngine.js: oud → jong)
// =======================
let children = dataRel.filter(d => ['KindID','HKindID','PHKindID'].includes(d.Relatie)); 
// Filter alle kinderen — gesorteerd door relatieEngine.js (oud → jong)

if(children.length > 0){ 
    const kidsWrap = document.createElement('div'); 
    kidsWrap.className = 'tree-children';                     // Wrapper voor alle kinder-nodes

    children.forEach(k => {                                    
        const kidGroup = document.createElement('div'); 
        kidGroup.className = 'tree-kid-group';                // Horizontaal groepje: kind + partner

        kidGroup.appendChild(createTreeNode(k, k.Relatie));   // Voeg kind toe

        if(k.PartnerID){                                          // Controleer of kind partner(s) heeft
            k.PartnerID.split('|')                                // Splits op pipe: meerdere partners mogelijk
                .map(id => id.trim())                             // Witruimte rondom elk ID verwijderen
                .filter(Boolean)                                  // Lege strings na split verwijderen
                .forEach(pid => {                                 // Loop door elk partner-ID
                    const kPartner = findPerson(pid);             // Zoek partner in dataset
                    if(kPartner) kidGroup.appendChild(createTreeNode(kPartner,'PKindID')); // Voeg partner naast kind toe
                });
        }

        kidsWrap.appendChild(kidGroup);                        // Voeg groep toe aan wrapper
    });

    treeBox.appendChild(kidsWrap);                              // Voeg alle kinderen toe aan de boom
}

    // =======================
    // BROER / ZUS (volgorde via relatieEngine.js: oud → jong)
    // =======================
    let bzNodes = dataRel.filter(d => d.Relatie === 'BZID'); 
    // Gesorteerd door relatieEngine.js (oud → jong)

    bzNodes.forEach(b => {

        const bzGroup = document.createElement('div'); 
        bzGroup.className = 'tree-kid-group';         

        bzGroup.appendChild(createTreeNode(b, 'BZID')); 

        if(b.PartnerID){
            b.PartnerID.split('|')                                // Splits op pipe: meerdere partners mogelijk
                .map(id => id.trim())                             // Witruimte rondom elk ID verwijderen
                .filter(Boolean)                                  // Lege strings na split verwijderen
                .forEach(pid => {                                 // Loop door elk partner-ID
                    const bPartner = findPerson(pid);             // Zoek partner in dataset
                    if(bPartner) bzGroup.appendChild(createTreeNode(bPartner,'PBZID')); // Voeg partner naast broer/zus toe
                });
        }

        BZBox.appendChild(bzGroup);                   
    });
}

// =======================
// SVG VERBINDINGSLIJNEN (F3-53)
// =======================

/**
 * Berekent het middelpunt van de onderkant van een node
 * relatief aan de treeContainer — gebruikt voor lijnen van boven naar beneden.
 * @param  {Element} node      - De tree-node DOM element
 * @param  {DOMRect} containerRect - getBoundingClientRect van treeContainer
 * @returns {{ x: number, y: number }}
 */
function getBottomCenter(node, containerRect) {
    const r = node.getBoundingClientRect();                               // Absolute positie van de node
    return {
        x: r.left + r.width  / 2 - containerRect.left,                  // Horizontaal midden, relatief aan container
        y: r.bottom           - containerRect.top                        // Onderkant van node, relatief aan container
    };
}

/**
 * Berekent het middelpunt van de bovenkant van een node
 * relatief aan de treeContainer — gebruikt voor lijnen van boven naar beneden.
 * @param  {Element} node      - De tree-node DOM element
 * @param  {DOMRect} containerRect - getBoundingClientRect van treeContainer
 * @returns {{ x: number, y: number }}
 */
function getTopCenter(node, containerRect) {
    const r = node.getBoundingClientRect();                               // Absolute positie van de node
    return {
        x: r.left + r.width  / 2 - containerRect.left,                  // Horizontaal midden, relatief aan container
        y: r.top              - containerRect.top                        // Bovenkant van node, relatief aan container
    };
}

/**
 * Berekent het middelpunt van de rechterkant van een node
 * relatief aan de treeContainer — gebruikt voor horizontale partner-lijnen.
 * @param  {Element} node      - De tree-node DOM element
 * @param  {DOMRect} containerRect - getBoundingClientRect van treeContainer
 * @returns {{ x: number, y: number }}
 */
function getRightCenter(node, containerRect) {
    const r = node.getBoundingClientRect();                               // Absolute positie van de node
    return {
        x: r.right            - containerRect.left,                      // Rechterkant van node, relatief aan container
        y: r.top  + r.height / 2 - containerRect.top                    // Verticaal midden, relatief aan container
    };
}

/**
 * Berekent het middelpunt van de linkerkant van een node
 * relatief aan de treeContainer — gebruikt voor horizontale partner-lijnen.
 * @param  {Element} node      - De tree-node DOM element
 * @param  {DOMRect} containerRect - getBoundingClientRect van treeContainer
 * @returns {{ x: number, y: number }}
 */
function getLeftCenter(node, containerRect) {
    const r = node.getBoundingClientRect();                               // Absolute positie van de node
    return {
        x: r.left             - containerRect.left,                      // Linkerkant van node, relatief aan container
        y: r.top  + r.height / 2 - containerRect.top                    // Verticaal midden, relatief aan container
    };
}

/**
 * Maakt een SVG <line> element aan met de opgegeven coördinaten en stijl.
 * @param  {string} ns      - SVG namespace string
 * @param  {number} x1, y1 - Startpunt
 * @param  {number} x2, y2 - Eindpunt
 * @param  {string} color  - Kleur van de lijn
 * @param  {number} width  - Lijndikte in pixels
 * @returns {SVGLineElement}
 */
function makeLine(ns, x1, y1, x2, y2, color, width) {
    const line = document.createElementNS(ns, 'line');                   // Maak SVG line element aan in de juiste namespace
    line.setAttribute('x1', x1);                                         // Startpunt X
    line.setAttribute('y1', y1);                                         // Startpunt Y
    line.setAttribute('x2', x2);                                         // Eindpunt X
    line.setAttribute('y2', y2);                                         // Eindpunt Y
    line.setAttribute('stroke', color);                                  // Lijnkleur
    line.setAttribute('stroke-width', width);                            // Lijndikte
    line.setAttribute('stroke-linecap', 'round');                        // Afgeronde lijnuiteinden
    return line;
}

/**
 * Tekent alle SVG verbindingslijnen in treeContainer na een render.
 * Verwijdert eerst de bestaande SVG (indien aanwezig) en maakt een nieuwe.
 * Lijnen die getekend worden:
 *   - Ouder(s) → HoofdID (verticaal, groen)
 *   - HoofdID ↔ Partner(s) (horizontaal, paars)
 *   - HoofdID/Partner → KindID/HKindID/PHKindID (verticaal met knik, blauw)
 */
function drawLines() {

    const existing = document.getElementById('treeSVG');                 // Zoek bestaande SVG overlay op
    if (existing) existing.remove();                                     // Verwijder bij elke redraw zodat lijnen niet stapelen

    const ns  = 'http://www.w3.org/2000/svg';                           // SVG namespace — vereist voor createElementNS
    const svg = document.createElementNS(ns, 'svg');                    // Maak nieuw SVG element aan
    svg.setAttribute('id', 'treeSVG');                                   // ID voor CSS positionering en herverwijdering
    treeBox.appendChild(svg);                                            // Voeg SVG toe aan treeContainer

    const cr = treeBox.getBoundingClientRect();                          // Containerrechthoek als referentiepunt voor alle coördinaten

    // ── 1. OUDERS → HOOFD ──────────────────────────────────────────
    // Lijn van elk ouder-node naar het HoofdID-node
    const hoofdNode = treeBox.querySelector('.tree-node.HoofdID');      // Zoek het HoofdID node in de container
    if (hoofdNode) {
        const hoofdTop = getTopCenter(hoofdNode, cr);                   // Bovenkant van hoofd als eindpunt

        treeBox.querySelectorAll('.tree-node.VHoofdID, .tree-node.MHoofdID') // Zoek alle ouder-nodes
            .forEach(ouder => {
                const ouderBottom = getBottomCenter(ouder, cr);         // Onderkant van ouder als startpunt
                svg.appendChild(makeLine(ns,
                    ouderBottom.x, ouderBottom.y,                       // Start: onderkant ouder
                    hoofdTop.x,    hoofdTop.y,                          // Eind: bovenkant hoofd
                    '#4caf50', 2                                        // Groen, 2px — ouder-kind lijn
                ));
            });
    }

    // ── 2. HOOFD ↔ PARTNER(S) ──────────────────────────────────────
    // Horizontale lijn tussen HoofdID en elke PHoofdID naast hem/haar
    if (hoofdNode) {
        const hoofdRight = getRightCenter(hoofdNode, cr);               // Rechterkant van hoofd als startpunt

        treeBox.querySelectorAll('.tree-node.PHoofdID')                 // Zoek alle partner-nodes van hoofd
            .forEach(partner => {
                const partnerLeft = getLeftCenter(partner, cr);         // Linkerkant van partner als eindpunt
                svg.appendChild(makeLine(ns,
                    hoofdRight.x,   hoofdRight.y,                       // Start: rechterkant hoofd
                    partnerLeft.x,  partnerLeft.y,                      // Eind: linkerkant partner
                    '#9c27b0', 2                                        // Paars, 2px — partner lijn
                ));
            });
    }

    // ── 3. HOOFD/PARTNER → KINDEREN ────────────────────────────────
    // Geknikt pad: verticaal omlaag vanuit hoofd/partner, dan horizontaal naar elk kind
    // KindID  → ouder is hoofd én partner → middenpunt tussen beide
    // HKindID → ouder is alleen hoofd     → lijn vanuit hoofd
    // PHKindID→ ouder is alleen partner   → lijn vanuit eerste partner

    const kindNodes   = Array.from(treeBox.querySelectorAll('.tree-node.KindID'));   // Kinderen van hoofd + partner
    const hkindNodes  = Array.from(treeBox.querySelectorAll('.tree-node.HKindID'));  // Kinderen van alleen hoofd
    const phkindNodes = Array.from(treeBox.querySelectorAll('.tree-node.PHKindID')); // Kinderen van alleen partner

    // Helper: teken geknikt pad van bronpunt naar bovenkant van een kind-node
    function drawKinkedLine(startX, startY, kindNode, color) {
        const kindTop = getTopCenter(kindNode, cr);                     // Bovenkant van kind als eindpunt
        const midY    = startY + (kindTop.y - startY) / 2;             // Halverwege verticaal als knikpunt

        // Verticaal segment: van bronpunt naar knikpunt
        svg.appendChild(makeLine(ns, startX, startY, startX, midY, color, 2));
        // Horizontaal segment: van knikpunt X-bron naar knikpunt X-kind
        svg.appendChild(makeLine(ns, startX, midY, kindTop.x, midY, color, 2));
        // Verticaal segment: van knikpunt naar bovenkant kind
        svg.appendChild(makeLine(ns, kindTop.x, midY, kindTop.x, kindTop.y, color, 2));
    }

    if (hoofdNode && kindNodes.length > 0) {
        // Startpunt: midden tussen hoofd en eerste partner (indien aanwezig)
        const eerstePartner = treeBox.querySelector('.tree-node.PHoofdID'); // Eerste partner node
        const hoofdBottom   = getBottomCenter(hoofdNode, cr);              // Onderkant hoofd

        let startX = hoofdBottom.x;                                         // Standaard: recht onder hoofd
        if (eerstePartner) {
            const partnerBottom = getBottomCenter(eerstePartner, cr);       // Onderkant eerste partner
            startX = (hoofdBottom.x + partnerBottom.x) / 2;                // Midden tussen hoofd en partner
        }

        kindNodes.forEach(k => drawKinkedLine(startX, hoofdBottom.y, k, '#2196f3')); // Blauw — kind van hoofd+partner
    }

    if (hoofdNode && hkindNodes.length > 0) {
        const hoofdBottom = getBottomCenter(hoofdNode, cr);                 // Onderkant hoofd als startpunt
        hkindNodes.forEach(k => drawKinkedLine(hoofdBottom.x, hoofdBottom.y, k, '#90caf9')); // Lichtblauw — kind van hoofd alleen
    }

    if (phkindNodes.length > 0) {
        const eerstePartner = treeBox.querySelector('.tree-node.PHoofdID'); // Eerste partner node
        if (eerstePartner) {
            const partnerBottom = getBottomCenter(eerstePartner, cr);       // Onderkant partner als startpunt
            phkindNodes.forEach(k => drawKinkedLine(partnerBottom.x, partnerBottom.y, k, '#bbdefb')); // Zachtblauw — kind van partner alleen
        }
    }
}

// =======================
// LIVE SEARCH INTEGRATIE
// =======================
searchInput.addEventListener('input', () => {
    liveSearch({
        searchInput,        // input element
        dataset,            // huidige dataset
        displayType: 'popup', // we blijven popup gebruiken in view
        renderCallback: (selected) => {
            // Callback bij selectie uit popup
            selectedHoofdId = safe(selected.ID); // stel geselecteerde persoon in
            renderTree();                        // update de boom
        }
    });
});
    
// =======================
// INIT
// =======================
function renderTree(){ 
    buildTree(selectedHoofdId);
    // Wacht één animatieframe zodat de browser de nodes heeft gerenderd
    // vóór drawLines() de posities meet via getBoundingClientRect()
    requestAnimationFrame(drawLines);
}

function refreshView(){

    dataset = window.StamboomStorage.get()||[]; 
    selectedHoofdId = null;                     

    renderTree();                               
}

// ResizeObserver: herteken lijnen als de container van grootte verandert
// (bijv. bij schermrotatie of venster schalen)
const resizeObserver = new ResizeObserver(() => {
    requestAnimationFrame(drawLines);           // Herteken na elke resize
});
resizeObserver.observe(treeBox);               // Observeer treeContainer

refreshView();                                  
searchInput.addEventListener('input', liveSearch); 

})();
