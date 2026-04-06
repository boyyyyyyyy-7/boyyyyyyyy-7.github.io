function loadV2() {
            let parsed = null;
            try {
                const stored = localStorage.getItem(STORAGE_KEY_V2);
                if (stored) {
                    // Try decrypting first
                    if (typeof Obfuscator !== 'undefined') {
                        parsed = Obfuscator.decrypt(stored);
                    }
                    // Fallback to plain JSON if decryption failed or not ready
                    if (!parsed && stored.startsWith('{')) {
                        parsed = JSON.parse(stored);
                    }
                }
            } catch {
                parsed = null;
            }

            const base = {
                version: 2,
                visits: [],
                freezes: Number(localStorage.getItem('streakFreezes') || 0) || 0,
                usedFreezes: [],
                lastFreezeWeek: null,
                best: Number(localStorage.getItem('bestStreak') || 0) || 0,
                forgivenessData: {},
                checksum: null
            };

            if (!parsed || typeof parsed !== 'object') return base;

            let loadedData = {
                ...base,
                version: 2,
                visits: Array.isArray(parsed.visits) ? parsed.visits : base.visits,
                freezes: Number.isFinite(parsed.freezes) ? parsed.freezes : base.freezes,
                usedFreezes: Array.isArray(parsed.usedFreezes) ? parsed.usedFreezes : base.usedFreezes,
                lastFreezeWeek: typeof parsed.lastFreezeWeek === 'string' ? parsed.lastFreezeWeek : base.lastFreezeWeek,
                best: Number.isFinite(parsed.best) ? parsed.best : base.best,
                forgivenessData: (parsed.forgivenessData && typeof parsed.forgivenessData === 'object') ? parsed.forgivenessData : base.forgivenessData,
                checksum: parsed.checksum || null
            };

            if (!validateStreakData(loadedData)) {
                localStorage.removeItem(STORAGE_KEY_V2);
                localStorage.removeItem('streakFreezes');
                localStorage.removeItem('bestStreak');
                return base;
            }

            return loadedData;
        }