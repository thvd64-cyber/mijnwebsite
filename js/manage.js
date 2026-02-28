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
// Event listener koppelen (alleen voor zoek/Laad)
// =======================
searchInput.addEventListener('input', liveSearch); // bij elk type-event → popup wordt bijgewerkt
    
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
// Live search popup (alleen bij zoek/Laad, niet bij Refresh)
// =======================

// Functie: maakt het popup-element aan indien niet aanwezig
function createPopup(){
    let popup = document.getElementById('searchPopup');
    if(!popup){
        popup = document.createElement('div');
        popup.id = 'searchPopup';
        popup.style.position = 'absolute';
        popup.style.border = '1px solid #999';
        popup.style.background = '#fff';
        popup.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
        popup.style.zIndex = 1000;
        popup.style.maxHeight = '200px';
        popup.style.overflowY = 'auto';
        popup.style.display = 'none';
        document.body.appendChild(popup);
    }
    return popup;
} // einde createPopup – popup element maken indien niet aanwezig

// Functie: toont zoekresultaten in popup onder het inputveld
function showPopup(results, rect){
    const popup = createPopup();
    popup.innerHTML = ''; // leeg de inhoud

    results.forEach(p=>{
        const row = document.createElement('div');
        row.style.padding = '5px 10px';
        row.style.cursor = 'pointer';
        row.style.borderBottom = '1px solid #eee';
        row.textContent = `${p.ID} | ${p.Roepnaam} | ${p.Achternaam} | ${p.Geboortedatum || ''}`;

        // Klik: render alleen geselecteerde persoon + relatielogica
        row.addEventListener('click', ()=>{
            renderTable([p], p.ID); // p.ID als hoofdId → toont Hoofd + Ouders
            popup.style.display = 'none'; // sluit popup na klik
        });

        popup.appendChild(row);
    });

    if(results.length===0){
        const row = document.createElement('div');
        row.style.padding = '5px 10px';
        row.textContent = 'Geen resultaten';
        popup.appendChild(row);
    }

    // Positioneer popup onder het inputveld
    popup.style.top = (rect.bottom + window.scrollY) + 'px';
    popup.style.left = (rect.left + window.scrollX) + 'px';
    popup.style.width = rect.width + 'px';
    popup.style.display = 'block';
} // einde showPopup – toont zoekresultaten als popup

// Functie: live search voor de popup
function liveSearch(){
    const term = searchInput.value.trim().toLowerCase();
    if(!term){
        createPopup().style.display='none'; // verberg popup als niets is ingevuld
        return;
    }

    // Filter op ID, Roepnaam of Achternaam
    const results = dataset.filter(p =>
        (p.ID && p.ID.toLowerCase().includes(term)) ||
        (p.Roepnaam && p.Roepnaam.toLowerCase().includes(term)) ||
        (p.Achternaam && p.Achternaam.toLowerCase().includes(term))
    );

    const rect = searchInput.getBoundingClientRect();
    showPopup(results, rect); // toon resultaten in popup
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
    // Initialisatie
    // =======================
    buildHeader();
    renderTable(dataset, searchInput.value.trim());

    addBtn.addEventListener('click', addPersoon);
    saveBtn.addEventListener('click', saveDataset);
    refreshBtn.addEventListener('click', refreshTable);
    searchInput.addEventListener('input', liveSearch);
    
// =======================
// Popup sluiten bij klik buiten
// =======================
document.addEventListener('click', e => {
    const popup = document.getElementById('searchPopup');
    if (popup && !popup.contains(e.target) && e.target !== searchInput) {
        popup.style.display = 'none';
    }
});

})();
