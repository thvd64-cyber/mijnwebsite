/* ======================= js/timeline.js v1.0.0 ======================= */
/* Robuuste Timeline module voor MyFamTreeCollab
   - Volledig losgekoppeld van HTML (alle init hier)
   - Werkt met sandboxSearch (geen HTML wijziging nodig)
   - Veilige datum parsing + fallback handling
   - Automatische eerste render
*/

/* ======================= INIT TIMELINE + LIVESEARCH ======================= */
document.addEventListener('DOMContentLoaded', () => {

    // ======================= DATA LADEN =======================
    let peopleData = []; // lege array initialiseren
    if(typeof getPeopleData === "function"){
        peopleData = getPeopleData(); // dataset ophalen uit storage
    } else {
        console.warn("getPeopleData() niet gevonden");
    }

    if(!peopleData || peopleData.length === 0){
        console.warn("Dataset leeg - geen timeline mogelijk");
        return; // stop verdere uitvoering
    }

    // ======================= INPUT OPHALEN =======================
    const input = document.getElementById('sandboxSearch'); // 🔥 juiste ID

    if(!input){
        console.error("Input veld 'sandboxSearch' niet gevonden");
        return; // stop als input ontbreekt
    }

    // ======================= LIVESEARCH INITIALISEREN =======================
    if(typeof initLiveSearch === "function"){
        initLiveSearch(input, peopleData, personID => {

            const person = peopleData.find(p => p.ID === personID); // geselecteerde persoon zoeken

            if(person){
                drawTimeline(peopleData, person); // timeline opnieuw tekenen met focus
            }

        });
    } else {
        console.warn("initLiveSearch() niet gevonden");
    }

    // ======================= INITIËLE TIMELINE =======================
    drawTimeline(peopleData, peopleData[0]); // eerste persoon als default
});


/* ======================= DRAW TIMELINE ======================= */
/**
 * Tekent de gehele tijdlijn
 * @param {Array} data - dataset met personen
 * @param {Object} focusPerson - geselecteerde persoon
 */
function drawTimeline(data, focusPerson){

    if(!data || data.length === 0) return; // stop als geen data

    // ======================= CONTAINER =======================
    const container = document.getElementById("timelineContainer"); // container ophalen
    if(!container) return; // extra veiligheid

    container.innerHTML = ""; // oude inhoud verwijderen

    // ======================= SVG =======================
    const svg = document.createElementNS("http://www.w3.org/2000/svg","svg"); // svg element maken
    svg.setAttribute("width","3000"); // vaste breedte
    svg.setAttribute("height","200"); // vaste hoogte
    container.appendChild(svg); // toevoegen aan DOM

    // ======================= JAAR DATA FILTER =======================
    const validPeople = data.filter(p => {
        const d = new Date(p.Geboortedatum); // datum object maken
        return !isNaN(d); // alleen geldige datums
    });

    if(validPeople.length === 0){
        console.warn("Geen geldige geboortedata");
        return;
    }

    // ======================= JAAR RANGE =======================
    const years = validPeople.map(p => new Date(p.Geboortedatum).getFullYear()); // jaren ophalen
    const minYear = Math.min(...years); // minimum jaar
    const maxYear = Math.max(...years); // maximum jaar

    const yearRange = (maxYear - minYear) || 1; // 🔥 voorkomt divide-by-zero

    // ======================= JAAR → X POSITIE =======================
    function yearToX(year){
        return ((year - minYear) / yearRange) * 2800 + 50; // schaal + marge
    }

    // ======================= BASIS LIJN =======================
    const baseLine = document.createElementNS("http://www.w3.org/2000/svg","line"); // lijn maken
    baseLine.setAttribute("x1","50");  // start x
    baseLine.setAttribute("y1","100"); // start y
    baseLine.setAttribute("x2","2850"); // eind x
    baseLine.setAttribute("y2","100");  // eind y
    baseLine.setAttribute("stroke","black"); // kleur
    svg.appendChild(baseLine); // toevoegen

    // ======================= PERSONEN =======================
    validPeople.forEach(p => {

        const date = new Date(p.Geboortedatum); // datum object
        const year = date.getFullYear(); // jaar extraheren
        const x = yearToX(year); // bereken x
        const y = 100; // vaste lijn

        // ======================= PUNT =======================
        const circle = document.createElementNS("http://www.w3.org/2000/svg","circle"); // cirkel
        circle.setAttribute("cx", x); // x positie
        circle.setAttribute("cy", y); // y positie
        circle.setAttribute("r", "6"); // grootte
        circle.setAttribute("fill", p.ID === focusPerson?.ID ? "red" : "black"); // highlight
        svg.appendChild(circle); // toevoegen

        // ======================= LABEL =======================
        const name = `${p.Roepnaam} ${p.Prefix || ""} ${p.Achternaam}`.trim(); // naam samenstellen

        const label = document.createElementNS("http://www.w3.org/2000/svg","text"); // tekst element
        label.setAttribute("x", x + 8); // rechts van punt
        label.setAttribute("y", y - 10); // boven punt
        label.setAttribute("class","timelineLabel"); // css class
        label.textContent = `${name} (${year})`; // tekst
        svg.appendChild(label); // toevoegen

    });

}
