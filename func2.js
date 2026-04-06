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