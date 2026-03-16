/* ======================= js/LiveSearch.js v1.0.0 ======================= */
/* Centrale Live Search module (popup) voor view.js
   - Filtert dataset realtime op ID, Roepnaam, Achternaam
   - Toont resultaten in een dropdown-popup
   - Klikken op resultaat selecteert persoon en roept callback aan
*/

(function() {
    'use strict'; // veilige uitvoering

    /* ======================= LiveSearch functie ======================= */
    function liveSearch(options) {
        // Destructureer opties
        const { searchInput, dataset, renderCallback } = options;

        // Haal de zoekterm op en zet om naar kleine letters
        const term = safe(searchInput.value).toLowerCase();

        // Verwijder vorige popup als die er is
        document.getElementById('searchPopup')?.remove();

        // Stop als zoekterm leeg is
        if (!term) return;

        // ======================= Dataset filter =======================
        const results = dataset.filter(p =>
            safe(p.ID).toLowerCase().includes(term) ||
            safe(p.Roepnaam).toLowerCase().includes(term) ||
            safe(p.Achternaam).toLowerCase().includes(term)
        );

        // ======================= Popup creëren =======================
        const rect = searchInput.getBoundingClientRect(); // positie van input
        const popup = document.createElement('div');       // nieuw popup element
        popup.id = 'searchPopup';                          // uniek ID

        // Basis styling voor popup
        popup.style.position = 'absolute';
        popup.style.background = '#fff';
        popup.style.border = '1px solid #999';
        popup.style.zIndex = 1000;
        popup.style.top = rect.bottom + window.scrollY + 5 + 'px';   // net onder input
        popup.style.left = Math.max(rect.left + window.scrollX, 20) + 'px';
        popup.style.width = (rect.width * 1.2) + 'px';                // iets breder
        popup.style.maxHeight = '600px';
        popup.style.overflowY = 'auto';                               // scroll bij veel items
        popup.style.fontSize = '1.5rem';
        popup.style.padding = '8px';
        popup.style.borderRadius = '5px';
        popup.style.boxShadow = '0 3px 6px rgba(0,0,0,0.2)';          // subtiele schaduw

        // ======================= Resultaten vullen =======================
        if (results.length === 0) {
            // Geen resultaten
            const row = document.createElement('div');
            row.textContent = 'Geen resultaten';
            row.style.padding = '8px';
            row.style.fontSize = '1.3rem';
            popup.appendChild(row);
        } else {
            // Voor elk resultaat een klikbare regel maken
            results.forEach(p => {
                const row = document.createElement('div');
                row.textContent = `${p.ID} | ${p.Roepnaam} | ${p.Achternaam}`;
                row.style.padding = '8px';
                row.style.cursor = 'pointer';
                row.style.fontSize = '1.3rem';

                // Klik-event voor selectie
                row.addEventListener('click', () => {
                    renderCallback(p); // callback aanroepen met geselecteerde persoon
                    popup.remove();    // popup sluiten
                });

                popup.appendChild(row);
            });
        }

        // Voeg popup toe aan body zodat het zichtbaar wordt
        document.body.appendChild(popup);
    }

    /* ======================= Exporteren ======================= */
    // Maak liveSearch globaal beschikbaar voor view.js
    window.liveSearch = liveSearch;

})();
