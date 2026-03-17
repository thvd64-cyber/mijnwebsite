/* ======================= js/timeline.js v0.0.5 ======================= */
/* Robuuste Timeline module voor MyFamTreeCollab
   - Volledig losgekoppeld van HTML (sandboxSearch ID blijft)
   - Veilige datum parsing + fallback handling
   - LiveSearch koppeling met HoofdID + relaties
   - Automatische eerste render
*/

// ======================= DATA LADEN + FALLBACK =======================
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

// ======================= DATUM HELPER =======================
function parseYear(d){
    if(!d) return new Date(0);
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? new Date(0) : dt;
}

// ======================= TEKEN TIMELINE =======================
/**
 * Tekent de gehele tijdlijn voor een dataset
 * @param {Array} data - array van personen (HoofdID + relaties)
 * @param {Object} focusPerson - persoon die gehighlight wordt
 */
function drawTimeline(data, focusPerson){
    if(!data || data.length === 0) return;

    // ======================= CONTAINER OPSLAAN =======================
    const container = document.getElementById("timelineContainer");
    if(!container){
        console.error("timelineContainer niet gevonden");
        return;
    }
    container.innerHTML = ""; // oude timeline verwijderen

    // ======================= SVG CANVAS =======================
    const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.setAttribute("width","3000"); // breed canvas voor grote datasets
    svg.setAttribute("height","200"); // hoogte canvas
    container.appendChild(svg);

    // ======================= JAAR RANGE =======================
    const years = data.map(p => parseYear(p.Geboortedatum).getFullYear());
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    function yearToX(year){
        return ((year - minYear)/(maxYear - minYear))*2800 + 50;
    }

    // ======================= BASIS LIJN =======================
    const baseLine = document.createElementNS("http://www.w3.org/2000/svg","line");
    baseLine.setAttribute("x1","50");
    baseLine.setAttribute("y1","100");
    baseLine.setAttribute("x2","2850");
    baseLine.setAttribute("y2","100");
    baseLine.setAttribute("stroke","black");
    svg.appendChild(baseLine);

    // ======================= PERSONEN TEKENEN =======================
    data.forEach(p => {
        const year = parseYear(p.Geboortedatum).getFullYear();
        const x = yearToX(year);
        const y = 100;

        // CIRKEL PUNT
        const circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
        circle.setAttribute("cx",x);
        circle.setAttribute("cy",y);
        circle.setAttribute("r","6");
        circle.setAttribute("fill", p.ID === focusPerson.ID ? "red" : "black");
        svg.appendChild(circle);

        // NAAM LABEL
        const name = `${p.Roepnaam} ${p.Prefix || ""} ${p.Achternaam}`;
        const label = document.createElementNS("http://www.w3.org/2000/svg","text");
        label.setAttribute("x", x+8);
        label.setAttribute("y", y-10);
        label.setAttribute("class","timelineLabel");
        label.textContent = `${name} (${year})`;
        svg.appendChild(label);
    });
}

// ======================= INIT TIMELINE + LIVESEARCH =======================
document.addEventListener('DOMContentLoaded', () => {

    // ======================= INPUT OPHALEN =======================
    const input = document.getElementById('sandboxSearch'); // juiste ID
    if(!input){
        console.error("Input veld 'sandboxSearch' niet gevonden");
        return;
    }

    // ======================= LIVESEARCH INITIALISEREN =======================
    if(typeof initLiveSearch === "function"){
        initLiveSearch(input, peopleData, personID => {

            // Zoek geselecteerde HoofdID
            const person = peopleData.find(p => p.ID === personID);
            if(!person) return;

            // Relaties ophalen via RelatieEngine
            let timelineData = [person]; // start met focus persoon
            if(window.RelatieEngine && typeof window.RelatieEngine.computeRelaties === "function"){
                const rel = window.RelatieEngine.computeRelaties(peopleData, person.ID);
                timelineData = [person, ...rel];
            }

            // Timeline renderen
            drawTimeline(timelineData, person);
        });
    }

    // ======================= AUTOMATISCHE EERSTE RENDER =======================
    if(peopleData.length > 0){
        let firstPerson = peopleData[0];
        let initialData = [firstPerson];
        if(window.RelatieEngine && typeof window.RelatieEngine.computeRelaties === "function"){
            const rel = window.RelatieEngine.computeRelaties(peopleData, firstPerson.ID);
            initialData = [firstPerson, ...rel];
        }
        drawTimeline(initialData, firstPerson);
    }
});
