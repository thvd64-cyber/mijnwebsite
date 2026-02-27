// ======================= js/manage.js v1.0.5 =======================
// → Haalt DOM-elementen, schema en opgeslagen dataset op
// → Bouwt de tabelkop en rendert de dataset met inputvelden, ID read-only
// → Bepaalt relaties ten opzichte van een hoofdpersoon voor subset-weergave
// → + Toevoegen maakt een nieuwe persoon met unieke ID en voegt deze toe
// → Opslaan valideert en bewaart wijzigingen, Laad subset toont directe familie
// .5 laad table na laad activatie op basis van search
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
    let dataset = window.StamboomStorage.get() || []; // volledige dataset ophalen via storage

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
    // C = Create – nieuwe persoon toevoegen
    // =======================
    function addPersoon() {
        const nieuw = window.StamboomSchema.empty(); // lege persoon
        nieuw[ID_FIELD] = window.genereerCode(nieuw, dataset); // unieke ID
        dataset.push(nieuw); // toevoegen
        StamboomStorage.set(dataset); // opslaan
        renderTable(dataset); // renderen
    }

    // =======================
    // R/U = Read & Update – opslaan gewijzigde tabel
    // =======================
    function saveDataset() {
        const rows = tableBody.querySelectorAll('tr');
        const nieuweDataset = [];
        const idSet = new Set();
        rows.forEach(tr => {
            const persoon = window.StamboomSchema.empty();
            FIELDS.forEach((field,index) => {
                const cell = tr.cells[index+1]; // +1 want eerste td = Relatie
                if(field === ID_FIELD) persoon[field] = cell.textContent.trim();
                else {
                    const input = cell.querySelector('input');
                    persoon[field] = input ? input.value.trim() : '';
                }
            });
            if(!window.StamboomSchema.validate(persoon)) {
                throw new Error(`Validatie mislukt voor ID ${persoon[ID_FIELD]}`);
            }
            if(idSet.has(persoon[ID_FIELD])) throw new Error(`Duplicate ID: ${persoon[ID_FIELD]}`);
            idSet.add(persoon[ID_FIELD]);
            nieuweDataset.push(persoon);
        });
        dataset = nieuweDataset;
        StamboomStorage.set(dataset);
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

   // ======================= Init =======================
function initPlaceholder() {
    tableBody.innerHTML = ''; // tbody leegmaken
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = FIELDS.length + 1; // +1 voor Relatie kolom
    td.textContent = 'Klik op "Laat Person" om data te laden'; 
    td.style.textAlign = 'center';
    tr.appendChild(td);
    tableBody.appendChild(tr);
}
initPlaceholder(); // roept dit bij init aan
})();
