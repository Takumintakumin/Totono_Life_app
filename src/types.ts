export type Mood = 'happy' | 'neutral' | 'sad';

export type RoutineType = 'morning' | 'evening';

export type AvatarAccessory = 'none' | 'hat' | 'glasses' | 'scarf';

export interface AvatarConfig {
  skinTone: string;
  hairColor: string;
  clothingColor: string;
  outlineColor: string;
  accentColor: string;
  cheekColor: string;
  accessory: AvatarAccessory;
}

export interface RoutineItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface DayLog {
  date: string; // YYYY-MM-DD
  morning: {
    routines: RoutineItem[];
    completed: boolean;
  };
  evening: {
    routines: RoutineItem[];
    completed: boolean;
    mood?: Mood;
  };
}

export interface Character {
  level: number;
  experience: number;
  experienceToNext: number;
  theme: 'wizard';
  evolutionStage: number;
  lastActiveDate: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  email?: string;
  avatar: AvatarConfig;
  isRegistered: boolean;
}

export interface AppData {
  user: UserProfile;
  character: Character;
  defaultMorningRoutines: string[];
  defaultEveningRoutines: string[];
  dayLogs: DayLog[];
  settings: {
    morningNotificationTime: string; // HH:mm
    eveningNotificationTime: string; // HH:mm
  };
}

export const createDefaultAvatarConfig = (): AvatarConfig => ({
  skinTone: '#fcd7b8',
  hairColor: '#5d4632',
  clothingColor: '#7fb4ff',
  outlineColor: '#2b3a2b',
  accentColor: '#ffb26b',
  cheekColor: '#ff9bb3',
  accessory: 'none',
});


