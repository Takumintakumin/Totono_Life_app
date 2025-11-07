import { useEffect, useMemo, useState } from 'react';
import { AppData, DayLog, Mood, RoutineItem } from '../types';
import { getTodayLog } from '../utils/api';
import { addExperience, calculateExperience } from '../utils/character';

type RoutineSection = 'morning' | 'evening';
type RoutineFilter = 'all' | RoutineSection;

interface RoutineDashboardProps {
  data: AppData;
  updateData: (updater: (prev: AppData) => AppData) => void;
  initialSection?: RoutineFilter;
}

export default function RoutineDashboard({ data, updateData, initialSection = 'all' }: RoutineDashboardProps) {
  const [log, setLog] = useState<DayLog>(() => getTodayLog(data));
  const [filter, setFilter] = useState<RoutineFilter>(initialSection);
  const [showMorningBonus, setShowMorningBonus] = useState(false);
  const [showEveningBonus, setShowEveningBonus] = useState(false);
  const [showGoodNight, setShowGoodNight] = useState(false);

  useEffect(() => {
    setLog(getTodayLog(data));
  }, [data]);

  const morningProgress = useMemo(() => {
    const completed = log.morning.routines.filter((routine) => routine.completed).length;
    const total = log.morning.routines.length || 1;
    return {
      completed,
      total,
      ratio: Math.round((completed / total) * 100),
    };
  }, [log.morning.routines]);

  const eveningProgress = useMemo(() => {
    const completed = log.evening.routines.filter((routine) => routine.completed).length;
    const total = log.evening.routines.length || 1;
    return {
      completed,
      total,
      ratio: Math.round((completed / total) * 100),
    };
  }, [log.evening.routines]);

  const handleToggleRoutine = (section: RoutineSection, id: string) => {
    updateData((prev) => {
      const today = new Date().toISOString().split('T')[0];
      const todayLog = getTodayLog(prev);
      const sectionState = section === 'morning' ? todayLog.morning : todayLog.evening;

      const updatedRoutines = sectionState.routines.map((routine: RoutineItem) =>
        routine.id === id ? { ...routine, completed: !routine.completed } : routine
      );

      const allCompleted = updatedRoutines.length > 0 && updatedRoutines.every((routine) => routine.completed);
      const wasCompleted = sectionState.completed;

      if (section === 'morning') {
        if (allCompleted && !wasCompleted) {
          setShowMorningBonus(true);
          setTimeout(() => setShowMorningBonus(false), 3000);
          window.charAction?.('morning');
        } else if (!allCompleted && wasCompleted) {
          window.charAction?.('miss');
        }
      } else {
        if (allCompleted && !wasCompleted) {
          setShowEveningBonus(true);
          setTimeout(() => setShowEveningBonus(false), 3000);
          window.charAction?.('night');
        } else if (!allCompleted && wasCompleted) {
          window.charAction?.('miss');
        }
      }

      const newSectionState = {
        ...sectionState,
        routines: updatedRoutines,
        completed: allCompleted,
      };

      const newLog: DayLog =
        section === 'morning'
          ? { ...todayLog, morning: newSectionState }
          : { ...todayLog, evening: newSectionState };

      const updatedLogs = prev.dayLogs.some((entry) => entry.date === today)
        ? prev.dayLogs.map((entry) => (entry.date === today ? newLog : entry))
        : [...prev.dayLogs, newLog];

      const completedCount = updatedRoutines.filter((routine) => routine.completed).length;
      const exp = calculateExperience(completedCount, updatedRoutines.length, allCompleted);
      const updatedCharacter = addExperience(prev.character, exp);

      return {
        ...prev,
        character: updatedCharacter,
        dayLogs: updatedLogs,
      };
    });
  };

  const handleMoodSelect = (mood: Mood) => {
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

      const updatedLogs = prev.dayLogs.some((entry) => entry.date === today)
        ? prev.dayLogs.map((entry) => (entry.date === today ? newLog : entry))
        : [...prev.dayLogs, newLog];

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

  useEffect(() => {
    if (initialSection !== filter) {
      setFilter(initialSection);
    }
  }, [initialSection]);

  const shouldShowSection = (section: RoutineSection) => filter === 'all' || filter === section;

  return (
    <div className="routine-dashboard">
      <div className="card">
        <h1 className="card-title">🕒 今日のルーティン</h1>
        <p style={{ color: '#546854', marginBottom: '1.25rem', textAlign: 'center' }}>
          朝と夜の習慣をここでまとめてチェックしましょう。
        </p>

        <div className="routine-filter">
          <button
            type="button"
            className={`routine-filter-button ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            すべて
          </button>
          <button
            type="button"
            className={`routine-filter-button ${filter === 'morning' ? 'active' : ''}`}
            onClick={() => setFilter('morning')}
          >
            🌅 朝
          </button>
          <button
            type="button"
            className={`routine-filter-button ${filter === 'evening' ? 'active' : ''}`}
            onClick={() => setFilter('evening')}
          >
            🌙 夜
          </button>
        </div>

        <div className="routine-progress">
          <div>
            <span className="routine-progress-label">朝</span>
            <span className="routine-progress-value">
              {morningProgress.completed} / {morningProgress.total}（{morningProgress.ratio}%）
            </span>
          </div>
          <div>
            <span className="routine-progress-label">夜</span>
            <span className="routine-progress-value">
              {eveningProgress.completed} / {eveningProgress.total}（{eveningProgress.ratio}%）
            </span>
          </div>
        </div>
      </div>

      {shouldShowSection('morning') && (
        <div className="card routine-section">
          <div className="routine-section-header">
            <h2 className="card-title" style={{ marginBottom: '0.75rem' }}>
              🌅 朝ルーティン
            </h2>
            <span className="routine-section-caption">一日のスタートを整えましょう</span>
          </div>

          <ul className="routine-list">
            {log.morning.routines.map((routine) => (
              <li
                key={routine.id}
                className={`routine-item ${routine.completed ? 'completed' : ''}`}
                onClick={() => handleToggleRoutine('morning', routine.id)}
              >
                <input
                  type="checkbox"
                  className="routine-checkbox"
                  checked={routine.completed}
                  onChange={() => handleToggleRoutine('morning', routine.id)}
                  onClick={(event) => event.stopPropagation()}
                />
                <span className="routine-text">{routine.text}</span>
              </li>
            ))}
          </ul>

          {showMorningBonus && (
            <div className="bonus-message" style={{ marginTop: '1rem' }}>
              ✨ Good Morning Bonus! ✨<br />
              全達成おめでとうございます！
            </div>
          )}

          {log.morning.completed && (
            <div style={{ textAlign: 'center', marginTop: '1rem', color: '#28a745', fontWeight: 600 }}>
              🎉 朝のルーティン完了！
            </div>
          )}
        </div>
      )}

      {shouldShowSection('evening') && (
        <div className="card routine-section">
          <div className="routine-section-header">
            <h2 className="card-title" style={{ marginBottom: '0.75rem' }}>
              🌙 夜ルーティン
            </h2>
            <span className="routine-section-caption">一日の終わりを整えましょう</span>
          </div>

          <ul className="routine-list">
            {log.evening.routines.map((routine) => (
              <li
                key={routine.id}
                className={`routine-item ${routine.completed ? 'completed' : ''}`}
                onClick={() => handleToggleRoutine('evening', routine.id)}
              >
                <input
                  type="checkbox"
                  className="routine-checkbox"
                  checked={routine.completed}
                  onChange={() => handleToggleRoutine('evening', routine.id)}
                  onClick={(event) => event.stopPropagation()}
                />
                <span className="routine-text">{routine.text}</span>
              </li>
            ))}
          </ul>

          {showEveningBonus && (
            <div className="bonus-message" style={{ marginTop: '1rem' }}>
              🌙 Night Routine Bonus! 🌙<br />
              今日もお疲れさまでした！
            </div>
          )}

          {log.evening.completed && (
            <div style={{ textAlign: 'center', marginTop: '1rem', color: '#28a745', fontWeight: 600 }}>
              🎉 夜のルーティン完了！
            </div>
          )}

          <div className="mood-selector" style={{ marginTop: '1.5rem' }}>
            <button
              className={`mood-button ${log.evening.mood === 'happy' ? 'selected' : ''}`}
              onClick={() => handleMoodSelect('happy')}
              title="良い"
            >
              🙂
            </button>
            <button
              className={`mood-button ${log.evening.mood === 'neutral' ? 'selected' : ''}`}
              onClick={() => handleMoodSelect('neutral')}
              title="普通"
            >
              😐
            </button>
            <button
              className={`mood-button ${log.evening.mood === 'sad' ? 'selected' : ''}`}
              onClick={() => handleMoodSelect('sad')}
              title="良くない"
            >
              😞
            </button>
          </div>

          <button className="button" onClick={handleGoodNight} disabled={!log.evening.completed}>
            おやすみモード 🌙
          </button>

          {showGoodNight && (
            <div className="bonus-message" style={{ marginTop: '1rem' }}>
              🌙 おやすみなさい 🌙<br />
              キャラが眠りにつきました...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

