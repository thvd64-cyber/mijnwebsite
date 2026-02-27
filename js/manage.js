// ======================= manage.js v1.1.1 =======================
// Beheer module: CRUD + zoek + refresh + placeholder + styling
// ==============================================================================

(function(){
    'use strict'; // Strikte modus voor veiliger JS

    // =======================
    // DOM elementen ophalen
    // =======================
    const tableBody = document.querySelector('#manageTable tbody'); // tbody van tabel
    const theadRow = document.querySelector('#manageTable thead tr'); // header rij
    const addBtn = document.getElementById('addBtn'); // + Toevoegen
    const saveBtn = document.getElementById('saveBtn'); // Opslaan
    const loadBtn = document.getElementById('loadBtn'); // Zoeken / Laad
    const refreshBtn = document.getElementById('refreshBtn'); // Refresh
    const searchInput = document.getElementById('searchPerson'); // zoekveld

    // =======================
    // Dataset & schema
    // =======================
    const FIELDS = window.StamboomSchema.fields; // velden uit schema
    const ID_FIELD = FIELDS[0]; // ID veld is eerste
    let dataset = window.StamboomStorage.get() || []; // dataset ophalen

    // =======================
    // Header opbouwen
    // =======================
    function buildHeader(){
        theadRow.innerHTML = ''; // eerst leegmaken
        const th = document.createElement('th'); // eerste kolom leeg (relatie)
        th.textContent = '';
        theadRow.appendChild(th); // toevoegen
        FIELDS.forEach(f=>{
            const th = document.createElement('th'); // kolom per veld
            th.textContent = f; // header naam
            theadRow.appendChild(th);
        });
    }

    // =======================
    // Tabel renderen
    // =======================
    function renderTable(data){
        tableBody.innerHTML = ''; // tbody leegmaken
        if(!data || data.length === 0){ // geen data → placeholder
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = FIELDS.length+1;
            td.textContent = 'Geen personen gevonden';
            td.style.textAlign = 'center';
            tr.appendChild(td);
            tableBody.appendChild(tr);
            return;
        }

        data.forEach(p=>{
            const tr = document.createElement('tr'); // rij maken
            // =======================
            // Achtergrond kleur op basis van relatie
            // =======================
            if(p.Relatie) tr.className = p.Relatie; // verwacht: 'main','parent','partner','child','sibling'

            FIELDS.forEach(f=>{
                const td = document.createElement('td');
                if(f === ID_FIELD) td.textContent = p[f] || ''; // ID readonly
                else{
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
    // Placeholder tonen
    // =======================
    function initPlaceholder(){
        tableBody.innerHTML = ''; // tbody leegmaken
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = FIELDS.length+1; // overspant alle kolommen
        td.textContent = 'Klik op "Laad Persoon" of zoek om data te tonen';
        td.style.textAlign = 'center';
        tr.appendChild(td);
        tableBody.appendChild(tr);
    }

    // =======================
    // Nieuwe persoon toevoegen
    // =======================
    function addPersoon(){
        const nieuw = window.StamboomSchema.empty(); // lege persoon
        nieuw[ID_FIELD] = window.genereerCode(nieuw,dataset); // unieke ID
        dataset.push(nieuw); // toevoegen
        window.StamboomStorage.set(dataset); // opslaan
        initPlaceholder(); // placeholder tonen ipv volledige tabel
    }

    // =======================
    // Dataset opslaan
    // =======================
    function saveDataset(){
        const rows = tableBody.querySelectorAll('tr');
        const nieuweDataset = [];
        const idSet = new Set();

        rows.forEach(tr=>{
            const persoon = window.StamboomSchema.empty();
            FIELDS.forEach((f,i)=>{
                const cell = tr.cells[i];
                if(f===ID_FIELD) persoon[f] = cell.textContent.trim();
                else{
                    const input = cell.querySelector('input');
                    persoon[f] = input ? input.value.trim() : '';
                }
            });
            if(!window.StamboomSchema.validate(persoon))
                throw new Error(`Validatie mislukt voor ID ${persoon[ID_FIELD]}`);
            if(idSet.has(persoon[ID_FIELD]))
                throw new Error(`Duplicate ID: ${persoon[ID_FIELD]}`);
            idSet.add(persoon[ID_FIELD]);
            nieuweDataset.push(persoon);
        });

        dataset = nieuweDataset;
        window.StamboomStorage.set(dataset);
        alert('Dataset succesvol opgeslagen');
    }

    // =======================
    // Zoek functionaliteit
    // =======================
    function searchPerson(){
        dataset = window.StamboomStorage.get() || [];
        const term = searchInput.value.trim().toLowerCase();
        if(!term) return alert('Voer een ID of naam in.');
        const result = dataset.filter(p=>
            (p.ID && p.ID.toLowerCase().includes(term)) ||
            (p.Doopnaam && p.Doopnaam.toLowerCase().includes(term)) ||
            (p.Roepnaam && p.Roepnaam.toLowerCase().includes(term)) ||
            (p.Achternaam && p.Achternaam.toLowerCase().includes(term))
        );
        renderTable(result);
    }

    // =======================
    // Refresh functionaliteit
    // =======================
    function refreshTable(){
        dataset = window.StamboomStorage.get() || []; // dataset opnieuw ophalen
        initPlaceholder(); // placeholder tonen ipv direct alle data
    }

    // =======================
    // Initialisatie
    // =======================
    buildHeader(); // headers maken
    initPlaceholder(); // placeholder tonen
    addBtn.addEventListener('click', addPersoon); // + Toevoegen
    saveBtn.addEventListener('click', saveDataset); // Opslaan
    loadBtn.addEventListener('click', searchPerson); // Zoeken
    refreshBtn.addEventListener('click', refreshTable); // Refresh

})();
