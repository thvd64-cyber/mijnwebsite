// ======================= view.js v1.0.0 =======================
// Visualisatie van stamboom (hark structuur)
// Gebruikt dezelfde dataset als manage.js
// Visualisatie van stamboom met live search
// =============================================================

(function(){
'use strict';

// =======================
// DOM
// =======================
const treeContainer = document.getElementById('treeView'); // container voor boom
const searchInput   = document.getElementById('searchPerson'); // zoekveld

// =======================
// STATE
// =======================
let dataset = window.StamboomStorage.get() || []; // dataset laden
let selectedHoofdId = null; // huidige focus

// =======================
// HELPERS
// =======================
const safe = val => val ? String(val).trim() : ''; // veilige string
const geboorteJaar = datum => datum ? datum.split('-')[0] : ''; // extract jaar

// =======================
// RELATIE ENGINE
// =======================
function computeRelaties(data, hoofdId){
    const hoofdID = safe(hoofdId);
    if(!hoofdID) return [];
    const hoofd = data.find(p=>safe(p.ID)===hoofdID);
    if(!hoofd) return [];

    const VHoofdID = safe(hoofd.VaderID);
    const MHoofdID = safe(hoofd.MoederID);
    const PHoofdID = safe(hoofd.PartnerID);

    const KindID = data.filter(p=>
        safe(p.VaderID)===hoofdID || safe(p.MoederID)===hoofdID ||
        (PHoofdID && (safe(p.VaderID)===PHoofdID || safe(p.MoederID)===PHoofdID))
    ).map(p=>p.ID);

    const BZID = data.filter(p=>{
        const pid=safe(p.ID);
        if(pid===hoofdID || KindID.includes(pid) || pid===PHoofdID) return false;
        return (VHoofdID && safe(p.VaderID)===VHoofdID) || (MHoofdID && safe(p.MoederID)===MHoofdID);
    }).map(p=>p.ID);

    const KindPartnerID = KindID.map(id=>{ const k=data.find(p=>safe(p.ID)===id); return k?.PartnerID? safe(k.PartnerID) : null; }).filter(Boolean);
    const BZPartnerID = BZID.map(id=>{ const s=data.find(p=>safe(p.ID)===id); return s?.PartnerID? safe(s.PartnerID) : null; }).filter(Boolean);

    return data.map(p=>{
        const pid = safe(p.ID);
        const clone = {...p};
        clone.Relatie='';
        if(pid===hoofdID) clone.Relatie='HoofdID';
        else if(pid===VHoofdID) clone.Relatie='VHoofdID';
        else if(pid===MHoofdID) clone.Relatie='MHoofdID';
        else if(pid===PHoofdID) clone.Relatie='PHoofdID';
        else if(KindID.includes(pid)) clone.Relatie='KindID';
        else if(KindPartnerID.includes(pid)) clone.Relatie='KindPartnerID';
        else if(BZID.includes(pid)) clone.Relatie='BZID';
        else if(BZPartnerID.includes(pid)) clone.Relatie='BZPartnerID';
        return clone;
    });
}

// =======================
// VIEW MODEL
// =======================
function buildViewModel(context){
    const model={vader:null,moeder:null,siblings:[],siblingPartners:[],hoofd:null,partner:null,children:[],childPartners:[]};
    context.forEach(p=>{
        switch(p.Relatie){
            case 'VHoofdID': model.vader=p; break;
            case 'MHoofdID': model.moeder=p; break;
            case 'HoofdID': model.hoofd=p; break;
            case 'PHoofdID': model.partner=p; break;
            case 'BZID': model.siblings.push(p); break;
            case 'BZPartnerID': model.siblingPartners.push(p); break;
            case 'KindID': model.children.push(p); break;
            case 'KindPartnerID': model.childPartners.push(p); break;
        }
    });
    return model;
}

// =======================
// PERSON CARD
// =======================
function createPersonCard(p){
    if(!p) return document.createElement('div');
    const card=document.createElement('div'); card.className='person';
    const name=document.createElement('div'); name.className='name';
    name.textContent=`${safe(p.Roepnaam)} ${safe(p.Prefix)} ${safe(p.Achternaam)}`;
    const year=document.createElement('div'); year.className='year';
    const geboortejaar = geboorteJaar(p.Geboortedatum);
    if(geboortejaar) year.textContent=`(${geboortejaar})`;
    card.appendChild(name); card.appendChild(year);
    card.addEventListener('click',()=>{ selectedHoofdId=p.ID; renderTree(); });
    return card;
}

// =======================
// RENDER FAMILY PAIR
// =======================
function renderPair(p1,p2){
    const container=document.createElement('div'); container.className='family';
    container.appendChild(createPersonCard(p1));
    if(p2) container.appendChild(createPersonCard(p2));
    return container;
}

// =======================
// RENDER TREE
// =======================
function renderTree(){
    treeContainer.innerHTML='';
    if(!selectedHoofdId){ treeContainer.textContent='Selecteer een persoon'; return; }
    const context=computeRelaties(dataset,selectedHoofdId);
    const model=buildViewModel(context);
    const tree=document.createElement('div'); tree.className='tree';

    const parentRow=document.createElement('div'); parentRow.className='row';
    parentRow.appendChild(renderPair(model.vader,model.moeder));
    model.siblings.forEach(sib=>{
        const partner = model.siblingPartners.find(p=>safe(p.ID)===safe(sib.PartnerID));
        parentRow.appendChild(renderPair(sib,partner));
    });
    tree.appendChild(parentRow);

    const hoofdRow=document.createElement('div'); hoofdRow.className='row';
    hoofdRow.appendChild(renderPair(model.hoofd,model.partner));
    tree.appendChild(hoofdRow);

    const childRow=document.createElement('div'); childRow.className='row';
    model.children.forEach(child=>{
        const partner = model.childPartners.find(p=>safe(p.ID)===safe(child.PartnerID));
        childRow.appendChild(renderPair(child,partner));
    });
    tree.appendChild(childRow);

    treeContainer.appendChild(tree);
}

// =======================
// LIVE SEARCH
// =======================
searchInput.addEventListener('input',()=>{

    const term = safe(searchInput.value).toLowerCase();
    document.getElementById('searchPopup')?.remove();
    if(!term) return;

    const results = dataset.filter(p=>
        safe(p.ID).toLowerCase().includes(term) ||
        safe(p.Roepnaam).toLowerCase().includes(term) ||
        safe(p.Achternaam).toLowerCase().includes(term)
    );

    const rect=searchInput.getBoundingClientRect();
    const popup=document.createElement('div'); popup.id='searchPopup';
    popup.style.position='absolute'; popup.style.background='#fff';
    popup.style.border='1px solid #999'; popup.style.zIndex=1000;
    popup.style.top=rect.bottom+window.scrollY+'px'; popup.style.left=rect.left+window.scrollX+'px';
    popup.style.width=rect.width+'px'; popup.style.maxHeight='200px';
    popup.style.overflowY='auto'; popup.style.borderRadius='6px';
    popup.style.boxShadow='0 2px 6px rgba(0,0,0,0.1)';

    if(results.length===0){ const row=document.createElement('div'); row.textContent='Geen resultaten'; row.style.padding='8px'; popup.appendChild(row); }

    results.forEach(p=>{
        const row=document.createElement('div'); row.textContent=`${p.ID} | ${p.Roepnaam} | ${p.Achternaam}`;
        row.style.padding='8px'; row.style.cursor='pointer';
        row.addEventListener('click',()=>{
            selectedHoofdId = safe(p.ID); searchInput.value=safe(p.ID); popup.remove(); renderTree();
        });
        popup.appendChild(row);
    });

    document.body.appendChild(popup);
});

document.addEventListener('click',e=>{
    const popup=document.getElementById('searchPopup');
    if(popup && !popup.contains(e.target) && e.target!==searchInput) popup.remove();
});

// =======================
// INIT
// =======================
if(dataset.length) selectedHoofdId=dataset[0].ID; // default focus
renderTree();

})();
