<!-- js/idGenerator.js -->
  <!-- Neemt eerste letters van naam en geslacht. -->
  <!-- Voegt oplopend nummer van 3 cijfers toe. -->
  <!-- Controleert dat ID uniek is in dataset. -->
  <!-- Gebruikt fallback als een veld leeg is. -->
(function () {
    'use strict'; // Strikte modus om fouten en slecht gebruik van variabelen te voorkomen
    function firstLetter(value, fallback = "X") { // Haalt de eerste letter van een string, fallback indien leeg
        if (!value || typeof value !== "string") return fallback; // Als waarde leeg of geen string → fallback
        const trimmed = value.trim(); // Verwijdert spaties voor en na
        return trimmed ? trimmed[0].toUpperCase() : fallback; // Geeft hoofdletter eerste teken of fallback
    }
    function genereerCode(persoon, bestaandeDataset) { // Genereert unieke ID voor een persoon
        if (!persoon || typeof persoon !== "object") { // Check of het persoon-object geldig is
            throw new Error("Ongeldig persoon-object voor ID generatie.");
        }
        const fields = window.StamboomSchema.fields; // Haalt alle velden van het schema op
        const idField = fields[0]; // ID is altijd eerste kolom in het schema
        if (persoon[idField]) { // Als er al een ID is → niet overschrijven
            return persoon[idField];
        }
        const basis =
            firstLetter(persoon.Doopnaam) + // Eerste letter doopnaam
            firstLetter(persoon.Roepnaam) + // Eerste letter roepnaam
            firstLetter(persoon.Achternaam) + // Eerste letter achternaam
            firstLetter(persoon.Geslacht, "Y"); // Eerste letter geslacht of fallback Y
        const bestaandeIDs = (bestaandeDataset || []) // Bestaande dataset checken
            .map(p => p[idField]) // Alleen bestaande ID's eruit halen
            .filter(Boolean); // Geen lege waarden meenemen
        let teller = 1; // Start teller op 1
        let nieuweID; // Variabele voor de nieuwe ID
        do {
            nieuweID = basis + String(teller).padStart(3, "0"); // <-- Aantal cijfers (3) na letters
            teller++; // Teller verhogen voor volgende poging
        } while (bestaandeIDs.includes(nieuweID)); // Blijf controleren tot unieke ID gevonden is
        return nieuweID; // Geef de nieuwe unieke ID terug
    }
    window.genereerCode = genereerCode; // Maakt functie globaal beschikbaar
})();
