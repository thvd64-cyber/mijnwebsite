// ======================= tree.js v1.1.0 =======================
// Relation Tree Engine met SVG lijnen en generatie layout

export function renderTree(personen, hoofdId, containerId="tree"){ // exporteer hoofdfunctie, accepteert dataset, hoofdId en containerId
const container=document.getElementById(containerId); // zoek container element
if(!container)return; // stop als container niet bestaat
container.innerHTML=""; // maak container leeg
container.style.position="relative"; // nodig voor absolute positionering

// ======================= SVG VOOR LIJNEN =======================
const svg=document.createElementNS("http://www.w3.org/2000/svg","svg"); // maak SVG element
svg.style.position="absolute"; // plaats SVG boven layout
svg.style.top="0"; // positioneer boven
svg.style.left="0"; // positioneer links
svg.style.width="100%"; // volledige breedte
svg.style.height="100%"; // volledige hoogte
container.appendChild(svg); // voeg SVG toe

// ======================= MAP VOOR SNELLE LOOKUP =======================
const map=new Map(); // maak map
personen.forEach(p=>map.set(p.id,p)); // voeg personen toe aan map
const hoofd=map.get(hoofdId); // haal hoofdpersoon op
if(!hoofd)return; // stop als niet gevonden

// ======================= GEN LAGEN CONTAINERS =======================
const genParents=createLayer("parents"); // laag ouders
const genMain=createLayer("main"); // laag hoofd
const genChildren=createLayer("children"); // laag kinderen
const genSiblings=createLayer("siblings"); // laag siblings
container.appendChild(genParents); // voeg ouders toe
container.appendChild(genMain); // voeg hoofd toe
container.appendChild(genChildren); // voeg kinderen toe
container.appendChild(genSiblings); // voeg siblings toe

// ======================= HOOFD =======================
const hoofdNode=createNode(hoofd,"main"); // maak node
genMain.appendChild(hoofdNode); // voeg toe

// ======================= PARTNER HOOFD =======================
if(hoofd.partnerId&&map.has(hoofd.partnerId)){ // controleer partner
const partnerNode=createNode(map.get(hoofd.partnerId),"partner"); // maak partner node
genMain.appendChild(partnerNode); // voeg toe
connect(svg,hoofdNode,partnerNode); // teken lijn
}

// ======================= OUDERS =======================
if(hoofd.vaderId&&map.has(hoofd.vaderId)){ // controleer vader
const vaderNode=createNode(map.get(hoofd.vaderId),"parent"); // maak node
genParents.appendChild(vaderNode); // voeg toe
connect(svg,vaderNode,hoofdNode); // verbind met hoofd
}
if(hoofd.moederId&&map.has(hoofd.moederId)){ // controleer moeder
const moederNode=createNode(map.get(hoofd.moederId),"parent"); // maak node
genParents.appendChild(moederNode); // voeg toe
connect(svg,moederNode,hoofdNode); // verbind met hoofd
}
// ======================= KINDEREN =======================
personen.forEach(p=>{ // loop personen
if(p.vaderId===hoofdId||p.moederId===hoofdId){ // controleer kind
const childNode=createNode(p,"child"); // maak child node
genChildren.appendChild(childNode); // voeg toe
connect(svg,hoofdNode,childNode); // verbind met hoofd
if(p.partnerId&&map.has(p.partnerId)){ // controleer partner
const partnerNode=createNode(map.get(p.partnerId),"partner"); // maak partner
genChildren.appendChild(partnerNode); // voeg toe
connect(svg,childNode,partnerNode); // verbind partner
}
}
});

// ======================= SIBLINGS =======================
personen.forEach(p=>{ // loop personen
if(p.id!==hoofdId&&(p.vaderId===hoofd.vaderId||p.moederId===hoofd.moederId)){ // controleer sibling
const siblingNode=createNode(p,"sibling"); // maak sibling node
genSiblings.appendChild(siblingNode); // voeg toe
connect(svg,hoofdNode,siblingNode); // verbind sibling
}
});
}

// ======================= NODE MAKER =======================
function createNode(person,type){ // maak visuele node
const div=document.createElement("div"); // maak div
div.className="tree-node "+type; // voeg type class toe
div.dataset.id=person.id; // sla ID op
div.innerText=person.id+" "+(person.roepnaam||""); // toon tekst
div.onclick=()=>renderTree(window.personen,person.id); // klik maakt nieuwe root
return div; // return node
}

// ======================= LAYER MAKER =======================
function createLayer(name){ // maak generatie layer
const div=document.createElement("div"); // maak div
div.className="tree-layer "+name; // voeg class toe
div.style.display="flex"; // flex layout
div.style.justifyContent="center"; // centreer
div.style.margin="20px"; // spacing
return div; // return layer
}

// ======================= CONNECTOR =======================
function connect(svg,a,b){ // verbind nodes met lijn
setTimeout(()=>{ // wacht tot layout klaar is

const rectA=a.getBoundingClientRect(); // positie A
const rectB=b.getBoundingClientRect(); // positie B
const svgRect=svg.getBoundingClientRect(); // positie SVG
const x1=rectA.left+rectA.width/2-svgRect.left; // start X
const y1=rectA.bottom-svgRect.top; // start Y
const x2=rectB.left+rectB.width/2-svgRect.left; // eind X
const y2=rectB.top-svgRect.top; // eind Y
const line=document.createElementNS("http://www.w3.org/2000/svg","line"); // maak lijn

line.setAttribute("x1",x1); // set start X
line.setAttribute("y1",y1); // set start Y
line.setAttribute("x2",x2); // set eind X
line.setAttribute("y2",y2); // set eind Y
line.setAttribute("stroke","#999"); // kleur
line.setAttribute("stroke-width","2"); // dikte
svg.appendChild(line); // voeg toe

},50); // kleine delay

}
