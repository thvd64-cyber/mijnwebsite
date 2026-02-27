// ======================= js/manage.js v1.0.8 =======================
// → Haalt DOM-elementen, schema en opgeslagen dataset op
// → Bouwt de tabelkop en rendert de dataset met inputvelden, ID read-only
// → Bepaalt relaties ten opzichte van een hoofdpersoon voor subset-weergave
// → + Toevoegen maakt een nieuwe persoon met unieke ID en voegt deze toe
// → Opslaan valideert en bewaart wijzigingen, Laad subset toont directe familie
// .5 laad table na laad activatie op basis van search
// .6 pas table body vullen pas bij knop, headers altijd zichtbaar
// .7 lazy-load + correcte row kleuren
// .8 relatie filter en sortering (v2)
// ==============================================================================

(function() {
    'use strict'; // Strikte modus voor veiligere JS

    // =======================
    // DOM-elementen ophalen
    // =======================
    const tableBody = document.querySelector('#manageTable tbody'); // tbody van manage tabel
    const theadRow = document.querySelector('#manageTable thead tr'); // thead rij voor headers
    const addBtn = document.getElementById('addBtn'); // + Toevoegen knop
    const saveBtn = document.getElementById('saveBtn'); // Opslaan knop
    const loadBtn = document.getElementById('loadBtn'); // Laad subset knop
    const searchInput = document.getElementById('searchPerson'); // zoekveld

    // =======================
    // Schema & ID
    // =======================
    const FIELDS = window.StamboomSchema.fields; // alle velden uit schema
    const ID_FIELD = FIELDS[0]; // "ID" veld
    let dataset = window.StamboomStorage.get() || []; // volledige dataset ophalen via storage, maar NIET renderen

    // =======================
    // Header opbouwen (toegevoegd)
    // =======================
    function buildHeader() {
        theadRow.innerHTML = ''; // lege header eerst
        const thRel = document.createElement('th'); // eerste kolom: Relatie
        thRel.textContent = 'Relatie'; // tekst
        theadRow.appendChild(thRel); // toevoegen aan thead
        FIELDS.forEach(field => { // loop over alle schema velden
            const th = document.createElement('th'); // maak th element
            th.textContent = field; // veldnaam als kolomnaam
            theadRow.appendChild(th); // voeg toe aan header
        });
    }
    
    // =======================
    // Tabel renderen (lazy-load + correcte kleuren)
    // =======================
    function renderTable(data, hoofd=null) {
        tableBody.innerHTML = ''; // tbody eerst leegmaken
        if(!data || data.length===0) { // geen data = placeholder tonen
            const tr = document.createElement('tr'); // nieuwe rij
            const td = document.createElement('td'); // cel
            td.colSpan = FIELDS.length + 1; // over alle kolommen
            td.textContent = 'Geen personen gevonden'; // boodschap
            td.style.textAlign = 'center'; // centreren
            tr.appendChild(td); // cel toevoegen aan rij
            tableBody.appendChild(tr); // rij toevoegen
            return; // klaar
        }
   
        // =======================
// Relatie bepalen voor view (v2)
// =======================
function bepaalRelatie(p, hoofd) {
    if(!hoofd) return ''; // fallback
    const vaderHoofd = hoofd.VaderID || null; // fallback null
    const moederHoofd = hoofd.MoederID || null;
    const partnerHoofd = hoofd.PartnerID || null;

    // 1. Hoofd zelf
    if(p.ID === hoofd.ID) return 'main';

    // 2. Ouders hoofd (alleen tonen als ID bekend is)
    if((vaderHoofd && p.ID === vaderHoofd) || (moederHoofd && p.ID === moederHoofd)) return 'parent';

    // 3. Huidige partner hoofd (alleen tonen als ID bekend is)
    if(partnerHoofd && p.ID === partnerHoofd) return 'partner';

    // 4. Broer/Zus (zelfde ouders, maar niet hoofd)
    const isSibling = p.ID !== hoofd.ID &&
        ((vaderHoofd && p.VaderID === vaderHoofd) || !vaderHoofd) &&
        ((moederHoofd && p.MoederID === moederHoofd) || !moederHoofd);
    if(isSibling) return 'sibling';

    // 5. Kinderen uit huidige huwelijk (alleen als partner bekend)
    const isChildSameMarriage =
        partnerHoofd &&
        ((p.VaderID === hoofd.ID && p.MoederID === partnerHoofd) ||
         (p.MoederID === hoofd.ID && p.VaderID === partnerHoofd));
    if(isChildSameMarriage) return 'child';

    // 6. Kinderen uit vorig huwelijk hoofd
    const isChildPreviousMarriage =
        (p.VaderID === hoofd.ID || p.MoederID === hoofd.ID) &&
        !isChildSameMarriage;
    if(isChildPreviousMarriage) return 'child';

    // 7. Kinderen uit vorig huwelijk partner
    const isChildPartnerPrevMarriage =
        partnerHoofd &&
        (p.VaderID === partnerHoofd || p.MoederID === partnerHoofd) &&
        !isChildSameMarriage;
    if(isChildPartnerPrevMarriage) return 'child';

    return ''; // alles wat geen match is of geen bekende ID
}
        data.forEach(p => { // loop over dataset
            const tr = document.createElement('tr'); // nieuwe rij
            const relatie = hoofd ? bepaalRelatie(p, hoofd) : ''; // relatie bepalen
            if(relatie) tr.className = relatie.toLowerCase().replace(/\s+/g,'-'); // css klasse voor kleur
            const tdRel = document.createElement('td'); // Relatie cel
            tdRel.textContent = relatie; // tekst vullen
            tr.appendChild(tdRel); // toevoegen aan rij
            FIELDS.forEach(f => { // overige velden
                const td = document.createElement('td'); // cel
                if(f === ID_FIELD) td.textContent = p[f] || ''; // ID readonly
                else {
                    const input = document.createElement('input'); // editable input
                    input.value = p[f] || ''; // waarde invullen
                    input.dataset.field = f; // veld attribuut
                    td.appendChild(input); // input toevoegen
                }
                tr.appendChild(td); // cel toevoegen aan rij
            });
            tableBody.appendChild(tr); // rij toevoegen aan tbody
        });
    }

    // =======================
    // C = Create – nieuwe persoon toevoegen
    // =======================
    function addPersoon() {
        const nieuw = window.StamboomSchema.empty(); // lege persoon
        nieuw[ID_FIELD] = window.genereerCode(nieuw, dataset); // unieke ID
        dataset.push(nieuw); // toevoegen
        StamboomStorage.set(dataset); // opslaan
        initPlaceholder(); // placeholder tonen, NIET volledige tabel renderen
    }

    // =======================
    // R/U = Read & Update – opslaan gewijzigde tabel
    // =======================
    function saveDataset() {
        const rows = tableBody.querySelectorAll('tr'); // alle rijen
        const nieuweDataset = []; // nieuwe dataset
        const idSet = new Set(); // check voor duplicates
        rows.forEach(tr => {
            const persoon = window.StamboomSchema.empty(); // lege persoon
            FIELDS.forEach((field,index) => {
                const cell = tr.cells[index+1]; // +1 want eerste td = Relatie
                if(field === ID_FIELD) persoon[field] = cell.textContent.trim(); // ID
                else {
                    const input = cell.querySelector('input'); // input ophalen
                    persoon[field] = input ? input.value.trim() : ''; // waarde
                }
            });
            if(!window.StamboomSchema.validate(persoon)) { // validatie
                throw new Error(`Validatie mislukt voor ID ${persoon[ID_FIELD]}`); // fout
            }
            if(idSet.has(persoon[ID_FIELD])) throw new Error(`Duplicate ID: ${persoon[ID_FIELD]}`); // duplicate check
            idSet.add(persoon[ID_FIELD]); // toevoegen aan set
            nieuweDataset.push(persoon); // toevoegen aan nieuwe dataset
        });
        dataset = nieuweDataset; // dataset updaten
        StamboomStorage.set(dataset); // opslaan
        alert("Dataset succesvol opgeslagen."); // melding
    }

    // =======================
    // D = Delete – persoon verwijderen
    // =======================
    function deletePersoon(id) {
        dataset = dataset.filter(p => p.ID !== id); // filter verwijderen
        StamboomStorage.set(dataset); // opslaan
        initPlaceholder(); // placeholder tonen
    }

    // =======================
    // Subset search – subset van directe relaties laden
    // =======================
    function loadDirectRelations() {
        dataset = StamboomStorage.get() || []; // dataset ophalen
        const term = searchInput.value.trim().toLowerCase(); // zoekterm
        if(!term) return alert('Voer minimaal 1 ID of naam in.'); // validatie
        const hoofd = dataset.find(p =>
            (p.ID && p.ID.toLowerCase().includes(term)) ||
            (p.Doopnaam && p.Doopnaam.toLowerCase().includes(term)) ||
            (p.Achternaam && p.Achternaam.toLowerCase().includes(term))
        ); // hoofd zoeken
        if(!hoofd) return alert('Hoofd-ID niet gevonden'); // foutmelding
        const subset = dataset.filter(p =>
            p.ID === hoofd.ID ||
            p.ID === hoofd.VaderID || p.ID === hoofd.MoederID ||
            p.ID === hoofd.PartnerID ||
            p.VaderID === hoofd.ID || p.MoederID === hoofd.ID ||
            (p.VaderID === hoofd.VaderID && p.MoederID === hoofd.MoederID && p.ID !== hoofd.ID) ||
            p.PartnerID === hoofd.ID
        ); // subset
        renderTable(subset, hoofd); // pas renderen bij klik
    }

    // ======================= Init (lazy-load) =======================
    function initPlaceholder() {
        tableBody.innerHTML = ''; // tbody leegmaken
        const tr = document.createElement('tr'); // nieuwe rij
        const td = document.createElement('td'); // nieuwe cel
        td.colSpan = FIELDS.length + 1; // span over alle kolommen
        td.textContent = 'Klik op "Laat Person" om data te laden'; // boodschap
        td.style.textAlign = 'center'; // centreren
        tr.appendChild(td); // rij vullen
        tableBody.appendChild(tr); // toevoegen aan tbody
    }

    buildHeader();      // headers renderen
    initPlaceholder();  // placeholder tonen, tbody leeg
    addBtn.addEventListener('click', addPersoon); // + Toevoegen knop
    saveBtn.addEventListener('click', saveDataset); // Opslaan knop
    loadBtn.addEventListener('click', loadDirectRelations); // Laad subset pas bij klik

})();
