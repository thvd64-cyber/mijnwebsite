// ======================= manage.js v1.1.5 =======================
// Beheer module: CRUD + live search popup + refresh + placeholder + relatie-cel
// ==============================================================================

(function(){
    'use strict'; // Strikte modus voor veiliger JS

    // =======================
    // DOM-elementen ophalen
    // =======================
    const tableBody = document.querySelector('#manageTable tbody'); // tbody van de tabel
    const theadRow = document.querySelector('#manageTable thead tr'); // header rij
    const addBtn = document.getElementById('addBtn'); // + Toevoegen knop
    const saveBtn = document.getElementById('saveBtn'); // Opslaan knop
    const refreshBtn = document.getElementById('refreshBtn'); // Refresh knop
    const searchInput = document.getElementById('searchPerson'); // zoekveld

    // =======================
    // Dataset & schema
    // =======================
    const FIELDS = window.StamboomSchema.fields; // velden uit schema
    const ID_FIELD = FIELDS[0]; // ID veld is altijd eerste
    let dataset = window.StamboomStorage.get() || []; // dataset ophalen

    // =======================
    // RELATIE LOGICA
    // =======================
    function applyRelatieLogica(selectie){
        if(!selectie || selectie.length===0) return selectie; // geen selectie → niets doen
        const hoofd = selectie[0]; // eerste persoon = hoofd bij live search
        if(!hoofd) return selectie;

        const ouder1 = hoofd[FIELDS[10]] || ''; // kolom 11 = ouder1Id
        const ouder2 = hoofd[FIELDS[11]] || ''; // kolom 12 = ouder2Id

        return selectie.map(p=>{
            const kopie = {...p}; // shallow copy zodat originele dataset niet verandert
            if(p[ID_FIELD]===hoofd[ID_FIELD]) kopie.Relatie='Hoofd'; // hoofd
            else if(p[ID_FIELD]===ouder1 || p[ID_FIELD]===ouder2) kopie.Relatie='Ouder'; // ouder
            else kopie.Relatie=''; // anders leeg
            return kopie;
        });
    }

    // =======================
    // Tabel header opbouwen
    // =======================
    function buildHeader(){
        theadRow.innerHTML = ''; // eerst leegmaken
        const th = document.createElement('th'); th.textContent=''; theadRow.appendChild(th); // lege eerste kolom
        FIELDS.forEach(f=>{
            const th = document.createElement('th'); 
            th.textContent = f; // veldnaam
            theadRow.appendChild(th);
        });
        const thRel = document.createElement('th'); // extra kolom voor relatie
        thRel.textContent = 'Relatie';
        theadRow.appendChild(thRel);
    }

    // =======================
    // Tabel renderen
    // =======================
    function renderTable(data){
        tableBody.innerHTML = ''; // tbody leegmaken
        if(!data || data.length === 0){
            const tr = document.createElement('tr'); // lege placeholder rij
            const td = document.createElement('td');
            td.colSpan = FIELDS.length+1; // +1 voor relatie kolom
            td.textContent = 'Geen personen gevonden';
            td.style.textAlign = 'center';
            tr.appendChild(td);
            tableBody.appendChild(tr);
            return;
        }

        data.forEach(p=>{
            const tr = document.createElement('tr'); // nieuwe rij
            if(p.Relatie) tr.className = p.Relatie; // klasse voor CSS styling

            // ===== bestaande cellen vullen =====
            FIELDS.forEach(f=>{
                const td = document.createElement('td'); // nieuwe cel
                if(f === ID_FIELD) td.textContent = p[f] || ''; // ID readonly
                else{
                    const input = document.createElement('input'); // editable input
                    input.value = p[f] || '';
                    input.dataset.field = f; // veldnaam voor later
                    td.appendChild(input);
                }
                tr.appendChild(td); // cel toevoegen aan rij
            });

            // ===== extra relatie cel =====
            const relatieTd = document.createElement('td'); // nieuwe cel
            relatieTd.textContent = p.Relatie || ''; // tekst: Hoofd / Ouder / leeg
            tr.appendChild(relatieTd); // cel toevoegen

            tableBody.appendChild(tr); // rij toevoegen aan tabel
        });
    }

    // =======================
    // Placeholder tonen
    // =======================
    function initPlaceholder(){
        tableBody.innerHTML = '';
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = FIELDS.length+1; // +1 voor relatie
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
        nieuw[ID_FIELD] = window.genereerCode(nieuw, dataset); // unieke ID genereren
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
                if(f === ID_FIELD) persoon[f] = cell.textContent.trim();
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
    // Dataset verversen
    // =======================
    function refreshTable(){
        dataset = window.StamboomStorage.get() || [];
        initPlaceholder();
    }

    // =======================
    // Live search popup
    // =======================
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
    }

    function showPopup(results, rect){
        const popup = createPopup();
        popup.innerHTML = '';
        results.forEach(p=>{
            const row = document.createElement('div');
            row.style.padding = '5px 10px';
            row.style.cursor = 'pointer';
            row.style.borderBottom = '1px solid #eee';
            row.textContent = `${p.ID} | ${p.Roepnaam} | ${p.Achternaam} | ${p.Geboortedatum || ''}`;
            row.addEventListener('click', ()=>{
                const selectie = [p]; // start met hoofd
                const ouder1 = dataset.find(x=>x[ID_FIELD]===p[FIELDS[10]]);
                const ouder2 = dataset.find(x=>x[ID_FIELD]===p[FIELDS[11]]);
                if(ouder1) selectie.push(ouder1); // ouder1 toevoegen
                if(ouder2) selectie.push(ouder2); // ouder2 toevoegen
                renderTable(applyRelatieLogica(selectie)); // render met relatie
                popup.style.display = 'none';
            });
            popup.appendChild(row);
        });
        if(results.length===0){
            const row = document.createElement('div');
            row.style.padding = '5px 10px';
            row.textContent = 'Geen resultaten';
            popup.appendChild(row);
        }
        popup.style.top = (rect.bottom + window.scrollY) + 'px';
        popup.style.left = (rect.left + window.scrollX) + 'px';
        popup.style.width = rect.width + 'px';
        popup.style.display = 'block';
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
            popup.style.display = 'none';
    });

    // =======================
    // Initialisatie
    // =======================
    buildHeader(); // header inclusief relatie kolom
    initPlaceholder(); // placeholder tonen
    addBtn.addEventListener('click', addPersoon);
    saveBtn.addEventListener('click', saveDataset);
    refreshBtn.addEventListener('click', refreshTable);
    searchInput.addEventListener('input', liveSearch);
})();
