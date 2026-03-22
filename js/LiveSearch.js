/* ======================= js/LiveSearch.js v1.1.0 =======================
   Universele Live Search module voor MyFamTreeCollab
   - Filtert dataset realtime op ID, Roepnaam, Achternaam en Geboortedatum
   - Toont resultaten als dropdown-popup of in een tabel
   - Klikken op resultaat selecteert persoon en roept callback aan
   Exporteert: window.liveSearch(), window.initLiveSearch()
   Vereist: utils.js (voor safe()) — moet eerder geladen zijn in HTML
   Wijziging v1.1.0: volledig in één IIFE gewikkeld — lost 'safe already declared' fout op
   ======================================================================= */

(function () {                                                              // Zelfuitvoerende functie: alle variabelen blijven lokaal, geen globale naamconflicten
    'use strict';                                                           // Strikte modus: voorkomt stille JS-fouten

    /* ======================= HELPERS ======================= */
    const safe = window.ftSafe;                                            // Centrale safe() uit utils.js — lokaal binnen deze IIFE, botst niet meer met andere scripts

    /* ======================= LiveSearch INIT ======================= */
    /**
     * Koppelt een zoekveld aan een dataset met een selectie-callback.
     * Verkorte initialisatie voor de meest gebruikte popup-modus.
     * @param {HTMLInputElement} searchInput     - Het zoekveld
     * @param {Array}            dataset         - De volledige lijst van personen
     * @param {Function}         onSelectCallback - Wordt aangeroepen met het ID van de geselecteerde persoon
     */
    function initLiveSearch(searchInput, dataset, onSelectCallback) {
        searchInput.addEventListener('input', () => {                      // Luister naar elke toetsaanslag in het zoekveld
            liveSearch({
                searchInput:    searchInput,                               // Geef het zoekveld door aan de universele liveSearch functie
                dataset:        dataset,                                   // Geef de volledige dataset mee om in te filteren
                displayType:    'popup',                                   // Gebruik popup-weergave (dropdown onder het zoekveld)
                renderCallback: (persoon) => {                             // Callback die aangeroepen wordt bij een klik op een zoekresultaat
                    if (!persoon) return;                                  // Veiligheidscheck: doe niets als persoon leeg is
                    onSelectCallback(persoon.ID);                          // Stuur het ID van de geselecteerde persoon terug naar de aanroeper
                }
            });
        });
    }

    /* ======================= LiveSearch FUNCTIE ======================= */
    /**
     * Universele zoekfunctie: filtert dataset en toont resultaten als popup of tabel.
     * @param {Object} options
     * @param {HTMLInputElement} options.searchInput    - Het zoekveld
     * @param {Array}            options.dataset        - De volledige lijst van personen
     * @param {string}           options.displayType    - 'popup' of 'table'
     * @param {Function}         options.renderCallback - Callback met geselecteerde persoon of gefilterde lijst
     */
    function liveSearch(options) {
        const {
            searchInput,                                                   // Het HTML input-element waar de gebruiker in typt
            dataset,                                                       // De volledige array van persoon-objecten om in te zoeken
            displayType,                                                   // Weergavemodus: 'popup' = dropdown, 'table' = tabel
            renderCallback                                                 // Functie die aangeroepen wordt bij selectie of tabelupdate
        } = options;

        const term = safe(searchInput.value).toLowerCase();                // Haal de zoekterm op, maak veilig en zet om naar kleine letters

        document.getElementById('searchPopup')?.remove();                  // Verwijder een eventueel al bestaande popup zodat er nooit twee tegelijk zijn

        if (!term) {                                                        // Als de zoekterm leeg is (gebruiker heeft alles gewist)
            if (displayType === 'table') renderCallback([]);               // Bij tabelweergave: geef lege array terug om de tabel te legen
            return;                                                        // Stop de functie, niets te tonen
        }

        /* ======================= DATASET FILTER ======================= */
        const results = dataset.filter(p =>                                // Filter de dataset: bewaar alleen personen die overeenkomen met de zoekterm
            safe(p.ID).toLowerCase().includes(term)           ||           // Zoek in het persoons-ID (bijv. "JJJM423")
            safe(p.Roepnaam).toLowerCase().includes(term)     ||           // Zoek in de roepnaam (bijv. "Jan")
            safe(p.Achternaam).toLowerCase().includes(term)   ||           // Zoek in de achternaam (bijv. "Jansen")
            safe(p.Geboortedatum).toLowerCase().includes(term)             // Zoek in de geboortedatum (bijv. "1954" of "12-03-1954")
        );

        /* ======================= POPUP WEERGAVE ======================= */
        if (displayType === 'popup') {
            const rect  = searchInput.getBoundingClientRect();             // Haal de positie en afmetingen van het zoekveld op in het venster
            const popup = document.createElement('div');                   // Maak een nieuw div-element voor de zoekresultaten-popup
            popup.id = 'searchPopup';                                      // Geef de popup een ID zodat hij later gevonden en verwijderd kan worden

            popup.style.position   = 'absolute';                           // Positioneer de popup absoluut zodat hij boven de pagina-inhoud zweeft
            popup.style.background = '#fff';                               // Witte achtergrond zodat de popup leesbaar is over andere content
            popup.style.border     = '1px solid #999';                     // Subtiele rand om de popup af te bakenen
            popup.style.zIndex     = 1000;                                 // Hoge z-index zodat de popup altijd bovenop andere elementen staat
            popup.style.top        = rect.bottom + window.scrollY + 5 + 'px'; // Positioneer direct onder het zoekveld + 5px ruimte
            popup.style.left       = Math.max(rect.left + window.scrollX, 20) + 'px'; // Uitgelijnd met het zoekveld, minimaal 20px van de linkerkant
            popup.style.width      = (rect.width * 1.2) + 'px';           // Iets breder dan het zoekveld voor betere leesbaarheid
            popup.style.maxHeight  = '600px';                              // Maximale hoogte zodat de popup niet buiten het scherm valt
            popup.style.overflowY  = 'auto';                               // Scrollbalk als er meer resultaten zijn dan in de popup passen
            popup.style.fontSize   = '1.5rem';                             // Grotere tekst voor betere leesbaarheid in de popup
            popup.style.padding    = '8px';                                // Binnenste ruimte zodat tekst niet tegen de rand staat
            popup.style.borderRadius = '5px';                              // Licht afgeronde hoeken voor een nette uitstraling
            popup.style.boxShadow  = '0 3px 6px rgba(0,0,0,0.2)';         // Zachte schaduw zodat de popup visueel boven de pagina zweeft

            if (results.length === 0) {                                    // Geen resultaten gevonden voor de zoekterm
                const row = document.createElement('div');                 // Maak een meldings-div
                row.textContent    = 'Geen resultaten';                    // Informatieve tekst voor de gebruiker
                row.style.padding  = '8px';                                // Ruimte rondom de tekst
                row.style.fontSize = '1.3rem';                             // Iets kleiner dan de resultaatregels
                popup.appendChild(row);                                    // Voeg de melding toe aan de popup

            } else {
                results.forEach(p => {                                     // Loop door alle gevonden personen
                    const row = document.createElement('div');             // Maak een rij-div voor elk zoekresultaat

                    const geboorte = p.Geboortedatum                       // Controleer of er een geboortedatum is
                        ? ` (${p.Geboortedatum})`                          // Ja: formatteer als " (datum)" met haakjes en spatie
                        : '';                                              // Nee: lege string, datum wordt niet getoond

                    row.textContent    = `${p.ID} | ${p.Roepnaam} | ${p.Achternaam}${geboorte}`; // Toon ID, roepnaam, achternaam en optioneel geboortedatum
                    row.style.padding  = '8px';                            // Ruimte rondom elke resultaatregel
                    row.style.cursor   = 'pointer';                        // Muiscursor verandert naar handje om aan te geven dat je kunt klikken
                    row.style.fontSize = '1.3rem';                         // Leesbare tekstgrootte voor de resultaatregels

                    row.addEventListener('click', () => {                  // Luister naar een klik op deze resultaatregel
                        renderCallback(p);                                 // Stuur het volledige persoon-object terug naar de callback
                        popup.remove();                                    // Sluit de popup direct na de selectie
                    });

                    popup.appendChild(row);                                // Voeg de ingevulde rij toe aan de popup
                });
            }

            document.body.appendChild(popup);                             // Voeg de popup toe aan de pagina zodat hij zichtbaar wordt

        /* ======================= TABEL WEERGAVE ======================= */
        } else if (displayType === 'table') {
            renderCallback(results);                                       // Stuur de gefilterde resultatenlijst direct naar de callback (vult de tabel)
        }
    }

    /* ======================= EXPORTEREN ======================= */
    window.liveSearch     = liveSearch;                                    // Maak liveSearch globaal beschikbaar voor view.js en timeline.js
    window.initLiveSearch = initLiveSearch;                                // Maak initLiveSearch globaal beschikbaar voor manage.js

})();                                                                      // Sluit en voer de zelfuitvoerende functie direct uit
