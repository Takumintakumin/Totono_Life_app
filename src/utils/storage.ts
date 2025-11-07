import { AppData, DayLog } from '../types';

const STORAGE_KEY = 'totono-life-data';

export const getDefaultData = (): AppData => ({
  character: {
    level: 1,
    experience: 0,
    experienceToNext: 100,
    theme: 'plant',
    evolutionStage: 0,
    lastActiveDate: new Date().toISOString().split('T')[0],
  },
  defaultMorningRoutines: [
    '歯磨き',
    '水を飲む',
    '布団をたたむ',
    'ストレッチ',
  ],
  defaultEveningRoutines: [
    '日記を書く',
    'スマホを置く',
    '明日の準備',
    '深呼吸',
  ],
  dayLogs: [],
  settings: {
    morningNotificationTime: '08:00',
    eveningNotificationTime: '22:00',
  },
});

export const loadData = (): AppData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      // デフォルト値とマージして、新しいフィールドがあれば追加
      return { ...getDefaultData(), ...data };
    }
  } catch (error) {
    console.error('Failed to load data:', error);
  }
  return getDefaultData();
};

export const saveData = (data: AppData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save data:', error);
  }
};

export const getTodayLog = (data: AppData): DayLog => {
  const today = new Date().toISOString().split('T')[0];
  let log = data.dayLogs.find((l) => l.date === today);

  if (!log) {
    log = {
      date: today,
      morning: {
        routines: data.defaultMorningRoutines.map((text, idx) => ({
          id: `morning-${idx}`,
          text,
          completed: false,
        })),
        completed: false,
      },
      evening: {
        routines: data.defaultEveningRoutines.map((text, idx) => ({
          id: `evening-${idx}`,
          text,
          completed: false,
        })),
        completed: false,
      },
    };
    data.dayLogs.push(log);
    saveData(data);
  }

  return log;
};


