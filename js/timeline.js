/* ======================= js/timeline.js v2.0.6b ======================= */
/* Timeline rendering met verticale levels + horizontale tijdlijn bovenaan + nodes uitgelijnd op geboortedatum */

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
// NODE CREATOR HORIZONTAAL
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
// TIMELINE RENDERER + HORIZONTALE POSITIES
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
// BEREKEN TIJDLIJN START/EIND
// =======================
const today = new Date();                             // Huidige datum ophalen
const nextQuarterMonth = Math.ceil((today.getMonth()+1)/3)*3; // Bereken de eerstvolgende kwartaal-maand
const endDate = new Date(today.getFullYear(), nextQuarterMonth, 1); // Einddatum tijdlijn (eerste dag van volgende kwartaal)
const startDate = new Date(endDate.getFullYear()-200, 0, 1);   // Startdatum tijdlijn (200 jaar terug vanaf einddatum)

// =======================
// HORIZONTALE TIMELINE MARKERS
// =======================
const timelineWrapper = document.createElement('div');  // Maak wrapper div voor jaartallen
timelineWrapper.className='timeline-year-wrapper';     // Voeg CSS class toe
timelineWrapper.style.display='flex';                  // Flex layout voor horizontale spreiding
timelineWrapper.style.justifyContent='space-between';  // Spreid markers gelijkmatig
timelineWrapper.style.marginBottom='10px';             // Ruimte onder jaartallen

for(let y=startDate.getFullYear(); y<=endDate.getFullYear(); y+=20){ // Loop door elk 20e jaar
    const span = document.createElement('span');       // Maak span voor jaar
    span.textContent = y;                              // Voeg jaartal toe aan span
    span.style.fontSize = '12px';                      // Font grootte instellen
    span.style.color = '#666';                         // Kleur grijs
    timelineWrapper.appendChild(span);                 // Voeg jaar toe aan wrapper
}

timelineBox.appendChild(timelineWrapper);             // Voeg wrapper boven timeline nodes toe

const timelineWidth = timelineBox.clientWidth;        // Meet de breedte van de container voor positionering

// =======================
// FUNCTIE: GEEF HORIZONTALE POSITIE OP BASIS VAN GEBOORTE
// =======================
function dateToX(d){
    const date = parseBirthday(d);                     // Converteer input string naar Date object
    const totalMs = endDate - startDate;              // Bereken totaal aantal milliseconden op tijdlijn
    const nodeMs  = date - startDate;                 // Bereken milliseconden vanaf startdatum tot node
    let perc = (nodeMs / totalMs)*100;                // Zet om naar percentage van de tijdlijn
    if(perc<0) perc=0;                                // Clamp minimum 0%
    if(perc>100) perc=100;                            // Clamp maximum 100%
    return perc;                                      // Return horizontale positie in percentage
}

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

    let children = dataRel.filter(d => ['KindID','HKindID','PHKindID'].includes(d.Relatie));
    children.sort((a,b) => parseBirthday(a.Geboortedatum)-parseBirthday(b.Geboortedatum));

    children.forEach(k=>{
        const kidNode = createTimelineNode(k,k.Relatie);
        kidNode.style.position='absolute';                         // Absolute position
        kidNode.style.left = dateToX(k.Geboortedatum)+'%';          // Horizontaal uitlijnen op geboortedatum
        hierarchy[3].nodes.push(kidNode);

        if(k.PartnerID){
            const kp = findPerson(safe(k.PartnerID));
            const kpNode = createTimelineNode(kp,'partner');
            kpNode.style.position='absolute';
            kpNode.style.left = dateToX(k.Geboortedatum)+'%';       // Partner horizontaal gelijk aan kind
            hierarchy[4].nodes.push(kpNode);
        }
    });

    // =======================
// BROER/ ZUS (BZ) + PARTNER BZ
// =======================
// Filter de dataRel voor alle personen die broer of zus zijn van HoofdID
let broerZusList = dataRel.filter(d => d.Relatie === 'BZID');

// Sorteer broer/zus op geboortedatum, van jong naar oud
broerZusList.sort((a, b) => parseBirthday(a.Geboortedatum) - parseBirthday(b.Geboortedatum));

// Voeg elke broer/zus toe aan het juiste hiërarchie level
broerZusList.forEach(bz => {
    const bzNode = createTimelineNode(bz, 'BZID');          // Maak een timeline node voor BZ
    bzNode.style.position = 'absolute';                     // Absolute position
    bzNode.style.left = dateToX(bz.Geboortedatum) + '%';    // Horizontaal uitlijnen op geboortedatum
    hierarchy[5].nodes.push(bzNode);                        // Voeg toe aan broerZus level

    // Voeg partner van broer/zus toe als die bestaat
    if (bz.PartnerID) {
        const bzPartner = findPerson(safe(bz.PartnerID));
        const bzPartnerNode = createTimelineNode(bzPartner, 'PBZID'); // Node voor partner BZ
        bzPartnerNode.style.position = 'absolute';
        bzPartnerNode.style.left = dateToX(bz.Geboortedatum) + '%';   // Horizontaal uitlijnen gelijk aan BZ
        hierarchy[6].nodes.push(bzPartnerNode);                        // Voeg toe aan partnerBZ level
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
