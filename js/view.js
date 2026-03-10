// ======================= stamboom/view.js v1.5.8 =======================
// Boom rendering + Live search + Kind/Partner + BZID + partner naast BZID
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
        selectedHoofdId = p.ID;
        renderTree();
    });

    return div;
}

// =======================
// DATA HELPERS
// =======================
function findPerson(id){
    return dataset.find(p => safe(p.ID) === safe(id));
}

// =======================
// RELATIE ENGINE
// =======================
function computeRelaties(data, hoofdId){
    const hoofdID = safe(hoofdId);
    if(!hoofdID) return [];
    const hoofd = findPerson(hoofdID);
    if(!hoofd) return [];

    const VHoodID = safe(hoofd.VaderID);
    const MHoofdID = safe(hoofd.MoederID);
    const PHoofdID = safe(hoofd.PartnerID);

    const children = data.filter(p => safe(p.VaderID)===hoofdID || safe(p.MoederID)===hoofdID);

    const BZID = data.filter(p=>{
        const pid = safe(p.ID);
        if(pid === hoofdID || pid === PHoofdID || children.some(c=>c.ID===pid)) return false;
        const sameVader = VHoodID && safe(p.VaderID)===VHoodID;
        const sameMoeder = MHoofdID && safe(p.MoederID)===MHoofdID;
        return sameVader || sameMoeder;
    });

    return data.map(p=>{
        const pid = safe(p.ID);
        const clone = {...p};
        clone.Relatie='';
        clone._priority=99;

        if(pid===hoofdID){ clone.Relatie='HoofdID'; clone._priority=1; }
        else if(pid===VHoodID){ clone.Relatie='VHoodID'; clone._priority=0; }
        else if(pid===MHoofdID){ clone.Relatie='MHoofdID'; clone._priority=0; }
        else if(pid===PHoofdID){ clone.Relatie='PHoofdID'; clone._priority=2; }
        else if(children.some(c=>c.ID===pid)){
            clone.Relatie='KindID'; clone._priority=3;
            if(PHoofdID && safe(p.VaderID)===hoofdID && safe(p.MoederID)===PHoofdID) clone.Relatie='kind1';
            else if(safe(p.VaderID)===hoofdID) clone.Relatie='kind2';
            else if(PHoofdID && safe(p.MoederID)===PHoofdID) clone.Relatie='kind3';
        }
        else if(BZID.some(b=>b.ID===pid)){ clone.Relatie='BZID'; clone._priority=4; }

        return clone;
    }).sort((a,b)=>a._priority - b._priority);
}

// =======================
// BOOM BUILDER
// =======================
function buildTree(rootID){
    treeBox.innerHTML='';  // Leeg boom container
    BZBox.innerHTML='';    // Leeg BZBox

    if(!rootID){ treeBox.textContent='Selecteer een persoon'; return; }
    const root = findPerson(rootID);
    if(!root){ treeBox.textContent='Persoon niet gevonden'; return; }

    const dataRel = computeRelaties(dataset, rootID);

    // Hoofd + Partner
    const rootWrapper=document.createElement('div');
    rootWrapper.className='tree-root-main';
    rootWrapper.appendChild(createTreeNode(root,'HoofdID'));
    if(root.PartnerID){
        const partner = findPerson(root.PartnerID);
        if(partner) rootWrapper.appendChild(createTreeNode(partner,'PHoofdID'));
    }
    treeBox.appendChild(rootWrapper);

    // Ouders
    const parents=document.createElement('div');
    parents.className='tree-parents';
    if(root.VaderID){ const v=findPerson(root.VaderID); if(v) parents.appendChild(createTreeNode(v,'VHoodID')); }
    if(root.MoederID){ const m=findPerson(root.MoederID); if(m) parents.appendChild(createTreeNode(m,'MHoofdID')); }
    if(parents.children.length>0) treeBox.prepend(parents);

    // Kinderen + partner
    const children=dataRel.filter(d=>['kind1','kind2','kind3'].includes(d.Relatie));
    if(children.length>0){
        const kidsWrap=document.createElement('div');
        kidsWrap.className='tree-children';
        children.forEach(k=>{
            const kidGroup=document.createElement('div');
            kidGroup.className='tree-kid-group';
            kidGroup.appendChild(createTreeNode(k,k.Relatie));
            if(k.PartnerID){
                const kPartner=findPerson(k.PartnerID);
                if(kPartner) kidGroup.appendChild(createTreeNode(kPartner,'PKindID'));
            }
            kidsWrap.appendChild(kidGroup);
        });
        treeBox.appendChild(kidsWrap);
    }

    // BZID + partner naast BZID
    const bzNodes = dataRel.filter(d=>d.Relatie==='BZID');
    bzNodes.forEach(b=>{
        const bzGroup=document.createElement('div');  // Horizontale rij
        bzGroup.className='tree-kid-group';           // Zelfde styling als kids
        bzGroup.appendChild(createTreeNode(b,'BZID')); // Voeg BZID node toe
        if(b.PartnerID){                               // Als BZID een partner heeft
            const bPartner=findPerson(b.PartnerID);
            if(bPartner) bzGroup.appendChild(createTreeNode(bPartner,'PBZID')); // Voeg partner ernaast
        }
        BZBox.appendChild(bzGroup);                    // Voeg complete rij toe aan BZBox
    });
}

// =======================
// LIVE SEARCH
// =======================
function liveSearch(){
    const term = safe(searchInput.value).toLowerCase();
    document.getElementById('searchPopup')?.remove(); // Verwijder oud popup
    if(!term) return; // Niets ingevoerd: stop

    const results = dataset.filter(p =>
        safe(p.ID).toLowerCase().includes(term) ||
        safe(p.Roepnaam).toLowerCase().includes(term) ||
        safe(p.Achternaam).toLowerCase().includes(term)
    );

    // Popup voor selectie
    const rect = searchInput.getBoundingClientRect();
    const popup = document.createElement('div');
    popup.id='searchPopup';
    popup.style.position='absolute';
    popup.style.background='#fff';
    popup.style.border='1px solid #999';
    popup.style.zIndex=1000;
    popup.style.top=rect.bottom+window.scrollY+'px';
    popup.style.left=rect.left+window.scrollX+'px';
    popup.style.width=rect.width+'px';
    popup.style.maxHeight='200px';
    popup.style.overflowY='auto';

    if(results.length===0){
        const row=document.createElement('div');
        row.textContent='Geen resultaten';
        row.style.padding='5px';
        popup.appendChild(row);
    } else {
        results.forEach(p=>{
            const row=document.createElement('div');
            row.textContent=`${p.ID} | ${p.Roepnaam} | ${p.Achternaam}`;
            row.style.padding='5px';
            row.style.cursor='pointer';
            row.addEventListener('click', ()=>{
                selectedHoofdId = safe(p.ID); // Pas selectie alleen toe bij klik
                popup.remove();
                renderTree();
            });
            popup.appendChild(row);
        });
    }

    document.body.appendChild(popup);
}

// =======================
// INIT
// =======================
function renderTree(){ buildTree(selectedHoofdId); }
function refreshView(){
    dataset = window.StamboomStorage.get()||[];
    selectedHoofdId = null; // Geen automatische selectie
    renderTree();
}

refreshView();
searchInput.addEventListener('input', liveSearch);

})();
