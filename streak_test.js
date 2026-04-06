// streak_test.js

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
    return `${y}-${m}-${day}`;
}

function parseDayKey(key) {
    if (!key) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
        const d = new Date(`${key}T12:00:00`);
        return Number.isNaN(d.getTime()) ? null : normalizeToNoon(d);
    }
    return null;
}

function normalizeDayKey(value) {
    const parsed = parseDayKey(value);
    return parsed ? toDayKey(parsed) : null;
}

function getDayDiff(a, b) {
    const msPerDay = 1000 * 60 * 60 * 24;
    const start = normalizeToNoon(a);
    const end = normalizeToNoon(b);
    return Math.round((end - start) / msPerDay);
}

function computeEffectiveUsedSet(data, date = new Date()) {
    const today = normalizeToNoon(date);
    const todayKey = toDayKey(today);
    const visitsSet = new Set((data.visits || []).map(normalizeDayKey).filter(Boolean));
    const originalUsedSet = new Set((data.usedFreezes || []).map(normalizeDayKey).filter(Boolean));
    const normalizedVisitsArr = (data.visits || []).map(normalizeDayKey).filter(Boolean);
    if (normalizedVisitsArr.length === 0) return { set: new Set(), freezesNew: 0 };
    let earliestVisitStr = normalizedVisitsArr.reduce((min, v) => v < min ? v : min, normalizedVisitsArr[0]);
    let available = Math.max(0, Number(data.freezes) || 0);

    let freezesNew = 0;
    const effectiveUsed = new Set();
    for (const key of originalUsedSet) effectiveUsed.add(key);

    let cursor = new Date(today);
    cursor.setHours(12, 0, 0, 0);

    let pending = [];
    let foundBridge = false;

    while (getDayDiff(cursor, today) < 365) {
        const key = toDayKey(cursor);
        if (key < earliestVisitStr) break;

        const hasVisit = visitsSet.has(key);
        const isWeekend = cursor.getDay() === 0 || cursor.getDay() === 6;

        if (hasVisit || originalUsedSet.has(key)) {
            foundBridge = true;
            pending.forEach(p => {
                effectiveUsed.add(p.key);
                if (p.type === 'freeze') {
                    if (p.key < todayKey) freezesNew++;
                }
            });
            pending = [];
        } else if (!isWeekend) {
            if (key === todayKey) {
                pending.push({ key: key, type: 'grace' });
            } else if (available > 0) {
                pending.push({ key: key, type: 'freeze' });
                available--;
            } else if (data.forgivenessData && data.forgivenessData[key]) {
                pending.push({ key: key, type: 'forgiveness' });
            } else {
                break;
            }
            if (pending.length > 7) break;
        }

        cursor.setDate(cursor.getDate() - 1);
        cursor.setHours(12, 0, 0, 0);
    }

    return { set: effectiveUsed, freezesNew: freezesNew };
}

function computeStreak(data, date = new Date()) {
    const today = normalizeToNoon(date);
    const todayKey = toDayKey(today);
    const originalFreezes = Math.max(0, Number(data.freezes) || 0);

    const result = computeEffectiveUsedSet(data, today);
    const effectiveUsedSet = result.set;

    data.freezes = Math.max(0, originalFreezes - result.freezesNew);
    data.usedFreezes = Array.from(effectiveUsedSet).filter(k => k < todayKey).sort();

    let streak = 0;
    let streakActive = false;
    const visitsSet = new Set((data.visits || []).map(normalizeDayKey).filter(Boolean));

    const normalizedVisitsArr = (data.visits || []).map(normalizeDayKey).filter(Boolean);
    let earliestVisitStr = normalizedVisitsArr.length > 0 ? normalizedVisitsArr.reduce((min, v) => v < min ? v : min, normalizedVisitsArr[0]) : todayKey;

    let cursor = new Date(today);
    cursor.setHours(12, 0, 0, 0);

    while (true) {
        const key = toDayKey(cursor);
        if (key < earliestVisitStr) break;

        const isWeekend = cursor.getDay() === 0 || cursor.getDay() === 6;
        const hasVisit = visitsSet.has(key);
        const isSaved = effectiveUsedSet.has(key);

        if (hasVisit) {
            streak++;
            streakActive = true;
        } else if (isSaved) {
            if (streakActive) streak++;
        } else if (!isWeekend) {
            if (key !== todayKey || streakActive) {
                break;
            }
        }

        cursor.setDate(cursor.getDate() - 1);
        cursor.setHours(12, 0, 0, 0);
        if (getDayDiff(cursor, today) > 365) break;
    }

    data.best = Math.max(Number(data.best) || 0, streak);
    return { streak, data };
}

// TESTS
const today = new Date('2026-04-01T12:00:00'); // Note: Apr 1 2026 is a Wednesday
const yesterday = new Date('2026-03-31T12:00:00'); // Tuesday
const monday = new Date('2026-03-30T12:00:00'); // Monday
const sunday = new Date('2026-03-29T12:00:00'); // Sunday
const lastFriday = new Date('2026-03-27T12:00:00'); // Friday
const ancient = new Date('2026-01-01T12:00:00'); // Long ago

function runTest(name, data, expectedStreak) {
    const res = computeStreak(data, today);
    if (res.streak === expectedStreak) {
        console.log(`✅ PASS: ${name} -> Streak: ${res.streak}`);
    } else {
        console.log(`❌ FAIL: ${name} -> Expected ${expectedStreak}, got ${res.streak}`);
    }
}

// 1. Played Monday, missed Tuesday. Today is Wednesday, haven't played today.
runTest("Missed yesterday, no freezes", {
    visits: ['2026-03-30'],
    freezes: 0
}, 0);

// 2. Played Friday. Missed Weekend. Played Monday. Today is Wednesday (haven't played). + missed Tuesday!
runTest("Played Friday, Monday. Missed Tuesday.", {
    visits: ['2026-03-27', '2026-03-30'],
    freezes: 0
}, 0);

// 3. Played Friday. Missed Weekend. Today is Monday, haven't played.
// Wait, if today is Monday and we played Friday, streak should be 1!
const mondayToday = new Date('2026-03-30T12:00:00');
const res3 = computeStreak({ visits: ['2026-03-27'], freezes: 0 }, mondayToday);
console.log(res3.streak === 1 ? '✅ PASS: Friday to Monday skip weekend (Not played Mon yet) -> 1' : `❌ FAIL: Friday to Monday skip -> Expected 1, got ${res3.streak}`);

// 4. Played Monday, have 1 freeze. Missed Tuesday. Today is Wednesday (Not played yet).
runTest("Missed yesterday but have 1 freeze", {
    visits: ['2026-03-30'],
    freezes: 1
}, 1);

// 5. Bug scenario: Played Jan 1st. Did nothing. Today is Apr 1.
runTest("Played months ago, no freezes (The Old Bug)", {
    visits: ['2026-01-01'],
    freezes: 0
}, 0);

// 6. Played Monday, missed Tuesday, played Wednesday (Today). No freezes.
runTest("Missed yesterday, played today. Restarts stream.", {
    visits: ['2026-03-30', '2026-04-01'],
    freezes: 0
}, 1);

// 7. Played Monday, missed Tuesday (1 freeze), played Wednesday (Today).
runTest("Missed yesterday (frozen), played today.", {
    visits: ['2026-03-30', '2026-04-01'],
    freezes: 1
}, 3);

// 8. Played Monday, 3 freezes. Missed Tues, Wed, Thurs. Today is Friday (haven't played).
const fridayToday = new Date('2026-04-03T12:00:00');
const res8 = computeStreak({ visits: ['2026-03-30'], freezes: 3 }, fridayToday);
console.log(res8.streak === 1 ? '✅ PASS: 3 freezes bridging Mon to Fri (not played Fri yet) streak is 1' : `❌ FAIL: Expected 1, got ${res8.streak}`);

// 9. Played Monday, 2 freezes. Missed Tues, Wed, Thurs. Today is Friday (haven't played).
// 2 freezes are NOT ENOUGH to bridge Tues, Wed, Thurs! The whole bridge fails!
const res9 = computeStreak({ visits: ['2026-03-30'], freezes: 2 }, fridayToday);
console.log(res9.streak === 0 ? '✅ PASS: Not enough freezes to bridge! Streak should break -> 0' : `❌ FAIL: Expected 0, got ${res9.streak}`);
