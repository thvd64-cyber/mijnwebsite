// ======================= stamboom/view.js v1.5.10 =======================
// Boom rendering + Live search + Kind/Partner + BZID + BZID partner naast
(function(){
'use strict';

// =======================
// DOM-elementen
// =======================
const treeBox      = document.getElementById('treeContainer'); // Container voor de hoofdbomen
const BZBox        = document.getElementById('BZBox');        // Container voor BZID nodes
const searchInput  = document.getElementById('searchPerson'); // Input veld voor live search

// =======================
// State
// =======================
let dataset = window.StamboomStorage.get() || [];  // Haal dataset uit local storage of lege array
let selectedHoofdId = null;                        // ID van geselecteerde hoofd persoon

// =======================
// Helpers
// =======================
function safe(val){ return val ? String(val).trim() : ''; } // Zet elke waarde om naar string, verwijder whitespace

function formatDate(d){ // Formatteer datum naar NL formaat
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

// =======================
// NODE CREATOR
// =======================
function createTreeNode(p, rel){
    const div = document.createElement('div');          // Maak een div element voor node
    div.className = 'tree-node';                        // Basis class
    if(rel) div.classList.add(rel);                     // Voeg relatie-specifieke class toe voor kleur

    const fullName = [safe(p.Roepnaam), safe(p.Prefix), safe(p.Achternaam)]
                     .filter(Boolean).join(' ').trim(); // Combineer naamcomponenten
    const birth = formatDate(p.Geboortedatum);          // Formatteer geboortedatum

    div.innerHTML = `
        <span class="id">${safe(p.ID)}</span>
        <span class="name">${fullName}</span> 
        <span class="birth">${birth}</span>
    `;
    
    div.dataset.id = p.ID;                              // Sla ID op in dataset
    div.addEventListener('click', () => {              // Klik selecteert node als hoofd
        selectedHoofdId = safe(p.ID);                  // Gebruik safe() om spaties te verwijderen
        renderTree();                                  // Bouw de boom
    });

    return div;                                        // Geef de node terug
}

// =======================
// DATA HELPERS
// =======================
function findPerson(id){
    return dataset.find(p => safe(p.ID) === safe(id));  // Zoek persoon op ID
}

// =======================
// RELATIE ENGINE
// =======================
function computeRelaties(data, hoofdId){
    const hoofdID = safe(hoofdId);                     // Veilig hoofdID
    if(!hoofdID) return [];                            // Geen selectie, stop
    const hoofd = findPerson(hoofdID);                // Vind hoofd in dataset
    if(!hoofd) return [];                              // Hoofd niet gevonden, stop

    const VHoodID = safe(hoofd.VaderID);              // Veilig VaderID
    const MHoofdID = safe(hoofd.MoederID);            // Veilig MoederID
    const PHoofdID = safe(hoofd.PartnerID);           // Veilig PartnerID

    const children = data.filter(p => safe(p.VaderID)===hoofdID || safe(p.MoederID)===hoofdID); // Kinderen van hoofd

    const BZID = data.filter(p=>{
        const pid = safe(p.ID);
        if(pid === hoofdID || pid === PHoofdID || children.some(c=>c.ID===pid)) return false; // Exclude hoofd, partner, kinderen
        const sameVader = VHoodID && safe(p.VaderID)===VHoodID;
        const sameMoeder = MHoofdID && safe(p.MoederID)===MHoofdID;
        return sameVader || sameMoeder;              // Broer/zus via vader of moeder
    });

    return data.map(p=>{
        const pid = safe(p.ID);
        const clone = {...p};
        clone.Relatie='';
        clone._priority=99;                            // Default laagste prioriteit

        if(pid===hoofdID){ clone.Relatie='HoofdID'; clone._priority=1; }         // Hoofd
        else if(pid===VHoodID){ clone.Relatie='VHoofdID'; clone._priority=0; }   // Vader
        else if(pid===MHoofdID){ clone.Relatie='MHoofdID'; clone._priority=0; }  // Moeder
        else if(pid===PHoofdID){ clone.Relatie='PHoofdID'; clone._priority=2; }  // Partner hoofd
        else if(children.some(c=>c.ID===pid)){
            clone.Relatie='KindID'; clone._priority=3;                           // Kind scenario
            if(PHoofdID && safe(p.VaderID)===hoofdID && safe(p.MoederID)===PHoofdID) clone.Relatie='kind1';
            else if(safe(p.VaderID)===hoofdID) clone.Relatie='kind2';
            else if(PHoofdID && safe(p.MoederID)===PHoofdID) clone.Relatie='kind3';
        }
        else if(BZID.some(b=>b.ID===pid)){ clone.Relatie='BZID'; clone._priority=4; } // Broer/zus

        return clone;
    }).sort((a,b)=>a._priority - b._priority);        // Sorteer op prioriteit voor render volgorde
}

// =======================
// BOOM BUILDER
// =======================
function buildTree(rootID){
    treeBox.innerHTML='';  // Leeg boom container
    BZBox.innerHTML='';    // Leeg BZBox

    if(!rootID){ treeBox.textContent='Selecteer een persoon'; return; }  // Geen selectie
    const root = findPerson(rootID);
    if(!root){ treeBox.textContent='Persoon niet gevonden'; return; }  // Niet gevonden

    const dataRel = computeRelaties(dataset, rootID);

    // Hoofd + Partner
    const rootWrapper=document.createElement('div'); // Wrapper voor hoofd + partner
    rootWrapper.className='tree-root-main';
    rootWrapper.appendChild(createTreeNode(root,'HoofdID'));             // Voeg hoofd toe
    if(root.PartnerID){
        const partner = findPerson(safe(root.PartnerID));                // Veilig partnerID
        if(partner) rootWrapper.appendChild(createTreeNode(partner,'PHoofdID')); // Voeg partner toe
    }
    treeBox.appendChild(rootWrapper);                                     // Voeg toe aan treeBox

    // Ouders
    const parents=document.createElement('div');
    parents.className='tree-parents';
    if(root.VaderID){ const v=findPerson(safe(root.VaderID)); if(v) parents.appendChild(createTreeNode(v,'VHoofdID')); } // Vader groen
    if(root.MoederID){ const m=findPerson(safe(root.MoederID)); if(m) parents.appendChild(createTreeNode(m,'MHoofdID')); } // Moeder groen
    if(parents.children.length>0) treeBox.prepend(parents);              // Voeg ouders bovenaan toe

    // Kinderen + partner
    const children=dataRel.filter(d=>['kind1','kind2','kind3'].includes(d.Relatie));
    if(children.length>0){
        const kidsWrap=document.createElement('div');
        kidsWrap.className='tree-children';
        children.forEach(k=>{
            const kidGroup=document.createElement('div');
            kidGroup.className='tree-kid-group';                // Kind + partner naast elkaar
            kidGroup.appendChild(createTreeNode(k,k.Relatie)); // Voeg kind toe
            if(k.PartnerID){
                const kPartner=findPerson(safe(k.PartnerID));  // Veilig partnerID
                if(kPartner) kidGroup.appendChild(createTreeNode(kPartner,'PKindID')); // Partner naast kind
            }
            kidsWrap.appendChild(kidGroup);
        });
        treeBox.appendChild(kidsWrap);
    }

    // BZID + partner naast BZID
    const bzNodes = dataRel.filter(d=>d.Relatie==='BZID');
    bzNodes.forEach(b=>{
        const bzGroup=document.createElement('div'); // Wrapper voor BZ + partner
        bzGroup.className='tree-kid-group';          // Horizontaal naast elkaar
        bzGroup.appendChild(createTreeNode(b,'BZID'));// Voeg BZ node toe
        if(b.PartnerID){                              // Partner naast BZID
            const bPartner=findPerson(safe(b.PartnerID));
            if(bPartner) bzGroup.appendChild(createTreeNode(bPartner,'PBZID')); // Voeg partner ernaast
        }
        BZBox.appendChild(bzGroup);                   // Voeg rij toe aan BZBox
    });
}

// =======================
// LIVE SEARCH (GROTERE BOX + TEKST + OFFSET)
// =======================
function liveSearch(){
    const term = safe(searchInput.value).toLowerCase();      // Zoekterm
    document.getElementById('searchPopup')?.remove();        // Verwijder oude popup
    if(!term) return;                                        // Stop bij lege input

    const results = dataset.filter(p =>
        safe(p.ID).toLowerCase().includes(term) ||
        safe(p.Roepnaam).toLowerCase().includes(term) ||
        safe(p.Achternaam).toLowerCase().includes(term)
    );

    const rect = searchInput.getBoundingClientRect();        // Positie input
    const popup = document.createElement('div');             // Popup container
    popup.id='searchPopup';
    popup.style.position='absolute';
    popup.style.background='#fff';
    popup.style.border='1px solid #999';
    popup.style.zIndex=1000;

    // ======================= POSITIE EN GROOTTE =======================
    popup.style.top = rect.bottom + window.scrollY + 'px';
    popup.style.left = Math.max(rect.left + window.scrollX, 5) + 'px'; // minimaal 5px vanaf linker kant
    popup.style.width = (rect.width * 1.2) + 'px'; // 20% breder dan de input
    popup.style.maxHeight = '300px';               // groter popup
    popup.style.overflowY = 'auto';
    popup.style.fontSize = '1.1rem';               // grotere tekst
    popup.style.padding = '8px';                   // meer padding

    if(results.length === 0){
        const row = document.createElement('div');
        row.textContent = 'Geen resultaten';
        row.style.padding = '8px';                // groter padding
        popup.appendChild(row);
    } else {
        results.forEach(p => {
            const row = document.createElement('div');
            row.textContent = `${p.ID} | ${p.Roepnaam} | ${p.Achternaam}`;
            row.style.padding = '8px';            // grotere padding
            row.style.cursor = 'pointer';
            row.style.fontSize = '1.1rem';        // grotere tekst
            row.addEventListener('click', ()=>{
                selectedHoofdId = safe(p.ID);     // Pas selectie toe alleen bij klik
                popup.remove();                   // Verwijder popup
                renderTree();                     // Bouw boom
            });
            popup.appendChild(row);
        });
    }

    document.body.appendChild(popup);                   // Voeg popup toe aan DOM
}
// =======================
// INIT
// =======================
function renderTree(){ buildTree(selectedHoofdId); }      // Render huidige hoofd
function refreshView(){
    dataset = window.StamboomStorage.get()||[];            // Herlaad dataset
    selectedHoofdId = null;                                // Geen automatische selectie
    renderTree();                                          // Bouw boom
}

refreshView();                                             // Initial render
searchInput.addEventListener('input', liveSearch);        // Live search trigger
})();
