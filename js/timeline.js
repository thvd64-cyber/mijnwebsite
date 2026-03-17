/* ======================= js/timeline.js v0.1.1 ======================= */
/* Vereenvoudigde versie:
   - Alleen HoofdID + Vader + Moeder
   - Vader + Moeder komen samen in 1 knooppunt
   - Vanuit knooppunt lijn naar HoofdID
   - GEEN recursie / partners / kinderen
*/

// ======================= DATA LADEN =======================
let peopleData = window.StamboomStorage?.get() || []; // dataset ophalen

if(!peopleData || peopleData.length === 0){
    console.warn("Dataset leeg - gebruik testdata");
    peopleData = [
        { ID: "1", Roepnaam: "Jan", Achternaam: "Jansen", Geboortedatum: "1950-01-01" },
        { ID: "2", Roepnaam: "Anna", Achternaam: "Jansen", Geboortedatum: "1955-01-01" },
        { ID: "3", Roepnaam: "Piet", Achternaam: "Jansen", Geboortedatum: "1980-01-01", VaderID:"1", MoederID:"2" }
    ];
}

// ======================= HULP FUNCTIES =======================
function parseDateSafe(d){
    if(!d){
        console.warn("Datum leeg → vandaag gebruikt");
        return new Date();
    }
    const dt = new Date(d);
    if(isNaN(dt.getTime())){
        console.warn(`Foute datum (${d}) → vandaag gebruikt`);
        return new Date();
    }
    return dt;
}

function yearToX(year, minYear, maxYear){
    const range = maxYear - minYear || 1;
    return ((year - minYear)/range)*2800 + 50;
}

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
    svg.setAttribute("height","300"); // minder hoog (we hebben maar 2 levels)
    container.appendChild(svg);

    // ======================= VADER + MOEDER ZOEKEN =======================
    const vader = peopleData.find(p => p.ID === rootPerson.VaderID); // zoek vader via VaderID
    const moeder = peopleData.find(p => p.ID === rootPerson.MoederID); // zoek moeder via MoederID

    // ======================= PERSONEN SET =======================
    const persons = [rootPerson]; // start met hoofd

    if(vader) persons.push(vader); // voeg vader toe indien bestaat
    if(moeder) persons.push(moeder); // voeg moeder toe indien bestaat

    // ======================= JAAR RANGE =======================
    const years = persons.map(p => parseDateSafe(p.Geboortedatum).getFullYear());
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    const baseY = 150; // hoofd niveau
    const parentY = 50; // ouders boven

    const positionMap = {}; // opslag posities

    // ======================= PERSONEN TEKENEN =======================
    persons.forEach(p=>{
        const dt = parseDateSafe(p.Geboortedatum);
        const year = dt.getFullYear();
        const x = yearToX(year, minYear, maxYear);

        const y = (p.ID === rootPerson.ID) ? baseY : parentY; // hoofd onder, ouders boven

        positionMap[p.ID] = { x, y }; // opslaan positie

        // cirkel
        const circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        circle.setAttribute("r","6");
        circle.setAttribute("fill", p.ID === rootPerson.ID ? "red" : "black"); // hoofd rood
        svg.appendChild(circle);

        // naam label
        const fullName = [p.ID, p.Roepnaam, p.Prefix || "", p.Achternaam].filter(Boolean).join(" ");
        const label = document.createElementNS("http://www.w3.org/2000/svg","text");
        label.setAttribute("x", x + 8);
        label.setAttribute("y", y - 10);
        label.textContent = fullName;
        svg.appendChild(label);

        // jaartal
        const yearLabel = document.createElementNS("http://www.w3.org/2000/svg","text");
        yearLabel.setAttribute("x", x - 10);
        yearLabel.setAttribute("y", y + 20);
        yearLabel.textContent = year;
        svg.appendChild(yearLabel);
    });

    // ======================= KNOOPPUNT (VADER + MOEDER) =======================
    if(vader && moeder){
        const vPos = positionMap[vader.ID]; // positie vader
        const mPos = positionMap[moeder.ID]; // positie moeder
        const cPos = positionMap[rootPerson.ID]; // positie kind

        const junctionX = (vPos.x + mPos.x) / 2; // midden tussen ouders
        const junctionY = parentY + 30; // iets onder ouders

        // vader → knooppunt
        const lineV = document.createElementNS("http://www.w3.org/2000/svg","line");
        lineV.setAttribute("x1", vPos.x);
        lineV.setAttribute("y1", vPos.y);
        lineV.setAttribute("x2", junctionX);
        lineV.setAttribute("y2", junctionY);
        lineV.setAttribute("stroke","blue");
        svg.appendChild(lineV);

        // moeder → knooppunt
        const lineM = document.createElementNS("http://www.w3.org/2000/svg","line");
        lineM.setAttribute("x1", mPos.x);
        lineM.setAttribute("y1", mPos.y);
        lineM.setAttribute("x2", junctionX);
        lineM.setAttribute("y2", junctionY);
        lineM.setAttribute("stroke","blue");
        svg.appendChild(lineM);

        // knooppunt → hoofd
        const lineC = document.createElementNS("http://www.w3.org/2000/svg","line");
        lineC.setAttribute("x1", junctionX);
        lineC.setAttribute("y1", junctionY);
        lineC.setAttribute("x2", cPos.x);
        lineC.setAttribute("y2", cPos.y);
        lineC.setAttribute("stroke","blue");
        svg.appendChild(lineC);

        // optioneel: visueel knooppunt puntje
        const junctionDot = document.createElementNS("http://www.w3.org/2000/svg","circle");
        junctionDot.setAttribute("cx", junctionX);
        junctionDot.setAttribute("cy", junctionY);
        junctionDot.setAttribute("r","3");
        junctionDot.setAttribute("fill","blue");
        svg.appendChild(junctionDot);
    }
}

// ======================= INIT =======================
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('sandboxSearch');

    if(typeof initLiveSearch === "function"){
        initLiveSearch(input, peopleData, personID => {
            const person = peopleData.find(p => p.ID === personID);
            if(person) drawTimeline(person);
        });
    }

    if(peopleData.length > 0){
        drawTimeline(peopleData[0]);
    }
});
