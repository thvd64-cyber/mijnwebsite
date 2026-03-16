/* ======================= js.timeline.js v0.0.3 ======================= */
/* Universele Timeline module voor MyFamTreeCollab
   - Werkt met LiveSearch popup (zelfde module als view/manage)
   - Tekent alle personen horizontaal op basis van geboortedatum
   - Highlight focus persoon in rood
*/

/* ======================= INIT TIMELINE + LIVESEARCH ======================= */
document.addEventListener('DOMContentLoaded', () => {

    // ======================= DATA LADEN =======================
    let peopleData = [];
    if(typeof getPeopleData === "function"){
        peopleData = getPeopleData(); // haal echte dataset uit schema.js/storage.js
    } else {
        console.warn("getPeopleData() niet gevonden, controleer schema.js/storage.js");
    }

    // ======================= LIVESEARCH INITIALISEREN =======================
    const input = document.getElementById('liveSearchInput'); // input veld ophalen
    initLiveSearch(input, peopleData, personID => {          // initLiveSearch uit LiveSearch.js
        const person = peopleData.find(p => p.ID === personID); // focus persoon vinden
        if(person) drawTimeline(peopleData, person);           // timeline tekenen met highlight
    });
});

/* ======================= DRAW TIMELINE ======================= */
/**
 * Tekent de gehele tijdlijn voor een dataset
 * @param {Array} data - array van personen
 * @param {Object} focusPerson - persoon die gehighlight wordt
 */
function drawTimeline(data, focusPerson){

    if(!data || data.length === 0) return; // stop als dataset leeg is

    // ======================= CONTAINER OPSLAAN =======================
    const container = document.getElementById("timelineContainer");
    container.innerHTML = ""; // oude timeline verwijderen

    // ======================= SVG CANVAS =======================
    const svg = document.createElementNS("http://www.w3.org/2000/svg","svg"); // svg element maken
    svg.setAttribute("width","3000"); // breed canvas voor grote datasets
    svg.setAttribute("height","200"); // hoogte canvas
    container.appendChild(svg); // voeg svg toe aan DOM

    // ======================= JAAR RANGE BEREKENEN =======================
    const years = data.map(p => new Date(p.Geboortedatum).getFullYear()); // alle geboortejaren
    const minYear = Math.min(...years); // oudste jaar
    const maxYear = Math.max(...years); // jongste jaar

    // ======================= JAAR NAAR PIXEL FUNCTIE =======================
    function yearToX(year){
        return ((year - minYear) / (maxYear - minYear)) * 2800 + 50; // omzetting naar x-coordinaat
    }

    // ======================= BASIS LIJN =======================
    const baseLine = document.createElementNS("http://www.w3.org/2000/svg","line");
    baseLine.setAttribute("x1","50");  // beginpunt x
    baseLine.setAttribute("y1","100"); // beginpunt y
    baseLine.setAttribute("x2","2850"); // eindpunt x
    baseLine.setAttribute("y2","100");  // eindpunt y
    baseLine.setAttribute("stroke","black"); // lijnkleur zwart
    svg.appendChild(baseLine); // lijn toevoegen aan svg

    // ======================= PERSONEN TEKENEN =======================
    data.forEach(p => {

        const year = new Date(p.Geboortedatum).getFullYear(); // geboortejaar
        const x = yearToX(year); // x positie
        const y = 100; // vaste y-positie

        // ======================= CIRKEL PUNT =======================
        const circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
        circle.setAttribute("cx", x); // horizontale positie
        circle.setAttribute("cy", y); // verticale positie
        circle.setAttribute("r", "6");  // radius
        circle.setAttribute("fill", p.ID === focusPerson.ID ? "red" : "black"); // focus highlight
        svg.appendChild(circle); // voeg punt toe

        // ======================= NAAM LABEL =======================
        const name = `${p.Roepnaam} ${p.Prefix || ""} ${p.Achternaam}`; // volledige naam
        const label = document.createElementNS("http://www.w3.org/2000/svg","text");
        label.setAttribute("x", x + 8);  // iets rechts van cirkel
        label.setAttribute("y", y - 10); // iets boven cirkel
        label.setAttribute("class","timelineLabel"); // CSS class
        label.textContent = `${name} (${year})`; // label tekst
        svg.appendChild(label); // label toevoegen
    });

}
