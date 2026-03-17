/* ======================= js/LiveSearch.js v1.0.3 ======================= */
/* Universele Live Search module voor view.js (popup) & manage.js (tabel)
   - Filtert dataset realtime op ID, Roepnaam, Achternaam en Geboortedatum
   - Toon resultaten als dropdown-popup of in een tabel
   - Klikken op resultaat selecteert persoon en roept callback aan
*/

/* ======================= HELPERS ======================= */ 
function safe(val){ return val ? String(val).trim() : ''; } // Zet waarde om naar string en trim spaties

/* ======================= LiveSearch INIT  ======================= */
function initLiveSearch(searchInput, dataset, onSelectCallback){
    // Event listener op input veld
    searchInput.addEventListener('input', ()=>{
        // Roep de universele liveSearch functie aan
        liveSearch({
            searchInput: searchInput,   // input element
            dataset: dataset,           // volledige dataset
            displayType: 'popup',       // gebruik popup weergave
            renderCallback: (persoon) => {
                if(!persoon) return;
                // Als iemand geselecteerd wordt:
                onSelectCallback(persoon.ID); // update geselecteerde hoofdID
            }
        });
    });
}

(function() {
    'use strict'; // veilige uitvoering

    /* ======================= LiveSearch functie ======================= */
    function liveSearch(options) {
        const {
            searchInput,    // input element (HTMLInputElement)
            dataset,        // array met personen
            displayType,    // 'popup' of 'table'
            renderCallback  // callback functie bij selectie/resultaten
        } = options;

        // Haal zoekterm op en lowercase
        const term = safe(searchInput.value).toLowerCase();

        // Verwijder eventuele oude popup
        document.getElementById('searchPopup')?.remove();

        // Stop als zoekterm leeg is
        if (!term) {
            if(displayType==='table') renderCallback([]); // bij table clear
            return;
        }

        // ======================= Dataset filter =======================
        const results = dataset.filter(p =>
            safe(p.ID).toLowerCase().includes(term) ||              // zoeken op ID
            safe(p.Roepnaam).toLowerCase().includes(term) ||        // zoeken op roepnaam
            safe(p.Achternaam).toLowerCase().includes(term) ||      // zoeken op achternaam
            safe(p.Geboortedatum).toLowerCase().includes(term)      // zoeken op geboortedatum (bijv. 1954 of 12-03-1954)
        );

        // ======================= Popup weergave =======================
        if(displayType==='popup') {
            const rect = searchInput.getBoundingClientRect(); // positie input
            const popup = document.createElement('div');       // nieuw element
            popup.id = 'searchPopup';

            // Styling van popup
            popup.style.position = 'absolute';
            popup.style.background = '#fff';
            popup.style.border = '1px solid #999';
            popup.style.zIndex = 1000;
            popup.style.top = rect.bottom + window.scrollY + 5 + 'px';
            popup.style.left = Math.max(rect.left + window.scrollX, 20) + 'px';
            popup.style.width = (rect.width * 1.2) + 'px';
            popup.style.maxHeight = '600px';
            popup.style.overflowY = 'auto';
            popup.style.fontSize = '1.5rem';
            popup.style.padding = '8px';
            popup.style.borderRadius = '5px';
            popup.style.boxShadow = '0 3px 6px rgba(0,0,0,0.2)';

            if(results.length===0){
                const row = document.createElement('div');
                row.textContent = 'Geen resultaten';
                row.style.padding='8px';
                row.style.fontSize='1.3rem';
                popup.appendChild(row);
            } else {
                results.forEach(p=>{
                    const row = document.createElement('div'); // container voor één resultaat

                    // ======================= TEKST INCL. GEBOORTEDATUM =======================
                    const geboorte = p.Geboortedatum ? ` (${p.Geboortedatum})` : ''; 
                    // Voeg datum toe als die bestaat
                    row.textContent = `${p.ID} | ${p.Roepnaam} | ${p.Achternaam}${geboorte}`;
                    // Voorbeeld output: "JJH123 | Jan | Jansen (12-03-1954)"

                    row.style.padding='8px';
                    row.style.cursor='pointer';
                    row.style.fontSize='1.3rem';

                    // Klik-event voor selectie
                    row.addEventListener('click', ()=>{
                        renderCallback(p); // stuur geselecteerde persoon terug
                        popup.remove();    // sluit popup
                    });

                    popup.appendChild(row); // voeg resultaat toe aan popup
                });
            }

            document.body.appendChild(popup); // popup toevoegen aan DOM
        }

        // ======================= Tabel weergave =======================
        else if(displayType==='table') {
            // stuur de gefilterde resultaten naar de callback (bv. tbody vullen)
            renderCallback(results);
        }
    }

    /* ======================= Exporteren ======================= */
    window.liveSearch = liveSearch; // exposeer global

})();
