/* ======================= js/timeline.js v0.0.8 ======================= */
/* Timeline module met HoofdID integratie
   - LiveSearch selecteert hoofd persoon
   - Alle relaties (ouders, kinderen, partners, BZ) verschijnen op de tijdlijn
   - Veilige datum parsing + NaN fallback (vandaag)
   - Automatische eerste render blijft werken
*/

// ======================= DATA LADEN =======================
let peopleData = window.StamboomStorage?.get() || []; // dataset ophalen uit StamboomStorage

if(!peopleData || peopleData.length === 0){ // check of dataset leeg is
    console.warn("Dataset leeg - gebruik testdata"); // waarschuwing
    peopleData = [ // fallback testdata
        { ID: "1", Roepnaam: "Jan", Achternaam: "Jansen", Geboortedatum: "1950-01-01" },
        { ID: "2", Roepnaam: "Anna", Achternaam: "Jansen", Geboortedatum: "1970-06-15" },
        { ID: "3", Roepnaam: "Piet", Achternaam: "Jansen", Geboortedatum: "1975-03-20" },
        { ID: "4", Roepnaam: "Lisa", Achternaam: "Jansen", Geboortedatum: "2000-09-10" }
    ];
}

// ======================= HULP FUNCTIES =======================
// Controleer datum veilig, fallback = vandaag
function checkDate(d, personName){
    const today = new Date();                    // fallback datum = vandaag
    if(!d){                                     // check of datum leeg is
        console.warn(`Geen datum bekend voor ${personName}`); // console melding
        return today;                            // fallback gebruiken
    }
    const dt = new Date(d);                      // probeer datum te parsen
    if(isNaN(dt.getTime())){                     // check of datum ongeldig is
        console.warn(`Verkeerde datum voor ${personName}: "${d}"`); // console melding
        return today;                            // fallback gebruiken
    }
    return dt;                                   // geldige datum teruggeven
}

// Bereken x-coord op basis van jaar en range
function yearToX(year, minYear, maxYear){
    const range = maxYear - minYear || 1;       // vermijd deling door nul
    const x = ((year - minYear)/range)*2800 + 50; // schaal naar SVG breedte
    return isNaN(x) ? 50 : x;                   // fallback x = 50
}

// ======================= DRAW TIMELINE =======================
function drawTimeline(rootPerson){
    if(!rootPerson) return;                      // check root persoon

    const container = document.getElementById("timelineContainer"); // timeline container
    if(!container){
        console.error("timelineContainer niet gevonden");          // foutmelding
        return;
    }
    container.innerHTML = "";                    // oude timeline wissen

    const svg = document.createElementNS("http://www.w3.org/2000/svg","svg"); // svg element
    svg.setAttribute("width","3000");           // breedte
    svg.setAttribute("height","200");           // hoogte
    container.appendChild(svg);                 // voeg toe aan container

    // ======================= RELATIES OPHALEN =======================
    const dataRel = window.RelatieEngine?.computeRelaties(peopleData, rootPerson.ID) || []; // relaties

    const timelinePersons = [rootPerson, ...dataRel]; // root + relaties

    // ======================= JAAR RANGE =======================
    const years = timelinePersons.map(p => checkDate(p.Geboortedatum, p.Roepnaam).getFullYear()); // veilige datum
    const minYear = Math.min(...years);            // oudste jaar
    const maxYear = Math.max(...years);            // jongste jaar

    // ======================= BASIS LIJN =======================
    const baseLine = document.createElementNS("http://www.w3.org/2000/svg","line"); // basislijn SVG
    baseLine.setAttribute("x1","50");            // start x
    baseLine.setAttribute("y1","100");           // start y
    baseLine.setAttribute("x2","2850");          // einde x
    baseLine.setAttribute("y2","100");           // einde y
    baseLine.setAttribute("stroke","black");     // lijnkleur
    svg.appendChild(baseLine);                   // voeg toe aan svg

    // ======================= PERSONEN TEKENEN =======================
    timelinePersons.forEach(p => {
        const date = checkDate(p.Geboortedatum, p.Roepnaam); // veilige datum
        const year = date.getFullYear();                       // jaar voor x-coord
        const x = yearToX(year, minYear, maxYear);             // bereken x
        const y = 100;                                         // vaste y

        const circle = document.createElementNS("http://www.w3.org/2000/svg","circle"); // persoon
        circle.setAttribute("cx", x);                            // x-coord
        circle.setAttribute("cy", y);                            // y-coord
        circle.setAttribute("r","6");                             // radius
        circle.setAttribute("fill", p.ID === rootPerson.ID ? "red" : "black"); // highlight root
        svg.appendChild(circle);                                   // voeg toe aan svg

        const fullName = [p.Roepnaam, p.Prefix || "", p.Achternaam].filter(Boolean).join(" "); // volledige naam
        const label = document.createElementNS("http://www.w3.org/2000/svg","text");           // label
        label.setAttribute("x", x + 8);            // positie x label
        label.setAttribute("y", y - 10);           // positie y label
        label.setAttribute("class","timelineLabel"); // css class
        label.textContent = `${fullName} (${year})`; // tekst label
        svg.appendChild(label);                     // voeg toe aan svg
    });
}

// ======================= INIT LIVESEARCH =======================
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('sandboxSearch'); // zoekveld
    if(!input){
        console.error("sandboxSearch input niet gevonden"); // foutmelding
        return;
    }

    if(typeof initLiveSearch === "function"){ // check of LiveSearch aanwezig
        initLiveSearch(input, peopleData, personID => {
            const person = peopleData.find(p => p.ID === personID); // zoek persoon
            if(person) drawTimeline(person);                        // teken timeline
        });
    }

    // ======================= AUTOMATISCHE EERSTE RENDER =======================
    if(peopleData.length > 0){
        drawTimeline(peopleData[0]); // eerste persoon highlight
    }
});
