import { useEffect, useMemo, useState } from 'react';
import Live2DContainer from '../components/Live2DContainer';
import ChatInterface from '../components/ChatInterface';
import { Character, UserProfile } from '../types';
import './CharacterView.css';

interface CharacterViewProps {
  character: Character;
  user: UserProfile;
}

const DEFAULT_NAV_HEIGHT = 80;
const MIN_CANVAS_HEIGHT = 360;

export default function CharacterView({ character: _character, user: _user }: CharacterViewProps) {
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

  const [activeTab, setActiveTab] = useState<'affinity' | 'chat'>('chat');
  const displayName = useMemo(() => _user.displayName || 'ゲスト', [_user.displayName]);
  const canvasHeight = useMemo(
    () => Math.max(viewport.height * (viewport.width <= 520 ? 0.65 : 0.68), MIN_CANVAS_HEIGHT * 0.55),
    [viewport.height, viewport.width]
  );

  return (
    <div className="character-view-fullscreen">
      <div className="character-overlay-wrapper">
        <div className="character-overlay-card">
          <div className="character-overlay-header">
            <span className="character-overlay-title">{displayName}のステータス</span>
            <span className="character-overlay-caption">キャラと話して親密度を高めよう</span>
          </div>

          <div className="character-overlay-tabs">
            <button
              type="button"
              className={`character-overlay-tab ${activeTab === 'affinity' ? 'active' : ''}`}
              onClick={() => setActiveTab('affinity')}
            >
              💞 なつき度
            </button>
            <button
              type="button"
              className={`character-overlay-tab ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              💬 おしゃべり
            </button>
          </div>

          <div className="character-overlay-body">
            {activeTab === 'chat' ? (
              <ChatInterface userName={displayName} character={_character} />
            ) : (
              <div className="character-affinity-panel">
                <p className="character-affinity-intro">最近の会話でキャラクターの心が温まっています。</p>
                <ul className="character-affinity-list">
                  <li><span>レベル</span><strong>{_character.level}</strong></li>
                  <li><span>経験値</span><strong>{_character.experience} / {_character.experienceToNext}</strong></li>
                  <li><span>進化段階</span><strong>{_character.evolutionStage}</strong></li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="character-canvas">
        <Live2DContainer
          width={viewport.width}
          height={canvasHeight}
          idleMotionGroup="Idle"
        />
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
