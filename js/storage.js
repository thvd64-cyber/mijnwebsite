// storage.js

const STORAGE_KEY = 'stamboomData';

/**
 * Haalt alle stamboom data uit localStorage
 */
function clearStamboomStorage() {
    localStorage.removeItem(STORAGE_KEY);
    console.log('Stamboom localStorage is leeggemaakt.');
}

/**
 * Haalt data op uit localStorage
 */
function getStamboomData() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

/**
 * Slaat data op in localStorage
 */
function setStamboomData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
