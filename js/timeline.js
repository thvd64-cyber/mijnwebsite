/* ======================= js/timeline.js v0.1.0 ======================= */
/* Uitbreiding op v0.0.9
   - Recursieve familie-opbouw (stamlijn + partners + kinderen)
   - Levels (Y-as) per generatie
   - SVG lijnen voor relaties (partner + ouder-kind)
   - Loop protectie via visited set
*/

// ======================= DATA LADEN =======================
let peopleData = window.StamboomStorage?.get() || []; // Haal dataset uit storage

if(!peopleData || peopleData.length === 0){ // fallback indien leeg
    console.warn("Dataset leeg - gebruik testdata"); // waarschuwing
    peopleData = [
        { ID: "1", Roepnaam: "Jan", Achternaam: "Jansen", Geboortedatum: "1950-01-01" },
        { ID: "2", Roepnaam: "Anna", Achternaam: "Jansen", Geboortedatum: "1970-06-15" },
        { ID: "3", Roepnaam: "Piet", Achternaam: "Jansen", Geboortedatum: "1975-03-20" },
        { ID: "4", Roepnaam: "Lisa", Achternaam: "Jansen", Geboortedatum: "2000-09-10" }
    ];
}

// ======================= HULP FUNCTIES =======================
function parseDateSafe(d){
    if(!d){ // lege datum
        console.warn("Datum leeg gevonden, gebruik vandaag als fallback"); // melding
        return new Date(); // vandaag
    }
    const dt = new Date(d); // parse datum
    if(isNaN(dt.getTime())){ // foutieve datum
        console.warn(`Datum verkeerd (${d}), gebruik vandaag`); // melding
        return new Date(); // fallback
    }
    return dt; // geldige datum
}

function yearToX(year, minYear, maxYear){
    const range = maxYear - minYear || 1; // voorkom delen door 0
    const x = ((year - minYear)/range)*2800 + 50; // schaal naar SVG
    return isNaN(x) ? 50 : x; // fallback
}

// ======================= RELATIE ZOEK FUNCTIES =======================

// Zoek partners via PHoofdID / PKPartnerID
function getPartners(person){
    return peopleData.filter(p =>
        p.PHoofdID === person.ID || p.PKPartnerID === person.ID // partner connecties
    );
}

// Zoek kinderen via VaderID / MoederID
function getChildren(person, partner){
    return peopleData.filter(p =>
        p.VaderID === person.ID || p.MoederID === person.ID || // kind van persoon
        (partner && (p.VaderID === partner.ID || p.MoederID === partner.ID)) // kind via partner
    );
}

// ======================= RECURSIEVE OPBOUW =======================
function buildFamily(rootPerson){
    const result = []; // lijst met personen + metadata
    const visited = new Set(); // voorkomt loops

    function traverse(person, level = 0){
        if(!person || visited.has(person.ID)) return; // stop bij null of herhaling
        visited.add(person.ID); // markeer als bezocht

        result.push({ ...person, level: level, role: "S" }); // voeg stam persoon toe

        const partners = getPartners(person); // zoek partners

        partners.forEach(partner => {
            if(!visited.has(partner.ID)){
                result.push({ ...partner, level: level, role: "P", parentID: person.ID }); // partner zelfde level
            }

            const children = getChildren(person, partner); // zoek kinderen

            children.forEach(child => {
                if(!visited.has(child.ID)){
                    result.push({ ...child, level: level + 1, role: "S", parentID: person.ID }); // kind 1 level lager
                }
                traverse(child, level + 1); // recursief verder
            });
        });
    }

    traverse(rootPerson, 0); // start bij root
    return result; // volledige familie boom
}

// ======================= DRAW TIMELINE =======================
function drawTimeline(rootPerson){
    if(!rootPerson) return; // stop als geen persoon

    const container = document.getElementById("timelineContainer"); // container
    if(!container){
        console.error("timelineContainer niet gevonden");
        return;
    }
    container.innerHTML = ""; // reset

    const svg = document.createElementNS("http://www.w3.org/2000/svg","svg"); // svg
    svg.setAttribute("width","3000"); // breedte
    svg.setAttribute("height","800"); // hoger voor meerdere levels
    container.appendChild(svg); // toevoegen

    // ======================= NIEUW: RECURSIEVE DATA =======================
    const timelinePersons = buildFamily(rootPerson); // volledige familie structuur

    // ======================= JAAR RANGE =======================
    const years = timelinePersons.map(p => parseDateSafe(p.Geboortedatum).getFullYear()); // alle jaren
    const minYear = Math.min(...years); // min
    const maxYear = Math.max(...years); // max

    const baseY = 100; // startlijn
    const levelHeight = 80; // afstand per generatie

    // ======================= BASIS LIJN =======================
    const baseLine = document.createElementNS("http://www.w3.org/2000/svg","line"); // lijn
    baseLine.setAttribute("x1","50"); 
    baseLine.setAttribute("y1", baseY);
    baseLine.setAttribute("x2","2850");
    baseLine.setAttribute("y2", baseY);
    baseLine.setAttribute("stroke","black");
    svg.appendChild(baseLine);

    // ======================= POSITIES OPSLAAN =======================
    const positionMap = {}; // bewaart x,y per ID

    // ======================= PERSONEN TEKENEN =======================
    timelinePersons.forEach(p => {
        const dt = parseDateSafe(p.Geboortedatum); // datum
        const year = dt.getFullYear(); // jaar
        const x = yearToX(year, minYear, maxYear); // x positie
        const y = baseY + (p.level * levelHeight); // y op basis van level

        positionMap[p.ID] = { x, y }; // opslaan voor lijnen

        const circle = document.createElementNS("http://www.w3.org/2000/svg","circle"); // cirkel
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        circle.setAttribute("r","6");
        circle.setAttribute("fill", p.ID === rootPerson.ID ? "red" : (p.role === "P" ? "blue" : "black")); // kleur
        svg.appendChild(circle);

        const fullName = [p.ID, p.Roepnaam, p.Prefix || "", p.Achternaam].filter(Boolean).join(" "); // naam
        const birthText = p.Geboortedatum ? `(${p.Geboortedatum})` : "(geen datum)";

        const label = document.createElementNS("http://www.w3.org/2000/svg","text"); // label
        label.setAttribute("x", x + 8);
        label.setAttribute("y", y - 10);
        label.textContent = `${fullName} ${birthText}`;
        svg.appendChild(label);

        const yearLabel = document.createElementNS("http://www.w3.org/2000/svg","text"); // jaartal
        yearLabel.setAttribute("x", x - 10);
        yearLabel.setAttribute("y", y + 25);
        yearLabel.textContent = `${year}`;
        svg.appendChild(yearLabel);
    });

    // ======================= RELATIE LIJNEN =======================
    timelinePersons.forEach(p => {
        if(p.parentID && positionMap[p.parentID]){ // als ouder bestaat
            const parent = positionMap[p.parentID]; // ouder positie
            const child = positionMap[p.ID]; // kind positie

            const line = document.createElementNS("http://www.w3.org/2000/svg","line"); // lijn
            line.setAttribute("x1", parent.x);
            line.setAttribute("y1", parent.y);
            line.setAttribute("x2", child.x);
            line.setAttribute("y2", child.y);
            line.setAttribute("stroke","gray");
            svg.appendChild(line);
        }
    });
}

// ======================= INIT LIVESEARCH =======================
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('sandboxSearch'); // zoekveld
    if(!input){
        console.error("sandboxSearch input niet gevonden");
        return;
    }

    if(typeof initLiveSearch === "function"){ // init search
        initLiveSearch(input, peopleData, personID => {
            const person = peopleData.find(p => p.ID === personID); // zoek persoon
            if(person) drawTimeline(person); // render
        });
    }

    if(peopleData.length > 0){
        drawTimeline(peopleData[0]); // eerste render
    }
});
