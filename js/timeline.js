/* ======================= js/timeline.js v0.2.0 ======================= */
/* Volledige integratie met RelatieEngine.js
   - Maakt gebruik van computeRelaties() voor alle relaties
   - Ondersteunt overlijdensdatum
   - Inline uitleg achter elke regel
*/

// ======================= DATA LADEN =======================
let peopleData = window.StamboomStorage?.get() || []; // Haal dataset uit storage
if(!peopleData || peopleData.length === 0){           // Fallback indien leeg
    console.warn("Dataset leeg - gebruik fictieve testdata");
    peopleData = [
        { ID: "1", Roepnaam: "Jan", Achternaam: "Jansen", Geboortedatum: "1950-01-01", Overlijdensdatum: "2010-05-12" }, // overleden
        { ID: "2", Roepnaam: "Anna", Achternaam: "Jansen", Geboortedatum: "1970-06-15" },
        { ID: "3", Roepnaam: "Piet", Achternaam: "Jansen", Geboortedatum: "1975-03-20" },
        { ID: "4", Roepnaam: "Lisa", Achternaam: "Jansen", Geboortedatum: "2000-09-10", Overlijdensdatum: "2020-01-01" }  // overleden
    ];
}

// ======================= HULP FUNCTIES =======================
function parseDateSafe(d){                                 // Veilig een date object maken
    if(!d) return new Date();                               // fallback vandaag
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? new Date() : dt;          // fallback als datum onjuist
}

function yearToX(year, minYear, maxYear){                  // Converteer jaar naar X positie
    const range = maxYear - minYear || 1;
    const x = ((year - minYear)/range)*2800 + 50;
    return isNaN(x) ? 50 : x;
}

// ======================= RECURSIEVE OPBOUW =======================
function buildTimeline(rootPerson){
    if(!window.RelatieEngine){
        console.error("RelatieEngine niet geladen!");
        return [];
    }
    const timelinePersons = window.RelatieEngine.computeRelaties(peopleData, rootPerson.ID); // Gebruik relatie-engine
    return timelinePersons;                                   // Return gesorteerde lijst met Relatie & _priority
}

// ======================= TEKEN TIMELINE =======================
function drawTimeline(rootPerson){
    if(!rootPerson) return;                                  // Stop als root ontbreekt
    const container = document.getElementById("timelineContainer");
    if(!container){ console.error("timelineContainer niet gevonden"); return; }
    container.innerHTML = "";                                 // Oude inhoud verwijderen

    const svg = document.createElementNS("http://www.w3.org/2000/svg","svg"); // SVG element
    svg.setAttribute("width","3000");                         
    svg.setAttribute("height","1000");
    container.appendChild(svg);

    const timelinePersons = buildTimeline(rootPerson);        // Haal personen via relatie-engine

    const years = timelinePersons.map(p => parseDateSafe(p.Geboortedatum).getFullYear());
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    const baseY = 200;                                        // Start Y lijn
    const levelHeight = 80;                                   // Hoogte tussen levels
    const positionMap = {};                                   // Opslag posities voor lijnen

    // ======================= BASISLIJN =======================
    const baseLine = document.createElementNS("http://www.w3.org/2000/svg","line");
    baseLine.setAttribute("x1","50");
    baseLine.setAttribute("y1", baseY);
    baseLine.setAttribute("x2","2850");
    baseLine.setAttribute("y2", baseY);
    baseLine.setAttribute("stroke","black");
    svg.appendChild(baseLine);

    // ======================= PERSONEN TEKENEN =======================
    timelinePersons.forEach((p,index) => {
        const dt = parseDateSafe(p.Geboortedatum);          // Geboortedatum veilig
        const year = dt.getFullYear();
        const x = yearToX(year, minYear, maxYear);
        const level = Math.floor(p._priority);               // Gebruik _priority als level
        const y = baseY + (level * levelHeight);
        positionMap[p.ID] = { x, y };

        // ======================= CIRCLES =======================
        const circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        circle.setAttribute("r","6");
        let fillColor = "black";
        if(p.Relatie==="HoofdID") fillColor="red";
        else if(p.Relatie.startsWith("VHoofd") || p.Relatie.startsWith("MHoofd")) fillColor="green";
        else if(p.Relatie.startsWith("PHoofd")) fillColor="blue";
        if(p.Overlijdensdatum) fillColor="gray";              // grijs als overleden
        circle.setAttribute("fill", fillColor);
        svg.appendChild(circle);

        // ======================= LABEL =======================
        const fullName = [p.Roepnaam, p.Prefix || "", p.Achternaam].filter(Boolean).join(" ");
        const birthText = p.Geboortedatum ? `(${p.Geboortedatum})` : "(geen datum)";
        const deathText = p.Overlijdensdatum ? `- (${p.Overlijdensdatum})` : "";
        const label = document.createElementNS("http://www.w3.org/2000/svg","text");
        label.setAttribute("x", x + 8);
        label.setAttribute("y", y - 10);
        label.textContent = `${fullName} ${birthText} ${deathText}`;
        svg.appendChild(label);

        // ======================= JAAR =======================
        const yearLabel = document.createElementNS("http://www.w3.org/2000/svg","text");
        yearLabel.setAttribute("x", x - 10);
        yearLabel.setAttribute("y", y + 25);
        yearLabel.textContent = `${year}`;
        svg.appendChild(yearLabel);
    });

    // ======================= RELATIE LIJNEN =======================
    timelinePersons.forEach(p => {
        if(p.Relatie && p.Relatie.includes("KindID") && p.VaderID && positionMap[p.VaderID]){
            const parent = positionMap[p.VaderID];
            const child = positionMap[p.ID];
            const line = document.createElementNS("http://www.w3.org/2000/svg","line");
            line.setAttribute("x1", parent.x);
            line.setAttribute("y1", parent.y);
            line.setAttribute("x2", child.x);
            line.setAttribute("y2", child.y);
            line.setAttribute("stroke","gray");
            svg.appendChild(line);
        }
    });
}

// ======================= INIT =======================
document.addEventListener('DOMContentLoaded', () => {
    const hoofdID = window.HoofdID || (peopleData[0] && peopleData[0].ID); // Root persoon
    const rootPerson = peopleData.find(p => p.ID===hoofdID);
    if(rootPerson) drawTimeline(rootPerson);
});
