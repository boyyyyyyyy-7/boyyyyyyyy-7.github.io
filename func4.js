function loadV2() {
            let parsed = null;
            try {
                console.log('Attempting to load streak data V2...');
                const stored = localStorage.getItem(STORAGE_KEY_V2);
                if (stored) {
                    console.log('Stored data found. Checking Obfuscator status...');
                    // Try decrypting first
                    if (typeof Obfuscator !== 'undefined') {
                        console.log('Obfuscator is defined. Attempting decryption...');
                        parsed = Obfuscator.decrypt(stored);
                        if (parsed) {
                            console.log('Decryption successful.');
                        } else {
                            console.warn('Decryption failed. Falling back to plain JSON parse.');
                        }
                    } else {
                        console.warn('Obfuscator is NOT defined. Attempting plain JSON parse.');
                    }
                    // Fallback to plain JSON if decryption failed or not ready
                    if (!parsed && stored.startsWith('{')) {
                        console.log('Attempting plain JSON parse...');
                        parsed = JSON.parse(stored);
                        if (parsed) {
                            console.log('Plain JSON parse successful.');
                        } else {
                            console.warn('Plain JSON parse failed.');
                        }
                    }
                } else {
                    console.log('No stored data found for V2.');
                }
            } catch (e) {
                console.error('Error loading V2 data:', e);
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

            if (!parsed || typeof parsed !== 'object') {
                console.log('No valid V2 data parsed. Returning base data.');
                return base;
            }

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
                console.warn('Loaded V2 data failed validation. Clearing and returning base data.');
                localStorage.removeItem(STORAGE_KEY_V2);
                localStorage.removeItem('streakFreezes');
                localStorage.removeItem('bestStreak');
                return base;
            }
            console.log('V2 data loaded and validated successfully.');
            return loadedData;
        }