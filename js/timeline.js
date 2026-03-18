/* ======================= js/timeline.js v0.2.0 ======================= */
/* Volledige integratie van hoofdID + robuuste relatie-engine
   - Testdata bevat nu overlijdensdatums
   - Inline uitleg achter elke regel
*/

// ======================= DATA LADEN =======================
let peopleData = window.StamboomStorage?.get() || []; // Probeer dataset uit storage te halen
if(!peopleData || peopleData.length === 0){ // fallback indien dataset leeg
    console.warn("Dataset leeg - gebruik testdata"); // waarschuwing
    peopleData = [
        { ID: "1", Roepnaam: "Jan", Achternaam: "Jansen", Geboortedatum: "1950-01-01", Overlijdensdatum: "2010-05-20" },
        { ID: "2", Roepnaam: "Anna", Achternaam: "Jansen", Geboortedatum: "1970-06-15" }, // leeft nog
        { ID: "3", Roepnaam: "Piet", Achternaam: "Jansen", Geboortedatum: "1975-03-20", Overlijdensdatum: "2020-11-01" },
        { ID: "4", Roepnaam: "Lisa", Achternaam: "Jansen", Geboortedatum: "2000-09-10" } // leeft nog
    ];
}

// ======================= HULP FUNCTIES =======================
function parseDateSafe(d){ // converteer datum naar Date object, fallback naar vandaag
    if(!d){ console.warn("Datum leeg gevonden, gebruik vandaag"); return new Date(); }
    const dt = new Date(d); // probeer datum te parsen
    if(isNaN(dt.getTime())){ console.warn(`Datum verkeerd (${d}), gebruik vandaag`); return new Date(); }
    return dt; // valide datum
}

function yearToX(year, minYear, maxYear){ // zet jaar om naar X-coördinaat
    const range = maxYear - minYear || 1; // range mag niet 0 zijn
    const x = ((year - minYear)/range)*2800 + 50; // schaal naar 50-2850 px
    return isNaN(x) ? 50 : x; // fallback bij NaN
}

// ======================= RELATIE ZOEK FUNCTIES =======================
function getPartners(person){ // zoek partners via PHoofdID of PKPartnerID
    return peopleData.filter(p => p.PHoofdID === person.ID || p.PKPartnerID === person.ID);
}

function getChildren(person, partner){ // zoek kinderen van persoon (optioneel met partner)
    return peopleData.filter(p =>
        p.VaderID === person.ID || p.MoederID === person.ID ||
        (partner && (p.VaderID === partner.ID || p.MoederID === partner.ID))
    );
}

// ======================= RECURSIEVE OPBOUW =======================
function buildFamily(rootPerson){ // bouw familieboom recursief
    const result = []; // array om personen in te bewaren
    const visited = new Set(); // set om dubbele traversals te voorkomen

    function traverse(person, level = 0){ // recursieve traverser functie
        if(!person || visited.has(person.ID)) return; // stop bij null of al bezocht
        visited.add(person.ID); // markeer als bezocht

        result.push({ ...person, level: level, role: "S" }); // voeg hoofdpersoon toe met level

        // ======================= PARTNERS =======================
        const partners = getPartners(person); // haal partners op
        partners.forEach(partner => {
            if(!visited.has(partner.ID)){
                result.push({ ...partner, level: level, role: "P", parentID: person.ID }); // partner toevoegen
            }

            // ======================= KINDEREN =======================
            const children = getChildren(person, partner); // kinderen van persoon + partner
            children.forEach(child => {
                if(!visited.has(child.ID)){
                    result.push({ ...child, level: level + 1, role: "S", parentID: person.ID }); // kind toevoegen
                }
                traverse(child, level + 1); // recursief traversen
            });
        });

        // ======================= VADER EN MOEDER =======================
        ["VaderID","MoederID"].forEach(parentField => { // door beide ouders itereren
            const parentID = person[parentField];
            if(parentID && !visited.has(parentID)){
                const parentPerson = peopleData.find(p => p.ID === parentID); // ouder opzoeken
                if(parentPerson){
                    result.push({ ...parentPerson, level: level - 1, role: "O" }); // ouder toevoegen
                    traverse(parentPerson, level - 1); // recursief ouder traversen
                }
            }
        });
    }

    traverse(rootPerson, 0); // start traverseren vanaf rootPerson
    return result; // return complete family array
}

// ======================= DRAW TIMELINE =======================
function drawTimeline(rootPerson){ // teken de timeline
    if(!rootPerson) return; // stop indien geen root

    const container = document.getElementById("timelineContainer"); // haal container
    if(!container){ console.error("timelineContainer niet gevonden"); return; }
    container.innerHTML = ""; // clear container

    const svg = document.createElementNS("http://www.w3.org/2000/svg","svg"); // maak SVG element
    svg.setAttribute("width","3000"); // breedte SVG
    svg.setAttribute("height","1000"); // hoogte SVG
    container.appendChild(svg); // voeg SVG toe aan container

    const timelinePersons = buildFamily(rootPerson); // bouw familie array via engine

    const years = timelinePersons.map(p => parseDateSafe(p.Geboortedatum).getFullYear()); // haal geboortejaren
    const minYear = Math.min(...years); // vroegste jaar
    const maxYear = Math.max(...years); // laatste jaar

    const baseY = 200; // Y startlijn
    const levelHeight = 80; // afstand per level

    // ======================= BASISLIJN =======================
    const baseLine = document.createElementNS("http://www.w3.org/2000/svg","line"); // lijn maken
    baseLine.setAttribute("x1","50"); 
    baseLine.setAttribute("y1", baseY);
    baseLine.setAttribute("x2","2850");
    baseLine.setAttribute("y2", baseY);
    baseLine.setAttribute("stroke","black");
    svg.appendChild(baseLine);

    const positionMap = {}; // map om posities van personen bij te houden

    // ======================= PERSONEN TEKENEN =======================
    timelinePersons.forEach((p,index) => {
        const dt = parseDateSafe(p.Geboortedatum); // veilige datum
        const year = dt.getFullYear(); // extract jaar
        const x = yearToX(year, minYear, maxYear); // bereken x
        const y = baseY + (p.level * levelHeight); // bereken y op level

        positionMap[p.ID] = { x, y }; // sla positie op

        const circle = document.createElementNS("http://www.w3.org/2000/svg","circle"); // maak cirkel
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        circle.setAttribute("r","6");
        circle.setAttribute("fill",
            p.ID === rootPerson.ID ? "red" : // root persoon in rood
            (p.role === "P" ? "blue" : // partner blauw
            (p.role === "O" ? "green" : "black"))); // ouders groen, anderen zwart
        svg.appendChild(circle);

        const fullName = [p.ID, p.Roepnaam, p.Prefix || "", p.Achternaam].filter(Boolean).join(" "); // naam samenstellen
        const birthText = p.Geboortedatum ? `(${p.Geboortedatum}${p.Overlijdensdatum ? " - "+p.Overlijdensdatum : ""})` : "(geen datum)"; // toon overlijdensdatum indien aanwezig

        const label = document.createElementNS("http://www.w3.org/2000/svg","text"); // naam label
        label.setAttribute("x", x + 8);
        label.setAttribute("y", y - 10 - (index * 2));
        label.textContent = `${fullName} ${birthText}`;
        svg.appendChild(label);

        const yearLabel = document.createElementNS("http://www.w3.org/2000/svg","text"); // jaar label
        yearLabel.setAttribute("x", x - 10);
        yearLabel.setAttribute("y", y + 25 + (index * 2));
        yearLabel.textContent = `${year}`;
        svg.appendChild(yearLabel);
    });

    // ======================= RELATIE LIJNEN =======================
    timelinePersons.forEach(p => {
        if(p.parentID && positionMap[p.parentID]){ // teken lijn als parentID bekend
            const parent = positionMap[p.parentID];
            const child = positionMap[p.ID];

            const line = document.createElementNS("http://www.w3.org/2000/svg","line"); // lijn element
            line.setAttribute("x1", parent.x);
            line.setAttribute("y1", parent.y);
            line.setAttribute("x2", child.x);
            line.setAttribute("y2", child.y);
            line.setAttribute("stroke","gray");
            svg.appendChild(line);
        }
    });
}

// ======================= INIT LIVESEARCH + HOOFDPERSOON =======================
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('sandboxSearch'); // zoek input
    if(!input){ console.error("sandboxSearch input niet gevonden"); return; }

    if(typeof initLiveSearch === "function"){ // check of LiveSearch bestaat
        initLiveSearch(input, peopleData, personID => { // init live search
            const person = peopleData.find(p => p.ID === personID); // zoek persoon
            if(person) drawTimeline(person); // update timeline bij selectie
        });
    }

    // ======================= ROOT PERSON VIA HOOFDID =======================
    const hoofdID = window.HoofdID || (peopleData[0] && peopleData[0].ID); // fallback naar eerste persoon
    const rootPerson = peopleData.find(p => p.ID === hoofdID); // vind root persoon
    if(rootPerson) drawTimeline(rootPerson); // teken timeline
});
