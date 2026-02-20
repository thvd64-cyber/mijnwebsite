// schema.js - next-level lean, future-proof
(function () {
    'use strict';

    const FIELDS = [
        "ID",
        "Doopnaam",
        "Roepnaam",
        "Prefix",
        "Achternaam",
        "Geslacht",
        "Geboortedatum",
        "Geboorteplaats",
        "Overlijdensdatum",
        "Overlijdensplaats",
        "VaderID",
        "MoederID",
        "PartnerID",      // meerdere partners via pipe |
        "Huwelijksdatum",
        "Huwelijksplaats",
        "Opmerkingen",
        "Adres",
        "ContactInfo",
        "URL"
    ];

    const DATE_FIELDS = ["Geboortedatum", "Overlijdensdatum", "Huwelijksdatum"];
    const GESLACHT_VALUES = {
        "nl": ["M", "V", "X"],
        "en": ["M", "F", "X"]
    };
    const DEFAULT_GESLACHT = "X";

    function getFields() { return FIELDS; }
    function getHeader() { return FIELDS.join(","); }

    function validateHeader(headerLine) {
        return headerLine.trim() === getHeader();
    }

    function createEmptyPersoon() {
        const obj = {};
        FIELDS.forEach(field => obj[field] = "");
        obj.Geslacht = DEFAULT_GESLACHT;
        return obj;
    }

    // lean validation: check alleen verplicht + bekende geslachten
    function validatePerson(obj, lang = "nl") {
        if (!obj.ID) return false;
        if (!GESLACHT_VALUES[lang].includes(obj.Geslacht)) return false;
        return true;
    }

    // CSV ↔ Object
    function objectToCSVRow(obj) {
        return FIELDS.map(field => {
            let value = obj[field] ?? "";
            if (DATE_FIELDS.includes(field) && value instanceof Date) {
                value = value.toISOString().split("T")[0]; // yyyy-mm-dd
            }
            return `"${String(value).replace(/"/g, '""')}"`;
        }).join(",");
    }

    function csvRowToObject(row) {
        const values = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        if (values.length !== FIELDS.length) {
            console.error(`CSV kolom mismatch: verwacht ${FIELDS.length}, kreeg ${values.length}`);
            return null;
        }
        const obj = {};
        FIELDS.forEach((field, i) => {
            let value = values[i] || "";
            value = value.replace(/^"|"$/g, "").replace(/""/g, '"');
            if (DATE_FIELDS.includes(field) && value) {
                const date = new Date(value);
                obj[field] = isNaN(date) ? "" : date;
            } else {
                obj[field] = value;
            }
        });
        return obj;
    }

    // Helpers voor partner scheiding
    function parsePartners(partnerField) {
        return partnerField ? partnerField.split("|").map(s => s.trim()).filter(Boolean) : [];
    }
    function stringifyPartners(partnersArray) {
        return partnersArray.join("|");
    }

    function getFieldCount() { return FIELDS.length; }

    window.StamboomSchema = {
        fields: FIELDS,
        header: getHeader,
        validateHeader,
        empty: createEmptyPersoon,
        toCSV: objectToCSVRow,
        fromCSV: csvRowToObject,
        validate: validatePerson,
        count: getFieldCount,
        parsePartners,
        stringifyPartners,
        GESLACHT_VALUES
    };

})();
