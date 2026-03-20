/* ======================= js/timeline.js v2.0.7 ======================= */
/* Timeline rendering met verticale hiërarchie + horizontale uitlijning op geboortedatum */

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
let dataset = window.StamboomStorage.get() || [];  // Haal dataset uit storage
let selectedHoofdId = null;                        // Geselecteerde persoon ID

// =======================
// HELPERS
// =======================
function safe(val){ 
    return val ? String(val).trim() : '';         // Voorkomt null/undefined, trimt whitespace
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
// CONVERT DATE TO X POSITION
// =======================
function dateToX(date, startDate, endDate, containerWidth){
    const totalMs = endDate - startDate;                   // totale tijd in ms
    const dateMs  = date - startDate;                      // datum t.o.v. start
    const ratio   = dateMs / totalMs;                      // percentage van tijdlijn
    return ratio * containerWidth;                         // pixelpositie
}

// =======================
// NODE CREATOR
// =======================
function createTimelineNode(p, rel){
    const div = document.createElement('div');             // Maak DOM element
    div.className = 'timeline-node';                      // Basis styling
    if(rel) div.classList.add(rel);                        // Voeg relatie class toe

    const fullName = [safe(p.Roepnaam), safe(p.Prefix), safe(p.Achternaam)]
                     .filter(Boolean).join(' ').trim();   // Volledige naam

    const birth = formatDate(p.Geboortedatum);            // Formatteer geboortedatum
    const death = formatDate(p.Overlijdensdatum);         // Formatteer overlijdensdatum

    div.innerHTML = `
        <span class="id">${safe(p.ID)}</span>                     <!-- ID -->
        <span class="name">${fullName}</span>                     <!-- Naam -->
        <span class="birth">${birth}</span>                       <!-- Geboortedatum -->
        ${death ? `<span class="death">- ${death}</span>` : ''}  <!-- Overlijdensdatum -->
    `;

    div.dataset.id = p.ID;                                   // Bewaar ID
    return div;                                              // Retourneer node
}

// =======================
// BUILD TIMELINE
// =======================
function buildTimeline(rootID){
    timelineBox.innerHTML='';                                 // Clear timeline container

    if(!rootID){                                              // Geen rootID geselecteerd
        timelineBox.textContent='Selecteer een persoon';
        return;
    }

    const root = findPerson(rootID);                         
    if(!root){
        timelineBox.textContent='Persoon niet gevonden';
        return;
    }

    const dataRel = window.RelatieEngine.computeRelaties(dataset, rootID); // Relaties ophalen

    // =======================
    // BEREKEN TIMELIJN RANGE
    // =======================
    const today = new Date();                            
    const nextQuarterMonth = Math.ceil((today.getMonth()+1)/3)*3; // Volgend kwartaal
    const endDate = new Date(today.getFullYear(), nextQuarterMonth, 1); 
    const startDate = new Date(endDate.getFullYear() - 200, 0, 1);   // Max 200 jaar terug
    const containerWidth = timelineBox.clientWidth || 800;           // fallback width

    // =======================
    // HORIZONTALE JAARLIJN
    // =======================
    const timelineWrapper = document.createElement('div');  
    timelineWrapper.className='timeline-year-wrapper';   
    timelineWrapper.style.display='flex';               
    timelineWrapper.style.justifyContent='space-between'; 
    timelineWrapper.style.marginBottom='10px';          

    for(let y=startDate.getFullYear(); y<=endDate.getFullYear(); y+=20){  
        const span = document.createElement('span');             
        span.textContent=y;                                       
        span.style.fontSize='12px';                              
        span.style.color='#666';                                 
        timelineWrapper.appendChild(span);                         
    }

    timelineBox.appendChild(timelineWrapper);                     // Voeg tijdlijn toe

    // =======================
    // HIËRARCHIE LEVELS
    // =======================
    const levels = [
        { nodes: [], type: 'ouders' },
        { nodes: [], type: 'hoofd' },
        { nodes: [], type: 'partnerHoofd' },
        { nodes: [], type: 'kind' },
        { nodes: [], type: 'partnerKind' },
        { nodes: [], type: 'broerZus' },
        { nodes: [], type: 'partnerBZ' }
    ];

    if(root.VaderID){
        const v = findPerson(safe(root.VaderID));
        if(v) levels[0].nodes.push(createTimelineNode(v,'VHoofdID'));
    }
    if(root.MoederID){
        const m = findPerson(safe(root.MoederID));
        if(m) levels[0].nodes.push(createTimelineNode(m,'MHoofdID'));
    }

    levels[1].nodes.push(createTimelineNode(root,'HoofdID'));

    if(root.PartnerID){
        const p = findPerson(safe(root.PartnerID));
        if(p) levels[2].nodes.push(createTimelineNode(p,'PHoofdID'));
    }

    let children = dataRel.filter(d => ['KindID','HKindID','PHKindID'].includes(d.Relatie));
    children.sort((a,b) => parseBirthday(a.Geboortedatum)-parseBirthday(b.Geboortedatum));

    children.forEach(k=>{
        levels[3].nodes.push(createTimelineNode(k,k.Relatie));
        if(k.PartnerID){
            const kp = findPerson(safe(k.PartnerID));
            if(kp) levels[4].nodes.push(createTimelineNode(kp,'partner')); // grijs
        }
    });

    let siblings = dataRel.filter(d => d.Relatie==='BZID');
    siblings.sort((a,b) => parseBirthday(a.Geboortedatum)-parseBirthday(b.Geboortedatum));

    siblings.forEach(s=>{
        levels[5].nodes.push(createTimelineNode(s,'BZID'));
        if(s.PartnerID){
            const sp = findPerson(safe(s.PartnerID));
            if(sp) levels[6].nodes.push(createTimelineNode(sp,'PBZID'));
        }
    });

    // =======================
    // RENDER LEVELS MET HORIZONTALE POSITION
    // =======================
    levels.forEach(level=>{
        if(level.nodes.length===0) return;

        const levelDiv = document.createElement('div');  
        levelDiv.className = 'timeline-level';             // CSS class per level
        levelDiv.style.position='relative';                 // relative voor absolute children
        levelDiv.style.height='40px';                       // vaste hoogte per level
        timelineBox.appendChild(levelDiv);                 // Voeg level container toe

        level.nodes.forEach(node=>{
            const birthDate = parseBirthday(node.dataset.birth || node.querySelector('.birth')?.textContent || '');
            const x = dateToX(birthDate, startDate, endDate, containerWidth);
            node.style.position='absolute';                // absolute in level
            node.style.top='0';                            // bovenkant level
            node.style.left=`${x}px`;                      // horizontale positie
            levelDiv.appendChild(node);                    // voeg node toe
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
