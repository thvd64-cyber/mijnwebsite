// ======================= manage.js v1.1.6 =======================
// Beheer module: CRUD + live search popup + refresh + placeholder + relatie-cel
// Relatie wordt automatisch weergegeven bij laden van de tabel
// ==============================================================================

(function(){
    'use strict';

    // =======================
    // DOM-elementen
    // =======================
    const tableBody = document.querySelector('#manageTable tbody');
    const theadRow = document.querySelector('#manageTable thead tr');
    const addBtn = document.getElementById('addBtn');
    const saveBtn = document.getElementById('saveBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const searchInput = document.getElementById('searchPerson');

    // =======================
    // Dataset & schema
    // =======================
    const FIELDS = window.StamboomSchema.fields; // alle velden
    const ID_FIELD = FIELDS[0]; // eerste veld = ID
    let dataset = window.StamboomStorage.get() || [];

    // =======================
    // RELATIE LOGICA
    // =======================
    function applyRelatieLogica(selectie){
        if(!selectie || selectie.length===0) return selectie;
        const hoofd = selectie[0]; // eerste persoon = hoofd
        const ouder1Id = hoofd[FIELDS[10]] || ''; // kolom 11
        const ouder2Id = hoofd[FIELDS[11]] || ''; // kolom 12
        return selectie.map(p=>{
            const kopie = {...p}; // shallow copy
            if(p[ID_FIELD]===hoofd[ID_FIELD]) kopie.Relatie='Hoofd';
            else if(p[ID_FIELD]===ouder1Id || p[ID_FIELD]===ouder2Id) kopie.Relatie='Ouder';
            else kopie.Relatie='';
            return kopie;
        });
    }

    // =======================
    // Header bouwen
    // =======================
    function buildHeader(){
        const th = document.createElement('th'); th.textContent=''; theadRow.appendChild(th); // lege eerste kolom
        FIELDS.forEach(f=>{
            const th = document.createElement('th'); th.textContent=f; theadRow.appendChild(th);
        });
        const thRel = document.createElement('th'); thRel.textContent='Relatie'; theadRow.appendChild(thRel);
    }

    // =======================
    // Tabel renderen
    // =======================
    function renderTable(data){
        tableBody.innerHTML='';
        if(!data || data.length===0){
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = FIELDS.length+1;
            td.textContent='Geen personen gevonden';
            td.style.textAlign='center';
            tr.appendChild(td);
            tableBody.appendChild(tr);
            return;
        }

        // Relatie property toevoegen voor alle rijen
        data = applyRelatieLogica(data);

        data.forEach(p=>{
            const tr = document.createElement('tr');
            if(p.Relatie) tr.className = p.Relatie; // CSS styling op Relatie

            // Bestaande velden
            FIELDS.forEach(f=>{
                const td = document.createElement('td');
                if(f===ID_FIELD) td.textContent = p[f] || '';
                else{
                    const input = document.createElement('input');
                    input.value = p[f] || '';
                    input.dataset.field = f;
                    td.appendChild(input);
                }
                tr.appendChild(td);
            });

            // Extra Relatie-cel
            const relatieTd = document.createElement('td');
            relatieTd.textContent = p.Relatie || '';
            tr.appendChild(relatieTd);

            tableBody.appendChild(tr);
        });
    }

    // =======================
    // Placeholder
    // =======================
    function initPlaceholder(){
        tableBody.innerHTML = '';
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = FIELDS.length+1;
        td.textContent='Klik op "Laad Persoon" of zoek om data te tonen';
        td.style.textAlign='center';
        tr.appendChild(td);
        tableBody.appendChild(tr);
    }

    // =======================
    // Persoon toevoegen
    // =======================
    function addPersoon(){
        const nieuw = window.StamboomSchema.empty();
        nieuw[ID_FIELD] = window.genereerCode(nieuw, dataset);
        dataset.push(nieuw);
        window.StamboomStorage.set(dataset);
        renderTable(dataset); // direct renderen met relatie
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
        renderTable(dataset); // her-renderen met relatie
    }

    // =======================
    // Dataset verversen
    // =======================
    function refreshTable(){
        dataset = window.StamboomStorage.get() || [];
        renderTable(dataset); // nu direct met relatie kolom
    }

    // =======================
    // Live search popup
    // =======================
    function createPopup(){
        let popup = document.getElementById('searchPopup');
        if(!popup){
            popup = document.createElement('div');
            popup.id = 'searchPopup';
            popup.style.position='absolute';
            popup.style.border='1px solid #999';
            popup.style.background='#fff';
            popup.style.boxShadow='0 2px 10px rgba(0,0,0,0.3)';
            popup.style.zIndex=1000;
            popup.style.maxHeight='200px';
            popup.style.overflowY='auto';
            popup.style.display='none';
            document.body.appendChild(popup);
        }
        return popup;
    }

    function showPopup(results, rect){
        const popup = createPopup();
        popup.innerHTML='';
        results.forEach(p=>{
            const row = document.createElement('div');
            row.style.padding='5px 10px';
            row.style.cursor='pointer';
            row.style.borderBottom='1px solid #eee';
            row.textContent=`${p.ID} | ${p.Roepnaam} | ${p.Achternaam} | ${p.Geboortedatum || ''}`;
            row.addEventListener('click', ()=>{
                const selectie = [p]; // hoofd
                const ouder1 = dataset.find(x=>x[ID_FIELD]===p[FIELDS[10]]);
                const ouder2 = dataset.find(x=>x[ID_FIELD]===p[FIELDS[11]]);
                if(ouder1) selectie.push(ouder1);
                if(ouder2) selectie.push(ouder2);
                renderTable(applyRelatieLogica(selectie));
                popup.style.display='none';
            });
            popup.appendChild(row);
        });
        if(results.length===0){
            const row = document.createElement('div');
            row.style.padding='5px 10px';
            row.textContent='Geen resultaten';
            popup.appendChild(row);
        }
        popup.style.top=(rect.bottom+window.scrollY)+'px';
        popup.style.left=(rect.left+window.scrollX)+'px';
        popup.style.width=rect.width+'px';
        popup.style.display='block';
    }

    function liveSearch(){
        const term = searchInput.value.trim().toLowerCase();
        if(!term){ createPopup().style.display='none'; return; }
        const results = dataset.filter(p=>
            (p.ID && p.ID.toLowerCase().includes(term)) ||
            (p.Roepnaam && p.Roepnaam.toLowerCase().includes(term)) ||
            (p.Achternaam && p.Achternaam.toLowerCase().includes(term))
        );
        const rect = searchInput.getBoundingClientRect();
        showPopup(results, rect);
    }

    document.addEventListener('click', e=>{
        const popup = document.getElementById('searchPopup');
        if(popup && !popup.contains(e.target) && e.target !== searchInput)
            popup.style.display='none';
    });

    // =======================
    // Initialisatie
    // =======================
    buildHeader();
    initPlaceholder();
    addBtn.addEventListener('click', addPersoon);
    saveBtn.addEventListener('click', saveDataset);
    refreshBtn.addEventListener('click', refreshTable);
    searchInput.addEventListener('input', liveSearch);

})();
