// ======================= js/view.js v1.6.4 =======================
// Boom rendering + Live search >> in LiveSearch.js + optimezed code structure
// Relatie logica komt nu uit externe relatieEngine.js en partner kind voor BZID verwijderd
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
        const partner = findPerson(safe(root.PartnerID)); 
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

        if(k.PartnerID){                                      // Controleer of kind een partner heeft
            const kPartner = findPerson(safe(k.PartnerID));   // Zoek partner in dataset
            if(kPartner) kidGroup.appendChild(createTreeNode(kPartner,'PKindID')); // Voeg partner toe naast kind
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
            const bPartner = findPerson(safe(b.PartnerID));
            if(bPartner) bzGroup.appendChild(createTreeNode(bPartner,'PBZID'));
        }

        BZBox.appendChild(bzGroup);                   
    });
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
}

function refreshView(){

    dataset = window.StamboomStorage.get()||[]; 
    selectedHoofdId = null;                     

    renderTree();                               
}

refreshView();                                  
searchInput.addEventListener('input', liveSearch); 

})();
