// ======================= js/timeline.js v2.0.0 =======================
// van view node naar Timeline rendering van personen met verticale hiërarchie
// Elke persoon krijgt een aparte horizontale box op timeline hoogte

(function(){
'use strict'; // Strikte modus voorkomt stille fouten

// =======================
// DOM-elementen
// =======================
const timelineBox  = document.getElementById('timelineContainer'); // Container voor timeline
const searchInput  = document.getElementById('searchPerson');      // Live search input

// =======================
// State
// =======================
let dataset = window.StamboomStorage.get() || [];  // Dataset uit storage
let selectedHoofdId = null;                        // Geselecteerde hoofd persoon

// =======================
// HELPERS
// =======================
function safe(val){ 
    return val ? String(val).trim() : ''; // Null/undefined voorkomen
}

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

function findPerson(id){
    return dataset.find(p => safe(p.ID) === safe(id)); 
}

// =======================
// NODE CREATOR
// =======================
function createTimelineNode(p, rel){
    const div = document.createElement('div');      // Maak DOM element
    div.className = 'timeline-node';               // Basis class
    if(rel) div.classList.add(rel);                // Voeg relatie class toe voor styling

    const fullName = [safe(p.Roepnaam), safe(p.Prefix), safe(p.Achternaam)]
                     .filter(Boolean).join(' ').trim();

    const birth = formatDate(p.Geboortedatum);

    div.innerHTML = `
        <span class="id">${safe(p.ID)}</span>
        <span class="name">${fullName}</span>
        <span class="birth">${birth}</span>
    `;

    div.dataset.id = p.ID;                          // Bewaar ID
    div.addEventListener('click', () => {           // Klik selecteert deze persoon
        selectedHoofdId = safe(p.ID);
        renderTimeline();                            // Re-render timeline
    });

    return div;
}

// =======================
// TIMELINE BUILDER
// =======================
function buildTimeline(rootID){
    timelineBox.innerHTML = '';                      // Reset container

    if(!rootID){
        timelineBox.textContent='Selecteer een persoon';
        return;
    }

    const root = findPerson(rootID);                 
    if(!root){
        timelineBox.textContent='Persoon niet gevonden';
        return;
    }

    const dataRel = window.RelatieEngine.computeRelaties(dataset, rootID);

    // =======================
    // HIËRARCHIE: ouders → hoofd → partner → kinderen → broer/zus
    // =======================
    const hierarchy = [
        { type: 'parents',   nodes: [] },           // Ouders
        { type: 'hoofd',     nodes: [] },           // HoofdID
        { type: 'children',  nodes: [] },           // Kinderen
        { type: 'siblings',  nodes: [] }            // Broer/zus
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
        if(p) hierarchy[1].nodes.push(createTimelineNode(p,'PHoofdID'));
    }

    // === Kinderen + partner ===
    let children = dataRel.filter(d => ['KindID','HKindID','PHKindID'].includes(d.Relatie));
    children.sort((a,b) => parseBirthday(a.Geboortedatum)-parseBirthday(b.Geboortedatum));

    children.forEach(k=>{
        hierarchy[2].nodes.push(createTimelineNode(k,k.Relatie));
        if(k.PartnerID){
            const kp = findPerson(safe(k.PartnerID));
            if(kp) hierarchy[2].nodes.push(createTimelineNode(kp,'PKindID'));
        }
    });

    // === Broer/zus + partner ===
    let siblings = dataRel.filter(d => d.Relatie==='BZID');
    siblings.sort((a,b) => parseBirthday(a.Geboortedatum)-parseBirthday(b.Geboortedatum));

    siblings.forEach(s=>{
        hierarchy[3].nodes.push(createTimelineNode(s,'BZID'));
        if(s.PartnerID){
            const sp = findPerson(safe(s.PartnerID));
            if(sp) hierarchy[3].nodes.push(createTimelineNode(sp,'PBZID'));
        }
    });

    // =======================
    // RENDER HIËRARCHIE
    // =======================
    hierarchy.forEach((level, idx)=>{
        if(level.nodes.length === 0) return;       // Skip lege levels

        const levelDiv = document.createElement('div');
        levelDiv.className = 'timeline-level';     // CSS grid/flex per hoogte
        levelDiv.dataset.level = idx;              // Bewaar niveau voor styling

        level.nodes.forEach(node=>{
            levelDiv.appendChild(node);           // Voeg elke node toe aan dit level
        });

        timelineBox.appendChild(levelDiv);         // Voeg level toe aan timeline
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
            selectedHoofdId = safe(selected.ID);
            renderTimeline();
        }
    });
});

// =======================
// INIT
// =======================
function renderTimeline(){
    buildTimeline(selectedHoofdId);
}

function refreshTimeline(){
    dataset = window.StamboomStorage.get()||[];
    selectedHoofdId = null;
    renderTimeline();
}

refreshTimeline();
searchInput.addEventListener('input', liveSearch);

})();
