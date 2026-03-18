/* ======================= js/timeline.js v0.0.9 ======================= */
/* Timeline module met HoofdID integratie + datum fallback naar vandaag
   - LiveSearch selecteert hoofd persoon
   - Alle relaties verschijnen op de tijdlijn
   - Veilige datum parsing, lege/foute datum -> vandaag + console waarschuwing
   - Label toont ID, Roepnaam, Prefix, Achternaam en Geboortedatum
   - Jaar wordt op de balk onder de persoon getoond
*/

// ======================= DATA LADEN =======================
let peopleData = window.StamboomStorage?.get() || []; // Haal dataset direct uit storage

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

// ======================= HULP FUNCTIES =======================
function parseDateSafe(d){
    if(!d){ // check lege datum
        console.warn("Datum leeg gevonden, gebruik vandaag als fallback"); // log waarschuwing
        return new Date(); // fallback naar vandaag
    }
    const dt = new Date(d); // probeer datum te parsen
    if(isNaN(dt.getTime())){ // check foutieve datum
        console.warn(`Datum verkeerd gevonden (${d}), gebruik vandaag als fallback`);
        return new Date(); // fallback naar vandaag
    }
    return dt; // geldige datum
}

function yearToX(year, minYear, maxYear){
    const range = maxYear - minYear || 1; // vermijd deling door nul
    const x = ((year - minYear)/range)*2800 + 50; // bereken horizontale positie
    return isNaN(x) ? 50 : x; // fallback x=50 bij NaN
}

// ======================= DRAW TIMELINE =======================
function drawTimeline(rootPerson){
    if(!rootPerson) return; // stop als geen persoon

    const container = document.getElementById("timelineContainer"); // container ophalen
    if(!container){
        console.error("timelineContainer niet gevonden");
        return;
    }
    container.innerHTML = ""; // oude timeline wissen

    const svg = document.createElementNS("http://www.w3.org/2000/svg","svg"); // svg element maken
    svg.setAttribute("width","3000"); // breedte
    svg.setAttribute("height","200"); // hoogte
    container.appendChild(svg); // svg toevoegen aan DOM

    // ======================= RELATIES OPHALEN =======================
    const dataRel = window.RelatieEngine?.computeRelaties(peopleData, rootPerson.ID) || []; // relaties ophalen

    // Voeg root zelf toe aan lijst
    const timelinePersons = [rootPerson, ...dataRel];

    // ======================= JAAR RANGE =======================
    const years = timelinePersons.map(p => parseDateSafe(p.Geboortedatum).getFullYear()); // haal jaren
    const minYear = Math.min(...years); // vroegste jaar
    const maxYear = Math.max(...years); // laatste jaar

    // ======================= BASIS LIJN =======================
    const baseLine = document.createElementNS("http://www.w3.org/2000/svg","line"); // lijn element
    baseLine.setAttribute("x1","50"); // begin x
    baseLine.setAttribute("y1","100"); // begin y
    baseLine.setAttribute("x2","2850"); // einde x
    baseLine.setAttribute("y2","100"); // einde y
    baseLine.setAttribute("stroke","black"); // lijnkleur
    svg.appendChild(baseLine); // toevoegen aan svg

    // ======================= PERSONEN TEKENEN =======================
    timelinePersons.forEach(p => {
        const dt = parseDateSafe(p.Geboortedatum); // veilige datum
        const year = dt.getFullYear(); // haal jaar
        const x = yearToX(year, minYear, maxYear); // bereken horizontale positie
        const y = 100; // vaste verticale lijn

        // cirkel voor persoon
        const circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
        circle.setAttribute("cx", x); // horizontale positie
        circle.setAttribute("cy", y); // verticale positie
        circle.setAttribute("r","6"); // straal
        circle.setAttribute("fill", p.ID === rootPerson.ID ? "red" : "black"); // hoofd persoon rood
        svg.appendChild(circle); // toevoegen aan svg

        // volledige naam label inclusief ID
        const fullName = [p.ID, p.Roepnaam, p.Prefix || "", p.Achternaam].filter(Boolean).join(" ");
        const birthText = p.Geboortedatum ? `(${p.Geboortedatum})` : "(geen datum)";
        const label = document.createElementNS("http://www.w3.org/2000/svg","text");
        label.setAttribute("x", x + 8); // beetje rechts van cirkel
        label.setAttribute("y", y - 10); // iets boven cirkel
        label.setAttribute("class","timelineLabel"); // css class
        label.textContent = `${fullName} ${birthText}`; // tekst label
        svg.appendChild(label); // toevoegen aan svg

        // ======================= JAAR ONDER CIRCEL =======================
        const yearLabel = document.createElementNS("http://www.w3.org/2000/svg","text");
        yearLabel.setAttribute("x", x - 10); // iets naar links zodat het niet overlapt
        yearLabel.setAttribute("y", y + 25); // onder de lijn
        yearLabel.setAttribute("class","timelineLabel"); // css class
        yearLabel.textContent = `${year}`; // jaartal
        svg.appendChild(yearLabel); // toevoegen aan svg
    });
}

// ======================= INIT LIVESEARCH =======================
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('sandboxSearch'); // input ophalen
    if(!input){
        console.error("sandboxSearch input niet gevonden");
        return;
    }

    // init liveSearch met callback
    if(typeof initLiveSearch === "function"){
        initLiveSearch(input, peopleData, personID => {
            const person = peopleData.find(p => p.ID === personID); // zoek geselecteerde persoon
            if(person) drawTimeline(person); // teken timeline met hoofdpersoon
        });
    }

    // ======================= AUTOMATISCHE EERSTE RENDER =======================
    if(peopleData.length > 0){
        drawTimeline(peopleData[0]); // eerste persoon highlight
    }
});
