const { JSDOM } = require("jsdom");
const dom = new JSDOM(\`<!DOCTYPE html><html><body>
    <div id="monthYear"></div>
    <div id="calendarDays"></div>
</body></html>\`);

const window = dom.window;
const document = window.document;

function normalizeToNoon(date) {
    const d = new Date(date);
    d.setHours(12, 0, 0, 0);
    return d;
}
function toDayKey(date) {
    const d = normalizeToNoon(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return \`\${y}-\${m}-\${day}\`;
}
function parseDayKey(key) {
    if (!key) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
        const d = new Date(\`\${key}T12:00:00\`);
        return Number.isNaN(d.getTime()) ? null : normalizeToNoon(d);
    }
    return null;
}
function normalizeDayKey(value) {
    const parsed = parseDayKey(value);
    return parsed ? toDayKey(parsed) : null;
}

const currentYear = 2026;
const currentMonth = 3; // April
const calendarDays = document.getElementById('calendarDays');
const monthYear = document.getElementById('monthYear');

function computeEffectiveUsedSet(data, date = new Date()) {
    return { set: new Set(), freezesNew: 0 };
}

window.updateCalendar = function (data) {
    const visitSet = new Set((data.visits || []).map(normalizeDayKey).filter(Boolean));
    const result = computeEffectiveUsedSet(data, new Date());
    const effectiveUsed = result.set;

    const now = new Date('2026-04-03T12:00:00'); // Force now to be April 3rd
    const year = currentYear;
    const month = currentMonth;

    const todayKey = toDayKey(normalizeToNoon(now));

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let date = 1; date <= daysInMonth; date++) {
        const d = document.createElement('div');
        d.className = 'day';
        const dayDate = new Date(year, month, date, 12, 0, 0, 0);
        const dow = dayDate.getDay();
        const key = toDayKey(dayDate);

        if (dow === 0 || dow === 6) d.classList.add('weekend');
        if (key === todayKey) d.classList.add('today');

        if (visitSet.has(key)) {
            d.classList.add('practiced');
        } else if (effectiveUsed.has(key)) {
            d.classList.add('used-freeze');
        }

        if (dow === 1) {
            d.classList.add('is-monday');
            const dot = document.createElement('span');
            dot.className = 'monday-dot';
            d.appendChild(dot);
        }

        d.appendChild(document.createTextNode(String(date)));
        calendarDays.appendChild(d);
    }
};

const data = { visits: ['2026-04-03'] };
window.updateCalendar(data);

console.log(calendarDays.innerHTML);
