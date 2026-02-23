// =======================
// js/manage.js - HTML/DOM-georiënteerd
// =======================
(function () {
    'use strict'; // Strikte modus voor veiligere JS

    // =======================
    // DOM elementen
    // =======================
    const tableBody = document.querySelector('#manageTable tbody'); // tbody van de manage tabel
    const theadRow = document.querySelector('#manageTable thead tr'); // thead rij
    const addBtn = document.getElementById('addBtn'); // + Toevoegen knop
    const saveBtn = document.getElementById('saveBtn'); // Opslaan knop
    const loadBtn = document.getElementById('loadBtn'); // Laad Persoon knop
    const searchInput = document.getElementById('searchPerson'); // input veld voor zoeken

    // =======================
    // Schema & ID
    // =======================
    const FIELDS = window.StamboomSchema.fields; // alle velden uit schema
    const ID_FIELD = FIELDS[0]; // "ID" veld
    let dataset = window.StamboomStorage.get() || []; // dataset ophalen uit storage

    // =======================
    // Header opbouwen
    // =======================
    function buildHeader() {
        theadRow.innerHTML = ''; // header leegmaken
        const thRel = document.createElement('th'); // kolom Relatie
        thRel.textContent = 'Relatie'; // titel Relatie
        theadRow.appendChild(thRel); // toevoegen aan thead
        FIELDS.forEach(field => { // loop door schema velden
            const th = document.createElement('th'); // th element
            th.textContent = field; // veldnaam instellen
            theadRow.appendChild(th); // toevoegen aan thead
        });
    }

    // =======================
    // Relatie bepalen voor view
    // =======================
    function bepaalRelatie(p, hoofd) {
        if(p.ID === hoofd.ID) return 'Hoofd-ID'; // huidige persoon is hoofd
        if(p.ID === hoofd.VaderID || p.ID === hoofd.MoederID) return 'Ouder'; // ouder
        if(p.ID === hoofd.PartnerID) return 'Partner'; // partner van hoofd
        if(p.VaderID === hoofd.ID || p.MoederID === hoofd.ID) return 'Kind'; // kind van hoofd
        if(p.VaderID === hoofd.VaderID && p.MoederID === hoofd.MoederID && p.ID !== hoofd.ID) return 'Broer/Zus'; // broer/zus
        if(p.PartnerID === hoofd.ID) return 'Partner-Kind'; // partner-kind relatie
        return ''; // geen relatie
    }

    // =======================
    // Render tabel
    // =======================
    function renderTable(data, hoofd = null) {
        tableBody.innerHTML = ''; // tbody leegmaken

        data.forEach(p => { // loop door personen
            const tr = document.createElement('tr'); // nieuwe rij

            const relatie = hoofd ? bepaalRelatie(p, hoofd) : ''; // bereken relatie
            if(relatie) tr.className = relatie.toLowerCase().replace(/\s+/g,'-'); // row-class voor kleur/UX

            // Relatie kolom view-only
            const tdRel = document.createElement('td'); // td voor Relatie
            tdRel.textContent = relatie; // tekst instellen
            tr.appendChild(tdRel); // toevoegen aan rij

            // overige velden
            FIELDS.forEach(f => {
                const td = document.createElement('td'); // td element
                if(f === ID_FIELD) td.textContent = p[f] || ''; // ID readonly
                else {
                    const input = document.createElement('input'); // input voor edit
                    input.value = p[f] || ''; // waarde instellen
                    input.dataset.field = f; // field attribuut
                    td.appendChild(input); // toevoegen aan td
                }
                tr.appendChild(td); // td toevoegen aan tr
            });

            tableBody.appendChild(tr); // tr toevoegen aan tbody
        });
    }

    // =======================
    // Voeg nieuwe persoon toe
    // =======================
    function addPersoon() {
        const nieuw = window.StamboomSchema.empty(); // lege persoon

        // 1️⃣ ID genereren
        nieuw[ID_FIELD] = window.genereerCode(nieuw, dataset); // unieke ID via generator

        dataset.push(nieuw); // toevoegen aan dataset

        renderTable(dataset); // renderen inclusief nieuwe persoon
    }

    // =======================
    // Opslaan dataset
    // =======================
    function saveDataset() {
        const rows = tableBody.querySelectorAll('tr'); // alle tabelrijen
        const nieuweDataset = []; // voor opslag
        const idSet = new Set(); // duplicate check

        rows.forEach(tr => { // loop door rijen
            const persoon = window.StamboomSchema.empty(); // start leeg

            FIELDS.forEach((field, index) => { // loop velden
                const cell = tr.cells[index+1]; // +1 want eerste td is Relatie
                if(field === ID_FIELD) persoon[field] = cell.textContent.trim(); // ID van td
                else {
                    const input = cell.querySelector('input'); // input element
                    persoon[field] = input ? input.value.trim() : ""; // waarde
                }
            });

            // Validatie
            if(!window.StamboomSchema.validate(persoon)) {
                throw new Error(`Validatie mislukt voor ID ${persoon[ID_FIELD]}`); // stop bij fout
            }

            // Duplicate check ID
            if(idSet.has(persoon[ID_FIELD])) {
                throw new Error(`Duplicate ID gevonden: ${persoon[ID_FIELD]}`); // stop bij dubbele
            }
            idSet.add(persoon[ID_FIELD]); // ID toevoegen aan set
            nieuweDataset.push(persoon); // persoon toevoegen
        });

        window.StamboomStorage.set(nieuweDataset); // opslaan in storage
        dataset = nieuweDataset; // dataset updaten
        alert("Dataset succesvol opgeslagen."); // feedback
    }

    // =======================
    // Laad subset van directe relaties
    // =======================
    function loadDirectRelations() {
        dataset = window.StamboomStorage.get() || []; // herlaad storage
        const term = searchInput.value.trim().toLowerCase(); // zoekterm

        if(!term) return alert('Voer minimaal 1 ID of naam in.'); // foutmelding bij lege input

        const hoofd = dataset.find(p =>
            (p.ID && p.ID.toLowerCase().includes(term)) ||
            (p.Doopnaam && p.Doopnaam.toLowerCase().includes(term)) ||
            (p.Achternaam && p.Achternaam.toLowerCase().includes(term))
        ); // zoek hoofd-ID

        if(!hoofd) return alert('Hoofd-ID niet gevonden'); // geen match

        // subset directe relaties: hoofd, ouders, partner, kinderen, broer/zus, partner-kind
        const subset = dataset.filter(p =>
            p.ID === hoofd.ID ||
            p.ID === hoofd.VaderID || p.ID === hoofd.MoederID ||
            p.ID === hoofd.PartnerID ||
            p.VaderID === hoofd.ID || p.MoederID === hoofd.ID ||
            (p.VaderID === hoofd.VaderID && p.MoederID === hoofd.MoederID && p.ID !== hoofd.ID) ||
            p.PartnerID === hoofd.ID
        );

        renderTable(subset, hoofd); // render met relatie info
    }

    // =======================
    // Init
    // =======================
    buildHeader(); // tabel header opbouwen
    renderTable(dataset); // eerste render van volledige dataset (optioneel)

    // Event listeners
    addBtn.addEventListener('click', addPersoon); // nieuwe persoon
    saveBtn.addEventListener('click', saveDataset); // opslaan
    loadBtn.addEventListener('click', loadDirectRelations); // subset van relaties
})();
