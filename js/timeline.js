/* ======================= js/timeline.js v0.0.4 ======================= */
/* Robuuste Timeline module voor MyFamTreeCollab
   - Volledig losgekoppeld van HTML (alle init hier)
   - Werkt met sandboxSearch (geen HTML wijziging nodig)
   - Veilige datum parsing + fallback handling
   - Automatische eerste render
   - Highlight focus persoon in rood
*/

/* ======================= DATA LADEN + FALLBACK ======================= */
let peopleData = []; // globale dataset initialiseren

// Probeer echte dataset op te halen via schema/storage
if(typeof getPeopleData === "function"){
    peopleData = getPeopleData();
}

// Fallback testdata als storage leeg of niet beschikbaar
if(!peopleData || peopleData.length === 0){
    console.warn("Dataset leeg - gebruik testdata");
    peopleData = [
        { ID: "1", Roepnaam: "Jan", Achternaam: "Jansen", Geboortedatum: "1950-01-01" },
        { ID: "2", Roepnaam: "Anna", Achternaam: "Jansen", Geboortedatum: "1970-06-15" },
        { ID: "3", Roepnaam: "Piet", Achternaam: "Jansen", Geboortedatum: "1975-03-20" },
        { ID: "4", Roepnaam: "Lisa", Achternaam: "Jansen", Geboortedatum: "2000-09-10" }
    ];
}

/* ======================= INIT TIMELINE + LIVESEARCH ======================= */
document.addEventListener('DOMContentLoaded', () => {

    // ======================= INPUT OPHALEN =======================
    const input = document.getElementById('sandboxSearch'); // juiste ID
    if(!input){
        console.error("Input veld 'sandboxSearch' niet gevonden");
        return; // stop als input ontbreekt
    }

    // ======================= LIVESEARCH INITIALISEREN =======================
    if(typeof initLiveSearch === "function") {
        initLiveSearch(input, peopleData, personID => {
            const person = peopleData.find(p => p.ID === personID); // focus persoon zoeken
            if(person) drawTimeline(peopleData, person);           // timeline renderen met highlight
        });
    }

    // ======================= AUTOMATISCHE EERSTE RENDER =======================
    if(peopleData.length > 0){
        drawTimeline(peopleData, peopleData[0]); // eerste persoon highlight
    }
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
    if(!container){
        console.error("Timeline container niet gevonden");
        return;
    }
    container.innerHTML = ""; // oude timeline verwijderen

    // ======================= SVG CANVAS =======================
    const svg = document.createElementNS("http://www.w3.org/2000/svg","svg"); // svg element maken
    svg.setAttribute("width","3000"); // breed canvas voor grote datasets
    svg.setAttribute("height","200"); // hoogte canvas
    container.appendChild(svg); // voeg svg toe aan DOM

    // ======================= JAAR RANGE BEREKENEN =======================
    const years = data.map(p => {
        const d = new Date(p.Geboortedatum);
        return isNaN(d.getFullYear()) ? 2000 : d.getFullYear(); // veilige parsing + fallback
    });
    const minYear = Math.min(...years); // oudste jaar
    const maxYear = Math.max(...years); // jongste jaar
    const range = maxYear - minYear || 1; // edge case: alle personen hetzelfde jaar

    // ======================= JAAR NAAR PIXEL FUNCTIE =======================
    function yearToX(year){
        return ((year - minYear) / range) * 2800 + 50; // omzetting naar x-coordinaat
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

        // Veilige datum parsing
        const d = new Date(p.Geboortedatum);
        const year = isNaN(d.getFullYear()) ? 2000 : d.getFullYear(); // fallback naar 2000
        const x = yearToX(year); // x positie
        const y = 100;           // vaste y-positie

        // ======================= CIRKEL PUNT =======================
        const circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
        circle.setAttribute("cx", x); // horizontale positie
        circle.setAttribute("cy", y); // verticale positie
        circle.setAttribute("r", "6");  // radius
        circle.setAttribute("fill", (focusPerson && p.ID === focusPerson.ID) ? "red" : "black"); // highlight focus
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
