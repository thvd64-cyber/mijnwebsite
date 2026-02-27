// ======================= js/manage.js v1.1.0 =======================
// restructure v1.0.8 to lean code
// Module: Manage Table – alleen hoofd + bekende ouders
// Functies: DOM ophalen, header bouwen, tabel renderen, toevoegen, opslaan, verwijderen, lazy-load placeholder
// ================================================================

(function() {
    'use strict'; // Strikte modus voor veiliger JS

    // =======================
    // DOM-elementen ophalen
    // =======================
    const tableBody = document.querySelector('#manageTable tbody'); // tbody van de tabel
    const theadRow = document.querySelector('#manageTable thead tr'); // header rij van de tabel
    const addBtn = document.getElementById('addBtn'); // + Toevoegen knop
    const saveBtn = document.getElementById('saveBtn'); // Opslaan knop
    const loadBtn = document.getElementById('loadBtn'); // Laad subset knop
    const searchInput = document.getElementById('searchPerson'); // zoekveld voor hoofd

    // =======================
    // Schema & ID
    // =======================
    const FIELDS = window.StamboomSchema.fields; // alle velden uit schema
    const ID_FIELD = FIELDS[0]; // eerste veld = ID
    let dataset = window.StamboomStorage.get() || []; // volledige dataset ophalen uit storage

    // =======================
    // Header bouwen
    // =======================
    function buildHeader() {
        theadRow.innerHTML = ''; // eerst lege header
        const thRel = document.createElement('th'); // eerste kolom: Relatie
        thRel.textContent = 'Relatie'; // kolomnaam
        theadRow.appendChild(thRel); // toevoegen aan header
        FIELDS.forEach(field => { // voor alle andere velden
            const th = document.createElement('th'); // nieuwe th
            th.textContent = field; // veldnaam
            theadRow.appendChild(th); // toevoegen
        });
    }

    // =======================
    // Relatie bepalen
    // =======================
    function bepaalRelatie(p, hoofd) {
        if(!hoofd) return ''; // fallback als geen hoofd
        if(p.ID === hoofd.ID) return 'main'; // hoofd zelf
        if(p.ID === hoofd.VaderID) return 'parent'; // vader
        if(p.ID === hoofd.MoederID) return 'parent'; // moeder
        return ''; // anders geen relatie
    }

    // =======================
    // Tabel renderen
    // =======================
    function renderTable(data, hoofd=null) {
        tableBody.innerHTML = ''; // tbody eerst leegmaken
        if(!data || data.length===0) { // geen data = placeholder
            const tr = document.createElement('tr'); // nieuwe rij
            const td = document.createElement('td'); // nieuwe cel
            td.colSpan = FIELDS.length + 1; // span over alle kolommen
            td.textContent = 'Geen personen gevonden'; // boodschap
            td.style.textAlign = 'center'; // centreren
            tr.appendChild(td); // cel toevoegen aan rij
            tableBody.appendChild(tr); // rij toevoegen aan tbody
            return; // klaar
        }

        // data doorlopen en rijen aanmaken
        data.forEach(p => {
            const tr = document.createElement('tr'); // nieuwe rij
            const relatie = hoofd ? bepaalRelatie(p, hoofd) : ''; // relatie bepalen
            if(relatie) tr.className = relatie.toLowerCase().replace(/\s+/g,'-'); // css class voor styling
            const tdRel = document.createElement('td'); // relatie cel
            tdRel.textContent = relatie; // vullen met relatie tekst
            tr.appendChild(tdRel); // toevoegen aan rij

            // overige velden
            FIELDS.forEach(f => {
                const td = document.createElement('td'); // nieuwe cel
                if(f === ID_FIELD) td.textContent = p[f] || ''; // ID readonly
                else {
                    const input = document.createElement('input'); // editable input
                    input.value = p[f] || ''; // waarde invullen
                    input.dataset.field = f; // attribuut field
                    td.appendChild(input); // input toevoegen aan cel
                }
                tr.appendChild(td); // cel toevoegen aan rij
            });

            tableBody.appendChild(tr); // rij toevoegen aan tbody
        });
    }

    // =======================
    // Subset load – hoofd + bekende ouders
    // =======================
    function loadDirectRelations() {
        dataset = StamboomStorage.get() || []; // dataset ophalen
        const term = searchInput.value.trim().toLowerCase(); // zoekterm
        if(!term) return alert('Voer minimaal 1 ID of naam in.'); // validatie

        // hoofd zoeken
        const hoofd = dataset.find(p =>
            (p.ID && p.ID.toLowerCase().includes(term)) ||
            (p.Doopnaam && p.Doopnaam.toLowerCase().includes(term)) ||
            (p.Achternaam && p.Achternaam.toLowerCase().includes(term))
        );
        if(!hoofd) return alert('Hoofd-ID niet gevonden'); // foutmelding

        // filter: alleen hoofd + vader + moeder (indien aanwezig)
        const subset = dataset.filter(p =>
            p.ID === hoofd.ID ||
            (hoofd.VaderID && p.ID === hoofd.VaderID) ||
            (hoofd.MoederID && p.ID === hoofd.MoederID)
        );

        renderTable(subset, hoofd); // tabel renderen
    }

    // =======================
    // C = Create – nieuwe persoon toevoegen
    // =======================
    function addPersoon() {
        const nieuw = window.StamboomSchema.empty(); // lege persoon
        nieuw[ID_FIELD] = window.genereerCode(nieuw, dataset); // unieke ID
        dataset.push(nieuw); // toevoegen aan dataset
        StamboomStorage.set(dataset); // opslaan in storage
        initPlaceholder(); // placeholder tonen, niet volledige tabel
    }

    // =======================
    // R/U = Read & Update – opslaan gewijzigde dataset
    // =======================
    function saveDataset() {
        const rows = tableBody.querySelectorAll('tr'); // alle rijen
        const nieuweDataset = []; // nieuwe dataset
        const idSet = new Set(); // check op duplicates
        rows.forEach(tr => {
            const persoon = window.StamboomSchema.empty(); // lege persoon
            FIELDS.forEach((field,index) => {
                const cell = tr.cells[index+1]; // +1 want eerste td = Relatie
                if(field === ID_FIELD) persoon[field] = cell.textContent.trim(); // ID invullen
                else {
                    const input = cell.querySelector('input'); // input ophalen
                    persoon[field] = input ? input.value.trim() : ''; // waarde invullen
                }
            });
            if(!window.StamboomSchema.validate(persoon)) throw new Error(`Validatie mislukt voor ID ${persoon[ID_FIELD]}`); // validatie check
            if(idSet.has(persoon[ID_FIELD])) throw new Error(`Duplicate ID: ${persoon[ID_FIELD]}`); // dubbele ID check
            idSet.add(persoon[ID_FIELD]); // ID toevoegen aan set
            nieuweDataset.push(persoon); // persoon toevoegen aan nieuwe dataset
        });
        dataset = nieuweDataset; // dataset bijwerken
        StamboomStorage.set(dataset); // opslaan in storage
        alert("Dataset succesvol opgeslagen."); // feedback
    }

    // =======================
    // D = Delete – persoon verwijderen
    // =======================
    function deletePersoon(id) {
        dataset = dataset.filter(p => p.ID !== id); // persoon uit dataset filteren
        StamboomStorage.set(dataset); // opslaan
        initPlaceholder(); // placeholder tonen
    }

    // =======================
    // Lazy-load placeholder
    // =======================
    function initPlaceholder() {
        tableBody.innerHTML = ''; // tbody leegmaken
        const tr = document.createElement('tr'); // nieuwe rij
        const td = document.createElement('td'); // nieuwe cel
        td.colSpan = FIELDS.length + 1; // span over alle kolommen
        td.textContent = 'Klik op "Laat Person" om data te laden'; // boodschap
        td.style.textAlign = 'center'; // centreren
        tr.appendChild(td); // cel toevoegen aan rij
        tableBody.appendChild(tr); // rij toevoegen aan tbody
    }

    // =======================
    // Init module
    // =======================
    buildHeader(); // header renderen
    initPlaceholder(); // placeholder tonen
    addBtn.addEventListener('click', addPersoon); // + Toevoegen knop
    saveBtn.addEventListener('click', saveDataset); // Opslaan knop
    loadBtn.addEventListener('click', loadDirectRelations); // Laad subset knop

})();
