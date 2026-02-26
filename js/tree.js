// ======================= tree.js v1.1.1 =======================
// Relation Tree Engine met SVG lijnen en generatie layout
// Compatibel met dataset uit manage.html / StamboomStorage

export function renderTree(personen, hoofdId, containerId="tree"){ // exporteer hoofdfunctie, accepteert dataset, hoofdId en containerId
    const container=document.getElementById(containerId); // zoek container element
    if(!container) return; // stop als container niet bestaat
    container.innerHTML=""; // maak container leeg
    container.style.position="relative"; // nodig voor absolute positionering

    // ======================= SVG VOOR LIJNEN =======================
    const svg=document.createElementNS("http://www.w3.org/2000/svg","svg"); // maak SVG element
    svg.style.position="absolute"; // boven layout
    svg.style.top="0";
    svg.style.left="0";
    svg.style.width="100%";
    svg.style.height="100%";
    container.appendChild(svg); // voeg SVG toe

    // ======================= MAP VOOR SNELLE LOOKUP =======================
    const map=new Map(); // map aanmaken
    personen.forEach(p=>map.set(p.ID,p)); // voeg personen toe aan map
    const hoofd=map.get(hoofdId); // haal hoofdpersoon op
    if(!hoofd) return; // stop als niet gevonden

    // ======================= GEN LAGEN CONTAINERS =======================
    const genParents=createLayer("parents"); // laag ouders
    const genMain=createLayer("main"); // laag hoofd
    const genChildren=createLayer("children"); // laag kinderen
    const genSiblings=createLayer("siblings"); // laag siblings
    container.appendChild(genParents); 
    container.appendChild(genMain); 
    container.appendChild(genChildren); 
    container.appendChild(genSiblings); 

    // ======================= OUDERS =======================
    if(hoofd.vaderId && map.has(hoofd.vaderId)){
        const vaderNode=createNode(map.get(hoofd.vaderId),"parent",personen,containerId);
        genParents.appendChild(vaderNode);
        connect(svg,vaderNode,genMain); // verbind ouders met hoofd laag
    }
    if(hoofd.moederId && map.has(hoofd.moederId)){
        const moederNode=createNode(map.get(hoofd.moederId),"parent",personen,containerId);
        genParents.appendChild(moederNode);
        connect(svg,moederNode,genMain); // verbind moeder met hoofd laag
    }

    // ======================= HOOFD =======================
    const hoofdNode=createNode(hoofd,"main",personen,containerId); 
    genMain.appendChild(hoofdNode);

    // ======================= PARTNER HOOFD =======================
    if(hoofd.PartnerID && map.has(hoofd.PartnerID)){
        const partnerNode=createNode(map.get(hoofd.PartnerID),"partner",personen,containerId); 
        genMain.appendChild(partnerNode);
        connect(svg,hoofdNode,partnerNode); // verbind hoofd met partner
    }

    // ======================= KINDEREN =======================
    personen.forEach(p=>{
        if(p.vaderId===hoofd.ID || p.moederId===hoofd.ID){ // controleer kind
            const childNode=createNode(p,"child",personen,containerId);
            genChildren.appendChild(childNode);
            connect(svg,hoofdNode,childNode); // verbind hoofd met kind
            // kind partner
            if(p.PartnerID && map.has(p.PartnerID)){
                const partnerNode=createNode(map.get(p.PartnerID),"partner",personen,containerId);
                genChildren.appendChild(partnerNode);
                connect(svg,childNode,partnerNode);
            }
        }
    });

    // ======================= SIBLINGS =======================
    personen.forEach(p=>{
        if(p.ID!==hoofd.ID && (p.vaderId===hoofd.vaderId || p.moederId===hoofd.moederId)){
            const siblingNode=createNode(p,"sibling",personen,containerId);
            genSiblings.appendChild(siblingNode);
            connect(svg,hoofdNode,siblingNode);
        }
    });
}

// ======================= NODE MAKER =======================
function createNode(person,type,personen,containerId){ 
    const div=document.createElement("div"); 
    div.className="tree-node "+type; 
    div.dataset.id=person.ID; 
    div.innerText=person.ID+" "+(person.Roepnaam||""); 
    div.onclick=()=>renderTree(personen, person.ID, containerId); // klik maakt nieuwe root
    return div; 
}

// ======================= LAYER MAKER =======================
function createLayer(name){ 
    const div=document.createElement("div"); 
    div.className="tree-layer "+name; 
    div.style.display="flex"; 
    div.style.justifyContent="center"; 
    div.style.margin="20px"; 
    return div; 
}

// ======================= CONNECTOR =======================
function connect(svg,a,b){ 
    setTimeout(()=>{
        let rectA, rectB;
        // a en b kunnen node of layer zijn
        if(a.classList.contains("tree-layer")) rectA=a.getBoundingClientRect();
        else rectA=a.getBoundingClientRect();
        if(b.classList.contains("tree-layer")) rectB=b.getBoundingClientRect();
        else rectB=b.getBoundingClientRect();

        const svgRect=svg.getBoundingClientRect();
        const x1=rectA.left+rectA.width/2-svgRect.left;
        const y1=rectA.bottom-svgRect.top;
        const x2=rectB.left+rectB.width/2-svgRect.left;
        const y2=rectB.top-svgRect.top;
        const line=document.createElementNS("http://www.w3.org/2000/svg","line");
        line.setAttribute("x1",x1);
        line.setAttribute("y1",y1);
        line.setAttribute("x2",x2);
        line.setAttribute("y2",y2);
        line.setAttribute("stroke","#999");
        line.setAttribute("stroke-width","2");
        svg.appendChild(line);
    },100); // kleine delay om layout te laten renderen
}
