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

  return (
    <div className="character-view-fullscreen">
      <div className="character-layout">
        <aside className="character-sidebar">
          <div className="character-sidecard">
            <div className="character-sidecard-header">
              <span className="character-sidecard-title">{displayName}のステータス</span>
              <span className="character-sidecard-caption">キャラと話して親密度を高めよう</span>
            </div>

            <div className="character-sidecard-tabs">
              <button
                type="button"
                className={`character-sidecard-tab ${activeTab === 'affinity' ? 'active' : ''}`}
                onClick={() => setActiveTab('affinity')}
              >
                💞 なつき度
              </button>
              <button
                type="button"
                className={`character-sidecard-tab ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('chat')}
              >
                💬 おしゃべり
              </button>
            </div>

            <div className="character-sidecard-body">
              {activeTab === 'chat' ? (
                <ChatInterface userName={displayName} character={_character} />
              ) : (
                <div className="character-affinity-panel">
                  <p>しばらく会話してキャラクターとの絆を深めましょう。</p>
                  <p style={{ fontSize: '0.85rem', color: 'rgba(47, 59, 89, 0.75)' }}>
                    現在のレベル: {_character.level}
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>

        <div className="character-canvas">
          <Live2DContainer
            width={viewport.width}
            height={viewport.height}
            idleMotionGroup="Idle"
          />
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
