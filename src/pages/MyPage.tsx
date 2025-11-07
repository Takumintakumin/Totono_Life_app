import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AppData, UserProfile } from '../types';

interface MyPageProps {
  data: AppData;
  updateData: (updater: (prev: AppData) => AppData) => void;
  onProfileUpdated: (user: UserProfile) => void;
}

export default function MyPage({ data, updateData, onProfileUpdated }: MyPageProps) {
  const { user } = data;

  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [email, setEmail] = useState(user.email || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 設定関連のstate
  const [morningRoutines, setMorningRoutines] = useState(data.defaultMorningRoutines);
  const [eveningRoutines, setEveningRoutines] = useState(data.defaultEveningRoutines);
  const [morningTime, setMorningTime] = useState(data.settings.morningNotificationTime);
  const [eveningTime, setEveningTime] = useState(data.settings.eveningNotificationTime);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(user.displayName || '');
  }, [user.displayName]);

  useEffect(() => {
    setEmail(user.email || '');
  }, [user.email]);

  useEffect(() => {
    setMorningRoutines(data.defaultMorningRoutines);
  }, [data.defaultMorningRoutines]);

  useEffect(() => {
    setEveningRoutines(data.defaultEveningRoutines);
  }, [data.defaultEveningRoutines]);

  useEffect(() => {
    setMorningTime(data.settings.morningNotificationTime);
  }, [data.settings.morningNotificationTime]);

  useEffect(() => {
    setEveningTime(data.settings.eveningNotificationTime);
  }, [data.settings.eveningNotificationTime]);

  const notificationPreview = useMemo(() => {
    const now = new Date();

    const parse = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      const scheduled = new Date(now);
      scheduled.setHours(hours, minutes, 0, 0);
      if (scheduled <= now) {
        scheduled.setDate(scheduled.getDate() + 1);
      }
      return scheduled;
    };

    const nextMorning = parse(morningTime);
    const nextEvening = parse(eveningTime);

    const format = (date: Date) =>
      date.toLocaleString('ja-JP', {
        month: 'short',
        day: 'numeric',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });

    return {
      morning: format(nextMorning),
      evening: format(nextEvening),
    };
  }, [morningTime, eveningTime]);

  const templates: Record<'morning' | 'evening', string[][]> = {
    morning: [
      ['水を飲む', 'ストレッチ', '朝日を浴びる'],
      ['ベッドメイキング', '瞑想', '軽く散歩'],
      ['日記を書く', '今日のタスク確認', '深呼吸']
    ],
    evening: [
      ['夕食後の片付け', '明日の準備', 'ストレッチ'],
      ['湯船につかる', '読書', 'スマホを手放す'],
      ['今日を振り返る', '感謝を書く', '就寝準備']
    ],
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!displayName.trim()) {
      setError('表示名を入力してください');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const updatedUser: UserProfile = {
        ...user,
        displayName: displayName.trim(),
        email: email.trim(),
      };
      updateData((prev) => ({
        ...prev,
        user: updatedUser,
      }));
      onProfileUpdated(updatedUser);
      setMessage('プロフィールを更新しました！');
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setError('更新に失敗しました。時間をおいて再試行してください。');
    } finally {
      setSaving(false);
    }
  };

  const saveMorningRoutines = () => {
    const trimmed = morningRoutines.map((routine) => routine.trim()).filter((routine) => routine.length > 0);
    setMorningRoutines(trimmed);
    const today = new Date().toISOString().split('T')[0];

    updateData((prev) => {
      const updatedDayLogs = prev.dayLogs.map((log) => {
        if (log.date !== today) {
          return log;
        }

        const updatedRoutines = trimmed.map((text, index) => {
          const existing = log.morning.routines.find((routine) => routine.text === text);
          return existing
            ? { ...existing, id: `morning-${index}`, text }
            : { id: `morning-${index}`, text, completed: false };
        });

        const allCompleted = updatedRoutines.length > 0 && updatedRoutines.every((routine) => routine.completed);

        return {
          ...log,
          morning: {
            routines: updatedRoutines,
            completed: allCompleted,
          },
        };
      });

      return {
      ...prev,
        defaultMorningRoutines: trimmed,
        dayLogs: updatedDayLogs,
      };
    });
    setMessage('朝ルーティンを保存しました！');
    setTimeout(() => setMessage(null), 2000);
  };

  const saveEveningRoutines = () => {
    const trimmed = eveningRoutines.map((routine) => routine.trim()).filter((routine) => routine.length > 0);
    setEveningRoutines(trimmed);
    const today = new Date().toISOString().split('T')[0];

    updateData((prev) => {
      const updatedDayLogs = prev.dayLogs.map((log) => {
        if (log.date !== today) {
          return log;
        }

        const updatedRoutines = trimmed.map((text, index) => {
          const existing = log.evening.routines.find((routine) => routine.text === text);
          return existing
            ? { ...existing, id: `evening-${index}`, text }
            : { id: `evening-${index}`, text, completed: false };
        });

        const allCompleted = updatedRoutines.length > 0 && updatedRoutines.every((routine) => routine.completed);

        return {
          ...log,
          evening: {
            routines: updatedRoutines,
            completed: allCompleted,
            mood: log.evening.mood,
          },
        };
      });

      return {
      ...prev,
        defaultEveningRoutines: trimmed,
        dayLogs: updatedDayLogs,
      };
    });
    setMessage('夜ルーティンを保存しました！');
    setTimeout(() => setMessage(null), 2000);
  };

  const saveNotificationTimes = () => {
    updateData((prev) => ({
      ...prev,
      settings: {
        morningNotificationTime: morningTime,
        eveningNotificationTime: eveningTime,
      },
    }));
    setMessage('通知時間を保存しました！');
    setTimeout(() => setMessage(null), 2000);
  };

  const applyTemplate = (type: 'morning' | 'evening', index: number) => {
    const template = templates[type][index];
    if (type === 'morning') {
      setMorningRoutines(template);
    } else {
      setEveningRoutines(template);
    }
    setSelectedTemplate(`${type}-${index}`);
    setMessage(`${type === 'morning' ? '朝' : '夜'}のテンプレートを適用しました！`);
    setTimeout(() => setMessage(null), 2000);
  };

  const changeTheme = (theme: 'plant' | 'animal' | 'robot') => {
    updateData((prev) => ({
      ...prev,
      character: {
        ...prev.character,
        theme,
      },
    }));
    setMessage('キャラクターテーマを変更しました！');
    setTimeout(() => setMessage(null), 2000);
  };

  const addMorningRoutine = () => {
    setMorningRoutines([...morningRoutines, '']);
  };

  const removeMorningRoutine = (index: number) => {
    setMorningRoutines(morningRoutines.filter((_, i) => i !== index));
  };

  const updateMorningRoutine = (index: number, value: string) => {
    const updated = [...morningRoutines];
    updated[index] = value;
    setMorningRoutines(updated);
  };

  const addEveningRoutine = () => {
    setEveningRoutines([...eveningRoutines, '']);
  };

  const removeEveningRoutine = (index: number) => {
    setEveningRoutines(eveningRoutines.filter((_, i) => i !== index));
  };

  const updateEveningRoutine = (index: number, value: string) => {
    const updated = [...eveningRoutines];
    updated[index] = value;
    setEveningRoutines(updated);
  };

  return (
    <div>
      {/* プロフィールセクション */}
      <div className="card">
        <h1 className="card-title">👤 マイページ</h1>
        <p style={{ color: '#546854', marginBottom: '1.5rem', textAlign: 'center' }}>
          プロフィール情報を更新しましょう。
        </p>

        <form onSubmit={handleProfileSubmit} className="form-stack">
          <label className="input-group">
            <span className="input-label">表示名</span>
            <input
              type="text"
              className="input-field"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
            />
          </label>
          <label className="input-group">
            <span className="input-label">メールアドレス</span>
            <input
              type="email"
              className="input-field"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="example@totono.life"
            />
          </label>
          {message && (
            <div className="bonus-message" style={{ marginTop: '1rem' }}>
              {message}
            </div>
          )}

          {error && (
            <div className="bonus-message" style={{ marginTop: '1rem', background: '#ffe3e3', color: '#b94a48' }}>
              {error}
            </div>
          )}

          <button className="button" type="submit" disabled={saving} style={{ marginTop: '2rem' }}>
            {saving ? '保存中...' : 'プロフィールを保存する'}
          </button>
        </form>
      </div>

      {/* ルーティン設定セクション */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h2 className="card-title" style={{ fontSize: '1.25rem' }}>⚙️ ルーティン設定</h2>

        <div className="settings-section">
          <h3 className="settings-title">習慣テンプレート</h3>
          <div className="template-grid">
            <div className="template-column">
              <div className="template-heading">朝</div>
              {templates.morning.map((template, index) => (
                <button
                  key={`morning-template-${index}`}
                  type="button"
                  className={`template-button ${selectedTemplate === `morning-${index}` ? 'selected' : ''}`}
                  onClick={() => applyTemplate('morning', index)}
                >
                  {template.join(' ・ ')}
                </button>
              ))}
            </div>
            <div className="template-column">
              <div className="template-heading">夜</div>
              {templates.evening.map((template, index) => (
                <button
                  key={`evening-template-${index}`}
                  type="button"
                  className={`template-button ${selectedTemplate === `evening-${index}` ? 'selected' : ''}`}
                  onClick={() => applyTemplate('evening', index)}
                >
                  {template.join(' ・ ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-title">朝ルーティン</h3>
          <div className="routine-editor">
            {morningRoutines.map((routine, index) => (
              <div key={index} className="routine-editor-item">
                <input
                  type="text"
                  className="routine-editor-input"
                  value={routine}
                  onChange={(e) => updateMorningRoutine(index, e.target.value)}
                  placeholder="ルーティン項目を入力"
                />
                <button
                  className="delete-button"
                  onClick={() => removeMorningRoutine(index)}
                >
                  削除
                </button>
              </div>
            ))}
            <button className="add-button" onClick={addMorningRoutine}>
              + 追加
            </button>
            <button
              className="button"
              onClick={saveMorningRoutines}
              style={{ marginTop: '1rem' }}
            >
              保存
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-title">夜ルーティン</h3>
          <div className="routine-editor">
            {eveningRoutines.map((routine, index) => (
              <div key={index} className="routine-editor-item">
                <input
                  type="text"
                  className="routine-editor-input"
                  value={routine}
                  onChange={(e) => updateEveningRoutine(index, e.target.value)}
                  placeholder="ルーティン項目を入力"
                />
                <button
                  className="delete-button"
                  onClick={() => removeEveningRoutine(index)}
                >
                  削除
                </button>
              </div>
            ))}
            <button className="add-button" onClick={addEveningRoutine}>
              + 追加
            </button>
            <button
              className="button"
              onClick={saveEveningRoutines}
              style={{ marginTop: '1rem' }}
            >
              保存
            </button>
          </div>
        </div>
      </div>

      {/* 通知設定セクション */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h2 className="card-title" style={{ fontSize: '1.25rem' }}>🔔 通知設定</h2>
        <div className="settings-section">
          <div className="notification-preview">
            <div className="notification-preview-item">
              <span className="notification-label">次の朝通知</span>
              <span className="notification-value">{notificationPreview.morning}</span>
            </div>
            <div className="notification-preview-item">
              <span className="notification-label">次の夜通知</span>
              <span className="notification-value">{notificationPreview.evening}</span>
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">朝の通知時間</label>
            <input
              type="time"
              className="input-field"
              value={morningTime}
              onChange={(e) => setMorningTime(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label className="input-label">夜の通知時間</label>
            <input
              type="time"
              className="input-field"
              value={eveningTime}
              onChange={(e) => setEveningTime(e.target.value)}
            />
          </div>
          <button className="button" onClick={saveNotificationTimes}>
            保存
          </button>
        </div>
      </div>

      {/* キャラクターテーマセクション */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h2 className="card-title" style={{ fontSize: '1.25rem' }}>🎨 キャラクターテーマ</h2>
        <div className="settings-section">
          <div className="theme-selector">
            <button
              className={`theme-button ${data.character.theme === 'plant' ? 'selected' : ''}`}
              onClick={() => changeTheme('plant')}
            >
              🌱
              <span className="theme-label">植物系</span>
            </button>
            <button
              className={`theme-button ${data.character.theme === 'animal' ? 'selected' : ''}`}
              onClick={() => changeTheme('animal')}
            >
              🐾
              <span className="theme-label">動物系</span>
            </button>
            <button
              className={`theme-button ${data.character.theme === 'robot' ? 'selected' : ''}`}
              onClick={() => changeTheme('robot')}
            >
              🤖
              <span className="theme-label">ロボット系</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
