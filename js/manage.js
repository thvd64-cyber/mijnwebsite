// ======================= manage.js v1.3.3 =======================
// Beheer module: Hoofd + Ouders + Partner + Kinderen + Broer/Zus
// Production hardened: null-safe + selectedHoofdId state + header fix
// Visualisatie: Ouders → Hoofd+Partner → Kinderen → Broer/Zus
// =================================================================
(function(){ // IIFE start → voorkomt globale vervuiling
'use strict'; // strikte modus

// =======================
// DOM-elementen
// =======================
const tableBody   = document.querySelector('#manageTable tbody'); // tbody referentie
const theadRow    = document.querySelector('#manageTable thead tr'); // header rij
const addBtn      = document.getElementById('addBtn'); // toevoegen knop
const saveBtn     = document.getElementById('saveBtn'); // opslaan knop
const refreshBtn  = document.getElementById('refreshBtn'); // refresh knop
const searchInput = document.getElementById('searchPerson'); // zoekveld

// =======================
// State
// =======================
let dataset = window.StamboomStorage.get() || []; // dataset laden
let selectedHoofdId = null; // actieve geselecteerde persoon

// =======================
// Helpers (null-safe)
// =======================
function safe(val){ return val ? String(val).trim() : ''; } // null-safe string
function parseDate(d){ 
    if(!d) return new Date(0);
    const parts = d.split('-');
    if(parts.length !==3) return new Date(0);
    return new Date(parts.reverse().join('-'));
}

// =======================
// Kolomdefinitie
// =======================
const COLUMNS = [
    { key: 'Relatie', readonly: true },
    { key: 'ID', readonly: true },
    { key: 'Doopnaam', readonly: false },
    { key: 'Roepnaam', readonly: false },
    { key: 'Prefix', readonly: false },
    { key: 'Achternaam', readonly: false },
    { key: 'Geslacht', readonly: false },
    { key: 'Geboortedatum', readonly: false },
    { key: 'Geboorteplaats', readonly: false },
    { key: 'Overlijdensdatum', readonly: false },
    { key: 'Overlijdensplaats', readonly: false },
    { key: 'VaderID', readonly: false },
    { key: 'MoederID', readonly: false },
    { key: 'PartnerID', readonly: false },
    { key: 'Huwelijksdatum', readonly: false },
    { key: 'Huwelijksplaats', readonly: false },
    { key: 'Opmerkingen', readonly: false },
    { key: 'Adres', readonly: false },
    { key: 'ContactInfo', readonly: false },
    { key: 'UR', readonly: false }
];

// =======================
// Build Table Header
// =======================
function buildHeader(){ 
    theadRow.innerHTML = ''; // leegmaken
    COLUMNS.forEach(col=>{
        const th = document.createElement('th');
        th.textContent = col.key;
        theadRow.appendChild(th);
    });
}

// =======================
// Relatie-engine v2.0 – volledig hiërarchisch
// Naamstructuur: HoofdID, VHoofdID, MHoofdID, PHoofdID, KindID, PKPartnerID, BZID, BZPartnerID
// Null-safe, automatisch sortering en partner koppeling
// =======================
function computeRelaties(data, hoofdId){
    const hoofdIdStr = safe(hoofdId);                       // HoofdID null-safe maken
    if(!hoofdIdStr) return [];                               // Stop als geen HoofdID

    const hoofdPersoon = data.find(d => safe(d.ID) === hoofdIdStr); // Zoek hoofd persoon
    if(!hoofdPersoon) return [];                             // Stop als hoofd niet gevonden

    const vaderId   = safe(hoofdPersoon.VaderID);           // VHoofdID
    const moederId  = safe(hoofdPersoon.MoederID);          // MHoofdID
    const partnerId = safe(hoofdPersoon.PartnerID);         // PHoofdID

    // =======================
    // Functies voor objecten
    // =======================
    function KindObj(ID, geboortedatum, scenario=0, linkedTo=null){
        return {
            KindID: ID,              // ID van kind
            PKPartnerID: null,       // Partner van kind
            _priority: 3,            // Prioriteit voor sortering
            _scenario: scenario,     // Scenario volgorde
            _linkedTo: linkedTo,     // Partner koppeling
            Geboortedatum: geboortedatum // Geboortedatum
        };
    }

    function BZObj(ID, geboortedatum, scenario=0, linkedTo=null){
        return {
            BZID: ID,                // ID van broer/zus
            BZPartnerID: null,       // Partner van broer/zus
            _priority: 4,            // Prioriteit voor sortering
            _scenario: scenario,     // Scenario volgorde
            _linkedTo: linkedTo,     // Partner koppeling
            Geboortedatum: geboortedatum // Geboortedatum
        };
    }

    // =======================
    // Sorteerfunctie: prioriteit, partner direct onder gekoppelde persoon, scenario, leeftijd
    // =======================
    function sorteerRelaties(array){
        return array.sort((a,b)=>{
            if(a._priority !== b._priority) return a._priority - b._priority;         // 1️⃣ prioriteit
            if(a._linkedTo === (b.KindID || b.BZID)) return 1;                        // 2️⃣ partner direct onder
            if(b._linkedTo === (a.KindID || a.BZID)) return -1;
            if(a._scenario !== b._scenario) return a._scenario - b._scenario;         // 3️⃣ scenario
            return parseDate(a.Geboortedatum) - parseDate(b.Geboortedatum);           // 4️⃣ leeftijd (oudste eerst)
        });
    }

    // =======================
    // Maak hiërarchische structuur
    // =======================
    const hoofdStructuur = {
        HoofdID: hoofdIdStr,         // HoofdID
        VHoofdID: vaderId,           // Vader
        MHoofdID: moederId,          // Moeder
        PHoofdID: partnerId,         // Partner
        Kinderen: [],                // Array van KindID objecten
        BroersZussen: []             // Array van BZID objecten
    };

    // =======================
    // Vul Kinderen en PartnerKind
    // =======================
    data.forEach(p=>{
        const pid = safe(p.ID);
        const geboortedatum = safe(p.Geboortedatum);

        // Kinderen van hoofd
        const isKindHoofd = safe(p.VaderID) === hoofdIdStr || safe(p.MoederID) === hoofdIdStr;
        const isKindPartner = partnerId && (safe(p.VaderID) === partnerId || safe(p.MoederID) === partnerId);

        if(isKindHoofd || isKindPartner){
            const scenario = isKindHoofd && isKindPartner ? 1 : isKindHoofd ? 2 : 3;
            const kind = KindObj(pid, geboortedatum, scenario);

            // Koppel partner van kind indien aanwezig
            if(safe(p.PartnerID)){
                kind.PKPartnerID = safe(p.PartnerID);
                kind._linkedTo = pid; // partner direct onder kind
            }

            hoofdStructuur.Kinderen.push(kind);
        }
    });

    // =======================
    // Vul Broers/Zussen en PartnerBroerZus
    // =======================
    data.forEach(p=>{
        const pid = safe(p.ID);
        const geboortedatum = safe(p.Geboortedatum);
        if(pid === hoofdIdStr) return; // sla hoofd over

        const zelfdeVader  = vaderId  && safe(p.VaderID)  === vaderId;
        const zelfdeMoeder = moederId && safe(p.MoederID) === moederId;

        if(zelfdeVader || zelfdeMoeder){
            const scenario = zelfdeVader && zelfdeMoeder ? 1 : zelfdeVader ? 2 : 3;
            const bz = BZObj(pid, geboortedatum, scenario);

            // Partner broer/zus koppelen
            if(safe(p.PartnerID)){
                bz.BZPartnerID = safe(p.PartnerID);
                bz._linkedTo = pid; // partner direct onder broer/zus
            }

            hoofdStructuur.BroersZussen.push(bz);
        }
    });

    // =======================
    // Sorteer Kinderen en Broers/Zussen
    // =======================
    hoofdStructuur.Kinderen = sorteerRelaties(hoofdStructuur.Kinderen);
    hoofdStructuur.BroersZussen = sorteerRelaties(hoofdStructuur.BroersZussen);

    // =======================
    // Teruggeven van hiërarchische structuur
    // =======================
    return hoofdStructuur;
}
    
// =======================
// Render Table
// =======================
function renderTable(data){
    if(!selectedHoofdId){ showPlaceholder('Selecteer een persoon'); return; }
    const contextData = computeRelaties(data, selectedHoofdId);
    tableBody.innerHTML='';
    if(!contextData.length){ showPlaceholder('Geen personen gevonden'); return; }

    contextData.forEach(p=>{
        const tr = document.createElement('tr');
        if(p.Relatie) tr.classList.add(`rel-${p.Relatie.toLowerCase()}`);
        if(p._scenario) tr.classList.add(`scenario-${p._scenario}`);
        COLUMNS.forEach(col=>{
            const td=document.createElement('td');
            if(col.readonly){ td.textContent=p[col.key]||''; }
            else { const input=document.createElement('input'); input.value=p[col.key]||''; input.dataset.field=col.key; td.appendChild(input); }
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
}

// =======================
// Placeholder
// =======================
function showPlaceholder(msg){
    tableBody.innerHTML='';
    const tr=document.createElement('tr');
    const td=document.createElement('td');
    td.colSpan=COLUMNS.length; td.textContent=msg; td.style.textAlign='center';
    tr.appendChild(td); tableBody.appendChild(tr);
}

// ======================= Flatten helper voor computeRelaties output
// =======================
function flattenContext(context){ // Converteer object van computeRelaties naar array geschikt voor renderTable
    const arr = []; // Maak lege array voor resultaten
    if(context.HoofdID) arr.push({ID: context.HoofdID, Relatie:'Hoofd'}); // Voeg hoofd toe als object
    context.Kinderen.forEach(k => arr.push({ID: k.KindID, Relatie:'Kind', ...k})); // Voeg elk kind toe met Relatie 'Kind'
    context.BroersZussen.forEach(bz => arr.push({ID: bz.BZID, Relatie:'BroerZus', ...bz})); // Voeg elke broer/zus toe met Relatie 'BroerZus'
    return arr; // Geef platte array terug
}

// ======================= Render Table (aangepast voor flattenContext)
// =======================
function renderTable(data){
    if(!selectedHoofdId){ showPlaceholder('Selecteer een persoon'); return; } // Stop en toon placeholder als geen hoofd geselecteerd
    const contextData = flattenContext(computeRelaties(data, selectedHoofdId)); // Haal hiërarchie op en flatten naar array
    tableBody.innerHTML=''; // Maak tbody leeg
    if(!contextData.length){ showPlaceholder('Geen personen gevonden'); return; } // Stop en toon placeholder als geen data

    contextData.forEach(p=>{ // Loop door elk object in de platte array
        const tr = document.createElement('tr'); // Maak een nieuwe tabelrij
        if(p.Relatie) tr.classList.add(`rel-${p.Relatie.toLowerCase()}`); // Voeg relatie-klasse toe (hoofd/kind/broerZus)
        if(p._scenario) tr.classList.add(`scenario-${p._scenario}`); // Voeg scenario-klasse toe als aanwezig
        COLUMNS.forEach(col=>{ // Loop door kolommen
            const td=document.createElement('td'); // Maak tabelcel
            if(col.readonly){ td.textContent=p[col.key]||''; } // Vul readonly velden
            else { 
                const input=document.createElement('input'); // Maak input voor bewerkbare velden
                input.value=p[col.key]||''; // Vul value
                input.dataset.field=col.key; // Zet field attribuut
                td.appendChild(input); // Voeg input toe aan cel
            }
            tr.appendChild(td); // Voeg cel toe aan rij
        });
        tableBody.appendChild(tr); // Voeg rij toe aan tbody
    });
}

// ======================= Live Search – herwerkt, hiërarchie compatible
// =======================
function liveSearch() {
    const term = safe(searchInput.value).toLowerCase(); // Haal input op, maak null-safe en lowercase voor case-insensitive zoek
    document.getElementById('searchPopup')?.remove();  // Verwijder eventueel bestaande popup om duplicaten te voorkomen
    if (!term) return;                                  // Stop als er niets is ingevuld

    // =======================
    // Filter dataset
    // =======================
    const results = dataset.filter(p =>
        safe(p.ID).toLowerCase().includes(term) ||       // Zoek op ID
        safe(p.Roepnaam).toLowerCase().includes(term) ||// Zoek op Roepnaam
        safe(p.Achternaam).toLowerCase().includes(term) // Zoek op Achternaam
    );

    // =======================
    // Bepaal positie van de zoekinput
    // =======================
    const rect = searchInput.getBoundingClientRect();   // Verkrijg afmetingen en positie van input veld
    const popup = document.createElement('div');        // Maak een div voor popup
    popup.id = 'searchPopup';                           // Zet ID zodat we het later kunnen verwijderen
    popup.style.position = 'absolute';                  // Absolute positionering tov viewport
    popup.style.background = '#fff';                    // Achtergrond wit
    popup.style.border = '1px solid #999';             // Lichte rand
    popup.style.zIndex = 1000;                          // Zorg dat popup boven andere elementen ligt
    popup.style.top = rect.bottom + window.scrollY + 'px'; // Plaats net onder input veld
    popup.style.left = rect.left + window.scrollX + 'px';  // Horizontaal alignen met input
    popup.style.width = rect.width + 'px';             // Zelfde breedte als input
    popup.style.maxHeight = '200px';                   // Max hoogte met scroll
    popup.style.overflowY = 'auto';                    // Scroll bij overflow

    // =======================
    // Voeg resultaten toe
    // =======================
    results.forEach(p => {
        const row = document.createElement('div');             // Maak een div per resultaat
        row.textContent = `${p.ID} | ${p.Roepnaam} | ${p.Achternaam}`; // Toon basis info
        row.style.padding = '5px';                             // Padding voor leesbaarheid
        row.style.cursor = 'pointer';                          // Cursor pointer bij hover
        row.addEventListener('click', () => {                 // Klik-event
            selectedHoofdId = safe(p.ID);                     // Stel geselecteerd hoofd in
            popup.remove();                                   // Sluit popup
            renderTable(dataset);                              // Render tabel met nieuwe hoofd
        });
        popup.appendChild(row);                                // Voeg resultaat toe aan popup
    });

    // =======================
    // Toon "geen resultaten" als leeg
    // =======================
    if (results.length === 0) {
        const row = document.createElement('div');             // Maak een div
        row.textContent = 'Geen resultaten';                  // Bericht voor lege resultaten
        row.style.padding = '5px';                             // Padding
        popup.appendChild(row);                                 // Voeg toe aan popup
    }

    // =======================
    // Voeg popup toe aan document
    // =======================
    document.body.appendChild(popup);                         // Voeg popup toe aan DOM zodat zichtbaar
}

// ======================= Event listener toevoegen
// =======================
searchInput.addEventListener('input', liveSearch); // Zorg dat liveSearch wordt aangeroepen bij elke input verandering
