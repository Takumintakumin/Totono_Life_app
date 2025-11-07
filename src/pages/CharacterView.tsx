import { useMemo } from 'react';
import Live2DContainer from '../components/Live2DContainer';
import { Character, UserProfile } from '../types';
import ChatInterface from '../components/ChatInterface';
import './CharacterView.css';

interface CharacterViewProps {
  character: Character;
  user: UserProfile;
}

export default function CharacterView({ character, user }: CharacterViewProps) {
  const progress = useMemo(() => {
    if (!character.experienceToNext) return 0;
    return Math.min(100, Math.max(0, (character.experience / character.experienceToNext) * 100));
  }, [character.experience, character.experienceToNext]);

  return (
    <div className="character-view-container">
      <div className="card character-display-card">
        <div className="live2d-wrapper">
          <Live2DContainer width={380} height={440} idleMotionGroup="Idle" />
        </div>

        <div className="character-summary">
          <div className="character-name">{user.displayName || 'ゲスト'}</div>
          <p className="character-caption">クリックすると反応するよ！</p>
        </div>

        <div className="character-info" style={{ marginTop: '1.5rem' }}>
          <div className="character-level">
            Level {character.level}
          </div>
          {character.evolutionStage > 0 && (
            <div className="evolution-badge">
              ✨ 進化段階: {character.evolutionStage} ✨
            </div>
          )}
          <div className="exp-info">
            経験値: {character.experience} / {character.experienceToNext}
          </div>
          <div className="exp-bar-container">
            <div
              className="exp-bar"
              style={{
                width: `${progress}%`,
              }}
            >
              {progress.toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      <div className="card chat-card">
        <h2 className="card-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
          💬 おしゃべり
        </h2>
        <ChatInterface userName={user.displayName || 'ゲスト'} />
      </div>
    </div>
  );
}
