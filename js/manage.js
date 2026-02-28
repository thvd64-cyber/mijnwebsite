// ======================= manage.js v1.2.3 =======================
// Beheer module: directe relaties (Hoofd + Ouders)
// Relatie = visueel (Hoofd / Ouder), geen andere personen tonen
// =================================================================
(function(){
    'use strict';

    // =======================
    // DOM-elementen
    // =======================
    const tableBody   = document.querySelector('#manageTable tbody');
    const theadRow    = document.querySelector('#manageTable thead tr');
    const addBtn      = document.getElementById('addBtn');
    const saveBtn     = document.getElementById('saveBtn');
    const refreshBtn  = document.getElementById('refreshBtn');
    const searchInput = document.getElementById('searchPerson');

    // =======================
    // Dataset
    // =======================
    let dataset = window.StamboomStorage.get() || [];

    // =======================
    // Kolomdefinitie
    // =======================
    const COLUMNS = [
        { key: 'Relatie', readonly: true },
        { key: 'ID', readonly: true },
        { key: 'Doopnaam', readonly: false },
        { key: 'Roepnaam', readonly: false },
        { key: 'Prefix', readonly: false },
        { key: 'Achternaam', readonly: false },
        { key: 'Geslacht', readonly: false },
        { key: 'Geboortedatum', readonly: false },
        { key: 'Geboorteplaats', readonly: false },
        { key: 'Overlijdensdatum', readonly: false },
        { key: 'Overlijdensplaats', readonly: false },
        { key: 'VaderID', readonly: false },
        { key: 'MoederID', readonly: false },
        { key: 'PartnerID', readonly: false },
        { key: 'Huwelijksdatum', readonly: false },
        { key: 'Huwelijksplaats', readonly: false },
        { key: 'Opmerkingen', readonly: false },
        { key: 'Adres', readonly: false },
        { key: 'ContactInfo', readonly: false },
        { key: 'UR', readonly: false }
    ];

    // =======================
    // Relatieberekening (Hoofd + Ouders)
    // =======================
    function computeRelaties(data, hoofdId){
        return data
            .filter(p => {
                // Alleen Hoofd of Ouders tonen
                return p.ID === hoofdId ||
                       p.ID === (data.find(d => d.ID === hoofdId)?.VaderID) ||
                       p.ID === (data.find(d => d.ID === hoofdId)?.MoederID);
            })
            .map(p => {
                const clone = { ...p };
                clone.Relatie = '';

                if(!hoofdId) return clone;

                if(p.ID === hoofdId) clone.Relatie = 'Hoofd';
                else clone.Relatie = 'Ouder';

                return clone;
            });
    }

    // =======================
    // Header
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
    // Placeholder
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
    function renderTable(data, hoofdId){
        const contextData = computeRelaties(data, hoofdId);

        tableBody.innerHTML = '';
        if(!contextData || contextData.length === 0){
            showPlaceholder('Geen personen gevonden');
            return;
        }

        contextData.forEach(p=>{
            const tr = document.createElement('tr');
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
        COLUMNS.forEach(col=> nieuw[col.key] = '');
        nieuw.ID = window.genereerCode(nieuw, dataset);
        dataset.push(nieuw);
        window.StamboomStorage.set(dataset);
        renderTable(dataset, searchInput.value.trim());
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
            COLUMNS.forEach((col,index)=>{
                const cell = tr.cells[index];
                if(col.readonly){
                    if(col.key === 'ID') persoon.ID = cell.textContent.trim();
                } else {
                    const input = cell.querySelector('input');
                    persoon[col.key] = input ? input.value.trim() : '';
                }
            });

            if(!persoon.ID) throw new Error('ID ontbreekt');
            if(idSet.has(persoon.ID)) throw new Error(`Duplicate ID: ${persoon.ID}`);
            idSet.add(persoon.ID);
            nieuweDataset.push(persoon);
        });

        dataset = nieuweDataset;
        window.StamboomStorage.set(dataset);
        alert('Dataset succesvol opgeslagen');
    }

    // =======================
    // Laad / Refresh
    // =======================
    function refreshTable(){
        dataset = window.StamboomStorage.get() || [];
        renderTable(dataset, searchInput.value.trim());
    }

    // =======================
    // Search
    // =======================
    function liveSearch(){
        const term = searchInput.value.trim();
        if(!term){
            renderTable(dataset, searchInput.value.trim());
            return;
        }

        const results = dataset.filter(p =>
            (p.ID?.toLowerCase().includes(term.toLowerCase())) ||
            (p.Roepnaam?.toLowerCase().includes(term.toLowerCase())) ||
            (p.Achternaam?.toLowerCase().includes(term.toLowerCase()))
        );

        renderTable(results, searchInput.value.trim());
    }

    // =======================
    // Initialisatie
    // =======================
    buildHeader();
    renderTable(dataset, searchInput.value.trim());

    addBtn.addEventListener('click', addPersoon);
    saveBtn.addEventListener('click', saveDataset);
    refreshBtn.addEventListener('click', refreshTable);
    searchInput.addEventListener('input', liveSearch);

})();
