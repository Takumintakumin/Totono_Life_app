import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { loadData, saveData } from './utils/api';
import { AppData, UserProfile } from './types';
import MorningRoutine from './pages/MorningRoutine';
import EveningRoutine from './pages/EveningRoutine';
import CharacterView from './pages/CharacterView';
import CalendarView from './pages/CalendarView';
import MyPage from './pages/MyPage';
import './App.css';

function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初回データ読み込み
    loadData().then((loadedData) => {
      setData(loadedData);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    // データが変更されたら保存
    if (data) {
      saveData(data).catch((error) => {
        console.error('Failed to save data:', error);
      });
    }
  }, [data]);

  const updateData = (updater: (prev: AppData) => AppData) => {
    setData((prev) => {
      if (!prev) return prev;
      const updated = updater(prev);
      return updated;
    });
  };

  const handleProfileUpdated = (user: UserProfile) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        user,
      };
    });
  };

  if (loading || !data) {
    return (
      <div className="app" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🐾</div>
          <div>読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <AppShell
        data={data}
        updateData={updateData}
        onProfileUpdated={handleProfileUpdated}
      />
    </Router>
  );
}

export default App;

interface AppShellProps {
  data: AppData;
  updateData: (updater: (prev: AppData) => AppData) => void;
  onProfileUpdated: (user: UserProfile) => void;
}

function AppShell({ data, updateData, onProfileUpdated }: AppShellProps) {
  const location = useLocation();
  const isCharacterRoute = location.pathname.startsWith('/character');

  return (
    <div className={`app ${isCharacterRoute ? 'app--full-character' : ''}`}>
      <nav className="nav">
        <Link to="/" className="nav-link">
          <span className="nav-icon">🌅</span>
          <span className="nav-text">朝</span>
        </Link>
        <Link to="/evening" className="nav-link">
          <span className="nav-icon">🌙</span>
          <span className="nav-text">夜</span>
        </Link>
        <Link to="/character" className="nav-link">
          <span className="nav-icon">✨</span>
          <span className="nav-text">キャラ</span>
        </Link>
        <Link to="/calendar" className="nav-link">
          <span className="nav-icon">📅</span>
          <span className="nav-text">カレンダー</span>
        </Link>
        <Link to="/mypage" className="nav-link">
          <span className="nav-icon">👤</span>
          <span className="nav-text">マイ</span>
        </Link>
      </nav>

      <main className={`main-content ${isCharacterRoute ? 'main-content--full' : ''}`}>
        <Routes>
          <Route path="/" element={<MorningRoutine data={data} updateData={updateData} />} />
          <Route path="/evening" element={<EveningRoutine data={data} updateData={updateData} />} />
          <Route path="/character" element={<CharacterView character={data.character} user={data.user} />} />
          <Route path="/calendar" element={<CalendarView dayLogs={data.dayLogs} />} />
          <Route
            path="/mypage"
            element={<MyPage data={data} updateData={updateData} onProfileUpdated={onProfileUpdated} />}
          />
        </Routes>
      </main>
    </div>
  );
}

