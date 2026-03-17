/* ======================= js/timeline.js v0.1.2 ======================= */
/* Uitbreiding op v0.1.1
   - Iedereen krijgt een unieke hoogte zodat teksten niet overlappen
   - Kleine random offset per jaar toegepast
*/

// ======================= DRAW TIMELINE =======================
function drawTimeline(rootPerson){
    if(!rootPerson) return;

    const container = document.getElementById("timelineContainer");
    if(!container){
        console.error("timelineContainer niet gevonden");
        return;
    }
    container.innerHTML = "";

    const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.setAttribute("width","3000");
    svg.setAttribute("height","1200"); // extra hoogte voor meerdere offsets
    container.appendChild(svg);

    const timelinePersons = buildFamily(rootPerson);

    const years = timelinePersons.map(p => parseDateSafe(p.Geboortedatum).getFullYear());
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    const baseY = 200;
    const levelHeight = 80;

    const baseLine = document.createElementNS("http://www.w3.org/2000/svg","line");
    baseLine.setAttribute("x1","50"); 
    baseLine.setAttribute("y1", baseY);
    baseLine.setAttribute("x2","2850");
    baseLine.setAttribute("y2", baseY);
    baseLine.setAttribute("stroke","black");
    svg.appendChild(baseLine);

    const positionMap = {};

    // ======================= OFFSET MAP PER JAAR =======================
    const offsetMap = {}; // voorkomt dat personen exact dezelfde y hebben
    const offsetStep = 20; // verticale stap per persoon

    // ======================= PERSONEN TEKENEN =======================
    timelinePersons.forEach((p, index) => {
        const dt = parseDateSafe(p.Geboortedatum);
        const year = dt.getFullYear();
        const x = yearToX(year, minYear, maxYear);

        // bereken unieke y per persoon: levelHeight + extra offset
        if(!offsetMap[year]) offsetMap[year] = 0; // start bij 0 per jaar
        const y = baseY + (p.level * levelHeight) + offsetMap[year];
        offsetMap[year] += offsetStep; // volgende persoon op dit jaar hoger

        positionMap[p.ID] = { x, y };

        const circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        circle.setAttribute("r","6");
        circle.setAttribute("fill",
            p.ID === rootPerson.ID ? "red" :
            (p.role === "P" ? "blue" :
            (p.role === "O" ? "green" : "black"))); // ouders groen
        svg.appendChild(circle);

        const fullName = [p.ID, p.Roepnaam, p.Prefix || "", p.Achternaam].filter(Boolean).join(" ");
        const birthText = p.Geboortedatum ? `(${p.Geboortedatum})` : "(geen datum)";

        const label = document.createElementNS("http://www.w3.org/2000/svg","text");
        label.setAttribute("x", x + 8);
        label.setAttribute("y", y - 10);
        label.textContent = `${fullName} ${birthText}`;
        svg.appendChild(label);

        const yearLabel = document.createElementNS("http://www.w3.org/2000/svg","text");
        yearLabel.setAttribute("x", x - 10);
        yearLabel.setAttribute("y", y + 25);
        yearLabel.textContent = `${year}`;
        svg.appendChild(yearLabel);
    });

    // ======================= RELATIE LIJNEN =======================
    timelinePersons.forEach(p => {
        if(p.parentID && positionMap[p.parentID]){
            const parent = positionMap[p.parentID];
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
