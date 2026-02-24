// ======================= manage.js – lean CRUD via StamboomStorage =======================
(function() {
    'use strict'; // Strikte modus voor veiligere JS
    // =======================
    // DOM-elementen ophalen
    // =======================
    const tableBody = document.querySelector('#manageTable tbody'); // tbody van manage tabel
    const theadRow = document.querySelector('#manageTable thead tr'); // thead rij
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
    // Header opbouwen
    // =======================
    function buildHeader() {
        theadRow.innerHTML = ''; // lege header
        const thRel = document.createElement('th'); // kolom Relatie
        thRel.textContent = 'Relatie';
        theadRow.appendChild(thRel); // toevoegen aan header
        FIELDS.forEach(field => {
            const th = document.createElement('th'); // kolom voor veld
            th.textContent = field;
            theadRow.appendChild(th);
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
            // Relatie kolom (read-only)
            const tdRel = document.createElement('td');
            tdRel.textContent = relatie;
            tr.appendChild(tdRel);
            // overige velden (editable behalve ID)
            FIELDS.forEach(f => {
                const td = document.createElement('td');
                if(f === ID_FIELD) td.textContent = p[f] || '';
                else {
                    const input = document.createElement('input');
                    input.value = p[f] || '';
                    input.dataset.field = f;
                    td.appendChild(input);
                }
                tr.appendChild(td);
            });
            tableBody.appendChild(tr);
        });
    }
    // =======================
    // C = Create – nieuwe persoon toevoegen
    // =======================
    function addPersoon() {
        const nieuw = window.StamboomSchema.empty(); // lege persoon via schema
        nieuw[ID_FIELD] = window.genereerCode(nieuw, dataset); // unieke ID genereren
        dataset.push(nieuw); // toevoegen aan dataset
        StamboomStorage.set(dataset); // direct opslaan in storage
        renderTable(dataset); // renderen
    }
    // =======================
    // R/U = Read & Update – opslaan gewijzigde tabel
    // =======================
    function saveDataset() {
        const rows = tableBody.querySelectorAll('tr');
        const nieuweDataset = [];
        const idSet = new Set(); // duplicate check
        rows.forEach(tr => {
            const persoon = window.StamboomSchema.empty(); // leeg object
            FIELDS.forEach((field,index) => {
                const cell = tr.cells[index+1]; // +1 want eerste td = Relatie
                if(field === ID_FIELD) persoon[field] = cell.textContent.trim();
                else {
                    const input = cell.querySelector('input');
                    persoon[field] = input ? input.value.trim() : '';
                }
            });
            // Validatie
            if(!window.StamboomSchema.validate(persoon)) {
                throw new Error(`Validatie mislukt voor ID ${persoon[ID_FIELD]}`);
            }
            // Duplicate check
            if(idSet.has(persoon[ID_FIELD])) throw new Error(`Duplicate ID: ${persoon[ID_FIELD]}`);
            idSet.add(persoon[ID_FIELD]);
            nieuweDataset.push(persoon);
        });
        dataset = nieuweDataset; // update lokale dataset
        StamboomStorage.set(dataset); // opslaan in storage
        alert("Dataset succesvol opgeslagen.");
    }
    // =======================
    // D = Delete – persoon verwijderen
    // =======================
    function deletePersoon(id) {
        dataset = dataset.filter(p => p.ID !== id); // verwijder persoon op ID
        StamboomStorage.set(dataset); // opslaan
        renderTable(dataset); // tabel updaten
    }
    // =======================
    // Subset search – subset van directe relaties laden
    // =======================
    function loadDirectRelations() {
        dataset = StamboomStorage.get() || []; // herlaad storage
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
        renderTable(subset, hoofd); // render subset
    }
    // =======================
    // Init
    // =======================
    buildHeader(); // header opbouwen
    renderTable(dataset); // eerste render volledige dataset
    addBtn.addEventListener('click', addPersoon); // C = Create
    saveBtn.addEventListener('click', saveDataset); // R/U = Read/Update
    loadBtn.addEventListener('click', loadDirectRelations); // subset search
})();
