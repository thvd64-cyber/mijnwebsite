/* ======================= js/timeline.js v2.1.1 ======================= */
/* Timeline rendering met horizontale tijdlijn (geboorte) + verticale hiërarchie
   + automatische containerhoogte op basis van nodes */

(function(){
'use strict'; // Strikte modus voorkomt stille fouten

// =======================
// DOM-elementen
// =======================
const timelineBox  = document.getElementById('timelineContainer'); // Container voor timeline
const searchInput  = document.getElementById('sandboxSearch');     // Live search input

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

function findPerson(id){
    return dataset.find(p => safe(p.ID) === safe(id)); // Zoek persoon op ID
}

// =======================
// NODE CREATOR
// =======================
function createTimelineNode(p, rel){
    const div = document.createElement('div');      
    div.className = 'timeline-node';               
    if(rel) div.classList.add(rel);                

    const fullName = [safe(p.Roepnaam), safe(p.Prefix), safe(p.Achternaam)]
                     .filter(Boolean).join(' ').trim(); 

    const birth = formatDate(p.Geboortedatum);     
    const death = formatDate(p.Overlijdensdatum);

    div.innerHTML = `
        <span class="id">${safe(p.ID)}</span>                     
        <span class="name">${fullName}</span>                     
        <span class="birth">${birth}</span>                       
        ${death ? `<span class="death">- ${death}</span>` : ''}  
    `;

    div.dataset.id = p.ID;                           
    div.dataset.geboorte = p.Geboortedatum;          
    div.addEventListener('click', () => {           
        selectedHoofdId = safe(p.ID);                
        renderTimeline();                            
    });

    return div;                                      
}

// =======================
// BUILD TIMELINE
// =======================
function buildTimeline(rootID){
    timelineBox.innerHTML='';                       

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
    // TIMELINE START/EIND
    // =======================
    const today = new Date();                             
    const nextQuarterMonth = Math.ceil((today.getMonth()+1)/3)*3; 
    const endDate = new Date(today.getFullYear(), nextQuarterMonth, 1); 
    const startDate = new Date(endDate.getFullYear()-200, 0, 1);   

    // =======================
    // HORIZONTALE POSITIE FUNCTIE
    // =======================
    function dateToX(d){
        const date = parseBirthday(d);                     
        const totalMs = endDate - startDate;              
        const nodeMs  = date - startDate;                 
        let perc = (nodeMs / totalMs)*100;                
        if(perc<0) perc=0;                                
        if(perc>100) perc=100;                            
        return perc;                                      
    }

    // =======================
    // VERTICALE HIËRARCHIE
    // =======================
    const levelHeight = 60; // px per level
    const hierarchy = [
        { type:'ouders', nodes:[], y:0 },
        { type:'hoofd', nodes:[], y:1 },
        { type:'partnerHoofd', nodes:[], y:2 },
        { type:'kinderen', nodes:[], y:3 },
        { type:'partnerKind', nodes:[], y:4 },
        { type:'broerZus', nodes:[], y:5 },
        { type:'partnerBZ', nodes:[], y:6 }
    ];

    let maxBottom = 0; // Houd bij wat de grootste 'top + height' is

    // Voeg ouders toe
    if(root.VaderID){
        const v = findPerson(safe(root.VaderID));
        if(v){
            const node = createTimelineNode(v,'VHoofdID');
            node.style.position='absolute';
            node.style.left = dateToX(v.Geboortedatum)+'%';
            node.style.top  = (hierarchy[0].y * levelHeight)+'px';
            hierarchy[0].nodes.push(node);
            maxBottom = Math.max(maxBottom, hierarchy[0].y * levelHeight + node.offsetHeight);
        }
    }
    if(root.MoederID){
        const m = findPerson(safe(root.MoederID));
        if(m){
            const node = createTimelineNode(m,'MHoofdID');
            node.style.position='absolute';
            node.style.left = dateToX(m.Geboortedatum)+'%';
            node.style.top  = (hierarchy[0].y * levelHeight + 30)+'px'; // extra spacing
            hierarchy[0].nodes.push(node);
            maxBottom = Math.max(maxBottom, hierarchy[0].y * levelHeight + 30 + node.offsetHeight);
        }
    }

    // Voeg hoofd
    const hoofdNode = createTimelineNode(root,'HoofdID');
    hoofdNode.style.position='absolute';
    hoofdNode.style.left = dateToX(root.Geboortedatum)+'%';
    hoofdNode.style.top  = (hierarchy[1].y * levelHeight)+'px';
    hierarchy[1].nodes.push(hoofdNode);
    maxBottom = Math.max(maxBottom, hierarchy[1].y * levelHeight + hoofdNode.offsetHeight);

    // Partner hoofd
    if(root.PartnerID){
        const p = findPerson(safe(root.PartnerID));
        const node = createTimelineNode(p,'PHoofdID');
        node.style.position='absolute';
        node.style.left = dateToX(p.Geboortedatum)+'%';
        node.style.top  = (hierarchy[2].y * levelHeight)+'px';
        hierarchy[2].nodes.push(node);
        maxBottom = Math.max(maxBottom, hierarchy[2].y * levelHeight + node.offsetHeight);
    }

    // Kinderen + partner kind
    let children = dataRel.filter(d => ['KindID','HKindID','PHKindID'].includes(d.Relatie));
    children.sort((a,b) => parseBirthday(a.Geboortedatum)-parseBirthday(b.Geboortedatum));

    children.forEach((k, idx)=>{
        const kidNode = createTimelineNode(k,k.Relatie);
        kidNode.style.position='absolute';
        kidNode.style.left = dateToX(k.Geboortedatum)+'%';
        kidNode.style.top  = (hierarchy[3].y * levelHeight + idx*30)+'px';
        hierarchy[3].nodes.push(kidNode);
        maxBottom = Math.max(maxBottom, hierarchy[3].y * levelHeight + idx*30 + kidNode.offsetHeight);

        if(k.PartnerID){
            const kp = findPerson(safe(k.PartnerID));
            const kpNode = createTimelineNode(kp,'partner');
            kpNode.style.position='absolute';
            kpNode.style.left = dateToX(k.Geboortedatum)+'%';
            kpNode.style.top  = (hierarchy[4].y * levelHeight + idx*30)+'px';
            hierarchy[4].nodes.push(kpNode);
            maxBottom = Math.max(maxBottom, hierarchy[4].y * levelHeight + idx*30 + kpNode.offsetHeight);
        }
    });

    // Broer/zus + partner
    let broerZusList = dataRel.filter(d => d.Relatie === 'BZID');
    broerZusList.sort((a,b) => parseBirthday(a.Geboortedatum) - parseBirthday(b.Geboortedatum));

    broerZusList.forEach((bz, idx)=>{
        const bzNode = createTimelineNode(bz, 'BZID');
        bzNode.style.position='absolute';
        bzNode.style.left = dateToX(bz.Geboortedatum)+'%';
        bzNode.style.top  = (hierarchy[5].y * levelHeight + idx*30)+'px';
        hierarchy[5].nodes.push(bzNode);
        maxBottom = Math.max(maxBottom, hierarchy[5].y * levelHeight + idx*30 + bzNode.offsetHeight);

        if(bz.PartnerID){
            const bzPartner = findPerson(safe(bz.PartnerID));
            const bzPartnerNode = createTimelineNode(bzPartner, 'PBZID');
            bzPartnerNode.style.position='absolute';
            bzPartnerNode.style.left = dateToX(bz.Geboortedatum)+'%';
            bzPartnerNode.style.top  = (hierarchy[6].y * levelHeight + idx*30)+'px';
            hierarchy[6].nodes.push(bzPartnerNode);
            maxBottom = Math.max(maxBottom, hierarchy[6].y * levelHeight + idx*30 + bzPartnerNode.offsetHeight);
        }
    });

    // =======================
    // RENDER NODES
    // =======================
    hierarchy.forEach(level=>{
        level.nodes.forEach(node=>{
            timelineBox.appendChild(node); // Voeg toe aan container
        });
    });

    // =======================
    // AUTOMATISCHE CONTAINERHOOGTE
    // =======================
    timelineBox.style.height = (maxBottom + 50)+'px'; // Voeg extra buffer toe
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
function renderTimeline(){ buildTimeline(selectedHoofdId); }

function refreshTimeline(){
    dataset = window.StamboomStorage.get()||[];
    selectedHoofdId = null;
    renderTimeline();
}

refreshTimeline();

})();
