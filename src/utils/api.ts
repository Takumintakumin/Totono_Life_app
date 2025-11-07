import { AppData, DayLog } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// 簡易的なユーザーID（実際のアプリでは認証システムから取得）
function getUserId(): string {
  let userId = localStorage.getItem('user-id');
  if (!userId) {
    userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('user-id', userId);
  }
  return userId;
}

export async function loadData(): Promise<AppData> {
  try {
    const userId = getUserId();
    const response = await fetch(`${API_BASE_URL}/data?userId=${userId}`);
    if (!response.ok) {
      throw new Error('Failed to load data');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to load data from API:', error);
    // フォールバック: ローカルストレージから読み込み
    return loadDataFromLocalStorage();
  }
}

export async function saveData(data: AppData): Promise<void> {
  try {
    const userId = getUserId();
    const response = await fetch(`${API_BASE_URL}/data?userId=${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to save data');
    }
    // 成功したらローカルストレージにもバックアップ
    saveDataToLocalStorage(data);
  } catch (error) {
    console.error('Failed to save data to API:', error);
    // フォールバック: ローカルストレージに保存
    saveDataToLocalStorage(data);
  }
}

// ローカルストレージのフォールバック関数
const STORAGE_KEY = 'totono-life-data';

function loadDataFromLocalStorage(): AppData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      return { ...getDefaultData(), ...data };
    }
  } catch (error) {
    console.error('Failed to load data from localStorage:', error);
  }
  return getDefaultData();
}

function saveDataToLocalStorage(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save data to localStorage:', error);
  }
}

function getDefaultData(): AppData {
  return {
    character: {
      level: 1,
      experience: 0,
      experienceToNext: 100,
      theme: 'animal', // デフォルトを動物に変更
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
  };
}

export function getTodayLog(data: AppData): DayLog {
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
    // 非同期で保存（エラーは無視）
    saveData(data).catch(() => {});
  }

  return log;
}

