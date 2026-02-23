// manage.js
(function () {
    'use strict';

    const tableBody = document.querySelector('#manageTable tbody');
    const theadRow = document.querySelector('#manageTable thead tr');
    const addBtn = document.getElementById('addBtn');
    const saveBtn = document.getElementById('saveBtn');
    const loadBtn = document.getElementById('loadBtn');
    const searchInput = document.getElementById('searchPerson');

    const FIELDS = window.StamboomSchema.fields;
    const ID_FIELD = FIELDS[0];

    let dataset = window.StamboomStorage.get() || [];

    /* ==============================
       Header opbouwen vanuit schema
    ============================== */
    function buildHeader() {
        theadRow.innerHTML = '';
        FIELDS.forEach(field => {
            const th = document.createElement('th');
            th.textContent = field;
            theadRow.appendChild(th);
        });
    }

    /* ==============================
       Tabel renderen
    ============================== */
    function renderTable(data) {
        tableBody.innerHTML = '';

        data.forEach(persoon => {
            const tr = document.createElement('tr');

            FIELDS.forEach(field => {
                const td = document.createElement('td');

                if (field === ID_FIELD) {
                    td.textContent = persoon[field] || '';
                } else {
                    const input = document.createElement('input');
                    input.value = persoon[field] || '';
                    input.dataset.field = field;
                    td.appendChild(input);
                }

                tr.appendChild(td);
            });

            tableBody.appendChild(tr);
        });
    }

    /* ==============================
       Nieuwe persoon toevoegen
    ============================== */
    function addPersoon() {

        const nieuw = window.StamboomSchema.empty();

        // 1️⃣ ID genereren
        nieuw[ID_FIELD] = window.genereerCode(nieuw, dataset);

        // Direct in dataset zetten
        dataset.push(nieuw);

        renderTable(dataset);
    }

    /* ==============================
       Opslaan (volledige dataset)
    ============================== */
    function saveDataset() {

        const rows = tableBody.querySelectorAll('tr');
        const nieuweDataset = [];
        const idSet = new Set();

        rows.forEach(tr => {

            const persoon = window.StamboomSchema.empty();

            FIELDS.forEach((field, index) => {

                const cell = tr.cells[index];

                if (field === ID_FIELD) {
                    persoon[field] = cell.textContent.trim();
                } else {
                    const input = cell.querySelector('input');
                    persoon[field] = input ? input.value.trim() : "";
                }
            });

            // 2️⃣ Validatie
            if (!window.StamboomSchema.validate(persoon)) {
                throw new Error(`Validatie mislukt voor ID ${persoon[ID_FIELD]}`);
            }

            // 3️⃣ Duplicate check (alleen ID)
            if (idSet.has(persoon[ID_FIELD])) {
                throw new Error(`Duplicate ID gevonden: ${persoon[ID_FIELD]}`);
            }

            idSet.add(persoon[ID_FIELD]);
            nieuweDataset.push(persoon);
        });

        // 4️⃣ Opslaan
        window.StamboomStorage.set(nieuweDataset);
        dataset = nieuweDataset;

        alert("Dataset succesvol opgeslagen.");
    }

    /* ==============================
       Zoeken
    ============================== */
    function loadFiltered() {

        dataset = window.StamboomStorage.get() || [];

        const term = searchInput.value.trim().toLowerCase();

        if (!term) {
            renderTable(dataset);
            return;
        }

        const filtered = dataset.filter(p =>
            (p.ID && p.ID.toLowerCase().includes(term)) ||
            (p.Doopnaam && p.Doopnaam.toLowerCase().includes(term)) ||
            (p.Achternaam && p.Achternaam.toLowerCase().includes(term))
        );

        renderTable(filtered);
    }

    /* ==============================
       Init
    ============================== */
    buildHeader();
    renderTable(dataset);

    addBtn.addEventListener('click', addPersoon);
    saveBtn.addEventListener('click', saveDataset);
    loadBtn.addEventListener('click', loadFiltered);

})();
