// ======================= manage_clean.js =======================
// Core module voor het beheren van personen
// → DOM ophalen
// → Tabel renderen (alleen zoekresultaat of volledige dataset)
// → CRUD: Create, Read/Update, Delete
// → Lazy-load placeholder voor initiële weergave
// ==============================================================================

(function() {
    'use strict'; // Strikte modus voor veiliger JS

    // =======================
    // DOM-elementen ophalen
    // =======================
    const tableBody = document.querySelector('#manageTable tbody'); // tbody van manage tabel
    const theadRow = document.querySelector('#manageTable thead tr'); // thead rij
    const addBtn = document.getElementById('addBtn'); // + Toevoegen knop
    const saveBtn = document.getElementById('saveBtn'); // Opslaan knop
    const loadBtn = document.getElementById('loadBtn'); // Zoeken knop
    const searchInput = document.getElementById('searchPerson'); // zoekveld

    // =======================
    // Schema & dataset
    // =======================
    const FIELDS = window.StamboomSchema.fields; // alle velden uit schema
    const ID_FIELD = FIELDS[0]; // "ID" veld is eerste veld
    let dataset = window.StamboomStorage.get() || []; // volledige dataset ophalen (maar nog niet renderen)

    // =======================
    // Header opbouwen
    // =======================
    function buildHeader() {
        theadRow.innerHTML = ''; // eerst lege header
        const th = document.createElement('th'); // eerste kolom: placeholder voor eventuele labels
        th.textContent = ''; // leeg (relatie is verwijderd)
        theadRow.appendChild(th); // toevoegen
        FIELDS.forEach(field => { // loop over schema velden
            const th = document.createElement('th'); // nieuw th element
            th.textContent = field; // veldnaam als header
            theadRow.appendChild(th); // toevoegen aan thead
        });
    }

    // =======================
    // Tabel renderen
    // =======================
    function renderTable(data) {
        tableBody.innerHTML = ''; // tbody leegmaken
        if(!data || data.length === 0) { // geen data = placeholder
            const tr = document.createElement('tr'); // nieuwe rij
            const td = document.createElement('td'); // nieuwe cel
            td.colSpan = FIELDS.length + 1; // overspant alle kolommen
            td.textContent = 'Geen personen gevonden'; // boodschap
            td.style.textAlign = 'center'; // centreren
            tr.appendChild(td); // rij vullen
            tableBody.appendChild(tr); // toevoegen aan tbody
            return; // klaar
        }

        data.forEach(p => { // loop over dataset
            const tr = document.createElement('tr'); // nieuwe rij
            tr.style.backgroundColor = '#e0f7fa'; // lichtblauwe achtergrond voor zichtbare rijen

            FIELDS.forEach(f => { // loop over alle velden
                const td = document.createElement('td'); // nieuwe cel
                if(f === ID_FIELD) td.textContent = p[f] || ''; // ID readonly
                else {
                    const input = document.createElement('input'); // editable input
                    input.value = p[f] || ''; // waarde invullen
                    input.dataset.field = f; // veld attribuut
                    td.appendChild(input); // toevoegen aan cel
                }
                tr.appendChild(td); // cel toevoegen aan rij
            });

            tableBody.appendChild(tr); // rij toevoegen aan tbody
        });
    }

    // =======================
    // Create – nieuwe persoon toevoegen
    // =======================
    function addPersoon() {
        const nieuw = window.StamboomSchema.empty(); // lege persoon
        nieuw[ID_FIELD] = window.genereerCode(nieuw, dataset); // unieke ID genereren
        dataset.push(nieuw); // toevoegen aan dataset
        window.StamboomStorage.set(dataset); // opslaan in storage
        initPlaceholder(); // placeholder tonen ipv volledige tabel
    }

    // =======================
    // Read/Update – opslaan gewijzigde tabel
    // =======================
    function saveDataset() {
        const rows = tableBody.querySelectorAll('tr'); // alle rijen ophalen
        const nieuweDataset = []; // nieuwe dataset opbouwen
        const idSet = new Set(); // check voor duplicate ID's

        rows.forEach(tr => {
            const persoon = window.StamboomSchema.empty(); // lege persoon
            FIELDS.forEach((field, index) => {
                const cell = tr.cells[index]; // cel ophalen
                if(field === ID_FIELD) persoon[field] = cell.textContent.trim(); // ID vullen
                else {
                    const input = cell.querySelector('input'); // input ophalen
                    persoon[field] = input ? input.value.trim() : ''; // waarde vullen
                }
            });

            if(!window.StamboomSchema.validate(persoon)) // validatie
                throw new Error(`Validatie mislukt voor ID ${persoon[ID_FIELD]}`);

            if(idSet.has(persoon[ID_FIELD])) // duplicate check
                throw new Error(`Duplicate ID: ${persoon[ID_FIELD]}`);

            idSet.add(persoon[ID_FIELD]); // ID toevoegen aan set
            nieuweDataset.push(persoon); // toevoegen aan nieuwe dataset
        });

        dataset = nieuweDataset; // dataset vervangen
        window.StamboomStorage.set(dataset); // opslaan
        alert('Dataset succesvol opgeslagen'); // melding
    }

    // =======================
    // Delete – persoon verwijderen
    // =======================
    function deletePersoon(id) {
        dataset = dataset.filter(p => p.ID !== id); // filter verwijderen
        window.StamboomStorage.set(dataset); // opslaan
        initPlaceholder(); // placeholder tonen
    }

    // =======================
    // Zoekfunctionaliteit – enkel persoon tonen die overeenkomt
    // =======================
    function searchPerson() {
        dataset = window.StamboomStorage.get() || []; // dataset ophalen
        const term = searchInput.value.trim().toLowerCase(); // zoekterm
        if(!term) return alert('Voer een ID of naam in.'); // validatie

        const result = dataset.filter(p =>
            (p.ID && p.ID.toLowerCase().includes(term)) ||
            (p.Doopnaam && p.Doopnaam.toLowerCase().includes(term)) ||
            (p.Achternaam && p.Achternaam.toLowerCase().includes(term))
        );

        renderTable(result); // tabel renderen van zoekresultaat
    }

    // =======================
    // Lazy-load placeholder bij init
    // =======================
    function initPlaceholder() {
        tableBody.innerHTML = ''; // tbody leegmaken
        const tr = document.createElement('tr'); // nieuwe rij
        const td = document.createElement('td'); // nieuwe cel
        td.colSpan = FIELDS.length; // overspant alle kolommen
        td.textContent = 'Klik op "Laat Person" of zoek om data te tonen'; // boodschap
        td.style.textAlign = 'center'; // centreren
        tr.appendChild(td); // rij vullen
        tableBody.appendChild(tr); // toevoegen
    }

    // =======================
    // Initialisatie & event listeners
    // =======================
    buildHeader(); // tabel headers maken
    initPlaceholder(); // placeholder tonen
    addBtn.addEventListener('click', addPersoon); // + Toevoegen
    saveBtn.addEventListener('click', saveDataset); // Opslaan knop
    loadBtn.addEventListener('click', searchPerson); // Zoeken knop

})();
