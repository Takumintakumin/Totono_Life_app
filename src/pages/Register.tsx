import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import AvatarBuilder from '../components/AvatarBuilder';
import { AppData, AvatarConfig, createDefaultAvatarConfig } from '../types';
import { registerUser, switchUser, peekUserId } from '../utils/api';

interface RegisterProps {
  data: AppData;
  onRegistered: (data: AppData) => void;
}

export default function Register({ data, onRegistered }: RegisterProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState<AvatarConfig>(createDefaultAvatarConfig());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingCode, setExistingCode] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const currentUserId = useMemo(() => peekUserId(), []);

  useEffect(() => {
    if (data.user.isRegistered) {
      if (location.pathname !== '/' && location.pathname !== '/routine') {
        navigate('/', { replace: true });
      }
      return;
    }
    setDisplayName('');
    setEmail('');
    setAvatar(createDefaultAvatarConfig());
    setExistingCode('');
  }, [data.user.isRegistered, navigate, location.pathname]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!displayName.trim()) {
      setError('表示名を入力してください');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const updated = await registerUser({
        displayName: displayName.trim(),
        email: email.trim(),
        avatar,
      });
      onRegistered(updated);
      navigate('/');
    } catch (err) {
      console.error(err);
      setError('登録に失敗しました。時間をおいて再試行してください。');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestore = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!existingCode.trim()) {
      setRestoreError('ユーザーコードを入力してください');
      return;
    }
    try {
      setRestoring(true);
      setRestoreError(null);
      const restored = await switchUser(existingCode.trim());
      onRegistered(restored);
      navigate('/', { replace: true });
    } catch (err) {
      console.error(err);
      setRestoreError('ユーザーコードの読み込みに失敗しました。正しいコードか確認してください。');
    } finally {
      setRestoring(false);
    }
  };

  if (data.user.isRegistered) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="card">
      <h1 className="card-title">🌱 アカウント登録</h1>
      <p style={{ color: '#546854', marginBottom: '1.5rem', textAlign: 'center' }}>
        名前とアバターを設定して、あなた専用の「ミドリの芽」を育てましょう。
      </p>

      {currentUserId && (
        <div className="bonus-message" style={{ marginBottom: '1.25rem', background: '#f0f8ec', color: '#1f5728' }}>
          あなたのユーザーコード: <strong>{currentUserId}</strong><br />
          このコードをメモしておくと、別の端末でもデータを復元できます。
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-stack">
        <label className="input-group">
          <span className="input-label">表示名</span>
          <input
            type="text"
            className="input-field"
            value={displayName}
            placeholder="例: みどり さん"
            onChange={(event) => setDisplayName(event.target.value)}
            required
          />
        </label>
        <label className="input-group">
          <span className="input-label">メールアドレス (任意)</span>
          <input
            type="email"
            className="input-field"
            value={email}
            placeholder="example@totono.life"
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <section style={{ marginTop: '2rem' }}>
          <h2 className="card-title" style={{ fontSize: '1.25rem' }}>
            あなたのアバターを作成
          </h2>
          <AvatarBuilder value={avatar} onChange={setAvatar} />
        </section>

        {error && (
          <div className="bonus-message" style={{ marginTop: '1rem', background: '#ffe3e3', color: '#b94a48' }}>
            {error}
          </div>
        )}

        <button className="button" type="submit" disabled={submitting} style={{ marginTop: '2rem' }}>
          {submitting ? '登録中...' : '登録してスタート'}
        </button>
      </form>

      <section style={{ marginTop: '2.5rem' }}>
        <h2 className="card-title" style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
          🔄 既存データを復元する
        </h2>
        <p style={{ color: '#546854', marginBottom: '1rem', textAlign: 'center', fontSize: '0.95rem' }}>
          すでにユーザーコードをお持ちの場合は、こちらから復元できます。
        </p>
        <form onSubmit={handleRestore} className="form-stack">
          <label className="input-group">
            <span className="input-label">ユーザーコード</span>
            <input
              type="text"
              className="input-field"
              value={existingCode}
              placeholder="例: user-1699352045000-abc123xyz"
              onChange={(event) => setExistingCode(event.target.value)}
            />
          </label>

          {restoreError && (
            <div className="bonus-message" style={{ marginTop: '0.75rem', background: '#ffe3e3', color: '#b94a48' }}>
              {restoreError}
            </div>
          )}

          <button className="button" type="submit" disabled={restoring} style={{ marginTop: '1.5rem' }}>
            {restoring ? '復元中...' : 'このコードで復元する'}
          </button>
        </form>
      </section>
    </div>
  );
}
