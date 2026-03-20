/* ======================= js/timeline.js v2.0.8 ======================= */
/* Timeline rendering met verticale levels + horizontale tijdlijn + nodes op geboortedatum */

(function(){
'use strict'; // Strikte modus voorkomt stille fouten

// ======================= DOM-elementen =======================
const timelineBox  = document.getElementById('timelineContainer'); // Container voor timeline
const searchInput  = document.getElementById('sandboxSearch');     // Live search input

// ======================= STATE =======================
let dataset = window.StamboomStorage.get() || [];  // Haal dataset op uit storage
let selectedHoofdId = null;                        // Geselecteerde persoon ID

// ======================= HELPERS =======================
function safe(val){ 
    return val ? String(val).trim() : ''; // Voorkom null/undefined, trim whitespace
}

function parseBirthday(d){
    if(!d) return new Date(0);               // Fallback bij ontbrekende datum
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
    const date = parseBirthday(d);
    if(date.getTime()===0) return '';
    const options = { day:'2-digit', month:'short', year:'numeric' };                      
    return date.toLocaleDateString('nl-NL', options).replace(/\./g,'');                    
}

function findPerson(id){
    return dataset.find(p => safe(p.ID) === safe(id)); // Zoek persoon op ID
}

// ======================= NODE CREATOR =======================
function createTimelineNode(p, rel){
    const div = document.createElement('div');      // DOM element voor persoon
    div.className = 'timeline-node';               // Basis class
    if(rel) div.classList.add(rel);                // Voeg relatie-specifieke class toe
    div.textContent = `${safe(p.Roepnaam)} ${safe(p.Prefix)} ${safe(p.Achternaam)} (${formatDate(p.Geboortedatum)})`; // Naam + geboortedatum
    div.dataset.id = p.ID;                           // Bewaar ID

    div.addEventListener('click', () => {           
        selectedHoofdId = safe(p.ID);                // Update geselecteerde persoon
        renderTimeline();                            // Re-render timeline
    });

    return div;                                      // Retourneer DOM node
}

// ======================= TIMELINE BUILDER =======================
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

    // ======================= TIMELINE START/EIND =======================
    const today = new Date();                            
    const startDate = new Date(today.getFullYear()-200,0,1); // Max 200 jaar terug
    const endDate   = new Date(today.getFullYear()+1,0,1); // Volgend jaar

    // ======================= HORIZONTALE POSITIE =======================
    function dateToX(d){
        const date = parseBirthday(d);
        const totalMs = endDate - startDate;
        const nodeMs  = date - startDate;
        let perc = (nodeMs / totalMs)*100;
        if(perc<0) perc=0; if(perc>100) perc=100;
        return perc;
    }

    // ======================= HIËRARCHIE =======================
    const hierarchy = [
        { type:'ouders', nodes:[], class:'level-ouders' },
        { type:'hoofd', nodes:[], class:'level-hoofd' },
        { type:'partnerHoofd', nodes:[], class:'level-partnerHoofd' },
        { type:'kinderen', nodes:[], class:'level-kinderen' },
        { type:'partnerKind', nodes:[], class:'level-partnerKind' },
        { type:'broerZus', nodes:[], class:'level-broerZus' },
        { type:'partnerBZ', nodes:[], class:'level-partnerBZ' }
    ];

    // ======================= OUDERS =======================
    if(root.VaderID){
        const v = findPerson(safe(root.VaderID));
        if(v) hierarchy[0].nodes.push(createTimelineNode(v,'VHoofdID'));
    }
    if(root.MoederID){
        const m = findPerson(safe(root.MoederID));
        if(m) hierarchy[0].nodes.push(createTimelineNode(m,'MHoofdID'));
    }

    // ======================= HOOFDPERSOON =======================
    hierarchy[1].nodes.push(createTimelineNode(root,'HoofdID'));

    // ======================= PARTNER HOOFD =======================
    if(root.PartnerID){
        const p = findPerson(safe(root.PartnerID));
        if(p) hierarchy[2].nodes.push(createTimelineNode(p,'PHoofdID'));
    }

    // ======================= KINDEREN + PARTNERS =======================
    const children = dataRel.filter(d => ['KindID','HKindID','PHKindID'].includes(d.Relatie));
    children.sort((a,b) => parseBirthday(a.Geboortedatum)-parseBirthday(b.Geboortedatum));

    children.forEach(k=>{
        const kidNode = createTimelineNode(k,'kind');
        kidNode.style.left = dateToX(k.Geboortedatum)+'%';       // Horizontale positie
        hierarchy[3].nodes.push(kidNode);

        if(k.PartnerID){
            const kp = findPerson(safe(k.PartnerID));
            if(kp){
                const kpNode = createTimelineNode(kp,'partner');
                kpNode.style.left = dateToX(k.Geboortedatum)+'%';
                hierarchy[4].nodes.push(kpNode);
            }
        }
    });

    // ======================= BROER/ZUS + PARTNERS =======================
    const bzNodes = dataRel.filter(d => d.Relatie==='BZID');
    bzNodes.sort((a,b) => parseBirthday(a.Geboortedatum)-parseBirthday(b.Geboortedatum));

    bzNodes.forEach(bz=>{
        const bzNode = createTimelineNode(bz,'BZID');
        bzNode.style.left = dateToX(bz.Geboortedatum)+'%';
        hierarchy[5].nodes.push(bzNode);

        if(bz.PartnerID){
            const pbz = findPerson(safe(bz.PartnerID));
            if(pbz){
                const pbzNode = createTimelineNode(pbz,'PBZID');
                pbzNode.style.left = dateToX(bz.Geboortedatum)+'%';
                hierarchy[6].nodes.push(pbzNode);
            }
        }
    });

    // ======================= RENDER =======================
    hierarchy.forEach(level=>{
        level.nodes.forEach(node=>{
            node.classList.add(level.class);       // Voeg level class toe voor verticale offset
            timelineBox.appendChild(node);         // Voeg toe aan container
        });
    });
}

// ======================= LIVE SEARCH =======================
searchInput.addEventListener('input', () => {
    liveSearch({
        searchInput,
        dataset,
        displayType: 'popup',
        renderCallback: (selected)=>{
            selectedHoofdId = safe(selected.ID);   // Update selectie
            renderTimeline();                      // Render timeline opnieuw
        }
    });
});

// ======================= INIT =======================
function renderTimeline(){ buildTimeline(selectedHoofdId); }
function refreshTimeline(){ dataset = window.StamboomStorage.get()||[]; selectedHoofdId=null; renderTimeline(); }

refreshTimeline();

})();
