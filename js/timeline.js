/* ======================= js/timeline.js v0.2.0 ======================= */
/* Nieuwe versie:
   - Volledig gebaseerd op relatieEngine.js
   - Werkt met "lanes" (Ouder, Hoofd, Partner, Kind, Broer/Zus)
   - Geen overlap meer
*/

(function(){
'use strict'; // Zorgt voor striktere foutcontrole

// ======================= IMPORT RELATIE ENGINE =======================
// Verwacht dat relatieEngine globally beschikbaar is
const getRelaties = window.relatieEngine; // Haalt de engine functie op

// ======================= CONFIG =======================
const laneConfig = [
    { key: 'ouders', label: 'Ouder', y: 50 },          // Bovenste lane
    { key: 'hoofd', label: 'Hoofd', y: 120 },          // Centrale persoon
    { key: 'partner', label: 'Partner', y: 170 },      // Partner
    { key: 'kinderen', label: 'Kind', y: 240 },        // Kinderen
    { key: 'broersZussen', label: 'Broer/Zus', y: 300 } // Siblings
];

// ======================= MAIN RENDER FUNCTION =======================
window.renderTimeline = function(hoofdID, data){

    const container = document.getElementById('timeline'); // Timeline container
    container.innerHTML = ''; // Reset vorige render

    // ======================= RELATIES OPHALEN =======================
    const rel = getRelaties(hoofdID, data); // Haalt gestructureerde relaties op

    // ======================= ALLES NORMALISEREN NAAR ARRAYS =======================
    const lanes = {
        ouders: rel.ouders || [],
        hoofd: rel.hoofd ? [rel.hoofd] : [],
        partner: rel.partner ? [rel.partner] : [],
        kinderen: rel.kinderen || [],
        broersZussen: rel.broersZussen || []
    };

    // ======================= TIMELINE RENDER PER LANE =======================
    laneConfig.forEach(lane => {

        const persons = lanes[lane.key]; // Haalt personen voor deze lane

        persons.forEach(p => {

            // ======================= POSITIE BEREKENEN =======================
            const startX = yearToX(p.GeboorteJaar); // Start positie op basis van geboortejaar
            const endX = p.OverlijdenJaar ? yearToX(p.OverlijdenJaar) : yearToX(new Date().getFullYear()); // Eind positie

            // ======================= LIJN =======================
            const line = document.createElement('div'); // Nieuwe lijn
            line.className = 'timeline-line'; // CSS class
            line.style.left = startX + 'px'; // Start positie
            line.style.top = lane.y + 'px'; // Lane positie
            line.style.width = (endX - startX) + 'px'; // Lengte lijn

            // ======================= LABEL =======================
            const label = document.createElement('div'); // Naam label
            label.className = 'timeline-label';
            label.style.left = startX + 'px'; // Zelfde startpunt
            label.style.top = (lane.y - 20) + 'px'; // Net boven lijn
            label.innerText = `${p.Naam} (${p.GeboorteJaar || '?'}–${p.OverlijdenJaar || ''})`; // Tekst

            // ======================= TOEVOEGEN =======================
            container.appendChild(line); // Voeg lijn toe
            container.appendChild(label); // Voeg label toe

        });

    });

};

// ======================= HELPER: JAAR → PIXEL =======================
function yearToX(year){
    const baseYear = 1930; // Start van timeline
    const scale = 5; // Pixels per jaar (aanpasbaar)
    return (year - baseYear) * scale; // Simpele lineaire mapping
}

})();
