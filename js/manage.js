/* ======================= js/manage.js v2.4.0 =======================
   Beheerpagina: toont stamboom als tabel, live search, add/save/refresh
   Vereist: schema.js, idGenerator.js, storage.js, LiveSearch.js, relatieEngine.js
   Wijziging v2.4.0:
   - Meerdere partners ondersteuning via pipe-gescheiden PartnerID (F3-48)
   - Kinderen: PartnerID split op | zodat alle partners als aparte rij worden getoond
   - Broers/zussen: zelfde split-logica voor hun partners
   - Hoofdpersoon: extra partners (2e, 3e, ...) worden als extra Partner-rijen getoond
   Wijziging v2.3.2:
   - Delete-knop werkt nu op alle bestaande rijen (fix: Acties als eerste in if-chain)
   - Delete cleanup: verwijderd ID wordt ook gewist uit VaderID, MoederID en PartnerID
     van alle andere personen in de dataset (inclusief pipe-gescheiden partnerlijsten)
   Wijziging v2.3.1:
   - Voeg rij delete actie toe en render aangepast
   Wijziging v2.3.0:
   - KindPartnerID en BZPartnerID vervangen door één uniforme relatienaam 'Partner'
     Partners zijn directe eigenschappen van een persoon (persoon.PartnerID),
     geen aparte relatiecode nodig
   Wijziging v2.2.0:
   - Kindpartner en BZpartner opzoeken via dataset (niet via relatieEngine)
   Wijziging v2.1.0:
   - KindID filter uitgebreid naar HKindID en PHKindID
   - Labels HKindID → 'Kind (hoofd)', PHKindID → 'Kind (partner)'
   =================================================================== */

(function () {                                                              // Zelfuitvoerende functie: alle variabelen blijven lokaal, geen globale vervuiling
    'use strict';                                                           // Strikte modus: voorkomt stille JS-fouten

    /* ======================= HELPERS ======================= */
    const safe = window.ftSafe;                                             // Gebruik de centrale safe() uit utils.js — geen lokale kopie meer nodig

    /* ======================= KOLOMMEN DEFINITIE ======================= */
    const COLUMNS = [                                                       // Array die alle tabelkolommen definieert met naam en bewerkbaarheid
        { key: 'Acties',            readonly: true  },                     // UI kolom voor delete-knop, readonly want geen textarea nodig
        { key: 'Relatie',           readonly: true  },                     // Relatie t.o.v. hoofdpersoon, automatisch berekend, niet bewerkbaar
        { key: 'ID',                readonly: true  },                     // Uniek persoons-ID, gegenereerd door idGenerator.js, niet bewerkbaar
        { key: 'Doopnaam',          readonly: false },                     // Officiële voornaam, gebruiker kan dit aanpassen
        { key: 'Roepnaam',          readonly: false },                     // Roepnaam / gebruikelijke naam, bewerkbaar
        { key: 'Prefix',            readonly: false },                     // Tussenvoegsel (van, de, van den), bewerkbaar
        { key: 'Achternaam',        readonly: false },                     // Familienaam, bewerkbaar
        { key: 'Geslacht',          readonly: false },                     // M / V / X, bewerkbaar
        { key: 'Geboortedatum',     readonly: false },                     // Datum formaat yyyy-mm-dd, bewerkbaar
        { key: 'Geboorteplaats',    readonly: false },                     // Stad/gemeente van geboorte, bewerkbaar
        { key: 'Overlijdensdatum',  readonly: false },                     // Datum overlijden, leeg als nog in leven
        { key: 'Overlijdensplaats', readonly: false },                     // Stad/gemeente van overlijden, bewerkbaar
        { key: 'VaderID',           readonly: false },                     // ID van de vader, verwijzing naar andere persoon in dataset
        { key: 'MoederID',          readonly: false },                     // ID van de moeder, verwijzing naar andere persoon in dataset
        { key: 'PartnerID',         readonly: false },                     // ID van partner(s), meerdere mogelijk gescheiden door |
        { key: 'Opmerkingen',       readonly: false }                      // Vrij tekstveld voor extra informatie
    ];

    /* ======================= STATE ======================= */
    let dataset         = StamboomStorage.get();                           // Laad de volledige stamboom-dataset uit localStorage bij pagina-load
    let selectedHoofdId = null;                                            // Houdt bij welke persoon momenteel geselecteerd is als hoofdpersoon
    let tempRowCount    = 0;                                               // Telt hoeveel nieuwe (nog niet opgeslagen) rijen er zijn toegevoegd

    /* ======================= DOM ELEMENTEN ======================= */
    const tableBody     = document.querySelector('#manageTable tbody');    // Het <tbody> element waar alle persoonsrijen in komen
    const theadRow      = document.querySelector('#manageTable thead tr'); // De header-rij van de tabel voor kolomtitels
    const addBtn        = document.getElementById('addBtn');               // Knop om een lege nieuwe rij toe te voegen aan de tabel
    const saveBtn       = document.getElementById('saveBtn');              // Knop om alle wijzigingen op te slaan naar localStorage
    const refreshBtn    = document.getElementById('refreshBtn');           // Knop om de tabel te herladen vanuit localStorage
    const exportJsonBtn = document.getElementById('exportJson');           // Knop om de dataset te downloaden als .json bestand
    const exportCsvBtn  = document.getElementById('exportCsv');            // Knop om de dataset te downloaden als .csv bestand
    const searchInput   = document.getElementById('searchPerson');         // Zoekveld bovenaan de pagina voor live persoon-zoeken

    /* ======================= HEADER BOUWEN ======================= */
    function buildHeader() {
        theadRow.innerHTML = '';                                           // Verwijder alle bestaande kolomkoppen (bij refresh)
        COLUMNS.forEach(col => {                                           // Loop door elke kolom-definitie in de COLUMNS array
            const th = document.createElement('th');                      // Maak een nieuw <th> header-cel element
            th.textContent = col.key;                                     // Zet de kolomnaam als zichtbare tekst in de cel
            theadRow.appendChild(th);                                     // Voeg de header-cel toe aan de header-rij van de tabel
        });
    }

    /* ======================= RELATIE ENGINE ======================= */
    // Geen lokale versie meer — we gebruiken de centrale relatieEngine.js
    const computeRelaties = window.RelatieEngine.computeRelaties;         // Haal de centrale functie op uit relatieEngine.js (moet eerder geladen zijn in HTML)

    /* ======================= TEXTAREA AUTO-HOOGTE ======================= */
    function adjustTextareas() {
        tableBody.querySelectorAll('textarea').forEach(ta => {            // Loop door alle textarea-velden in de tabel
            ta.style.height = 'auto';                                     // Reset eerst de hoogte zodat scrollHeight correct berekend wordt
            const maxH = 120;                                             // Maximale hoogte in pixels voor een textarea (voorkomt te grote cellen)
            if (ta.scrollHeight > maxH) {                                 // Als de inhoud meer ruimte nodig heeft dan het maximum
                ta.style.height    = maxH + 'px';                         // Begrens de hoogte op het maximum
                ta.style.overflowY = 'auto';                              // Voeg scrollbalk toe zodat de rest van de tekst bereikbaar blijft
            } else {
                ta.style.height    = ta.scrollHeight + 'px';              // Pas de hoogte precies aan op de inhoud
                ta.style.overflowY = 'hidden';                            // Geen scrollbalk nodig: alle tekst is zichtbaar
            }
        });
    }

    /* ======================= DELETE HANDLER FACTORY ======================= */
    // Aparte functie zodat dezelfde logica herbruikbaar is voor bestaande én nieuwe rijen
    function makeDeleteHandler(tr, getID) {
        return function () {
            if (!confirm('Weet je zeker dat je deze persoon wilt verwijderen?')) return; // Vraag bevestiging voor definitieve actie

            const id = getID();                                           // Haal het te verwijderen ID op via de meegegeven callback

            if (id) {
                // Stap 1: verwijder de persoon zelf uit de dataset
                dataset = dataset.filter(x => safe(x.ID) !== id);        // Filter de persoon met dit ID eruit

                // Stap 2: cleanup verwijzingen in alle andere personen
                dataset = dataset.map(x => {
                    const updated = { ...x };                             // Werk op een kopie zodat het originele object niet gemuteerd wordt

                    // VaderID: leegmaken als het overeenkomt met het verwijderde ID
                    if (safe(updated.VaderID) === id) {
                        updated.VaderID = '';                             // Veld leegmaken: vader bestaat niet meer
                    }

                    // MoederID: leegmaken als het overeenkomt met het verwijderde ID
                    if (safe(updated.MoederID) === id) {
                        updated.MoederID = '';                            // Veld leegmaken: moeder bestaat niet meer
                    }

                    // PartnerID: kan meerdere ID's bevatten gescheiden door |
                    if (safe(updated.PartnerID)) {
                        updated.PartnerID = updated.PartnerID
                            .split('|')                                   // Splits op pipe-scheidingsteken om elk partner-ID apart te behandelen
                            .map(s => s.trim())                           // Verwijder witruimte rondom elk ID
                            .filter(s => s !== id)                        // Verwijder het gedelete ID uit de partnerlijst
                            .join('|');                                   // Zet de resterende partner-ID's terug samen met pipe
                    }

                    return updated;                                       // Geef de opgeschoonde persoon terug
                });

                StamboomStorage.set(dataset);                             // Sla de volledige opgeschoonde dataset op in localStorage
            }

            tr.remove();                                                  // Verwijder de tabelrij direct uit de DOM voor directe visuele feedback
        };
    }

    /* ======================= TABEL RENDEREN ======================= */
    function renderTable(ds) {
        if (!selectedHoofdId) {                                           // Controleer of er een hoofdpersoon geselecteerd is
            showPlaceholder('Selecteer een persoon via de zoekfunctie');  // Geen selectie → toon instructie
            return;                                                       // Stop de functie, niets te renderen
        }

        const contextData = computeRelaties(ds, selectedHoofdId);        // Bereken alle relaties rondom de geselecteerde hoofdpersoon
        if (!contextData.length) {                                        // Als er geen personen teruggekomen zijn
            showPlaceholder('Geen personen gevonden');                    // Toon melding in de tabel
            return;                                                       // Stop de functie
        }

        tableBody.innerHTML = '';                                         // Leeg de tabel zodat we opnieuw kunnen opbouwen
        const renderQueue = [];                                           // Lege array die we vullen in de gewenste weergavevolgorde

        // Vul de renderQueue in de juiste hiërarchische volgorde
        contextData
            .filter(p => p.Relatie === 'VHoofdID' || p.Relatie === 'MHoofdID') // Ouders van hoofd komen als eerste
            .forEach(p => renderQueue.push(p));                           // Voeg elke ouder toe aan de queue

        const hoofd = contextData.find(p => p.Relatie === 'HoofdID');    // Zoek de hoofdpersoon op in de verwerkte lijst
        if (hoofd) renderQueue.push(hoofd);                               // Voeg hoofdpersoon toe na de ouders

        contextData
            .filter(p => p.Relatie === 'PHoofdID')                       // Eerste partner via relatieEngine (primaire partner)
            .forEach(p => renderQueue.push(p));                           // Voeg eerste partner toe na hoofd

        // Extra partners van de hoofdpersoon: 2e, 3e, ... uit de pipe-lijst
        if (hoofd && safe(hoofd.PartnerID)) {
            hoofd.PartnerID.split('|')                                    // Splits op pipe: meerdere partners mogelijk
                .map(id => id.trim())                                     // Witruimte rondom elk ID verwijderen
                .filter(Boolean)                                          // Lege strings verwijderen
                .slice(1)                                                 // Eerste partner overslaan — al toegevoegd via PHoofdID
                .forEach(pid => {                                         // Loop door elk extra partner-ID
                    const ep = dataset.find(p => safe(p.ID) === pid);    // Zoek extra partner in dataset
                    if (ep) renderQueue.push({ ...ep, Relatie: 'PHoofdID' }); // Toon als PHoofdID zodat kleurcodering klopt
                });
        }

        contextData
            .filter(p => ['KindID', 'HKindID', 'PHKindID'].includes(p.Relatie)) // Alle drie kindscenario's meenemen
            .forEach(k => {
                renderQueue.push(k);                                      // Voeg het kind toe aan de queue
                if (safe(k.PartnerID)) {                                  // Controleer of kind partner(s) heeft
                    k.PartnerID.split('|')                                // Splits op pipe: meerdere partners mogelijk
                        .map(id => id.trim())                             // Witruimte rondom elk ID verwijderen
                        .filter(Boolean)                                  // Lege strings na split verwijderen
                        .forEach(pid => {                                 // Loop door elk partner-ID
                            const kp = dataset.find(p => safe(p.ID) === pid); // Zoek partner in dataset
                            if (kp) renderQueue.push({ ...kp, Relatie: 'Partner' }); // Partner direct na kind
                        });
                }
            });

        contextData
            .filter(p => p.Relatie === 'BZID')                           // Loop door alle broers/zussen
            .forEach(s => {
                renderQueue.push(s);                                      // Voeg de broer/zus toe aan de queue
                if (safe(s.PartnerID)) {                                  // Controleer of broer/zus partner(s) heeft
                    s.PartnerID.split('|')                                // Splits op pipe: meerdere partners mogelijk
                        .map(id => id.trim())                             // Witruimte rondom elk ID verwijderen
                        .filter(Boolean)                                  // Lege strings na split verwijderen
                        .forEach(pid => {                                 // Loop door elk partner-ID
                            const bzP = dataset.find(p => safe(p.ID) === pid); // Zoek partner in dataset
                            if (bzP) renderQueue.push({ ...bzP, Relatie: 'Partner' }); // Partner direct na broer/zus
                        });
                }
            });

        // Bouw voor elke persoon in de queue een tabelrij
        renderQueue.forEach(p => {
            const tr = document.createElement('tr');                     // Maak een nieuwe tabelrij

            // Vertaal de interne relatiecodes naar leesbare Nederlandse labels
            let relatieLabel = '';                                        // Begin met leeg label
            switch (p.Relatie) {
                case 'VHoofdID':
                case 'MHoofdID':  relatieLabel = 'Ouder';     break;     // Vader of moeder = Ouder
                case 'PHoofdID':
                case 'Partner':   relatieLabel = 'Partner';   break;     // Alle partners = Partner
                case 'BZID':      relatieLabel = 'Broer/Zus'; break;     // Broer of zus
                case 'HoofdID':   relatieLabel = 'Hoofd';     break;     // Geselecteerde hoofdpersoon
                case 'KindID':    relatieLabel = 'Kind';      break;     // Kind van hoofd én partner
                case 'HKindID':   relatieLabel = 'Kind';      break;     // Kind van alleen de hoofdpersoon
                case 'PHKindID':  relatieLabel = 'Kind';      break;     // Kind van alleen de partner
                default:          relatieLabel = p.Relatie || '-';       // Onbekend type: toon de code zelf of streepje
            }

            if (p.Relatie) tr.classList.add(p.Relatie);                  // Voeg de relatiecode als CSS-class toe voor kleurcodering via RelationColors.css

            COLUMNS.forEach(col => {                                      // Loop door elke kolomdefinitie om de tabelcel aan te maken
                const td = document.createElement('td');                 // Maak een nieuwe tabelcel

                if (col.key === 'Acties') {
                    // Acties-kolom als EERSTE afhandelen, vóór de readonly-check
                    // Anders zou de readonly-tak deze kolom opvangen en geen knop tonen
                    const btn = document.createElement('button');        // Maak de delete-knop aan
                    btn.textContent = '🗑️';                              // Visueel icoon voor verwijderen
                    btn.title = 'Verwijder persoon';                     // Tooltip bij hover
                    btn.addEventListener(                                 // Koppel de delete-handler
                        'click',
                        makeDeleteHandler(tr, () => safe(p.ID))          // Geef een callback mee die het ID van deze persoon retourneert
                    );
                    td.appendChild(btn);                                 // Knop in de cel plaatsen

                } else if (col.key === 'Relatie') {
                    // Relatie-kolom: toon het leesbare Nederlandse label
                    td.textContent = relatieLabel;                       // Zet het vertaalde relatielabel als celtekst

                } else if (col.readonly) {
                    // Overige readonly kolommen (zoals ID): toon als platte tekst
                    td.textContent = p[col.key] || '';                   // Waarde tonen of leeg laten als het veld ontbreekt

                } else {
                    // Bewerkbare kolom: gebruik een textarea zodat lange waarden goed passen
                    const ta = document.createElement('textarea');       // Textarea voor bewerkbare invoer
                    ta.value           = p[col.key] || '';               // Vul de huidige waarde in
                    ta.dataset.field   = col.key;                        // Sla de veldnaam op als data-attribuut voor gebruik bij opslaan
                    ta.style.width     = '100%';                         // Volle breedte van de cel
                    ta.style.boxSizing = 'border-box';                   // Padding telt mee in breedte, geen overflow
                    ta.style.resize    = 'vertical';                     // Gebruiker mag alleen verticaal vergroten
                    td.appendChild(ta);                                  // Textarea in de cel plaatsen
                }

                tr.appendChild(td);                                      // Ingevulde cel toevoegen aan de tabelrij
            });

            tableBody.appendChild(tr);                                   // Complete rij toevoegen aan de tabel
        });

        adjustTextareas();                                               // Pas de hoogte van alle textareas aan na het opbouwen van de tabel
    }

    /* ======================= PLACEHOLDER ======================= */
    function showPlaceholder(msg) {
        tableBody.innerHTML = '';                                         // Verwijder alle bestaande rijen uit de tabel
        const tr  = document.createElement('tr');                        // Maak een nieuwe rij voor de melding
        const td  = document.createElement('td');                        // Maak een cel voor de meldingstekst
        td.colSpan = COLUMNS.length;                                     // Laat de cel alle kolommen overspannen
        td.textContent   = msg;                                          // Zet de meldingstekst
        td.style.textAlign = 'center';                                   // Centreer de tekst horizontaal
        tr.appendChild(td);                                              // Voeg de cel toe aan de rij
        tableBody.appendChild(tr);                                       // Voeg de rij toe aan de tabel
    }

    /* ======================= NIEUWE RIJ TOEVOEGEN ======================= */
    function addRow() {
        if (tempRowCount >= 10) {                                         // Maximaal 10 onopgeslagen rijen toestaan
            alert('Maximaal 10 rijen toegevoegd. Klik eerst op Opslaan.'); // Informeer de gebruiker
            return;                                                       // Stop zonder rij toe te voegen
        }

        const tr = document.createElement('tr');                         // Maak een nieuwe lege tabelrij

        COLUMNS.forEach(col => {                                          // Loop door elke kolomdefinitie
            const td = document.createElement('td');                     // Maak een cel per kolom

            if (col.key === 'Acties') {
                // Delete-knop voor nieuwe rij: verwijdert alleen uit DOM (geen dataset-cleanup nodig want nog niet opgeslagen)
                const btn = document.createElement('button');            // Maak de delete-knop aan
                btn.textContent = '🗑️';                                  // Visueel icoon
                btn.title = 'Verwijder rij';                             // Tooltip
                btn.addEventListener('click', () => tr.remove());        // Nieuwe rij heeft geen ID → alleen uit DOM verwijderen
                td.appendChild(btn);                                     // Knop in de cel

            } else if (col.readonly) {
                td.textContent = '';                                     // Readonly cel leeg laten: ID wordt ingevuld na opslaan

            } else {
                const ta = document.createElement('textarea');           // Bewerkbare kolom krijgt een textarea
                ta.value           = '';                                 // Begin leeg
                ta.dataset.field   = col.key;                           // Veldnaam opslaan als data-attribuut
                ta.style.width     = '100%';                            // Volle breedte
                ta.style.boxSizing = 'border-box';                      // Padding telt mee in breedte
                ta.style.resize    = 'vertical';                        // Alleen verticaal schalen toegestaan
                td.appendChild(ta);                                     // Textarea in de cel
            }

            tr.appendChild(td);                                         // Cel in de rij
        });

        tableBody.appendChild(tr);                                      // Rij in de tabel
        tempRowCount++;                                                  // Verhoog de teller voor onopgeslagen rijen
        adjustTextareas();                                              // Pas hoogte aan voor de nieuwe textarea's
    }

    /* ======================= DATASET OPSLAAN ======================= */
    function saveDatasetMerged() {
        try {
            const rows  = tableBody.querySelectorAll('tr');               // Haal alle zichtbare tabelrijen op
            const idMap = new Map(dataset.map(p => [p.ID, p]));          // Maak een Map van bestaande personen: ID → persoon-object (voor snelle updates)

            rows.forEach(tr => {                                          // Loop door elke zichtbare rij in de tabel
                const persoon = {};                                       // Leeg object dat we gaan vullen vanuit de cellen

                COLUMNS.forEach((col, i) => {                            // Loop door elke kolom om de waarde uit de cel te halen
                    const cell = tr.cells[i];                            // Haal de cel op op basis van kolomindex
                    if (col.readonly) {                                   // Alleen-lezen cel
                        if (col.key === 'ID') {                           // Alleen het ID-veld is nuttig uit de alleen-lezen cellen
                            persoon.ID = safe(cell.textContent);          // Lees het ID uit de celtekst
                        }
                    } else {
                        const ta = cell.querySelector('textarea');        // Zoek de textarea in de bewerkbare cel
                        persoon[col.key] = ta ? ta.value.trim() : '';    // Haal de getrimde waarde op, of lege string als textarea ontbreekt
                    }
                });

                if (!persoon.ID) {                                        // Nieuwe rij heeft nog geen ID (was leeg)
                    persoon.ID = window.genereerCode(                     // Genereer een nieuw uniek ID via de centrale generator
                        persoon,
                        Array.from(idMap.values())                        // Geef alle bestaande personen mee om uniciteit te garanderen
                    );
                }

                idMap.set(persoon.ID, {                                   // Sla de persoon op in de Map (update als al bestaat, voeg toe als nieuw)
                    ...idMap.get(persoon.ID),                             // Bewaar alle bestaande velden van de persoon (zoals velden die niet in de tabel staan)
                    ...persoon                                            // Overschrijf met de gewijzigde waarden uit de tabel
                });
            });

            dataset = Array.from(idMap.values());                        // Zet de Map terug naar een array voor opslag
            StamboomStorage.set(dataset);                                 // Sla de bijgewerkte dataset op in localStorage
            tempRowCount = 0;                                             // Reset de teller voor onopgeslagen rijen
            alert('Dataset succesvol opgeslagen');                        // Bevestig aan de gebruiker dat opslaan gelukt is
        } catch (e) {
            alert(`Opslaan mislukt: ${e.message}`);                       // Toon foutmelding als er iets misgaat
        }
    }

    /* ======================= EXPORT JSON ======================= */
    function exportJSON() {
        const data = JSON.stringify(dataset, null, 2);                   // Zet de dataset om naar leesbare JSON-tekst met 2 spaties inspringing
        const blob = new Blob([data], { type: 'application/json' });     // Maak een downloadbaar bestand van de JSON-tekst
        const url  = URL.createObjectURL(blob);                          // Maak een tijdelijke URL aan voor het bestand
        const a    = document.createElement('a');                        // Maak een onzichtbare downloadlink
        a.href     = url;                                                // Koppel de tijdelijke URL aan de link
        a.download = 'stamboom.json';                                    // Stel de bestandsnaam in voor de download
        a.click();                                                       // Simuleer een klik om de download te starten
        URL.revokeObjectURL(url);                                        // Verwijder de tijdelijke URL uit het geheugen
    }

    /* ======================= EXPORT CSV ======================= */
    function exportCSV() {
        const headers = COLUMNS.map(c => c.key).join(',');               // Maak de headerregel: kolomnamen gescheiden door komma's
        const rows    = dataset                                          // Loop door alle personen in de dataset
            .map(p => COLUMNS                                            // Loop door alle kolommen voor elke persoon
                .map(c => `"${(p[c.key] || '').replace(/"/g, '""')}"`)  // Zet elke waarde tussen aanhalingstekens, escape interne aanhalingstekens
                .join(',')                                               // Verbind de kolomwaarden met komma's tot één CSV-regel
            )
            .join('\n');                                                 // Verbind alle persoon-regels met een nieuwe regel

        const csv  = headers + '\n' + rows;                             // Combineer header en data tot volledige CSV-inhoud
        const blob = new Blob([csv], { type: 'text/csv' });             // Maak een downloadbaar bestand van de CSV-tekst
        const url  = URL.createObjectURL(blob);                         // Tijdelijke download-URL aanmaken
        const a    = document.createElement('a');                       // Onzichtbare downloadlink aanmaken
        a.href     = url;                                                // URL koppelen
        a.download = 'stamboom.csv';                                    // Bestandsnaam instellen
        a.click();                                                       // Download starten
        URL.revokeObjectURL(url);                                       // Tijdelijke URL opruimen uit geheugen
    }

    /* ======================= INITIALISATIE ======================= */
    function init() {
        buildHeader();                                                   // Bouw de kolomtitels in de tabelheader

        showPlaceholder('Selecteer een persoon via de zoekfunctie');     // Toon beginmelding: er is nog niemand geselecteerd

        addBtn.addEventListener('click', addRow);                        // Koppel de Voeg toe-knop aan de addRow functie
        saveBtn.addEventListener('click', saveDatasetMerged);            // Koppel de Opslaan-knop aan de saveDatasetMerged functie
        refreshBtn.addEventListener('click', () => {                     // Koppel de Vernieuwen-knop
            if (selectedHoofdId) renderTable(dataset);                   // Herlaad de tabel als er een persoon geselecteerd is
            else showPlaceholder('Selecteer een persoon via de zoekfunctie'); // Anders toon de beginmelding
        });
        exportJsonBtn?.addEventListener('click', exportJSON);            // Koppel de JSON-exportknop (?. = veilig: doet niets als knop niet bestaat)
        exportCsvBtn?.addEventListener('click', exportCSV);              // Koppel de CSV-exportknop (?. = veilig: doet niets als knop niet bestaat)

        if (typeof initLiveSearch === 'function') {                      // Controleer of LiveSearch.js correct geladen is
            initLiveSearch(searchInput, dataset, (selectedID) => {       // Initialiseer de live zoekfunctie met het zoekveld en de dataset
                selectedHoofdId = selectedID;                            // Sla het geselecteerde persoons-ID op als nieuwe hoofdpersoon
                renderTable(dataset);                                    // Herrender de tabel met de nieuw geselecteerde persoon als middelpunt
            });

            document.addEventListener('click', (e) => {                 // Luister naar klikken overal op de pagina
                const popup = document.getElementById('searchPopup');    // Zoek de zoekresultaten-popup op
                if (popup && !popup.contains(e.target)                   // Als de popup bestaat en de klik was buiten de popup
                          && e.target !== searchInput) {                 // EN de klik was niet op het zoekveld zelf
                    popup.remove();                                      // Verwijder de popup uit de DOM
                }
            });
        }
    }

    init();                                                              // Start de initialisatie zodra het script geladen is

})();                                                                    // Sluit en voer de zelfuitvoerende functie direct uit
