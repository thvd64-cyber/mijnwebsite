/* ======================= js/timeline.js v2.1.2 ======================= */
/* Timeline rendering met absolute X/Y: verticale hiërarchie + horizontale geboortedatum */

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
    if(!d) return new Date(0);                // Geen datum? fallback
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
    const div = document.createElement('div');      // DOM element voor persoon
    div.className = 'timeline-node';               // Basis class
    if(rel) div.classList.add(rel);                // Voeg relatie-specifieke class toe

    const fullName = [safe(p.Roepnaam), safe(p.Prefix), safe(p.Achternaam)]
                     .filter(Boolean).join(' ').trim(); // Volledige naam

    const birth = formatDate(p.Geboortedatum);     
    const death = formatDate(p.Overlijdensdatum);

    div.innerHTML = `
        <span class="id">${safe(p.ID)}</span>                     
        <span class="name">${fullName}</span>                     
        <span class="birth">${birth}</span>                       
        ${death ? `<span class="death">- ${death}</span>` : ''}  
    `;

    div.dataset.id = p.ID;                           
    div.dataset.geboorte = p.Geboortedatum;          // Bewaar geboortedatum voor x positie
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

    const dataRel = window.RelatieEngine.computeRelaties(dataset, rootID); // Relaties

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

    // Voeg nodes toe per type
    function addNodesToLevel(list, levelIndex){
        list.forEach((p, idx)=>{
            const node = createTimelineNode(p, p.Relatie || '');
            node.style.position='absolute';
            node.style.left = dateToX(p.Geboortedatum)+'%';
            node.style.top  = (hierarchy[levelIndex].y * levelHeight + idx*20)+'px'; 
            hierarchy[levelIndex].nodes.push(node);
        });
    }

    // Ouders
    let ouders = [];
    if(root.VaderID){
        const v = findPerson(safe(root.VaderID));
        if(v) ouders.push(v);
    }
    if(root.MoederID){
        const m = findPerson(safe(root.MoederID));
        if(m) ouders.push(m);
    }
    addNodesToLevel(ouders,0);

    // Hoofd
    addNodesToLevel([root],1);

    // Partner hoofd
    if(root.PartnerID){
        const p = findPerson(safe(root.PartnerID));
        addNodesToLevel([p],2);
    }

    // Kinderen + partner kind
    let children = dataRel.filter(d => ['KindID','HKindID','PHKindID'].includes(d.Relatie));
    children.sort((a,b) => parseBirthday(a.Geboortedatum)-parseBirthday(b.Geboortedatum));
    addNodesToLevel(children,3);

    children.forEach((k, idx)=>{
        if(k.PartnerID){
            const kp = findPerson(safe(k.PartnerID));
            kp.Relatie = 'partner';
            kp._idx = idx; // bewaar index om Y-spacing te behouden
            addNodesToLevel([kp],4);
        }
    });

    // Broer/zus + partner
    let broerZusList = dataRel.filter(d => d.Relatie === 'BZID');
    broerZusList.sort((a,b) => parseBirthday(a.Geboortedatum)-parseBirthday(b.Geboortedatum));
    addNodesToLevel(broerZusList,5);

    broerZusList.forEach((bz, idx)=>{
        if(bz.PartnerID){
            const bzPartner = findPerson(safe(bz.PartnerID));
            bzPartner.Relatie = 'PBZID';
            bzPartner._idx = idx;
            addNodesToLevel([bzPartner],6);
        }
    });

    // =======================
    // RENDER NODES + AUTOMATISCHE CONTAINERHOOGTE
    // =======================
    let maxY = 0;
    hierarchy.forEach(level=>{
        level.nodes.forEach(node=>{
            timelineBox.appendChild(node);
            const nodeBottom = parseFloat(node.style.top) + node.offsetHeight;
            if(nodeBottom > maxY) maxY = nodeBottom;
        });
    });
    timelineBox.style.height = (maxY + 20) + 'px'; // 20px marge onderaan
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
