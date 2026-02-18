// =======================================
// idGenerator.js
// Functie voor unieke ID/codes generatie
// =======================================

function genereerCode(doopnaam, roepnaam, achternaam, geslacht) {
    // Validatie geslacht
    geslacht = geslacht.toUpperCase();
    if (!['M','F','X'].includes(geslacht)) {
        throw new Error("Geslacht moet M, F of X zijn");
    }

    // Eerste letters van doopnaam, roepnaam en achternaam
    let L1 = doopnaam[0]?.toUpperCase() || 'X';
    let L2 = roepnaam[0]?.toUpperCase() || 'X';
    let L3 = achternaam[0]?.toUpperCase() || 'X';

    // Basisletters + geslacht
    let basis = L1 + L2 + L3 + geslacht;

    // Ophalen van bestaande codes uit localStorage
    let bestaandeCodes = JSON.parse(localStorage.getItem('codes') || '[]');

    // Vind eerst beschikbare 6-cijferige nummer
    let nummer = 1;
    let code;
    do {
        let nummerStr = nummer.toString().padStart(6, '0');
        code = basis + nummerStr;
        nummer++;
    } while (bestaandeCodes.includes(code) && nummer <= 999999);

    if (nummer > 999999) {
        throw new Error("Geen vrije codes meer voor deze lettercombinatie");
    }

    // Sla de code op in localStorage
    bestaandeCodes.push(code);
    localStorage.setItem('codes', JSON.stringify(bestaandeCodes));

    return code;
}

