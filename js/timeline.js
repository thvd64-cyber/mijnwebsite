 /* ======================= js/timeline.js v2.0.9 ======================= */
/* Timeline rendering met verticale hiërarchie, kinderen & broer/zus onder elkaar + correct afsluiten van pop-up */

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

    const dataRel = window.RelatieEngine.computeRelaties(dataset, rootID); // Relaties

    // =======================
    // HIËRARCHIE: ouders → hoofd → partner hoofd → kinderen → partner kind → broer/zus → partner broer/zus
    // =======================
    const hierarchy = [
        { type:'ouders', nodes:[] },
        { type:'hoofd', nodes:[] },
        { type:'partnerHoofd', nodes:[] },
        { type:'kinderen', nodes:[] },
        { type:'partnerKind', nodes:[] },
        { type:'broerZus', nodes:[] },
        { type:'partnerBZ', nodes:[] }
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

    // =======================
    // KINDEREN + PARTNERS
    // =======================
    let children = dataRel.filter(d => ['KindID','HKindID','PHKindID'].includes(d.Relatie));
    children.sort((a,b) => parseBirthday(a.Geboortedatum)-parseBirthday(b.Geboortedatum));

    children.forEach(k=>{
        hierarchy[3].nodes.push(k); // bewaar raw data, render later
        if(k.PartnerID) hierarchy[4].nodes.push({kindID:k.ID, data: findPerson(safe(k.PartnerID))});
    });

    // =======================
    // BROER/ZUS + PARTNERS
    // =======================
    let siblings = dataRel.filter(d => d.Relatie==='BZID');
    siblings.sort((a,b) => parseBirthday(a.Geboortedatum)-parseBirthday(b.Geboortedatum));

    siblings.forEach(s=>{
        hierarchy[5].nodes.push(s);
        if(s.PartnerID) hierarchy[6].nodes.push({bzID:s.ID, data: findPerson(safe(s.PartnerID))});
    });

    // =======================
    // RENDER HIËRARCHIE VERTICAAL MET LEVEL CONTAINERS
    // =======================
    hierarchy.forEach(level=>{
        if(level.nodes.length===0) return;

        const levelDiv = document.createElement('div');
        levelDiv.className = 'timeline-level'; // container voor dit level

        // KINDEREN + PARTNERS
        if(level.type==='kinderen'){
            level.nodes.forEach(k=>{
                const kidNode = createTimelineNode(k,k.Relatie);
                const kidWrapper = document.createElement('div');
                kidWrapper.className = 'tree-kid-group';
                kidWrapper.appendChild(kidNode);

                // Voeg partner toe als die er is
                const partnerObj = hierarchy[4].nodes.find(p => p.kindID===k.ID);
                if(partnerObj) kidWrapper.appendChild(createTimelineNode(partnerObj.data,'partner'));

                levelDiv.appendChild(kidWrapper);
            });
        }
        // BROER/ZUS + PARTNERS
        else if(level.type==='broerZus'){
            level.nodes.forEach(s=>{
                const sNode = createTimelineNode(s,'BZID');
                const bzWrapper = document.createElement('div');
                bzWrapper.className = 'tree-kid-group';
                bzWrapper.appendChild(sNode);

                const partnerObj = hierarchy[6].nodes.find(p => p.bzID===s.ID);
                if(partnerObj) bzWrapper.appendChild(createTimelineNode(partnerObj.data,'PBZID'));

                levelDiv.appendChild(bzWrapper);
            });
        }
        else{
            // Overige levels gewoon horizontaal
            level.nodes.forEach(node=>{
                const nodeElem = (node.ID) ? createTimelineNode(node,node.Relatie) : node; 
                levelDiv.appendChild(nodeElem);
            });
        }

        timelineBox.appendChild(levelDiv); // Voeg level container toe
    });
}

// =======================
// LIVE SEARCH
// =======================
searchInput.addEventListener('input', () => {
    // =======================
    // VERWIJDER OUDERE POPUP OM STACKING TE VOORKOMEN
    // =======================
    const oldPopup = document.querySelector('.live-search-popup');
    if(oldPopup) oldPopup.remove();

    liveSearch({
        searchInput,
        dataset,
        displayType: 'popup',
        renderCallback: (selected)=>{
            selectedHoofdId = safe(selected.ID);   // update geselecteerde persoon
            renderTimeline();                       // render timeline

            // =======================
            // POP-UP SLUITEN BIJ SELECTIE
            // =======================
            const popup = document.querySelector('.live-search-popup');
            if(popup) popup.remove();               // verwijder popup DOM
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
