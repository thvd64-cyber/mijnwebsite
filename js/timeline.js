// ======================= js/timeline.js v2.0.5 =======================
// Timeline rendering van personen met verticale hiërarchie
// Elke persoon krijgt een aparte verticale box op timeline hoogte
// Node inhoud horizontaal: ID | Naam | Geboortedatum | Overlijdensdatum

(function(){
'use strict'; // Strikte modus voorkomt stille fouten

// =======================
// DOM-elementen
// =======================
const timelineBox  = document.getElementById('timelineContainer'); // Container voor timeline nodes
const searchInput  = document.getElementById('sandboxSearch');     // Live search input veld

// =======================
// State
// =======================
let dataset = window.StamboomStorage.get() || [];  // Haal dataset uit storage of leeg array
let selectedHoofdId = null;                        // ID van de momenteel geselecteerde hoofd persoon

// =======================
// HELPERS
// =======================
function safe(val){ 
    return val ? String(val).trim() : ''; // Voorkomt null/undefined en trimt whitespace
}

function formatDate(d){                              
    if(!d) return '';                                
    d = String(d).trim();
    let date =
        /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d) :                                      // ISO YYYY-MM-DD
        /^\d{2}[-/]\d{2}[-/]\d{4}$/.test(d) ? new Date(d.replace(/(\d{2})[-/](\d{2})[-/](\d{4})/,'$3-$2-$1')) : // DD-MM-YYYY
        /^\d{4}-\d{2}$/.test(d) ? new Date(d+'-01') :                                       // YYYY-MM
        /^\d{4}$/.test(d) ? new Date(d+'-01-01') :                                           // YYYY
        new Date(d);                                                                        // fallback
    if(isNaN(date.getTime())) return d;                                                    
    const options = { day:'2-digit', month:'short', year:'numeric' };                      
    return date.toLocaleDateString('nl-NL', options).replace(/\./g,'');                    
}

function parseBirthday(d){
    if(!d) return new Date(0);               
    d = d.trim();
    if(/^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(d);           
    if(/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(d)){                        
        const parts = d.split(/[-/]/);
        return new Date(parts[2], parts[1]-1, parts[0]);           // maand 0-indexed
    }
    if(/^\d{4}$/.test(d)) return new Date(d+'-01-01');             
    const fallback = new Date(d);                                   
    return isNaN(fallback.getTime()) ? new Date(0) : fallback;      
}

function findPerson(id){
    return dataset.find(p => safe(p.ID) === safe(id)); // Zoek persoon op ID
}

// =======================
// NODE CREATOR HORIZONTAAL
// =======================
function createTimelineNode(p, rel){
    const div = document.createElement('div');       // Maak DOM element voor de node
    div.className = 'timeline-node';                // Basis class voor styling
    if(rel) div.classList.add(rel);                 // Voeg relatie-specifieke class toe

    const fullName = [safe(p.Roepnaam), safe(p.Prefix), safe(p.Achternaam)]
                     .filter(Boolean).join(' ').trim(); // Combineer naam onderdelen

    const birth = formatDate(p.Geboortedatum);      // Formatteer geboortedatum
    const death = formatDate(p.Overlijdensdatum);   // Formatteer overlijdensdatum

    // Horizontale inhoud: ID | Naam | Geboorte | Overlijden
    div.innerHTML = `
        <span class="id">${safe(p.ID)}</span>                   <!-- Persoon ID -->
        <span class="name">${fullName}</span>                  <!-- Volledige naam -->
        <span class="birth">${birth}</span>                     <!-- Geboortedatum -->
        ${death ? `<span class="death">- ${death}</span>` : ''}<!-- Overlijdensdatum indien aanwezig -->
    `;

    div.dataset.id = p.ID;                          // Bewaar ID als data attribuut
    div.addEventListener('click', () => {           // Klik event voor selectie
        selectedHoofdId = safe(p.ID);               // Update geselecteerde persoon
        renderTimeline();                            // Her-render timeline
    });

    return div;                                     // Retourneer DOM node
}

// =======================
// TIMELINE BUILDER (VERTICAAL)
// =======================
function buildTimeline(rootID){
    timelineBox.innerHTML = '';                      // Reset container

    if(!rootID){
        timelineBox.textContent='Selecteer een persoon'; // Geen selectie
        return;
    }

    const root = findPerson(rootID);                 
    if(!root){
        timelineBox.textContent='Persoon niet gevonden'; // Ongeldige ID
        return;
    }

    const dataRel = window.RelatieEngine.computeRelaties(dataset, rootID); // Bereken relaties

    // =======================
    // HIËRARCHIE: ouders → hoofd → partner hoofd → kinderen → partner kind → broer/zus → partner broer/zus
    // =======================
    const hierarchy = [
        { type: 'ouders', nodes: [] },        // 0: VHoofdID + MHoofdID
        { type: 'hoofd', nodes: [] },         // 1: HoofdID
        { type: 'partnerHoofd', nodes: [] },  // 2: PHoofdID
        { type: 'kinderen', nodes: [] },      // 3: KindID / HKindID
        { type: 'partnerKind', nodes: [] },   // 4: partners van kinderen
        { type: 'broerZus', nodes: [] },      // 5: BZID
        { type: 'partnerBZ', nodes: [] }      // 6: PBZID
    ];

    // === Ouders ===
    if(root.VaderID){
        const v = findPerson(safe(root.VaderID));
        if(v) hierarchy[0].nodes.push(createTimelineNode(v,'VHoofdID'));
    }
    if(root.MoederID){
        const m = findPerson(safe(root.MoederID));
        if(m) hierarchy[0].nodes.push(createTimelineNode(m,'MHoofdID'));
    }

    // === Hoofd + Partner ===
    hierarchy[1].nodes.push(createTimelineNode(root,'HoofdID'));
    if(root.PartnerID){
        const p = findPerson(safe(root.PartnerID));
        if(p) hierarchy[2].nodes.push(createTimelineNode(p,'PHoofdID'));
    }

    // === Kinderen + partner (direct onder elkaar) ===
    let children = dataRel.filter(d => ['KindID','HKindID','PHKindID'].includes(d.Relatie));
    children.sort((a,b) => parseBirthday(a.Geboortedatum)-parseBirthday(b.Geboortedatum));

    children.forEach(k=>{
        const kidGroup = document.createElement('div');          // Wrapper div voor kind + partner horizontaal
        kidGroup.style.display='flex';                            // Flex row zodat kind en partner naast elkaar
        kidGroup.style.flexDirection='row';                       // Row richting
        kidGroup.style.gap='4px';                                 // Kleine ruimte tussen kind en partner

        kidGroup.appendChild(createTimelineNode(k,k.Relatie));   // Voeg kind toe
        if(k.PartnerID){
            const kp = findPerson(safe(k.PartnerID));           
            if(kp) kp._classExtra='partner';                    // Voeg class partner toe voor grijs
            if(kp) {
                const partnerNode = createTimelineNode(kp,'partner'); // Voeg partner node
                kidGroup.appendChild(partnerNode);                   // Voeg partner direct naast kind
            }
        }
        hierarchy[3].nodes.push(kidGroup);                         // Voeg complete groep toe aan kinderen level
    });

    // === Broer/zus + partner ===
    let siblings = dataRel.filter(d => d.Relatie==='BZID');
    siblings.sort((a,b) => parseBirthday(a.Geboortedatum)-parseBirthday(b.Geboortedatum));

    siblings.forEach(s=>{
        const bzGroup = document.createElement('div'); 
        bzGroup.style.display='flex';       // Flex row voor broer/zus + partner
        bzGroup.style.flexDirection='row'; 
        bzGroup.style.gap='4px';            

        bzGroup.appendChild(createTimelineNode(s,'BZID'));        
        if(s.PartnerID){
            const sp = findPerson(safe(s.PartnerID));
            if(sp) {
                const partnerNode = createTimelineNode(sp,'PBZID');
                bzGroup.appendChild(partnerNode);
            }
        }
        hierarchy[5].nodes.push(bzGroup);     
    });

    // =======================
    // RENDER HIËRARCHIE VERTICAAL
    // =======================
    hierarchy.forEach(level=>{
        if(level.nodes.length === 0) return;       // Skip lege levels
        level.nodes.forEach(node=>{
            timelineBox.appendChild(node);         // Voeg elke node / groep direct onder elkaar
        });
    });
}

// =======================
// LIVE SEARCH INTEGRATIE
// =======================
searchInput.addEventListener('input', () => {
    liveSearch({
        searchInput,               
        dataset,                   
        displayType: 'popup',      
        renderCallback: (selected)=>{
            selectedHoofdId = safe(selected.ID); // Update geselecteerde persoon
            renderTimeline();                    // Her-render timeline
        }
    });
});

// =======================
// INIT
// =======================
function renderTimeline(){
    buildTimeline(selectedHoofdId); // Bouw timeline
}

function refreshTimeline(){
    dataset = window.StamboomStorage.get()||[]; // Update dataset
    selectedHoofdId = null;                      // Reset selectie
    renderTimeline();                             // Render opnieuw
}

refreshTimeline(); // Init render bij pagina laden

})();
