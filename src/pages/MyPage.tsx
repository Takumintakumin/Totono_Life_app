import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AvatarBuilder from '../components/AvatarBuilder';
import { AppData, AvatarConfig, UserProfile } from '../types';
import { updateUserProfile } from '../utils/api';

interface MyPageProps {
  data: AppData;
  onProfileUpdated: (user: UserProfile) => void;
}

export default function MyPage({ data, onProfileUpdated }: MyPageProps) {
  const navigate = useNavigate();
  const { user } = data;

  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [email, setEmail] = useState(user.email || '');
  const [avatar, setAvatar] = useState<AvatarConfig>(user.avatar);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user.isRegistered) {
      navigate('/register', { replace: true });
      return;
    }
    setDisplayName(user.displayName || '');
    setEmail(user.email || '');
    setAvatar(user.avatar);
  }, [user, navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!displayName.trim()) {
      setError('表示名を入力してください');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const updatedUser = await updateUserProfile({
        displayName: displayName.trim(),
        email: email.trim(),
        avatar,
      });
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

  return (
    <div className="card">
      <h1 className="card-title">👤 マイページ</h1>
      <p style={{ color: '#546854', marginBottom: '1.5rem', textAlign: 'center' }}>
        アバターやプロフィールを自由にカスタマイズしましょう。
      </p>

      <form onSubmit={handleSubmit} className="form-stack">
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

        <section style={{ marginTop: '2rem' }}>
          <h2 className="card-title" style={{ fontSize: '1.25rem' }}>
            アバターを編集
          </h2>
          <AvatarBuilder value={avatar} onChange={setAvatar} />
        </section>

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
          {saving ? '保存中...' : '変更を保存する'}
        </button>
      </form>
    </div>
  );
}
