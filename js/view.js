// ======================= js/view.js v1.6.0 =======================
// Boom rendering + Live search
// Relatie logica komt nu uit externe relatieEngine.js en partner kind voor BZID verwijderd

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
// Helpers
// =======================
function safe(val){ 
    return val ? String(val).trim() : ''; // Zorgt dat null/undefined nooit errors geven
}


// =======================
// DATUM FORMATTER
// =======================
function formatDate(d){                              // Formatteert datum naar Nederlands formaat
    if(!d) return '';                                // Geen datum → lege string
    d = String(d).trim();

    let date =
        /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d) :                                     // ISO datum
        /^\d{2}[-/]\d{2}[-/]\d{4}$/.test(d) ? new Date(d.replace(/(\d{2})[-/](\d{2})[-/](\d{4})/,'$3-$2-$1')) : // NL datum
        /^\d{4}-\d{2}$/.test(d) ? new Date(d+'-01') :                                      // Jaar + maand
        /^\d{4}$/.test(d) ? new Date(d+'-01-01') :                                          // Alleen jaar
        new Date(d);                                                                       // Fallback

    if(isNaN(date.getTime())) return d;                                                    // Ongeldige datum → origineel tonen

    const options = { day:'2-digit', month:'short', year:'numeric' };                      // NL datum opties
    return date.toLocaleDateString('nl-NL', options).replace(/\./g,'');                    // Verwijder puntjes
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
// DATA HELPERS
// =======================
function findPerson(id){
    return dataset.find(p => safe(p.ID) === safe(id)); // Zoek persoon in dataset
}


// =======================
// BOOM BUILDER
// =======================
function buildTree(rootID){

    treeBox.innerHTML=''; // Reset boom container
    BZBox.innerHTML='';   // Reset BZ container

    if(!rootID){
        treeBox.textContent='Selecteer een persoon'; // Geen selectie
        return;
    }

    const root = findPerson(rootID);                 // Zoek hoofd persoon
    if(!root){
        treeBox.textContent='Persoon niet gevonden'; // ID bestaat niet
        return;
    }

    // =======================
    // RELATIE ENGINE CALL
    // =======================
    const dataRel = window.RelatieEngine.computeRelaties(dataset, rootID);
    // Haalt alle relaties op via externe relatieEngine.js


    // =======================
    // HOOFD + PARTNER
    // =======================
    const rootWrapper=document.createElement('div'); // Wrapper voor hoofd + partner
    rootWrapper.className='tree-root-main';

    rootWrapper.appendChild(createTreeNode(root,'HoofdID')); // Voeg hoofd toe

    if(root.PartnerID){
        const partner = findPerson(safe(root.PartnerID)); // Zoek partner
        if(partner) rootWrapper.appendChild(createTreeNode(partner,'PHoofdID'));
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
// HELPER: Parse geboortedatum naar Date object voor sortering
// =======================
function parseBirthday(d){
    if(!d) return new Date(0);               // Fallback als datum ontbreekt
    d = d.trim();

    if(/^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(d);           // ISO YYYY-MM-DD
    if(/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(d)){                        // NL DD-MM-YYYY of DD/MM/YYYY
        const parts = d.split(/[-/]/);
        return new Date(parts[2], parts[1]-1, parts[0]);           // Maand 0-index
    }
    if(/^\d{4}$/.test(d)) return new Date(d+'-01-01');             // Alleen jaar
    const fallback = new Date(d);                                   // Fallback
    return isNaN(fallback.getTime()) ? new Date(0) : fallback;      // Ongeldige datum → heel oud
}

// =======================
// KINDEREN (gesorteerd van oudste naar jongste)
// =======================
let children = dataRel.filter(d => ['KindID','HKindID','PHKindID'].includes(d.Relatie)); 
// Filter alle kinderen

// Sorteer kinderen van oudste naar jongste
children.sort((a, b) => parseBirthday(a.Geboortedatum) - parseBirthday(b.Geboortedatum));

if(children.length > 0){ 
    const kidsWrap = document.createElement('div'); 
    kidsWrap.className = 'tree-children';                     // Wrapper voor alle kinderen

    children.forEach(k => {                                    // Loop door kinderen
        const kidGroup = document.createElement('div'); 
        kidGroup.className = 'tree-kid-group';                // Horizontaal groepje (nu alleen kind)

        kidGroup.appendChild(createTreeNode(k, k.Relatie));   // Voeg kind toe

        kidsWrap.appendChild(kidGroup);                        // Voeg groep toe aan wrapper
    });

    treeBox.appendChild(kidsWrap);                              // Voeg alle kinderen toe aan de boom
}
    
 // =======================
// BROER / ZUS (gesorteerd van oudste naar jongste)
// =======================
let bzNodes = dataRel.filter(d => d.Relatie === 'BZID'); 
// Filter alle broers/zussen

// Sorteer op geboortedatum (oudste eerst)
bzNodes.sort((a, b) => parseBirthday(a.Geboortedatum) - parseBirthday(b.Geboortedatum));

bzNodes.forEach(b => {

    const bzGroup = document.createElement('div'); 
    bzGroup.className = 'tree-kid-group';         // Wrapper voor BZ + partner (horizontaal)

    bzGroup.appendChild(createTreeNode(b, 'BZID')); // Voeg broer/zus toe

    // Partner van BZ kan blijven, of verwijderen als je alleen BZID wilt tonen
    if(b.PartnerID){
        const bPartner = findPerson(safe(b.PartnerID));
        if(bPartner) bzGroup.appendChild(createTreeNode(bPartner,'PBZID'));
    }

    BZBox.appendChild(bzGroup);                   // Voeg groep toe aan de BZ-box
});

// =======================
// LIVE SEARCH
// =======================
function liveSearch(){

    const term = safe(searchInput.value).toLowerCase();  // Zoekterm
    document.getElementById('searchPopup')?.remove();    // Verwijder bestaande popup

    if(!term) return;

    const results = dataset.filter(p =>
        safe(p.ID).toLowerCase().includes(term) ||
        safe(p.Roepnaam).toLowerCase().includes(term) ||
        safe(p.Achternaam).toLowerCase().includes(term)
    );

    const rect = searchInput.getBoundingClientRect();

    const popup = document.createElement('div');
    popup.id='searchPopup';

    popup.style.position='absolute';
    popup.style.background='#fff';
    popup.style.border='1px solid #999';
    popup.style.zIndex=1000;

    popup.style.top = rect.bottom + window.scrollY + 'px';
    popup.style.left = Math.max(rect.left + window.scrollX, 20) + 'px';

    popup.style.width = (rect.width * 1.2) + 'px';
    popup.style.maxHeight = '600px';

    popup.style.overflowY = 'auto';
    popup.style.fontSize = '1.5rem';
    popup.style.padding = '8px';

    if(results.length === 0){

        const row = document.createElement('div');
        row.textContent = 'Geen resultaten';
        row.style.padding = '8px';

        popup.appendChild(row);

    } else {

        results.forEach(p => {

            const row = document.createElement('div');

            row.textContent = `${p.ID} | ${p.Roepnaam} | ${p.Achternaam}`;

            row.style.padding = '8px';
            row.style.cursor = 'pointer';
            row.style.fontSize = '1.1rem';

            row.addEventListener('click', ()=>{

                selectedHoofdId = safe(p.ID); // Pas selectie toe
                popup.remove();               // Sluit popup
                renderTree();                 // Bouw boom

            });

            popup.appendChild(row);
        });
    }

    document.body.appendChild(popup);
}


// =======================
// INIT
// =======================
function renderTree(){ 
    buildTree(selectedHoofdId);  // Bouw boom voor geselecteerde persoon
}

function refreshView(){

    dataset = window.StamboomStorage.get()||[]; // Herlaad dataset uit storage
    selectedHoofdId = null;                     // Start zonder selectie

    renderTree();                               // Bouw boom
}

refreshView();                                  // Eerste render
searchInput.addEventListener('input', liveSearch); // Activeer live search

})();
