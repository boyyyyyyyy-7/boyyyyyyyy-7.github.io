
import { PlayerProfile } from "../types";

const STORAGE_KEY = 'ant_escape_profile_v1';

export const DEFAULT_PROFILE: PlayerProfile = {
  unlockedLevels: 1,
  gold: 0,
  selectedAnt: 'SOLDIER',
  hasSeenTutorial: false,
  sensitivity: 1.0
};

export const loadProfile = (): PlayerProfile => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Merge with default to ensure new fields exist if we update the shape later
      return { ...DEFAULT_PROFILE, ...parsed };
    } catch (e) {
      console.error("Failed to parse profile", e);
    }
  }
  return DEFAULT_PROFILE;
};

export const saveProfile = (profile: PlayerProfile) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
};
