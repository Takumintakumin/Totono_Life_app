export type Mood = 'happy' | 'neutral' | 'sad';

export type RoutineType = 'morning' | 'evening';

export type AvatarAccessory = 'none' | 'flower' | 'ribbon' | 'sprout';

export interface AvatarConfig {
  bodyColor: string;
  leafPrimary: string;
  leafSecondary: string;
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
  theme: 'plant' | 'animal' | 'robot';
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
  bodyColor: '#fffbe6',
  leafPrimary: '#9be07a',
  leafSecondary: '#6fb44f',
  outlineColor: '#2b3a2b',
  accentColor: '#ffd56b',
  cheekColor: '#ffd0d0',
  accessory: 'none',
});


