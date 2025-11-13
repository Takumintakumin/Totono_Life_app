import { useState } from 'react';
import { AppData } from '../types';

interface SettingsProps {
  data: AppData;
  updateData: (updater: (prev: AppData) => AppData) => void;
}

export default function Settings({ data, updateData }: SettingsProps) {
  const [morningRoutines, setMorningRoutines] = useState(data.defaultMorningRoutines);
  const [eveningRoutines, setEveningRoutines] = useState(data.defaultEveningRoutines);
  const [morningTime, setMorningTime] = useState(data.settings.morningNotificationTime);
  const [eveningTime, setEveningTime] = useState(data.settings.eveningNotificationTime);

  const saveMorningRoutines = () => {
    updateData((prev) => ({
      ...prev,
      defaultMorningRoutines: morningRoutines,
    }));
    alert('朝ルーティンを保存しました！');
  };

  const saveEveningRoutines = () => {
    updateData((prev) => ({
      ...prev,
      defaultEveningRoutines: eveningRoutines,
    }));
    alert('夜ルーティンを保存しました！');
  };

  const saveNotificationTimes = () => {
    updateData((prev) => ({
      ...prev,
      settings: {
        morningNotificationTime: morningTime,
        eveningNotificationTime: eveningTime,
      },
    }));
    alert('通知時間を保存しました！');
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
      <div className="card">
        <h1 className="card-title">⚙️ 設定</h1>

        <div className="settings-section">
          <h2 className="settings-title">朝ルーティン</h2>
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
          <h2 className="settings-title">夜ルーティン</h2>
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

        <div className="settings-section">
          <h2 className="settings-title">通知時間</h2>
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
    </div>
  );
}


