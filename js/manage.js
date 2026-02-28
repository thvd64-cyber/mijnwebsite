// ======================= manage.js v1.2.0 =======================
// Beheer module: Centrale kolomstructuur (Single Source of Truth)
// Geen lege kolommen, geen index-hacks, volledige synchronisatie
// =================================================================
(function(){
    'use strict';

    // =======================
    // DOM-elementen ophalen
    // =======================
    const tableBody  = document.querySelector('#manageTable tbody');
    const theadRow   = document.querySelector('#manageTable thead tr');
    const addBtn     = document.getElementById('addBtn');
    const saveBtn    = document.getElementById('saveBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const searchInput= document.getElementById('searchPerson');

    // =======================
    // Dataset
    // =======================
    let dataset = window.StamboomStorage.get() || [];

    // =======================
    // Centrale kolomdefinitie
    // =======================
    const COLUMNS = [
        { key: 'Relatie', readonly: false },
        { key: 'ID', readonly: true },
        { key: 'Doopnaam', readonly: false },
        { key: 'Roepnaam', readonly: false },
        { key: 'Prefix', readonly: false },
        { key: 'Achternaam', readonly: false },
        { key: 'Geslacht', readonly: false },
        { key: 'Geboortedatum', readonly: false },
        { key: 'Overlijdensdatum', readonly: false }
    ];

    const ID_COLUMN = COLUMNS.find(c => c.key === 'ID');

    // =======================
    // Header opbouwen
    // =======================
    function buildHeader(){
        theadRow.innerHTML = '';
        COLUMNS.forEach(col=>{
            const th = document.createElement('th');
            th.textContent = col.key;
            theadRow.appendChild(th);
        });
    }

    // =======================
    // Placeholder tonen
    // =======================
    function showPlaceholder(message){
        tableBody.innerHTML = '';
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = COLUMNS.length;
        td.textContent = message;
        td.style.textAlign = 'center';
        tr.appendChild(td);
        tableBody.appendChild(tr);
    }

    // =======================
    // Tabel renderen
    // =======================
    function renderTable(data){
        tableBody.innerHTML = '';

        if(!data || data.length === 0){
            showPlaceholder('Geen personen gevonden');
            return;
        }

        data.forEach(p=>{
            const tr = document.createElement('tr');

            // optionele styling via relatie
            if(p.Relatie){
                tr.className = p.Relatie;
            }

            COLUMNS.forEach(col=>{
                const td = document.createElement('td');

                if(col.readonly){
                    td.textContent = p[col.key] || '';
                } else {
                    const input = document.createElement('input');
                    input.value = p[col.key] || '';
                    input.dataset.field = col.key;
                    td.appendChild(input);
                }

                tr.appendChild(td);
            });

            tableBody.appendChild(tr);
        });
    }

    // =======================
    // Nieuwe persoon toevoegen
    // =======================
    function addPersoon(){
        const nieuw = {};

        COLUMNS.forEach(col=>{
            nieuw[col.key] = '';
        });

        // unieke ID genereren
        nieuw.ID = window.genereerCode(nieuw, dataset);

        dataset.push(nieuw);
        window.StamboomStorage.set(dataset);

        renderTable(dataset);
    }

    // =======================
    // Dataset opslaan
    // =======================
    function saveDataset(){
        const rows = tableBody.querySelectorAll('tr');
        const nieuweDataset = [];
        const idSet = new Set();

        rows.forEach(tr=>{
            const persoon = {};

            COLUMNS.forEach((col, index)=>{
                const cell = tr.cells[index];

                if(col.readonly){
                    persoon[col.key] = cell.textContent.trim();
                } else {
                    const input = cell.querySelector('input');
                    persoon[col.key] = input ? input.value.trim() : '';
                }
            });

            // Validatie
            if(!persoon.ID)
                throw new Error('ID ontbreekt');

            if(idSet.has(persoon.ID))
                throw new Error(`Duplicate ID: ${persoon.ID}`);

            idSet.add(persoon.ID);
            nieuweDataset.push(persoon);
        });

        dataset = nieuweDataset;
        window.StamboomStorage.set(dataset);
        alert('Dataset succesvol opgeslagen');
    }

    // =======================
    // Dataset verversen
    // =======================
    function refreshTable(){
        dataset = window.StamboomStorage.get() || [];
        renderTable(dataset);
    }

    // =======================
    // Live search
    // =======================
    function liveSearch(){
        const term = searchInput.value.trim().toLowerCase();

        if(!term){
            renderTable(dataset);
            return;
        }

        const results = dataset.filter(p=>
            (p.ID && p.ID.toLowerCase().includes(term)) ||
            (p.Roepnaam && p.Roepnaam.toLowerCase().includes(term)) ||
            (p.Achternaam && p.Achternaam.toLowerCase().includes(term))
        );

        renderTable(results);
    }

    // =======================
    // Initialisatie
    // =======================
    buildHeader();
    showPlaceholder('Klik op "Laad Persoon" of zoek om data te tonen');

    addBtn.addEventListener('click', addPersoon);
    saveBtn.addEventListener('click', saveDataset);
    refreshBtn.addEventListener('click', refreshTable);
    searchInput.addEventListener('input', liveSearch);

})();
