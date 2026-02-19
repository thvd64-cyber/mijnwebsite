// storage.js
// Centrale opslagmodule voor Stamboom applicatie
// Production-proof versie

(function () {
    'use strict';

    const STORAGE_KEY = 'stamboomData';
    const VERSION_KEY = 'stamboomDataVersion';
    const STORAGE_VERSION = '2.0.0';

    /**
     * Veilig JSON parsen
     */
    function safeParse(json) {
        try {
            return JSON.parse(json);
        } catch (error) {
            console.error('JSON parse fout in localStorage:', error);
            return null;
        }
    }

    /**
     * Controleert of object geldige persoon structuur heeft
     */
    function isValidPersoon(p) {
        return (
            p &&
            typeof p === 'object' &&
            typeof p.ID === 'string' &&
            typeof p.Doopnaam === 'string' &&
            typeof p.Achternaam === 'string'
        );
    }

    /**
     * Valideert volledige dataset
     */
    function validateDataset(data) {
        if (!Array.isArray(data)) return false;

        for (let i = 0; i < data.length; i++) {
            if (!isValidPersoon(data[i])) {
                console.warn('Ongeldige persoon gevonden op index:', i);
                return false;
            }
        }

        return true;
    }

    /**
     * Reset storage veilig
     */
    function clearStamboomStorage() {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem(VERSION_KEY, STORAGE_VERSION);
        console.warn('Stamboom localStorage is gereset.');
    }

    /**
     * Controleert versie en reset indien nodig
     */
    function checkStorageVersion() {
        const storedVersion = localStorage.getItem(VERSION_KEY);

        if (storedVersion !== STORAGE_VERSION) {
            console.warn('Storage versie mismatch. Reset wordt uitgevoerd.');
            clearStamboomStorage();
        }
    }

    /**
     * Haalt dataset veilig op
     */
    function getStamboomData() {
        checkStorageVersion();

        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];

        const parsed = safeParse(raw);
        if (!parsed) {
            console.warn('Corrupt JSON gedetecteerd. Storage wordt gereset.');
            clearStamboomStorage();
            return [];
        }

        if (!validateDataset(parsed)) {
            console.warn('Dataset structuur ongeldig. Storage wordt gereset.');
            clearStamboomStorage();
            return [];
        }

        return parsed;
    }

    /**
     * Slaat dataset veilig op
     */
    function setStamboomData(data) {
        if (!validateDataset(data)) {
            console.error('Opslaan geweigerd: dataset ongeldig.');
            return false;
        }

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            localStorage.setItem(VERSION_KEY, STORAGE_VERSION);
            return true;
        } catch (error) {
            console.error('Fout bij opslaan in localStorage:', error);
            return false;
        }
    }

    /**
     * Voegt persoon toe met duplicate ID check
     */
    function addPersoon(persoon) {
        const data = getStamboomData();

        const exists = data.some(p => p.ID === persoon.ID);
        if (exists) {
            console.error('Duplicate ID gedetecteerd:', persoon.ID);
            return false;
        }

        data.push(persoon);
        return setStamboomData(data);
    }

    /**
     * Vervangt volledige dataset (bij import)
     */
    function replaceDataset(newData) {
        clearStamboomStorage();
        return setStamboomData(newData);
    }

    /**
     * Expose publieke API
     */
    window.StamboomStorage = {
        get: getStamboomData,
        set: setStamboomData,
        add: addPersoon,
        replace: replaceDataset,
        clear: clearStamboomStorage,
        version: STORAGE_VERSION
    };

})();
