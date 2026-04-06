function validateStreakData(data) {
            if (data.freezes < 0 || data.freezes > 1000) return false;
            if (data.best < 0 || data.best > 10000) return false;
            if (!Array.isArray(data.visits) || !Array.isArray(data.usedFreezes)) return false;

            const visitSet = new Set(data.visits);
            if (visitSet.size !== data.visits.length) return false;

            const now = new Date();
            const maxFutureDays = 1;
            for (const visit of data.visits) {
                try {
                    const visitDate = parseDayKey(visit);
                    if (!visitDate) return false;
                    if (visitDate > new Date(now.getTime() + maxFutureDays * 24 * 60 * 60 * 1000)) return false;
                } catch {
                    return false;
                }
            }

            for (const freeze of data.usedFreezes) {
                try {
                    const freezeDate = parseDayKey(freeze);
                    if (!freezeDate) return false;
                } catch {
                    return false;
                }
            }

            return true;
        }