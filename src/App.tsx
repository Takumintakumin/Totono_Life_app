import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { loadData, saveData } from './utils/api';
import { AppData, UserProfile } from './types';
import RoutineDashboard from './pages/RoutineDashboard';
import CharacterView from './pages/CharacterView';
import CalendarView from './pages/CalendarView';
import MyPage from './pages/MyPage';
import Register from './pages/Register';
import './App.css';

function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初回データ読み込み
    loadData().then((loadedData) => {
      setData(loadedData);
      setLoading(false);
      console.log('[DeployCheck] App data loaded for user:', loadedData.user.id);
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

  const handleRegistered = (nextData: AppData) => {
    setData(nextData);
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
        onRegistered={handleRegistered}
      />
    </Router>
  );
}

export default App;

interface AppShellProps {
  data: AppData;
  updateData: (updater: (prev: AppData) => AppData) => void;
  onProfileUpdated: (user: UserProfile) => void;
  onRegistered: (data: AppData) => void;
}

function AppShell({ data, updateData, onProfileUpdated, onRegistered }: AppShellProps) {
  const location = useLocation();
  const isCharacterRoute = location.pathname.startsWith('/character');
  const isRegistered = data.user.isRegistered;
  const mainClasses = ['main-content'];
  if (isCharacterRoute) {
    mainClasses.push('main-content--full');
  }
  if (!isRegistered) {
    mainClasses.push('main-content--standalone');
  }

  return (
    <div className={`app ${isCharacterRoute ? 'app--full-character' : ''}`}>
      {isRegistered && (
        <nav className="nav">
          <Link to="/routine" className="nav-link">
            <span className="nav-icon">🕒</span>
            <span className="nav-text">ルーティン</span>
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
      )}

      <main className={mainClasses.join(' ')}>
        <Routes>
          {!isRegistered && (
            <>
              <Route path="/register" element={<Register data={data} onRegistered={onRegistered} />} />
              <Route path="*" element={<Navigate to="/register" replace />} />
            </>
          )}
          {isRegistered && (
            <>
              <Route path="/" element={<RoutineDashboard data={data} updateData={updateData} initialSection="morning" />} />
              <Route path="/evening" element={<RoutineDashboard data={data} updateData={updateData} initialSection="evening" />} />
              <Route path="/routine" element={<RoutineDashboard data={data} updateData={updateData} initialSection="all" />} />
              <Route path="/character" element={<CharacterView character={data.character} user={data.user} />} />
              <Route path="/calendar" element={<CalendarView dayLogs={data.dayLogs} />} />
              <Route path="/mypage" element={<MyPage data={data} updateData={updateData} onProfileUpdated={onProfileUpdated} />} />
              <Route path="/register" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      </main>
    </div>
  );
}

