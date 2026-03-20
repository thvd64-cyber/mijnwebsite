/* ======================= js/timeline.js v2.0.8 ======================= */
/* Timeline rendering met verticale levels + horizontale tijdlijn bovenaan
   + correcte hiërarchie, live search pop-up sluit na selectie
   + geen 'sibeling', inline uitleg bij elke regel
*/

(function(){
'use strict'; // Strikte modus voorkomt stille fouten

// =======================
// DOM-elementen
// =======================
const timelineBox  = document.getElementById('timelineContainer'); // Container voor timeline
const searchInput  = document.getElementById('sandboxSearch');     // Input veld voor live search

// =======================
// STATE
// =======================
let dataset = window.StamboomStorage.get() || [];  // Haal dataset op uit storage
let selectedHoofdId = null;                        // Geselecteerde persoon ID

// =======================
// HELPERS
// =======================
function safe(val){ 
    return val ? String(val).trim() : ''; // Voorkom null/undefined, trim whitespace
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
// NODE CREATOR
// =======================
function createTimelineNode(p, rel){
    const div = document.createElement('div');      // DOM element voor persoon
    div.className = 'timeline-node';               // Basis class
    if(rel) div.classList.add(rel);                // Voeg relatie-specifieke class toe

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

    div.dataset.id = p.ID;                           // Bewaar ID
    div.addEventListener('click', () => {           
        selectedHoofdId = safe(p.ID);                // Update geselecteerde persoon
        renderTimeline();                            // Re-render timeline
    });

    return div;                                      // Retourneer DOM node
}

// =======================
// TIMELINE BUILDER
// =======================
function buildTimeline(rootID){
    timelineBox.innerHTML='';                        // Reset container

    if(!rootID){
        timelineBox.textContent='Selecteer een persoon';
        return;
    }

    const root = findPerson(rootID);                 
    if(!root){
        timelineBox.textContent='Persoon niet gevonden';
        return;
    }

    const dataRel = window.RelatieEngine.computeRelaties(dataset, rootID) || []; // Relaties

    // =======================
    // HORIZONTALE TIMELIJN BEREKENING
    // =======================
    const today = new Date();
    const nextQuarterMonth = Math.ceil((today.getMonth()+1)/3)*3; // Volgend kwartaal
    const endDate = new Date(today.getFullYear(), nextQuarterMonth, 1); 
    const startDate = new Date(endDate.getFullYear()-200,0,1);      // Max 200 jaar terug

    const timelineWrapper = document.createElement('div');  
    timelineWrapper.className='timeline-year-wrapper'; 
    timelineWrapper.style.display='flex';               
    timelineWrapper.style.justifyContent='space-between'; 
    timelineWrapper.style.marginBottom='10px';          

    for(let y=startDate.getFullYear(); y<=endDate.getFullYear(); y+=20){ // Elke 20 jaar
        const span = document.createElement('span');             
        span.textContent = y;                                    
        span.style.fontSize = '12px';                             
        span.style.color = '#666';                                
        timelineWrapper.appendChild(span);                         
    }

    timelineBox.appendChild(timelineWrapper);                    // Voeg jaar markers toe

    const timelineWidth = timelineBox.clientWidth;                // Breedte container

    // =======================
    // HORIZONTALE POSITIE OP BASIS VAN GEBOORTE
    // =======================
    function dateToX(d){
        const date = parseBirthday(d);                            
        const totalMs = endDate - startDate;                      
        const nodeMs  = date - startDate;                         
        let perc = (nodeMs / totalMs)*100;                        
        if(perc<0) perc=0; if(perc>100) perc=100;                 
        return perc;
    }

    // =======================
    // HIËRARCHIE DEFINITIE
    // =======================
    const hierarchy = [
        { type:'ouders', nodes:[] },        // level 0
        { type:'hoofd', nodes:[] },         // level 1
        { type:'partnerHoofd', nodes:[] },  // level 2
        { type:'kinderen', nodes:[] },      // level 3
        { type:'partnerKind', nodes:[] },   // level 4
        { type:'broerZus', nodes:[] },      // level 5
        { type:'partnerBZ', nodes:[] }      // level 6
    ];

    // =======================
    // OUDERS
    // =======================
    if(root.VaderID){                                             
        const v = findPerson(safe(root.VaderID));                  
        if(v) hierarchy[0].nodes.push(createTimelineNode(v,'VHoofdID'));
    }
    if(root.MoederID){                                             
        const m = findPerson(safe(root.MoederID));                 
        if(m) hierarchy[0].nodes.push(createTimelineNode(m,'MHoofdID'));
    }

    // =======================
    // HOOFD PERSOON
    // =======================
    hierarchy[1].nodes.push(createTimelineNode(root,'HoofdID'));  

    // =======================
    // PARTNER HOOFD
    // =======================
    if(root.PartnerID){                                            
        const p = findPerson(safe(root.PartnerID));                
        if(p) hierarchy[2].nodes.push(createTimelineNode(p,'PHoofdID'));
    }

    // =======================
    // KINDEREN + PARTNERS
    // =======================
    let children = dataRel.filter(d => ['KindID','HKindID','PHKindID'].includes(d.Relatie));
    children.sort((a,b) => parseBirthday(a.Geboortedatum)-parseBirthday(b.Geboortedatum));

    children.forEach(k=>{
        const kidNode = createTimelineNode(k,k.Relatie);
        kidNode.style.position='absolute';
        kidNode.style.left = dateToX(k.Geboortedatum)+'%';
        hierarchy[3].nodes.push(kidNode);

        if(k.PartnerID){
            const kp = findPerson(safe(k.PartnerID));
            if(kp){
                const kpNode = createTimelineNode(kp,'partner');
                kpNode.style.position='absolute';
                kpNode.style.left = dateToX(k.Geboortedatum)+'%';
                hierarchy[4].nodes.push(kpNode);
            }
        }
    });

    // =======================
    // BROER/ZUS + PARTNERS
    // =======================
    let bzRelaties = dataRel.filter(d => d.Relatie==='BZID'); // Alleen broer/zus
    bzRelaties.sort((a,b) => parseBirthday(a.Geboortedatum)-parseBirthday(b.Geboortedatum));

    bzRelaties.forEach(bz => {
        const bzNode = createTimelineNode(bz,'BZID');
        bzNode.style.position='absolute';
        bzNode.style.left = dateToX(bz.Geboortedatum)+'%';
        hierarchy[5].nodes.push(bzNode);

        if(bz.PartnerID){
            const partnerBZ = findPerson(safe(bz.PartnerID));
            if(partnerBZ){
                const partnerNode = createTimelineNode(partnerBZ,'PBZID');
                partnerNode.style.position='absolute';
                partnerNode.style.left = dateToX(bz.Geboortedatum)+'%';
                hierarchy[6].nodes.push(partnerNode);
            }
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
            selectedHoofdId = safe(selected.ID); // Update geselecteerde persoon
            renderTimeline();                     // Re-render timeline
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
