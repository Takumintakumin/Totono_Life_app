import { useState, useEffect } from 'react';
import { getTodayLog } from '../utils/storage';
import { calculateExperience, addExperience } from '../utils/character';
import { AppData, DayLog, Mood } from '../types';

interface EveningRoutineProps {
  data: AppData;
  updateData: (updater: (prev: AppData) => AppData) => void;
}

export default function EveningRoutine({ data, updateData }: EveningRoutineProps) {
  const [log, setLog] = useState<DayLog>(getTodayLog(data));
  const [showGoodNight, setShowGoodNight] = useState(false);

  useEffect(() => {
    const todayLog = getTodayLog(data);
    setLog(todayLog);
  }, [data]);

  const toggleRoutine = (id: string) => {
    updateData((prev) => {
      const today = new Date().toISOString().split('T')[0];
      const todayLog = getTodayLog(prev);
      
      const updatedRoutines = todayLog.evening.routines.map((routine) =>
        routine.id === id
          ? { ...routine, completed: !routine.completed }
          : routine
      );

      const allCompleted = updatedRoutines.every((r) => r.completed);
      const wasAlreadyCompleted = todayLog.evening.completed;

      const newLog: DayLog = {
        ...todayLog,
        evening: {
          ...todayLog.evening,
          routines: updatedRoutines,
          completed: allCompleted,
        },
      };

      // 経験値計算
      const completedCount = updatedRoutines.filter((r) => r.completed).length;
      const exp = calculateExperience(
        completedCount,
        updatedRoutines.length,
        allCompleted
      );

      const updatedCharacter = addExperience(prev.character, exp);

      // ログを更新
      const updatedLogs = prev.dayLogs.map((l) =>
        l.date === today ? newLog : l
      );
      if (!updatedLogs.find((l) => l.date === today)) {
        updatedLogs.push(newLog);
      }

      return {
        ...prev,
        character: updatedCharacter,
        dayLogs: updatedLogs,
      };
    });
  };

  const setMood = (mood: Mood) => {
    updateData((prev) => {
      const today = new Date().toISOString().split('T')[0];
      const todayLog = getTodayLog(prev);
      
      const newLog: DayLog = {
        ...todayLog,
        evening: {
          ...todayLog.evening,
          mood,
        },
      };

      const updatedLogs = prev.dayLogs.map((l) =>
        l.date === today ? newLog : l
      );
      if (!updatedLogs.find((l) => l.date === today)) {
        updatedLogs.push(newLog);
      }

      return {
        ...prev,
        dayLogs: updatedLogs,
      };
    });
  };

  const handleGoodNight = () => {
    if (log.evening.completed) {
      setShowGoodNight(true);
      setTimeout(() => setShowGoodNight(false), 3000);
    }
  };

  const completedCount = log.evening.routines.filter((r) => r.completed).length;
  const totalCount = log.evening.routines.length;

  return (
    <div>
      <div className="card">
        <h1 className="card-title">🌙 夜ルーティン</h1>
        
        <div style={{ marginBottom: '1rem', textAlign: 'center', color: '#666' }}>
          進捗: {completedCount} / {totalCount}
        </div>

        <ul className="routine-list">
          {log.evening.routines.map((routine) => (
            <li
              key={routine.id}
              className={`routine-item ${routine.completed ? 'completed' : ''}`}
              onClick={() => toggleRoutine(routine.id)}
            >
              <input
                type="checkbox"
                className="routine-checkbox"
                checked={routine.completed}
                onChange={() => toggleRoutine(routine.id)}
                onClick={(e) => e.stopPropagation()}
              />
              <span className="routine-text">{routine.text}</span>
            </li>
          ))}
        </ul>

        {log.evening.completed && (
          <div style={{ textAlign: 'center', marginTop: '1rem', color: '#28a745', fontWeight: 600 }}>
            🎉 今日の夜ルーティン完了！
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="card-title" style={{ fontSize: '1.25rem' }}>
          今日の気分は？
        </h2>
        <div className="mood-selector">
          <button
            className={`mood-button ${log.evening.mood === 'happy' ? 'selected' : ''}`}
            onClick={() => setMood('happy')}
            title="良い"
          >
            🙂
          </button>
          <button
            className={`mood-button ${log.evening.mood === 'neutral' ? 'selected' : ''}`}
            onClick={() => setMood('neutral')}
            title="普通"
          >
            😐
          </button>
          <button
            className={`mood-button ${log.evening.mood === 'sad' ? 'selected' : ''}`}
            onClick={() => setMood('sad')}
            title="良くない"
          >
            😞
          </button>
        </div>
      </div>

      {log.evening.completed && (
        <button className="button" onClick={handleGoodNight}>
          おやすみモード 🌙
        </button>
      )}

      {showGoodNight && (
        <div className="bonus-message">
          🌙 おやすみなさい 🌙<br />
          キャラが眠りにつきました...
        </div>
      )}
    </div>
  );
}

