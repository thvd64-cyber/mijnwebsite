/* ======================= js/timeline.js v0.2.0 ======================= */
/* Timeline rendering voor MyFamTreeCollab
   - Gebaseerd op peopleData + RelatieEngine
   - Weergave per lane: Ouder, Hoofd, Partner, Kind, Broer/Zus
   - Pixel-perfect positionering volgens geboorte- en overlijdensjaar
   - Inline uitleg bij elke regel
*/

(function(){
'use strict'; // Schakel strikte mode in om fouten te voorkomen

// ======================= CONFIG =======================
// Lane configuratie voor timeline (Y-posities)
const laneConfig = [
    { key: 'VHoofdID', label: 'Ouder', y: 50 },          // Vader lane
    { key: 'MHoofdID', label: 'Ouder', y: 80 },          // Moeder lane
    { key: 'HoofdID', label: 'Hoofd', y: 120 },          // Hoofd lane
    { key: 'PHoofdID', label: 'Partner', y: 170 },       // Partner lane
    { key: 'KindID', label: 'Kind', y: 240 },            // Kind lane
    { key: 'BZID', label: 'Broer/Zus', y: 300 }          // Broer/Zus lane
];

// ======================= TIMELINE RENDER FUNCTION =======================
window.renderTimeline = function(hoofdID){

    // ======================= DATA LADEN =======================
    let peopleData = window.StamboomStorage?.get() || []; // Haal dataset direct uit storage
    if(!peopleData.length) return;                        // Stop als er geen data is

    // ======================= RELATIES BEREKENEN =======================
    const relaties = window.RelatieEngine.computeRelaties(peopleData, hoofdID); 
    // Output is een array van personen met Relatie en _priority

    // ======================= TIMELINE CONTAINER =======================
    const container = document.getElementById('timeline'); // Container div
    container.innerHTML = ''; // Reset eerdere content

    // ======================= HULPFUNCTIE: JAAR → PIXEL =======================
    const yearToX = year => {
        const baseYear = 1930;       // Timeline startjaar
        const scale = 5;             // Pixels per jaar
        return (year - baseYear) * scale; // Lineaire mapping
    };

    // ======================= RENDER PER LANE =======================
    laneConfig.forEach(lane => {
        // Selecteer personen die op deze lane horen
        const persons = relaties.filter(p => p.Relatie === lane.key);
        persons.forEach(p => {

            // ======================= START/END X =======================
            const birthYear = p.Geboortedatum instanceof Date ? p.Geboortedatum.getFullYear() : null;
            const deathYear = p.Overlijdensdatum instanceof Date ? p.Overlijdensdatum.getFullYear() : null;
            const startX = birthYear ? yearToX(birthYear) : 0; // fallback 0
            const endX = deathYear ? yearToX(deathYear) : yearToX(new Date().getFullYear());

            // ======================= LIJN ELEMENT =======================
            const line = document.createElement('div');   // lijn voor de periode
            line.className = 'timeline-line';             // CSS class
            line.style.left = startX + 'px';              // horizontale start
            line.style.top = lane.y + 'px';               // Y positie per lane
            line.style.width = (endX - startX) + 'px';    // lengte lijn
            line.style.height = '4px';                    // hoogte lijn
            line.style.backgroundColor = '#333';          // kleur lijn
            container.appendChild(line);                  // voeg toe aan DOM

            // ======================= LABEL ELEMENT =======================
            const label = document.createElement('div');  // naam label
            label.className = 'timeline-label';          // CSS class
            label.style.position = 'absolute';
            label.style.left = startX + 'px';            // zelfde start als lijn
            label.style.top = (lane.y - 20) + 'px';      // boven lijn
            label.style.fontSize = '12px';
            label.style.fontFamily = 'monospace';        // ASCII look
            label.innerText = `*- ${p.Doopnaam} ${p.Prefix} ${p.Achternaam} ${p.Geslacht==='M'?'♂':'♀'} (${birthYear||'?'}-${deathYear||''})${p.Relatie.includes('Hoofd')?'--------------------------------------':''}`;
            container.appendChild(label);                // voeg label toe
        });
    });

    // ======================= JAAR GRID (optioneel, ASCII style) =======================
    const years = [1930,1940,1950,1960,1970,1980,1990,2000,2010,2020,2026];
    years.forEach(y=>{
        const marker = document.createElement('div');
        marker.className = 'timeline-year';
        marker.style.position = 'absolute';
        marker.style.left = yearToX(y) + 'px';
        marker.style.top = '0px';
        marker.style.fontSize = '10px';
        marker.style.fontFamily = 'monospace';
        marker.innerText = y;
        container.appendChild(marker);
    });

};
})();
