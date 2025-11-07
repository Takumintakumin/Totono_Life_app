import { useEffect, useMemo, useState } from 'react';
import Live2DContainer from '../components/Live2DContainer';
import { Character, UserProfile } from '../types';
import ChatInterface from '../components/ChatInterface';
import './CharacterView.css';

interface CharacterViewProps {
  character: Character;
  user: UserProfile;
}

const DEFAULT_NAV_HEIGHT = 80;
const MIN_CANVAS_HEIGHT = 360;

export default function CharacterView({ character, user }: CharacterViewProps) {
  const [viewport, setViewport] = useState(() => {
    if (typeof window === 'undefined') {
      return {
        width: 1280,
        height: 720,
      };
    }

    return {
      width: window.innerWidth,
      height: Math.max(window.innerHeight - getNavHeight(), MIN_CANVAS_HEIGHT),
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const updateViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: Math.max(window.innerHeight - getNavHeight(), MIN_CANVAS_HEIGHT),
      });
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);

    return () => {
      window.removeEventListener('resize', updateViewport);
    };
  }, []);

  const progress = useMemo(() => {
    if (!character.experienceToNext) return 0;
    return Math.min(100, Math.max(0, (character.experience / character.experienceToNext) * 100));
  }, [character.experience, character.experienceToNext]);

  return (
    <div className="character-view-fullscreen">
      <div className="character-canvas">
        <Live2DContainer
          width={viewport.width}
          height={viewport.height}
          idleMotionGroup="Idle"
        />
      </div>

      <div className="character-overlay">
        <div className="character-info-panel">
          <div className="character-summary">
            <div className="character-name">{user.displayName || 'ゲスト'}</div>
            <p className="character-caption">クリックすると反応するよ！</p>
          </div>

          <div className="character-info">
            <div className="character-level">Level {character.level}</div>
            {character.evolutionStage > 0 && (
              <div className="evolution-badge">✨ 進化段階: {character.evolutionStage} ✨</div>
            )}
            <div className="exp-info">
              経験値: {character.experience} / {character.experienceToNext}
            </div>
            <div className="exp-bar-container">
              <div className="exp-bar" style={{ width: `${progress}%` }}>
                {progress.toFixed(0)}%
              </div>
            </div>
          </div>
        </div>

        <div className="character-chat-panel">
          <h2 className="card-title">💬 おしゃべり</h2>
          <ChatInterface userName={user.displayName || 'ゲスト'} />
        </div>
      </div>
    </div>
  );
}

function getNavHeight(): number {
  if (typeof window === 'undefined') {
    return DEFAULT_NAV_HEIGHT;
  }

  const value = getComputedStyle(document.documentElement).getPropertyValue('--nav-height').trim();
  const parsed = parseFloat(value);

  if (Number.isFinite(parsed)) {
    return parsed;
  }

  return DEFAULT_NAV_HEIGHT;
}
