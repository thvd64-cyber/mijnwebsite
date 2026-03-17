/* ======================= js/timeline.js v0.0.8 ======================= */
/* Timeline module met HoofdID integratie
   - LiveSearch selecteert hoofd persoon
   - Alle relaties (ouders, kinderen, partners, BZ) verschijnen op de tijdlijn
   - Veilige datum parsing + NaN fallback
   - Automatische eerste render blijft werken
*/

// ======================= DATA LADEN =======================
// Probeer dataset direct uit StamboomStorage te laden
let peopleData = window.StamboomStorage?.get() || [];

// Fallback testdata als storage leeg is
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
// Veilige datum parsing: retourneer fallback datum als invalid
function parseDateSafe(d){
    if(!d) return new Date("1970-01-01");                 // fallback bij null/undefined
    const dt = new Date(d);                               // maak Date object
    return isNaN(dt.getTime()) ? new Date("1970-01-01") : dt; // fallback bij NaN
}

// Bereken x-coordinaat op basis van geboortejaar
function yearToX(year, minYear, maxYear){
    const range = maxYear - minYear || 1;                // vermijd deling door nul
    const x = ((year - minYear)/range)*2800 + 50;        // lineaire omzetting naar pixels
    return isNaN(x) ? 50 : x;                            // fallback x bij NaN
}

// ======================= DRAW TIMELINE =======================
function drawTimeline(rootPerson){
    if(!rootPerson) return;                               // stop als geen root

    const container = document.getElementById("timelineContainer");
    if(!container){
        console.error("timelineContainer niet gevonden");
        return;
    }
    container.innerHTML = "";                              // oude timeline wissen

    // Maak SVG canvas
    const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.setAttribute("width","3000");                     // breed canvas
    svg.setAttribute("height","200");                     // vaste hoogte
    container.appendChild(svg);                           

    // ======================= RELATIES OPHALEN =======================
    // gebruik RelatieEngine om alle relaties t.o.v. rootPerson te berekenen
    const dataRel = window.RelatieEngine?.computeRelaties(peopleData, rootPerson.ID) || [];

    // Voeg root zelf toe aan timelinePersons array
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
        const year = parseDateSafe(p.Geboortedatum).getFullYear(); // veilige geboortejaar
        const x = yearToX(year, minYear, maxYear);                  // bereken x
        const y = 100;                                              // vaste y-positie

        // cirkel voor persoon
        const circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
        circle.setAttribute("cx", x);                                
        circle.setAttribute("cy", y);
        circle.setAttribute("r","6");                                
        circle.setAttribute("fill", p.ID === rootPerson.ID ? "red" : "black"); // highlight root
        svg.appendChild(circle);

        // label met naam en jaar
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

    // LiveSearch initialiseren met callback die root persoon update
    if(typeof initLiveSearch === "function"){
        row.addEventListener('click', ()=>{
    renderCallback(p); // p is het volledige persoon-object
    popup.remove();
});
    }

    // ======================= AUTOMATISCHE EERSTE RENDER =======================
    if(peopleData.length > 0){
        drawTimeline(peopleData[0]); // eerste persoon highlight
    }
});
