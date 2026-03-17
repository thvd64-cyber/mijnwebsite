/* ======================= js/timeline.js v0.0.6 ======================= */
/* Robuuste Timeline module voor MyFamTreeCollab
   - Werkt direct met StamboomStorage.get() voor echte data
   - Veilige datum parsing met fallback
   - LiveSearch koppeling met echte dataset
   - Automatische eerste render met highlight
   - Inline uitleg bij elke stap
*/

/* ======================= DATA LADEN ======================= */
// Haal dataset direct op uit StamboomStorage (realtime)
let peopleData = window.StamboomStorage?.get() || []; // lege array als storage nog niet beschikbaar

// Fallback testdata alleen gebruiken als storage leeg is
if(!peopleData || peopleData.length === 0){
    console.warn("Dataset leeg - gebruik testdata");
    peopleData = [
        { ID: "1", Roepnaam: "Jan", Achternaam: "Jansen", Geboortedatum: "1950-01-01" },
        { ID: "2", Roepnaam: "Anna", Achternaam: "Jansen", Geboortedatum: "1970-06-15" },
        { ID: "3", Roepnaam: "Piet", Achternaam: "Jansen", Geboortedatum: "1975-03-20" },
        { ID: "4", Roepnaam: "Lisa", Achternaam: "Jansen", Geboortedatum: "2000-09-10" }
    ];
}

/* ======================= HULP FUNCTIES ======================= */
// Veilige parsing van datum, fallback naar 1970-01-01 als invalid
function parseDateSafe(d){
    if(!d) return new Date("1970-01-01");        // lege datum fallback
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? new Date("1970-01-01") : dt; // fallback bij NaN
}

/* ======================= DRAW TIMELINE ======================= */
function drawTimeline(data, focusPerson){
    if(!data || data.length === 0) return; // stop als geen data

    const container = document.getElementById("timelineContainer"); // svg container
    if(!container) {
        console.error("timelineContainer niet gevonden");
        return;
    }

    container.innerHTML = ""; // oude timeline wissen

    // ======================= SVG ELEMENT =======================
    const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.setAttribute("width","3000");  // horizontaal scrollbare breedte
    svg.setAttribute("height","200");  // vaste hoogte
    container.appendChild(svg);

    // ======================= JAAR RANGE =======================
    const years = data.map(p => parseDateSafe(p.Geboortedatum).getFullYear()); // alle geboortejaren
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    // Veilig voorkomen dat max == min (single persoon)
    const yearRange = (maxYear - minYear) || 1; // geen deling door nul

    // ======================= JAAR -> X COORDINAAT =======================
    function yearToX(year){
        const x = ((year - minYear)/yearRange)*2800 + 50; // omzetting naar pixel
        return isNaN(x) ? 50 : x; // fallback bij NaN
    }

    // ======================= BASISLIJN =======================
    const baseLine = document.createElementNS("http://www.w3.org/2000/svg","line");
    baseLine.setAttribute("x1","50");
    baseLine.setAttribute("y1","100");
    baseLine.setAttribute("x2","2850");
    baseLine.setAttribute("y2","100");
    baseLine.setAttribute("stroke","black");
    svg.appendChild(baseLine);

    // ======================= PERSONEN TEKENEN =======================
    data.forEach(p => {
        const year = parseDateSafe(p.Geboortedatum).getFullYear();
        const x = yearToX(year);
        const y = 100; // vaste y

        // Cirkel
        const circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        circle.setAttribute("r","6");
        circle.setAttribute("fill", p.ID === focusPerson?.ID ? "red" : "black");
        svg.appendChild(circle);

        // Label
        const fullName = [p.Roepnaam, p.Prefix || "", p.Achternaam].filter(Boolean).join(" ");
        const label = document.createElementNS("http://www.w3.org/2000/svg","text");
        label.setAttribute("x", x + 8);
        label.setAttribute("y", y - 10);
        label.setAttribute("class","timelineLabel");
        label.textContent = `${fullName} (${year})`;
        svg.appendChild(label);
    });
}

/* ======================= INIT LIVESEARCH + AUTOMATISCHE RENDER ======================= */
document.addEventListener('DOMContentLoaded', () => {

    // Input veld ophalen
    const input = document.getElementById('sandboxSearch');
    if(!input){
        console.error("sandboxSearch input niet gevonden");
        return;
    }

    // LiveSearch initialiseren
    if(typeof initLiveSearch === "function"){
        initLiveSearch(input, peopleData, personID => {
            const person = peopleData.find(p => p.ID === personID);
            if(person) drawTimeline(peopleData, person); // highlight geselecteerde persoon
        });
    }

    // Automatische eerste render met eerste persoon in dataset
    if(peopleData.length > 0){
        drawTimeline(peopleData, peopleData[0]);
    }
});
