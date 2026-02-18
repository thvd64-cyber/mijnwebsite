// =======================================
// idGenerator.js
// Functie voor het automatisch genereren van unieke ID/codes
// alternatieven X, Q, Y
// Geschikt voor create.html en manage.html
// =======================================

/**
 * Genereert een unieke code voor een persoon op basis van:
 * - Doopnaam
 * - Roepnaam
 * - Achternaam
 * - Geslacht (M, F, X)
 * 
 * Formaat: L1L2L3G + 6-cijferig nummer
 * L1 = eerste letter doopnaam, L2 = roepnaam, L3 = achternaam
 * G = geslacht
 * Nummer = oplopend per combinatie
 * 
 * Lege velden krijgen placeholder letters: X (standaard), Q of Y als alternatief
 */
function genereerCode(doopnaam, roepnaam, achternaam, geslacht) {
    // Zorg dat geslacht geldig is
    geslacht = geslacht.toUpperCase();
    if (!['M','F','X'].includes(geslacht)) {
        throw new Error("Geslacht moet M, F of X zijn");
    }

    // Functie om eerste letter te kiezen met placeholder
    function eersteLetter(naam) {
        if (!naam || naam.trim() === '') {
            // Placeholder letters in volgorde van gebruik
            const alternatieven = ['X', 'Q', 'Y'];
            return alternatieven[0]; // standaard X
        }
        return naam[0].toUpperCase();
    }

    // Eerste letters ophalen
    const L1 = eersteLetter(doopnaam);
    const L2 = eersteLetter(roepnaam);
    const L3 = eersteLetter(achternaam);

    // Basisletters + geslacht
    const basis = L1 + L2 + L3 + geslacht;

    // Ophalen van bestaande codes uit localStorage
    let bestaandeCodes = JSON.parse(localStorage.getItem('codes') || '[]');

    // Vind het eerst beschikbare 6-cijferige nummer
    let nummer = 1;
    let code;
    do {
        const nummerStr = nummer.toString().padStart(6, '0'); // altijd 6 cijfers
        code = basis + nummerStr;
        nummer++;
    } while (bestaandeCodes.includes(code) && nummer <= 999999);

    if (nummer > 999999) {
        throw new Error("Geen vrije codes meer voor deze lettercombinatie");
    }

    // Sla de code op in localStorage zodat deze niet opnieuw gebruikt wordt
    bestaandeCodes.push(code);
    localStorage.setItem('codes', JSON.stringify(bestaandeCodes));

    return code;
}

/**
 * Voorbeeld gebruik:
 * let nieuweCode = genereerCode("Jan", "Hendrik", "Vermeer", "M");
 * console.log("Nieuwe unieke code:", nieuweCode);
 */
