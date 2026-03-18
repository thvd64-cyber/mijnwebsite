/* ======================= js/timeline.js v0.3.0 ======================= */
/* Robuuste genealogische tijdlijn gebaseerd op StamboomStorage + RelatieEngine
   - Vaste rijen per rol
   - X-as = tijd (jaartallen)
   - Symbolen voor geslacht en overlijdensdatum
   - Relatielijnen tussen personen
   - Inline uitleg bij elke regel
*/

// ======================= DATA LADEN =======================
let peopleData = window.StamboomStorage?.get() || []; // Haal dataset uit storage
if(!peopleData || peopleData.length===0){              // fallback indien leeg
    console.warn("Dataset leeg - gebruik testdata");
    peopleData = [
        { ID:"1", Roepnaam:"Martien", Achternaam:"van Doorn", Geboortedatum:"1935-02-10", Overlijdensdatum:"2019-03-12", Geslacht:"M" },
        { ID:"2", Roepnaam:"Tiny", Achternaam:"Peters", Geboortedatum:"1933-07-22", Overlijdensdatum:"2007-05-05", Geslacht:"V" },
        { ID:"3", Roepnaam:"Theo", Achternaam:"van Doorn", Geboortedatum:"1964-08-18", Geslacht:"M", PartnerID:"4", VaderID:"1", MoederID:"2" },
        { ID:"4", Roepnaam:"Marcia", Achternaam:"Lobos Astorga", Geboortedatum:"1962-11-02", Geslacht:"V", PartnerID:"3" },
        { ID:"5", Roepnaam:"David", Achternaam:"van Doorn", Geboortedatum:"1995-03-14", Geslacht:"M", VaderID:"3", MoederID:"4" },
        { ID:"6", Roepnaam:"Esther", Achternaam:"van Doorn", Geboortedatum:"1972-09-09", Geslacht:"V", VaderID:"1", MoederID:"2" }
    ];
}

// ======================= HULP FUNCTIES =======================
function parseDateSafe(d){                                // Parse een datum, fallback naar vandaag
    if(!d) return new Date();                              // Geen datum? gebruik vandaag
    const dt = new Date(d);
    if(isNaN(dt.getTime())) return new Date();             // Ongeldige datum? fallback
    return dt;
}

function yearToX(year, minYear, maxYear){                // Zet jaartal om naar X positie in pixels
    const range = maxYear - minYear || 1;
    return ((year - minYear)/range)*2800 + 50;            // schaal naar 50-2850 px
}

// ======================= Y-POSITIES PER RELATIE =======================
const roleYMap = {                                        // Vaste Y-posities
    "VHoofdID": 50,                                       // Vader / Ouder
    "MHoofdID": 50,                                       // Moeder / Ouder
    "HoofdID": 150,                                       // Hoofd persoon
    "PHoofdID": 250,                                      // Partner
    "KindID": 350,                                        // Kind
    "HKindID": 350,                                       // Kind via hoofd
    "PHKindID": 350,                                      // Kind via partner
    "BZID": 450,                                          // Broer/Zus
    "BZPartnerID": 450                                     // Partner van broer/zus
};

// ======================= DRAW TIMELINE =======================
function drawTimeline(rootID){
    if(!rootID) return;

    const container = document.getElementById("timelineContainer"); // Container div
    if(!container){ console.error("timelineContainer niet gevonden"); return; }
    container.innerHTML="";                                     // Wis vorige inhoud

    const svg = document.createElementNS("http://www.w3.org/2000/svg","svg"); // Maak SVG element
    svg.setAttribute("width","3000");                             // Breedte canvas
    svg.setAttribute("height","600");                             // Hoogte canvas
    container.appendChild(svg);

    const timelinePersons = window.RelatieEngine.computeRelaties(peopleData, rootID); // Bereken relaties

    // X-as berekenen
    const years = timelinePersons.map(p => parseDateSafe(p.Geboortedatum).getFullYear());
    const minYear = Math.min(...years)-5;                         // 5 jaar marge
    const maxYear = Math.max(...years)+5;

    // ======================= TEKEN JAARLIJN =======================
    const baseY = 25;
    const baseLine = document.createElementNS("http://www.w3.org/2000/svg","line");
    baseLine.setAttribute("x1","50");
    baseLine.setAttribute("y1",baseY);
    baseLine.setAttribute("x2","2850");
    baseLine.setAttribute("y2",baseY);
    baseLine.setAttribute("stroke","black");
    svg.appendChild(baseLine);

    for(let yYear=minYear; yYear<=maxYear; yYear+=10){          // Decennium markers
        const x = yearToX(yYear,minYear,maxYear);
        const tick = document.createElementNS("http://www.w3.org/2000/svg","line");
        tick.setAttribute("x1",x);
        tick.setAttribute("y1",baseY-5);
        tick.setAttribute("x2",x);
        tick.setAttribute("y2",baseY+5);
        tick.setAttribute("stroke","black");
        svg.appendChild(tick);

        const label = document.createElementNS("http://www.w3.org/2000/svg","text");
        label.setAttribute("x",x-15);
        label.setAttribute("y",baseY-10);
        label.textContent = yYear;
        svg.appendChild(label);
    }

    const positionMap={};                                        // Houd X,Y van elke persoon

    // ======================= TEKEN PERSONEN =======================
    timelinePersons.forEach((p,index)=>{
        const birth = parseDateSafe(p.Geboortedatum);           // Geboortedatum
        const death = p.Overlijdensdatum ? parseDateSafe(p.Overlijdensdatum) : null; // Overlijdensdatum
        const year = birth.getFullYear();                        // Geboortejaar
        const x = yearToX(year,minYear,maxYear);                 // X positie
        const y = roleYMap[p.Relatie] || 550;                    // Y positie op basis van rol
        positionMap[p.ID]={x,y};                                 // Opslaan

        // Symbolen voor geslacht
        let symb = "◌";                                         // Default geslacht onbekend
        if(p.Geslacht==="M") symb="♂";
        else if(p.Geslacht==="V") symb="♀";

        // Label
        const deathText = death ? `–${death.getFullYear()}` : "";
        const label = document.createElementNS("http://www.w3.org/2000/svg","text");
        label.setAttribute("x",x+8);
        label.setAttribute("y",y);
        label.textContent = `*- ${p.Roepnaam} ${p.Achternaam} ${symb} (${year}${deathText})`;
        svg.appendChild(label);

        // Kleine cirkel marker
        const circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
        circle.setAttribute("cx",x);
        circle.setAttribute("cy",y-3);
        circle.setAttribute("r","5");
        circle.setAttribute("fill","red");
        svg.appendChild(circle);
    });

    // ======================= TEKEN RELATIELIJNEN =======================
    timelinePersons.forEach(p=>{
        if(!p.Relatie) return;

        // Ouder → Hoofd / Kind
        if((p.Relatie==="VHoofdID" || p.Relatie==="MHoofdID") && positionMap[rootID]){
            const parent = positionMap[p.ID];
            const child = positionMap[rootID];
            if(parent && child){
                const line = document.createElementNS("http://www.w3.org/2000/svg","line");
                line.setAttribute("x1",parent.x);
                line.setAttribute("y1",parent.y);
                line.setAttribute("x2",child.x);
                line.setAttribute("y2",child.y);
                line.setAttribute("stroke","gray");
                line.setAttribute("stroke-dasharray","4,2");
                svg.appendChild(line);
            }
        }

        // Hoofd → Partner
        if(p.Relatie==="PHoofdID" && positionMap[rootID]){
            const line = document.createElementNS("http://www.w3.org/2000/svg","line");
            line.setAttribute("x1",positionMap[rootID].x);
            line.setAttribute("y1",positionMap[rootID].y);
            line.setAttribute("x2",positionMap[p.ID].x);
            line.setAttribute("y2",positionMap[p.ID].y);
            line.setAttribute("stroke","blue");
            line.setAttribute("stroke-dasharray","4,2");
            svg.appendChild(line);
        }

        // Ouder → Kind
        if(["KindID","HKindID","PHKindID"].includes(p.Relatie)){
            const parent = timelinePersons.find(pp=>pp.Relatie==="HoofdID");
            if(parent && positionMap[parent.ID]){
                const line = document.createElementNS("http://www.w3.org/2000/svg","line");
                line.setAttribute("x1",positionMap[parent.ID].x);
                line.setAttribute("y1",positionMap[parent.ID].y);
                line.setAttribute("x2",positionMap[p.ID].x);
                line.setAttribute("y2",positionMap[p.ID].y);
                line.setAttribute("stroke","green");
                line.setAttribute("stroke-dasharray","2,2");
                svg.appendChild(line);
            }
        }
    });
}

// ======================= INIT =======================
document.addEventListener("DOMContentLoaded",()=>{
    const hoofdID = window.HoofdID || (peopleData[0] && peopleData[0].ID); // fallback eerste persoon
    if(hoofdID) drawTimeline(hoofdID);                                       // Teken timeline bij load
});
