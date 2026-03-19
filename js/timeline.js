/* ======================= js/timeline.js v2.0.5 ======================= */
/* Timeline rendering met verticale nodes + horizontale tijdlijn bovenaan */

(function(){
'use strict'; // Strikte modus voorkomt stille fouten

// =======================
// DOM-elementen
// =======================
const timelineBox  = document.getElementById('timelineContainer'); // Container voor nodes
const searchInput  = document.getElementById('sandboxSearch');     // Live search input veld

// =======================
// State
// =======================
let dataset = window.StamboomStorage.get() || [];  // Haal dataset uit storage
let selectedHoofdId = null;                        // ID van geselecteerde persoon

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
    return dataset.find(p => safe(p.ID) === safe(id)); // Zoek persoon op ID
}

// =======================
// NODE CREATOR (HORIZONTAAL)
// =======================
function createTimelineNode(p, rel){
    const div = document.createElement('div');      // DOM element voor persoon
    div.className = 'timeline-node';               // Basis class
    if(rel) div.classList.add(rel);                // Relatie-specifieke class toevoegen

    const fullName = [safe(p.Roepnaam), safe(p.Prefix), safe(p.Achternaam)]
                     .filter(Boolean).join(' ').trim(); // Volledige naam

    const birth = formatDate(p.Geboortedatum);     // Formatteer geboortedatum
    const death = formatDate(p.Overlijdensdatum);  // Formatteer overlijdensdatum

    div.innerHTML = `
        <span class="id">${safe(p.ID)}</span>                     <!-- Persoon ID -->
        <span class="name">${fullName}</span>                     <!-- Volledige naam -->
        <span class="birth">${birth}</span>                       <!-- Geboortedatum -->
        ${death ? `<span class="death">- ${death}</span>` : ''}  <!-- Overlijdensdatum -->
    `;

    div.dataset.id = p.ID;                          // Bewaar ID
    div.addEventListener('click', () => {           
        selectedHoofdId = safe(p.ID);               // Update selectie
        renderTimeline();                           // Re-render
    });

    return div;                                     // Retourneer node
}

// =======================
// TIMELINE RENDERER (VERTICAAL) + HORIZONTALE JAARLIJST
// =======================
function buildTimeline(rootID){
    timelineBox.innerHTML=''; // Reset container

    if(!rootID){
        timelineBox.textContent='Selecteer een persoon';
        return;
    }

    const root = findPerson(rootID);                 
    if(!root){
        timelineBox.textContent='Persoon niet gevonden';
        return;
    }

    const dataRel = window.RelatieEngine.computeRelaties(dataset, rootID); // Relaties

    // =======================
    // HORIZONTALE TIMELINE BOVEN NODES
    // =======================
    const timelineWrapper = document.createElement('div');  
    timelineWrapper.className='timeline-year-wrapper';  // CSS class voor styling
    timelineWrapper.style.display='flex';               // horizontale layout
    timelineWrapper.style.justifyContent='space-between'; // gelijk verdeelde jaar markers
    timelineWrapper.style.marginBottom='10px';          // marge onder tijdlijn

    // Bereken tijdlijn start/eind
    const today = new Date();                            
    const nextQuarterMonth = Math.ceil((today.getMonth()+1)/3)*3; // volgend kwartaal maand (0-indexed)
    const endDate = new Date(today.getFullYear(), nextQuarterMonth, 1); 
    const startYear = Math.max(0, endDate.getFullYear() - 200);  // max 200 jaar terug

    for(let y=startYear; y<=endDate.getFullYear(); y+=20){        // marker elke 20 jaar
        const span = document.createElement('span');             
        span.textContent=y;                                       
        span.style.fontSize='12px';                              
        span.style.color='#666';                                 
        timelineWrapper.appendChild(span);                         
    }

    timelineBox.appendChild(timelineWrapper);                     // Voeg tijdlijn toe boven nodes

    // =======================
    // HIËRARCHIE: ouders → hoofd → partner hoofd → kinderen → partner kind → broer/zus → partner broer/zus
    // =======================
    const hierarchy = [
        { type: 'ouders', nodes: [] },
        { type: 'hoofd', nodes: [] },
        { type: 'partnerHoofd', nodes: [] },
        { type: 'kinderen', nodes: [] },
        { type: 'partnerKind', nodes: [] },
        { type: 'broerZus', nodes: [] },
        { type: 'partnerBZ', nodes: [] }
    ];

    if(root.VaderID){
        const v = findPerson(safe(root.VaderID));
        if(v) hierarchy[0].nodes.push(createTimelineNode(v,'VHoofdID'));
    }
    if(root.MoederID){
        const m = findPerson(safe(root.MoederID));
        if(m) hierarchy[0].nodes.push(createTimelineNode(m,'MHoofdID'));
    }

    hierarchy[1].nodes.push(createTimelineNode(root,'HoofdID'));
    if(root.PartnerID){
        const p = findPerson(safe(root.PartnerID));
        if(p) hierarchy[2].nodes.push(createTimelineNode(p,'PHoofdID'));
    }

    let children = dataRel.filter(d => ['KindID','HKindID','PHKindID'].includes(d.Relatie));
    children.sort((a,b) => parseBirthday(a.Geboortedatum)-parseBirthday(b.Geboortedatum));

    children.forEach(k=>{
        hierarchy[3].nodes.push(createTimelineNode(k,k.Relatie));
        if(k.PartnerID){
            const kp = findPerson(safe(k.PartnerID));
            if(kp) hierarchy[4].nodes.push(createTimelineNode(kp,'partner')); // grijs
        }
    });

    let siblings = dataRel.filter(d => d.Relatie==='BZID');
    siblings.sort((a,b) => parseBirthday(a.Geboortedatum)-parseBirthday(b.Geboortedatum));

    siblings.forEach(s=>{
        hierarchy[5].nodes.push(createTimelineNode(s,'BZID'));
        if(s.PartnerID){
            const sp = findPerson(safe(s.PartnerID));
            if(sp) hierarchy[6].nodes.push(createTimelineNode(sp,'PBZID'));
        }
    });

    // =======================
    // RENDER HIËRARCHIE VERTICAAL
    // =======================
    hierarchy.forEach(level=>{
        if(level.nodes.length===0) return;
        level.nodes.forEach(node=>{
            timelineBox.appendChild(node); // Voeg node onder elkaar
        });
    });
}

// =======================
// LIVE SEARCH
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

})();
