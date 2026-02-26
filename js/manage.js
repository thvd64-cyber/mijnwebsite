// ======================= js/manage.js v1.0.3 =======================
// → Haalt DOM-elementen, schema en opgeslagen dataset op
// → Bouwt de tabelkop en rendert de dataset met inputvelden, ID read-only
// → Bepaalt relaties ten opzichte van een hoofdpersoon voor subset-weergave
// → .3  C = Create – volledig lege persoon toevoegen // .2 NIEUWE ID NIET MEER GENEREREN
// .1 Opslaan valideert en bewaart met unieke ID’s; Laad subset toont directe familie op basis van die ID    
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
    const FIELDS = window.StamboomSchema.fields; // Haalt alle veldnamen uit je stamboom-schema (zoals ID, Naam, Geboortedatum, etc.)
    const ID_FIELD = FIELDS[0]; // Het eerste veld in het schema wordt beschouwd als het unieke ID-veld
    let dataset = window.StamboomStorage.get() || []; // Haalt de opgeslagen dataset op uit storage, of start een lege array als er nog niets is

    // =======================
    // Header opbouwen (toegevoegd)
    // =======================
    function buildHeader() {
        theadRow.innerHTML = ''; // lege header eerst
        const thRel = document.createElement('th'); // eerste kolom: Relatie
        thRel.textContent = 'Relatie'; // tekst
        theadRow.appendChild(thRel); // toevoegen aan dead
        FIELDS.forEach(field => { // loop over alle schema velden
            const th = document.createElement('th'); // maak th element
            th.textContent = field; // veldnaam als kolomnaam
            theadRow.appendChild(th); // voeg toe aan header
        });
    }

    // =======================
    // Relatie bepalen voor view
    // =======================
    function bepaalRelatie(p, hoofd) {
        if(!hoofd) return '';
        if(p.ID === hoofd.ID) return 'Hoofd-ID';
        if(p.ID === hoofd.VaderID || p.ID === hoofd.MoederID) return 'Ouder';
        if(p.ID === hoofd.PartnerID) return 'Partner';
        if(p.VaderID === hoofd.ID || p.MoederID === hoofd.ID) return 'Kind';
        if(p.VaderID === hoofd.VaderID && p.MoederID === hoofd.MoederID && p.ID !== hoofd.ID) return 'Broer/Zus';
        if(p.PartnerID === hoofd.ID) return 'Partner-Kind';
        return '';
    }

    // =======================
    // Tabel renderen
    // =======================
    function renderTable(data, hoofd=null) {
        tableBody.innerHTML = ''; // tbody leegmaken
        data.forEach(p => {
            const tr = document.createElement('tr'); // nieuwe rij
            const relatie = hoofd ? bepaalRelatie(p, hoofd) : '';
            if(relatie) tr.className = relatie.toLowerCase().replace(/\s+/g,'-'); // css klasse
            const tdRel = document.createElement('td'); // Relatie kolom
            tdRel.textContent = relatie;
            tr.appendChild(tdRel);
            FIELDS.forEach(f => { // overige velden
                const td = document.createElement('td');
                if(f === ID_FIELD) td.textContent = p[f] || '';
                else {
                    const input = document.createElement('input'); // editable input
                    input.value = p[f] || '';
                    input.dataset.field = f;
                    td.appendChild(input);
                }
                tr.appendChild(td);
            });
            tableBody.appendChild(tr); // rij toevoegen
        });
    }

    // =======================
// C = Create – volledig lege persoon toevoegen
// =======================
function addPersoon() {
    const nieuw = {}; // volledig leeg object

    // Zet alle velden uit schema op lege string
    FIELDS.forEach(f => {
        nieuw[f] = ''; // niks erin
    });

    dataset.push(nieuw); // toevoegen aan dataset
    StamboomStorage.set(dataset); // opslaan
    renderTable(dataset); // tabel opnieuw renderen
}
   // =======================
// R/U = Read & Update – opslaan gewijzigde tabel
// =======================
function saveDataset() {

    const rows = tableBody.querySelectorAll('tr'); // Alle zichtbare rijen ophalen
    const nieuweDataset = []; // Nieuwe dataset die we gaan opbouwen
    const idSet = new Set(); // Voor duplicate controle

    rows.forEach(tr => {

        const persoon = window.StamboomSchema.empty(); // Leeg persoonobject
        let origineleID = null; // ID zoals die in de bestaande dataset stond

        FIELDS.forEach((field,index) => {

            const cell = tr.cells[index+1]; // +1 want eerste kolom is Relatie

            if(field === ID_FIELD) {

                const huidigeID = cell.textContent.trim(); // ID uit tabel

                // Probeer originele persoon te vinden
                origineleID = dataset.find(p => p[ID_FIELD] === huidigeID);

                persoon[field] = huidigeID; // Zet huidige ID

            } else {

                const input = cell.querySelector('input');
                persoon[field] = input ? input.value.trim() : '';

            }
        });

        // =======================
        // ID Governance Logica
        // =======================

        if(!persoon[ID_FIELD]) {

            // Controleer of deze rij vroeger een ID had
            if(origineleID) {
                throw new Error('Een bestaande ID mag niet verwijderd worden.');
            }

            // Nieuwe persoon zonder ID → genereer er één
            persoon[ID_FIELD] = window.genereerCode(persoon, [...dataset, ...nieuweDataset]);
        }

        // Duplicate controle
        if(idSet.has(persoon[ID_FIELD])) {
            throw new Error(`Duplicate ID: ${persoon[ID_FIELD]}`);
        }

        idSet.add(persoon[ID_FIELD]);

        // Validatie
        if(!window.StamboomSchema.validate(persoon)) {
            throw new Error(`Validatie mislukt voor ID ${persoon[ID_FIELD]}`);
        }

        nieuweDataset.push(persoon);

    });

    dataset = nieuweDataset; // Dataset vervangen
    StamboomStorage.set(dataset); // Opslaan
    renderTable(dataset); // Her-renderen zodat nieuwe ID zichtbaar wordt

    alert("Dataset succesvol opgeslagen.");
}

    // =======================
    // D = Delete – persoon verwijderen
    // =======================
    function deletePersoon(id) {
        dataset = dataset.filter(p => p.ID !== id);
        StamboomStorage.set(dataset);
        renderTable(dataset);
    }

    // =======================
    // Subset search – subset van directe relaties laden
    // =======================
    function loadDirectRelations() {
        dataset = StamboomStorage.get() || [];
        const term = searchInput.value.trim().toLowerCase();
        if(!term) return alert('Voer minimaal 1 ID of naam in.');
        const hoofd = dataset.find(p =>
            (p.ID && p.ID.toLowerCase().includes(term)) ||
            (p.Doopnaam && p.Doopnaam.toLowerCase().includes(term)) ||
            (p.Achternaam && p.Achternaam.toLowerCase().includes(term))
        );
        if(!hoofd) return alert('Hoofd-ID niet gevonden');
        const subset = dataset.filter(p =>
            p.ID === hoofd.ID ||
            p.ID === hoofd.VaderID || p.ID === hoofd.MoederID ||
            p.ID === hoofd.PartnerID ||
            p.VaderID === hoofd.ID || p.MoederID === hoofd.ID ||
            (p.VaderID === hoofd.VaderID && p.MoederID === hoofd.MoederID && p.ID !== hoofd.ID) ||
            p.PartnerID === hoofd.ID
        );
        renderTable(subset, hoofd);
    }

    // =======================
    // Init
    // =======================
    buildHeader(); // header opbouwen bij init
    renderTable(dataset); // eerste render volledige dataset
    addBtn.addEventListener('click', addPersoon);
    saveBtn.addEventListener('click', saveDataset);
    loadBtn.addEventListener('click', loadDirectRelations);
})();
