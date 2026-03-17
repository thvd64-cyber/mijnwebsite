/* ======================= js/timeline.js v0.1.1 ======================= */
/* Uitbreiding op v0.1.0
   - Nu worden ook vaderID en moederID op de tijdslijn weergegeven
   - Alle inline uitleg toegevoegd
   - Alleen offset toegevoegd zodat teksten niet over elkaar lopen
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
    if(!d){
        console.warn("Datum leeg gevonden, gebruik vandaag als fallback");
        return new Date();
    }
    const dt = new Date(d);
    if(isNaN(dt.getTime())){
        console.warn(`Datum verkeerd (${d}), gebruik vandaag`);
        return new Date();
    }
    return dt;
}

function yearToX(year, minYear, maxYear){
    const range = maxYear - minYear || 1;
    const x = ((year - minYear)/range)*2800 + 50;
    return isNaN(x) ? 50 : x;
}

// ======================= RELATIE ZOEK FUNCTIES =======================
function getPartners(person){
    return peopleData.filter(p =>
        p.PHoofdID === person.ID || p.PKPartnerID === person.ID
    );
}

function getChildren(person, partner){
    return peopleData.filter(p =>
        p.VaderID === person.ID || p.MoederID === person.ID ||
        (partner && (p.VaderID === partner.ID || p.MoederID === partner.ID))
    );
}

// ======================= RECURSIEVE OPBOUW =======================
function buildFamily(rootPerson){
    const result = [];
    const visited = new Set();

    function traverse(person, level = 0){
        if(!person || visited.has(person.ID)) return;
        visited.add(person.ID);

        result.push({ ...person, level: level, role: "S" });

        // ======================= PARTNERS =======================
        const partners = getPartners(person);
        partners.forEach(partner => {
            if(!visited.has(partner.ID)){
                result.push({ ...partner, level: level, role: "P", parentID: person.ID });
            }

            // ======================= KINDEREN =======================
            const children = getChildren(person, partner);
            children.forEach(child => {
                if(!visited.has(child.ID)){
                    result.push({ ...child, level: level + 1, role: "S", parentID: person.ID });
                }
                traverse(child, level + 1);
            });
        });

        // ======================= VADER EN MOEDER =======================
        ["VaderID","MoederID"].forEach(parentField => {
            const parentID = person[parentField];
            if(parentID && !visited.has(parentID)){
                const parentPerson = peopleData.find(p => p.ID === parentID);
                if(parentPerson){
                    result.push({ ...parentPerson, level: level - 1, role: "O", parentID: null }); // ouder 1 level hoger
                    traverse(parentPerson, level - 1);
                }
            }
        });
    }

    traverse(rootPerson, 0);
    return result;
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
    svg.setAttribute("height","1000"); // meer hoogte voor ouders
    container.appendChild(svg);

    const timelinePersons = buildFamily(rootPerson);

    const years = timelinePersons.map(p => parseDateSafe(p.Geboortedatum).getFullYear());
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    const baseY = 200; // startlijn voor root persoon
    const levelHeight = 80;

    const baseLine = document.createElementNS("http://www.w3.org/2000/svg","line");
    baseLine.setAttribute("x1","50"); 
    baseLine.setAttribute("y1", baseY);
    baseLine.setAttribute("x2","2850");
    baseLine.setAttribute("y2", baseY);
    baseLine.setAttribute("stroke","black");
    svg.appendChild(baseLine);

    const positionMap = {};

    // ======================= PERSONEN TEKENEN =======================
    timelinePersons.forEach((p,index) => { // index toegevoegd voor offset
        const dt = parseDateSafe(p.Geboortedatum);
        const year = dt.getFullYear();
        const x = yearToX(year, minYear, maxYear);
        const y = baseY + (p.level * levelHeight);

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
        label.setAttribute("y", y - 10 - (index * 2)); // offset toegevoegd per index
        label.textContent = `${fullName} ${birthText}`;
        svg.appendChild(label);

        const yearLabel = document.createElementNS("http://www.w3.org/2000/svg","text");
        yearLabel.setAttribute("x", x - 10);
        yearLabel.setAttribute("y", y + 25 + (index * 2)); // offset toegevoegd per index
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

// ======================= INIT LIVESEARCH =======================
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('sandboxSearch');
    if(!input){
        console.error("sandboxSearch input niet gevonden");
        return;
    }

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
