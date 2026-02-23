// =======================================
// idGenerator.js
// Functie voor het automatisch genereren van unieke ID/codes
// fallback X
// =======================================
// js/idGenerator.js
(function () {
    'use strict';

    function firstLetter(value, fallback = "X") {
        if (!value || typeof value !== "string") return fallback;
        const trimmed = value.trim();
        return trimmed ? trimmed[0].toUpperCase() : fallback;
    }

    function genereerCode(persoon, bestaandeDataset) {

        if (!persoon || typeof persoon !== "object") {
            throw new Error("Ongeldig persoon-object voor ID generatie.");
        }

        const fields = window.StamboomSchema.fields;
        const idField = fields[0]; // ID is altijd eerste kolom

        // Als ID al bestaat → nooit overschrijven
        if (persoon[idField]) {
            return persoon[idField];
        }

        const basis =
            firstLetter(persoon.Doopnaam) +
            firstLetter(persoon.Roepnaam) +
            firstLetter(persoon.Achternaam) +
            firstLetter(persoon.Geslacht, "X");

        const bestaandeIDs = (bestaandeDataset || [])
            .map(p => p[idField])
            .filter(Boolean);

        let teller = 1;
        let nieuweID;

        do {
            nieuweID = basis + String(teller).padStart(5, "0");
            teller++;
        } while (bestaandeIDs.includes(nieuweID));

        return nieuweID;
    }

    window.genereerCode = genereerCode;

})();
