// simulate.js
const fs = require('fs');

// We will read index.html and extract the js block
const html = fs.readFileSync('index.html', 'utf8');
const scriptMatch = html.match(/class=\"streak-display\"[\s\S]*?<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
    console.error("Could not find script");
    process.exit(1);
}

let scriptContent = scriptMatch[1];
// Mock localStorage
scriptContent = `
const localStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
};
const document = {
    addEventListener: () => {},
    getElementById: () => ({ addEventListener: () => {}, style: {} }),
    createElement: () => ({ classList: { add:()=>{} }, appendChild: () => {} }),
    createTextNode: () => ({}),
};
const window = { location: { href: '' } };
` + scriptContent;

// Remove DOMContentLoaded wrapper
scriptContent = scriptContent.replace("document.addEventListener('DOMContentLoaded', function () {", "function simulateLoad() {");
// Close the function
scriptContent += `\n
// Setup test data
localStorage.setItem('streakDataV2', JSON.stringify({
    version: 2,
    visits: ['2026-03-30'],
    freezes: 2,
    usedFreezes: [],
    lastFreezeWeek: null,
    best: 5,
    forgivenessData: {},
    checksum: null
}));

console.log("Before load: ", localStorage.getItem('streakDataV2'));
simulateLoad();
console.log("After load & save: ", localStorage.getItem('streakDataV2'));

const d2 = loadV2();
console.log("Reloaded: ", d2.visits);
`;

fs.writeFileSync('sandbox.js', scriptContent);
