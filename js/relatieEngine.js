/* ======================= js/timeline.js v0.1.2 ======================= */
/* Uitbreiding op v0.1.1
   - Verwijdert interne relatie-opbouw
   - Verwijst nu naar RelatieEngine voor alle relaties
   - Houdt alleen drawing logica
*/

// ======================= DATA LADEN =======================
let peopleData = window.StamboomStorage?.get() || []; // Haal dataset uit storage

if(!peopleData || peopleData.length === 0){            // Fallback indien leeg
    console.warn("Dataset leeg - gebruik testdata");   // Waarschuwing
    peopleData = [                                     // Voeg testdata toe
        { ID: "1", Roepnaam: "Jan", Achternaam: "Jansen", Geboortedatum: "1950-01-01" },
        { ID: "2", Roepnaam: "Anna", Achternaam: "Jansen", Geboortedatum: "1970-06-15" },
        { ID: "3", Roepnaam: "Piet", Achternaam: "Jansen", Geboortedatum: "1975-03-20" },
        { ID: "4", Roepnaam: "Lisa", Achternaam: "Jansen", Geboortedatum: "2000-09-10" }
    ];
}

// ======================= HULP FUNCTIES =======================
function parseDateSafe(d){                              // Veilige parse van datum
    if(!d){                                              // Als datum leeg
        console.warn("Datum leeg gevonden, gebruik vandaag als fallback");
        return new Date();                               // Fallback: vandaag
    }
    const dt = new Date(d);                              // Probeer te parsen
    if(isNaN(dt.getTime())){                             // Check geldigheid
        console.warn(`Datum verkeerd (${d}), gebruik vandaag`);
        return new Date();                               // Fallback
    }
    return dt;                                          // Return geldige datum
}

function yearToX(year, minYear, maxYear){               // Zet jaar om naar X-coord
    const range = maxYear - minYear || 1;              // Vermijd deling door nul
    const x = ((year - minYear)/range)*2800 + 50;      // Schaal tussen 50 en 2850
    return isNaN(x) ? 50 : x;                          // Fallback indien NaN
}

// ======================= FAMILY BUILDER VIA RELATIEENGINE =======================
function buildFamilyViaEngine(rootPerson){             // Gebruik RelatieEngine
    if(!rootPerson || !window.RelatieEngine) return []; // Stop als geen engine
    const enriched = window.RelatieEngine.computeRelaties(peopleData, rootPerson.ID); // Bereken relaties
    return enriched;                                   // Return geënrichteerde data
}

// ======================= DRAW TIMELINE =======================
function drawTimeline(rootPerson){                     // Tekent de tijdslijn
    if(!rootPerson) return;                            // Stop bij geen root

    const container = document.getElementById("timelineContainer"); // Zoek container
    if(!container){
        console.error("timelineContainer niet gevonden");          // Foutmelding
        return;
    }
    container.innerHTML = "";                           // Leeg container

    const svg = document.createElementNS("http://www.w3.org/2000/svg","svg"); // SVG element
    svg.setAttribute("width","3000");                   // Breedte
    svg.setAttribute("height","1000");                  // Hoogte
    container.appendChild(svg);                         // Voeg toe aan DOM

    const timelinePersons = buildFamilyViaEngine(rootPerson); // Haal personen met relaties

    const years = timelinePersons.map(p => parseDateSafe(p.Geboortedatum).getFullYear()); // Alle jaren
    const minYear = Math.min(...years);                // Minimale jaar
    const maxYear = Math.max(...years);                // Maximale jaar

    const baseY = 200;                                 // Basis Y voor root persoon
    const levelHeight = 80;                             // Hoogte per level

    // ======================= BASISLIJN =======================
    const baseLine = document.createElementNS("http://www.w3.org/2000/svg","line"); // SVG lijn
    baseLine.setAttribute("x1","50"); 
    baseLine.setAttribute("y1", baseY);
    baseLine.setAttribute("x2","2850");
    baseLine.setAttribute("y2", baseY);
    baseLine.setAttribute("stroke","black");           // Kleur lijn
    svg.appendChild(baseLine);                          // Voeg toe aan SVG

    const positionMap = {};                              // Map ID -> positie voor lijnen

    // ======================= PERSONEN TEKENEN =======================
    timelinePersons.forEach(p => {
        const dt = parseDateSafe(p.Geboortedatum);      // Veilige datum
        const year = dt.getFullYear();                  // Jaar extract
        const x = yearToX(year, minYear, maxYear);     // X positie
        const y = baseY + ((p.level || 0) * levelHeight); // Y positie (level uit engine of 0)

        positionMap[p.ID] = { x, y };                  // Opslaan voor lijnen

        // ======================= CIRKEL =======================
        const circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        circle.setAttribute("r","6");
        circle.setAttribute("fill",
            p.ID === rootPerson.ID ? "red" :                                 // Root persoon rood
            (p.Relatie && p.Relatie.includes("Partner") ? "blue" :            // Partner blauw
            (p.Relatie && p.Relatie.includes("Hoofd") ? "orange" :            // Hoofd oranje
            (p.Relatie && (p.Relatie.includes("V") || p.Relatie.includes("M")) ? "green" : "black")))); // Ouders groen, anders zwart
        svg.appendChild(circle);

        // ======================= NAAM =======================
        const fullName = [p.ID, p.Roepnaam, p.Prefix || "", p.Achternaam].filter(Boolean).join(" ");
        const birthText = p.Geboortedatum ? `(${p.Geboortedatum})` : "(geen datum)";

        const label = document.createElementNS("http://www.w3.org/2000/svg","text");
        label.setAttribute("x", x + 8);
        label.setAttribute("y", y - 10);
        label.textContent = `${fullName} ${birthText}`;
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
        const parentID = p.parentID || null;             // ParentID uit engine
        if(parentID && positionMap[parentID]){           // Check parent positie
            const parent = positionMap[parentID];
            const child = positionMap[p.ID];

            const line = document.createElementNS("http://www.w3.org/2000/svg","line");
            line.setAttribute("x1", parent.x);
            line.setAttribute("y1", parent.y);
            line.setAttribute("x2", child.x);
            line.setAttribute("y2", child.y);
            line.setAttribute("stroke","gray");         // Kleur lijn
            svg.appendChild(line);
        }
    });
}

// ======================= INIT LIVESEARCH =======================
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('sandboxSearch'); // Zoek input
    if(!input){
        console.error("sandboxSearch input niet gevonden"); // Foutmelding
        return;
    }

    if(typeof initLiveSearch === "function"){                // Check live search
        initLiveSearch(input, peopleData, personID => {    // Callback bij selectie
            const person = peopleData.find(p => p.ID === personID);
            if(person) drawTimeline(person);              // Tekenen van tijdslijn
        });
    }

    if(peopleData.length > 0){                             // Init eerste persoon
        drawTimeline(peopleData[0]);
    }
});
