export type Mood = 'happy' | 'neutral' | 'sad';

export type RoutineType = 'morning' | 'evening';

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

export interface AppData {
  character: Character;
  defaultMorningRoutines: string[];
  defaultEveningRoutines: string[];
  dayLogs: DayLog[];
  settings: {
    morningNotificationTime: string; // HH:mm
    eveningNotificationTime: string; // HH:mm
  };
}

