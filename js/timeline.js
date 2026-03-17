/* ======================= js/timeline.js v0.0.7 ======================= */
/* Timeline module met HoofdID integratie
   - LiveSearch selecteert hoofd persoon
   - Alle relaties (ouders, kinderen, partners, BZ) verschijnen op de tijdlijn
   - Veilige datum parsing + NaN fallback
   - Automatische eerste render blijft werken
*/

// ======================= DATA LADEN =======================
let peopleData = window.StamboomStorage?.get() || [];

if(!peopleData || peopleData.length === 0){
    console.warn("Dataset leeg - gebruik testdata");
    peopleData = [
        { ID: "1", Roepnaam: "Jan", Achternaam: "Jansen", Geboortedatum: "1950-01-01" },
        { ID: "2", Roepnaam: "Anna", Achternaam: "Jansen", Geboortedatum: "1970-06-15" },
        { ID: "3", Roepnaam: "Piet", Achternaam: "Jansen", Geboortedatum: "1975-03-20" },
        { ID: "4", Roepnaam: "Lisa", Achternaam: "Jansen", Geboortedatum: "2000-09-10" }
    ];
}

// ======================= HULP FUNCTIES =======================
function parseDateSafe(d){
    if(!d) return new Date("1970-01-01");
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? new Date("1970-01-01") : dt;
}

function yearToX(year, minYear, maxYear){
    const range = maxYear - minYear || 1;
    const x = ((year - minYear)/range)*2800 + 50;
    return isNaN(x) ? 50 : x;
}

// ======================= DRAW TIMELINE =======================
function drawTimeline(rootPerson){
    if(!rootPerson) return;

    const container = document.getElementById("timelineContainer");
    if(!container){
        console.error("timelineContainer niet gevonden");
        return;
    }
    container.innerHTML = ""; // oude timeline wissen

    const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.setAttribute("width","3000");
    svg.setAttribute("height","200");
    container.appendChild(svg);

    // ======================= RELATIES OPHALEN =======================
    const dataRel = window.RelatieEngine?.computeRelaties(peopleData, rootPerson.ID) || [];

    // Voeg root zelf toe aan lijst
    const timelinePersons = [rootPerson, ...dataRel];

    // ======================= JAAR RANGE =======================
    const years = timelinePersons.map(p => parseDateSafe(p.Geboortedatum).getFullYear());
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    // ======================= BASIS LIJN =======================
    const baseLine = document.createElementNS("http://www.w3.org/2000/svg","line");
    baseLine.setAttribute("x1","50");
    baseLine.setAttribute("y1","100");
    baseLine.setAttribute("x2","2850");
    baseLine.setAttribute("y2","100");
    baseLine.setAttribute("stroke","black");
    svg.appendChild(baseLine);

    // ======================= PERSONEN TEKENEN =======================
    timelinePersons.forEach(p => {
        const year = parseDateSafe(p.Geboortedatum).getFullYear();
        const x = yearToX(year, minYear, maxYear);
        const y = 100;

        const circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        circle.setAttribute("r","6");
        // highlight hoofd persoon rood
        circle.setAttribute("fill", p.ID === rootPerson.ID ? "red" : "black");
        svg.appendChild(circle);

        const fullName = [p.Roepnaam, p.Prefix || "", p.Achternaam].filter(Boolean).join(" ");
        const label = document.createElementNS("http://www.w3.org/2000/svg","text");
        label.setAttribute("x", x + 8);
        label.setAttribute("y", y - 10);
        label.setAttribute("class","timelineLabel");
        label.textContent = `${fullName} (${year})`;
        svg.appendChild(label);
    });
}

// ======================= INIT LIVESEARCH =======================
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('sandboxSearch');
    if(!input){
        console.error("sandboxSearch input niet gevonden");
        return;
    }

    if(typeof initLiveSearch === "function"){
        initLiveSearch(input, peopleData, personID => {
            const person = peopleData.find(p => p.ID === personID);
            if(person) drawTimeline(person); // teken timeline met focus op geselecteerde hoofd
        });
    }

    // ======================= AUTOMATISCHE EERSTE RENDER =======================
    if(peopleData.length > 0){
        drawTimeline(peopleData[0]); // eerste persoon highlight
    }
});
