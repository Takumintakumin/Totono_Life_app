import { useState, useEffect } from 'react';
import { getTodayLog } from '../utils/storage';
import { calculateExperience, addExperience } from '../utils/character';
import { AppData, DayLog } from '../types';

interface MorningRoutineProps {
  data: AppData;
  updateData: (updater: (prev: AppData) => AppData) => void;
}

export default function MorningRoutine({ data, updateData }: MorningRoutineProps) {
  const [log, setLog] = useState<DayLog>(getTodayLog(data));
  const [showBonus, setShowBonus] = useState(false);

  useEffect(() => {
    const todayLog = getTodayLog(data);
    setLog(todayLog);
  }, [data]);

  const toggleRoutine = (id: string) => {
    updateData((prev) => {
      const today = new Date().toISOString().split('T')[0];
      const todayLog = getTodayLog(prev);
      
      const updatedRoutines = todayLog.morning.routines.map((routine) =>
        routine.id === id
          ? { ...routine, completed: !routine.completed }
          : routine
      );

      const allCompleted = updatedRoutines.every((r) => r.completed);
      const wasAlreadyCompleted = todayLog.morning.completed;

      const newLog: DayLog = {
        ...todayLog,
        morning: {
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

      // 全達成ボーナス（初回のみ）
      if (allCompleted && !wasAlreadyCompleted) {
        setShowBonus(true);
        setTimeout(() => setShowBonus(false), 3000);
      }

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

  const completedCount = log.morning.routines.filter((r) => r.completed).length;
  const totalCount = log.morning.routines.length;

  return (
    <div className="card">
      <h1 className="card-title">🌅 朝ルーティン</h1>
      
      <div style={{ marginBottom: '1rem', textAlign: 'center', color: '#666' }}>
        進捗: {completedCount} / {totalCount}
      </div>

      <ul className="routine-list">
        {log.morning.routines.map((routine) => (
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

      {showBonus && (
        <div className="bonus-message">
          ✨ Good Morning Bonus! ✨<br />
          全達成おめでとうございます！
        </div>
      )}

      {log.morning.completed && (
        <div style={{ textAlign: 'center', marginTop: '1rem', color: '#28a745', fontWeight: 600 }}>
          🎉 今日の朝ルーティン完了！
        </div>
      )}
    </div>
  );
}

