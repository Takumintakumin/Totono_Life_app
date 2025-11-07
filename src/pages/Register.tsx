import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AvatarBuilder from '../components/AvatarBuilder';
import { AppData, AvatarConfig, createDefaultAvatarConfig } from '../types';
import { registerUser } from '../utils/api';

interface RegisterProps {
  data: AppData;
  onRegistered: (data: AppData) => void;
}

export default function Register({ data, onRegistered }: RegisterProps) {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState<AvatarConfig>(createDefaultAvatarConfig());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data.user.isRegistered) {
      // すでに登録済みならマイページへ誘導
      navigate('/mypage', { replace: true });
      return;
    }
    setDisplayName('');
    setEmail('');
    setAvatar(createDefaultAvatarConfig());
  }, [data.user.isRegistered, navigate]);

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

  return (
    <div className="card">
      <h1 className="card-title">🌱 アカウント登録</h1>
      <p style={{ color: '#546854', marginBottom: '1.5rem', textAlign: 'center' }}>
        名前とアバターを設定して、あなた専用の「ミドリの芽」を育てましょう。
      </p>

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
    </div>
  );
}
