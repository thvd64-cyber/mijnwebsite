/* ======================= js/timeline.js v0.1.3 ======================= */
/* Platte horizontale tijdlijn:
   - Meerdere personen op dezelfde lijn
   - Geen ouders, partners of kinderen
   - Namen + jaartal netjes naast hun marker
*/

// ======================= DATA LADEN =======================
let peopleData = window.StamboomStorage?.get() || []; // haal dataset uit storage
if(!peopleData || peopleData.length === 0){ // fallback als leeg
    console.warn("Dataset leeg - gebruik testdata");
    peopleData = [
        { ID: "1", Roepnaam: "Jan", Achternaam: "Jansen", Geboortedatum: "1950-01-01" },
        { ID: "2", Roepnaam: "Anna", Achternaam: "Jansen", Geboortedatum: "1970-06-15" },
        { ID: "3", Roepnaam: "Piet", Achternaam: "Jansen", Geboortedatum: "1975-03-20" },
        { ID: "4", Roepnaam: "Lisa", Achternaam: "Jansen", Geboortedatum: "2000-09-10" }
    ];
}

// ======================= HULP FUNCTIES =======================
function parseDateSafe(d){ // parse datum veilig
    if(!d) return new Date(); // fallback vandaag
    const dt = new Date(d);
    if(isNaN(dt.getTime())) return new Date(); // fallback bij fout
    return dt;
}

function yearToX(year, minYear, maxYear){ // zet jaar om naar X positie
    const range = maxYear - minYear || 1;
    return ((year - minYear)/range)*2800 + 50;
}

// ======================= DRAW TIMELINE =======================
function drawTimeline(personList){
    if(!personList || personList.length === 0) return; // stop bij lege lijst

    const container = document.getElementById("timelineContainer");
    if(!container) return; // stop als container niet bestaat
    container.innerHTML = ""; // clear container

    const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.setAttribute("width","3000"); // breedte SVG
    svg.setAttribute("height","200"); // hoogte
    container.appendChild(svg);

    // ======================= JAAR RANGE =======================
    const years = personList.map(p => parseDateSafe(p.Geboortedatum).getFullYear()); // alle jaren
    const minYear = Math.min(...years) - 5; // marge links
    const maxYear = Math.max(...years) + 5; // marge rechts

    const baseY = 100; // vaste Y positie voor lijn en personen

    // ======================= BASIS LIJN =======================
    const line = document.createElementNS("http://www.w3.org/2000/svg","line"); // basislijn
    line.setAttribute("x1","50");
    line.setAttribute("y1", baseY);
    line.setAttribute("x2","2850");
    line.setAttribute("y2", baseY);
    line.setAttribute("stroke","black");
    svg.appendChild(line);

    // ======================= POSITIES OPSLAAN =======================
    const positionMap = {}; // bewaren van x/y posities per ID

    // ======================= PERSONEN TEKENEN =======================
    personList.forEach(p => {
        const dt = parseDateSafe(p.Geboortedatum);
        const year = dt.getFullYear();
        const x = yearToX(year, minYear, maxYear); // X positie op basis van jaar
        const y = baseY; // Y is constant

        positionMap[p.ID] = { x, y }; // opslaan voor referentie

        // cirkel
        const circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        circle.setAttribute("r","6");
        circle.setAttribute("fill","red"); // alle markers rood
        svg.appendChild(circle);

        // naam label
        const fullName = [p.ID, p.Roepnaam, p.Prefix || "", p.Achternaam].filter(Boolean).join(" ");
        const label = document.createElementNS("http://www.w3.org/2000/svg","text");
        label.setAttribute("x", x + 8); // rechts van cirkel
        label.setAttribute("y", y - 10); // iets boven
        label.textContent = fullName;
        svg.appendChild(label);

        // jaartal
        const yearLabel = document.createElementNS("http://www.w3.org/2000/svg","text");
        yearLabel.setAttribute("x", x - 10); // iets links van cirkel
        yearLabel.setAttribute("y", y + 20); // onder cirkel
        yearLabel.textContent = year;
        svg.appendChild(yearLabel);
    });
}

// ======================= INIT =======================
document.addEventListener('DOMContentLoaded', () => {
    drawTimeline(peopleData); // render alle personen op lijn
});/* ======================= js/timeline.js v0.1.3 ======================= */
/* Platte horizontale tijdlijn:
   - Meerdere personen op dezelfde lijn
   - Geen ouders, partners of kinderen
   - Namen + jaartal netjes naast hun marker
*/

// ======================= DATA LADEN =======================
let peopleData = window.StamboomStorage?.get() || []; // haal dataset uit storage
if(!peopleData || peopleData.length === 0){ // fallback als leeg
    console.warn("Dataset leeg - gebruik testdata");
    peopleData = [
        { ID: "1", Roepnaam: "Jan", Achternaam: "Jansen", Geboortedatum: "1950-01-01" },
        { ID: "2", Roepnaam: "Anna", Achternaam: "Jansen", Geboortedatum: "1970-06-15" },
        { ID: "3", Roepnaam: "Piet", Achternaam: "Jansen", Geboortedatum: "1975-03-20" },
        { ID: "4", Roepnaam: "Lisa", Achternaam: "Jansen", Geboortedatum: "2000-09-10" }
    ];
}

// ======================= HULP FUNCTIES =======================
function parseDateSafe(d){ // parse datum veilig
    if(!d) return new Date(); // fallback vandaag
    const dt = new Date(d);
    if(isNaN(dt.getTime())) return new Date(); // fallback bij fout
    return dt;
}

function yearToX(year, minYear, maxYear){ // zet jaar om naar X positie
    const range = maxYear - minYear || 1;
    return ((year - minYear)/range)*2800 + 50;
}

// ======================= DRAW TIMELINE =======================
function drawTimeline(personList){
    if(!personList || personList.length === 0) return; // stop bij lege lijst

    const container = document.getElementById("timelineContainer");
    if(!container) return; // stop als container niet bestaat
    container.innerHTML = ""; // clear container

    const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.setAttribute("width","3000"); // breedte SVG
    svg.setAttribute("height","200"); // hoogte
    container.appendChild(svg);

    // ======================= JAAR RANGE =======================
    const years = personList.map(p => parseDateSafe(p.Geboortedatum).getFullYear()); // alle jaren
    const minYear = Math.min(...years) - 5; // marge links
    const maxYear = Math.max(...years) + 5; // marge rechts

    const baseY = 100; // vaste Y positie voor lijn en personen

    // ======================= BASIS LIJN =======================
    const line = document.createElementNS("http://www.w3.org/2000/svg","line"); // basislijn
    line.setAttribute("x1","50");
    line.setAttribute("y1", baseY);
    line.setAttribute("x2","2850");
    line.setAttribute("y2", baseY);
    line.setAttribute("stroke","black");
    svg.appendChild(line);

    // ======================= POSITIES OPSLAAN =======================
    const positionMap = {}; // bewaren van x/y posities per ID

    // ======================= PERSONEN TEKENEN =======================
    personList.forEach(p => {
        const dt = parseDateSafe(p.Geboortedatum);
        const year = dt.getFullYear();
        const x = yearToX(year, minYear, maxYear); // X positie op basis van jaar
        const y = baseY; // Y is constant

        positionMap[p.ID] = { x, y }; // opslaan voor referentie

        // cirkel
        const circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        circle.setAttribute("r","6");
        circle.setAttribute("fill","red"); // alle markers rood
        svg.appendChild(circle);

        // naam label
        const fullName = [p.ID, p.Roepnaam, p.Prefix || "", p.Achternaam].filter(Boolean).join(" ");
        const label = document.createElementNS("http://www.w3.org/2000/svg","text");
        label.setAttribute("x", x + 8); // rechts van cirkel
        label.setAttribute("y", y - 10); // iets boven
        label.textContent = fullName;
        svg.appendChild(label);

        // jaartal
        const yearLabel = document.createElementNS("http://www.w3.org/2000/svg","text");
        yearLabel.setAttribute("x", x - 10); // iets links van cirkel
        yearLabel.setAttribute("y", y + 20); // onder cirkel
        yearLabel.textContent = year;
        svg.appendChild(yearLabel);
    });
}

// ======================= INIT =======================
document.addEventListener('DOMContentLoaded', () => {
    drawTimeline(peopleData); // render alle personen op lijn
});/* ======================= js/timeline.js v0.1.3 ======================= */
/* Platte horizontale tijdlijn:
   - Meerdere personen op dezelfde lijn
   - Geen ouders, partners of kinderen
   - Namen + jaartal netjes naast hun marker
*/

// ======================= DATA LADEN =======================
let peopleData = window.StamboomStorage?.get() || []; // haal dataset uit storage
if(!peopleData || peopleData.length === 0){ // fallback als leeg
    console.warn("Dataset leeg - gebruik testdata");
    peopleData = [
        { ID: "1", Roepnaam: "Jan", Achternaam: "Jansen", Geboortedatum: "1950-01-01" },
        { ID: "2", Roepnaam: "Anna", Achternaam: "Jansen", Geboortedatum: "1970-06-15" },
        { ID: "3", Roepnaam: "Piet", Achternaam: "Jansen", Geboortedatum: "1975-03-20" },
        { ID: "4", Roepnaam: "Lisa", Achternaam: "Jansen", Geboortedatum: "2000-09-10" }
    ];
}

// ======================= HULP FUNCTIES =======================
function parseDateSafe(d){ // parse datum veilig
    if(!d) return new Date(); // fallback vandaag
    const dt = new Date(d);
    if(isNaN(dt.getTime())) return new Date(); // fallback bij fout
    return dt;
}

function yearToX(year, minYear, maxYear){ // zet jaar om naar X positie
    const range = maxYear - minYear || 1;
    return ((year - minYear)/range)*2800 + 50;
}

// ======================= DRAW TIMELINE =======================
function drawTimeline(personList){
    if(!personList || personList.length === 0) return; // stop bij lege lijst

    const container = document.getElementById("timelineContainer");
    if(!container) return; // stop als container niet bestaat
    container.innerHTML = ""; // clear container

    const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.setAttribute("width","3000"); // breedte SVG
    svg.setAttribute("height","200"); // hoogte
    container.appendChild(svg);

    // ======================= JAAR RANGE =======================
    const years = personList.map(p => parseDateSafe(p.Geboortedatum).getFullYear()); // alle jaren
    const minYear = Math.min(...years) - 5; // marge links
    const maxYear = Math.max(...years) + 5; // marge rechts

    const baseY = 100; // vaste Y positie voor lijn en personen

    // ======================= BASIS LIJN =======================
    const line = document.createElementNS("http://www.w3.org/2000/svg","line"); // basislijn
    line.setAttribute("x1","50");
    line.setAttribute("y1", baseY);
    line.setAttribute("x2","2850");
    line.setAttribute("y2", baseY);
    line.setAttribute("stroke","black");
    svg.appendChild(line);

    // ======================= POSITIES OPSLAAN =======================
    const positionMap = {}; // bewaren van x/y posities per ID

    // ======================= PERSONEN TEKENEN =======================
    personList.forEach(p => {
        const dt = parseDateSafe(p.Geboortedatum);
        const year = dt.getFullYear();
        const x = yearToX(year, minYear, maxYear); // X positie op basis van jaar
        const y = baseY; // Y is constant

        positionMap[p.ID] = { x, y }; // opslaan voor referentie

        // cirkel
        const circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        circle.setAttribute("r","6");
        circle.setAttribute("fill","red"); // alle markers rood
        svg.appendChild(circle);

        // naam label
        const fullName = [p.ID, p.Roepnaam, p.Prefix || "", p.Achternaam].filter(Boolean).join(" ");
        const label = document.createElementNS("http://www.w3.org/2000/svg","text");
        label.setAttribute("x", x + 8); // rechts van cirkel
        label.setAttribute("y", y - 10); // iets boven
        label.textContent = fullName;
        svg.appendChild(label);

        // jaartal
        const yearLabel = document.createElementNS("http://www.w3.org/2000/svg","text");
        yearLabel.setAttribute("x", x - 10); // iets links van cirkel
        yearLabel.setAttribute("y", y + 20); // onder cirkel
        yearLabel.textContent = year;
        svg.appendChild(yearLabel);
    });
}

// ======================= INIT =======================
document.addEventListener('DOMContentLoaded', () => {
    drawTimeline(peopleData); // render alle personen op lijn
});
