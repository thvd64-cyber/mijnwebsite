/* ======================= js/timeline.js v2.0.7 ======================= */
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
let dataset = window.StamboomStorage.get() || [];  // Haal dataset op uit storage of gebruik lege array
let selectedHoofdId = null;                        // Geselecteerde persoon ID, initieel null

// =======================
// HELPERS
// =======================
function safe(val){ 
    return val ? String(val).trim() : ''; // Zorg dat waarde string is en geen null/undefined
}

function formatDate(d){                              
    if(!d) return '';                                // Als datum niet bestaat, return lege string
    d = String(d).trim();                            // Trim eventuele spaties
    let date =
        /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d) :                 // Formaat yyyy-mm-dd
        /^\d{2}[-/]\d{2}[-/]\d{4}$/.test(d) ? new Date(d.replace(/(\d{2})[-/](\d{2})[-/](\d{4})/,'$3-$2-$1')) : // dd-mm-yyyy of dd/mm/yyyy
        /^\d{4}-\d{2}$/.test(d) ? new Date(d+'-01') :                // yyyy-mm
        /^\d{4}$/.test(d) ? new Date(d+'-01-01') :                   // yyyy
        new Date(d);                                                 // fallback
    if(isNaN(date.getTime())) return d;                                // Ongeldige datum, return originele string
    const options = { day:'2-digit', month:'short', year:'numeric' }; // Opties NL datum
    return date.toLocaleDateString('nl-NL', options).replace(/\./g,''); // Return formatted string zonder puntjes
}

function parseBirthday(d){
    if(!d) return new Date(0);                // Geen datum, default epoch
    d = d.trim();                             // Trim spaties
    if(/^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(d);      // yyyy-mm-dd
    if(/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(d)){                     // dd-mm-yyyy of dd/mm/yyyy
        const parts = d.split(/[-/]/);                              
        return new Date(parts[2], parts[1]-1, parts[0]);           // Maand is 0-indexed
    }
    if(/^\d{4}$/.test(d)) return new Date(d+'-01-01');            // yyyy
    const fallback = new Date(d);                                 // fallback naar Date constructor
    return isNaN(fallback.getTime()) ? new Date(0) : fallback;     // Ongeldige datum? default epoch
}

function findPerson(id){
    return dataset.find(p => safe(p.ID) === safe(id)); // Zoek persoon in dataset op ID
}

// =======================
// NODE CREATOR HORIZONTAAL
// =======================
function createTimelineNode(p, rel){
    const div = document.createElement('div');      // Maak div element voor persoon
    div.className = 'timeline-node';               // Voeg basisclass toe
    if(rel) div.classList.add(rel);                // Voeg relatie-specifieke class toe

    const fullName = [safe(p.Roepnaam), safe(p.Prefix), safe(p.Achternaam)]
                     .filter(Boolean).join(' ').trim(); // Combineer naamvelden tot volledige naam

    const birth = formatDate(p.Geboortedatum);     // Formatteer geboortedatum
    const death = formatDate(p.Overlijdensdatum);  // Formatteer overlijdensdatum

    div.innerHTML = `
        <span class="id">${safe(p.ID)}</span>                     <!-- Persoon ID -->
        <span class="name">${fullName}</span>                     <!-- Volledige naam -->
        <span class="birth">${birth}</span>                       <!-- Geboortedatum -->
        ${death ? `<span class="death">- ${death}</span>` : ''}  <!-- Overlijdensdatum -->
    `;

    div.dataset.id = p.ID;                           // Bewaar ID in dataset attribuut
    div.addEventListener('click', () => {           
        selectedHoofdId = safe(p.ID);                // Update geselecteerde persoon
        renderTimeline();                            // Re-render timeline
    });

    return div;                                      // Return DOM node
}

// =======================
// TIMELINE RENDERER + HORIZONTALE POSITIES
// =======================
function buildTimeline(rootID){
    timelineBox.innerHTML='';                        // Reset container

    if(!rootID){
        timelineBox.textContent='Selecteer een persoon'; // Feedback voor gebruiker
        return;
    }

    const root = findPerson(rootID);                 // Vind root persoon
    if(!root){
        timelineBox.textContent='Persoon niet gevonden'; // Feedback als niet gevonden
        return;
    }

    const dataRel = window.RelatieEngine.computeRelaties(dataset, rootID); // Bereken relaties

    // =======================
    // BEREKEN TIJDLIJN START/EIND
    // =======================
    const today = new Date();                            
    const nextQuarterMonth = Math.ceil((today.getMonth()+1)/3)*3; // Volgend kwartaal maand
    const endDate = new Date(today.getFullYear(), nextQuarterMonth, 1); // Einddatum tijdlijn
    const startDate = new Date(endDate.getFullYear()-200, 0, 1);   // Startdatum max 200 jaar terug

    // =======================
    // HORIZONTALE TIMELINE MARKERS
    // =======================
    const timelineWrapper = document.createElement('div');  
    timelineWrapper.className='timeline-year-wrapper'; 
    timelineWrapper.style.display='flex';               
    timelineWrapper.style.justifyContent='space-between'; 
    timelineWrapper.style.marginBottom='10px';          

    for(let y=startDate.getFullYear(); y<=endDate.getFullYear(); y+=20){ // Marker elke 20 jaar
        const span = document.createElement('span');             
        span.textContent = y;                                    
        span.style.fontSize = '12px';                             
        span.style.color = '#666';                                
        timelineWrapper.appendChild(span);                         
    }

    timelineBox.appendChild(timelineWrapper);                    // Voeg tijdlijn boven nodes

    const timelineWidth = timelineBox.clientWidth;                // Breedte container

    // =======================
    // FUNCTIE: GEEF HORIZONTALE POSITIE OP BASIS VAN GEBOORTE
    // =======================
    function dateToX(d){
        const date = parseBirthday(d);                            // Converteer naar Date
        const totalMs = endDate - startDate;                      // Totaal tijdlijn ms
        const nodeMs  = date - startDate;                         // Node positie ms
        let perc = (nodeMs / totalMs)*100;                        // Bereken percentage
        if(perc<0) perc=0; if(perc>100) perc=100;                 // Clamp 0-100%
        return perc;                                              // Return percentage
    }

    // =======================
    // HIËRARCHIE: ouders → hoofd → partner hoofd → kinderen → partner kind → broer/zus → partner broer/zus
    // =======================
    const hierarchy = [
        { type:'ouders', nodes:[] },        // Level ouders
        { type:'hoofd', nodes:[] },         // Level hoofd
        { type:'partnerHoofd', nodes:[] },  // Partner van hoofd
        { type:'kinderen', nodes:[] },      // Kinderen
        { type:'partnerKind', nodes:[] },   // Partner van kinderen
        { type:'broerZus', nodes:[] },      // Broer/zus van hoofd
        { type:'partnerBZ', nodes:[] }      // Partner van broer/zus
    ];

    if(root.VaderID){
        const v = findPerson(safe(root.VaderID));                  // Vind vader
        if(v) hierarchy[0].nodes.push(createTimelineNode(v,'VHoofdID')); // Voeg vader toe aan ouders level
    }
    if(root.MoederID){
        const m = findPerson(safe(root.MoederID));                // Vind moeder
        if(m) hierarchy[0].nodes.push(createTimelineNode(m,'MHoofdID')); // Voeg moeder toe aan ouders level
    }

    hierarchy[1].nodes.push(createTimelineNode(root,'HoofdID'));     // Voeg hoofd toe
    if(root.PartnerID){
        const p = findPerson(safe(root.PartnerID));                // Vind partner hoofd
        if(p) hierarchy[2].nodes.push(createTimelineNode(p,'PHoofdID')); // Voeg toe
    }

    let children = dataRel.filter(d => ['KindID','HKindID','PHKindID'].includes(d.Relatie)); // Filter kinderen
    children.sort((a,b) => parseBirthday(a.Geboortedatum)-parseBirthday(b.Geboortedatum));   // Sorteer op geboortedatum

    children.forEach(k=>{
        const kidNode = createTimelineNode(k,k.Relatie);           // Maak node kind
        kidNode.style.position='absolute';                         // Absolute position
        kidNode.style.left = dateToX(k.Geboortedatum)+'%';         // Horizontaal uitlijnen
        hierarchy[3].nodes.push(kidNode);                           // Voeg toe aan kinderen level

        if(k.PartnerID){
            const kp = findPerson(safe(k.PartnerID));              // Vind partner kind
            const kpNode = createTimelineNode(kp,'partner');        // Maak node partner
            kpNode.style.position='absolute';
            kpNode.style.left = dateToX(k.Geboortedatum)+'%';      // Horizontaal uitlijnen met kind
            hierarchy[4].nodes.push(kpNode);                        // Voeg toe aan partnerKind level
        }
    });

   // =======================
   // BROER/ ZUS (BZ) + PARTNER BZ
   // =======================
let broerZusList = dataRel.filter(d => d.Relatie === 'BZID'); // Filter broer/zus van hoofd
broerZusList.sort((a, b) => parseBirthday(a.Geboortedatum) - parseBirthday(b.Geboortedatum)); // Sorteer op geboorte

broerZusList.forEach(bz => {
    const bzNode = createTimelineNode(bz, 'BZID');          // Maak node broer/zus
    bzNode.style.position = 'absolute';                     // Absolute position
    bzNode.style.left = dateToX(bz.Geboortedatum) + '%';    // Horizontaal uitlijnen
    hierarchy[5].nodes.push(bzNode);                        // Voeg toe aan broerZus level

    if (bz.PartnerID){
        const bzPartner = findPerson(safe(bz.PartnerID));           // Vind partner broer/zus
        const bzPartnerNode = createTimelineNode(bzPartner, 'PBZID'); // Maak node partner
        bzPartnerNode.style.position = 'absolute';                   // Absolute position
        bzPartnerNode.style.left = dateToX(bz.Geboortedatum) + '%';  // Horizontaal uitlijnen gelijk aan BZ
        hierarchy[6].nodes.push(bzPartnerNode);                      // Voeg toe aan partnerBZ level
    }
});
}

// =======================
// LIVE SEARCH
// =======================
searchInput.addEventListener('input', () => {
    liveSearch({
        searchInput,                                         // Input element
        dataset,                                             // Dataset voor zoeken
        displayType: 'popup',                                // Weergave als popup
        renderCallback: (selected)=>{                        // Callback bij selectie
            selectedHoofdId = safe(selected.ID);            // Update geselecteerde persoon
            renderTimeline();                                // Render opnieuw
        }
    });
});

// =======================
// INIT
// =======================
function renderTimeline(){
    buildTimeline(selectedHoofdId);                         // Bouw timeline voor geselecteerde persoon
}

function refreshTimeline(){
    dataset = window.StamboomStorage.get()||[];           // Herlaad dataset
    selectedHoofdId = null;                                // Reset selectie
    renderTimeline();                                      // Render opnieuw
}

refreshTimeline();                                         // Init render bij laden

})();
