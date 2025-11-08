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
      height: Math.max(window.innerHeight - getNavHeight(), 480),
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const updateViewport = () => {
      const nextHeight = Math.max(window.innerHeight - getNavHeight(), 480);
      setViewport({
        width: window.innerWidth,
        height: nextHeight,
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
  const layoutGap = 16;

  const overlayCardHeight = useMemo(() => {
    const ratio = viewport.width <= 520 ? 0.62 : 0.5;
    const minHeight = 340;
    const maxHeight = Math.max(minHeight, viewport.height - 220);
    const tentative = viewport.height * ratio;
    return Math.min(Math.max(tentative, minHeight), maxHeight);
  }, [viewport.height, viewport.width]);

  const canvasHeight = useMemo(() => {
    const available = viewport.height - overlayCardHeight - layoutGap;
    return Math.max(available, 200);
  }, [overlayCardHeight, viewport.height]);

  const live2DHeight = useMemo(() => {
    const scale = viewport.width <= 520 ? 0.8 : 0.7;
    const scaled = canvasHeight * scale;
    return Math.max(Math.min(scaled, canvasHeight), 180);
  }, [canvasHeight, viewport.width]);

  return (
    <div
      className="character-view-fullscreen"
      style={{ height: viewport.height, minHeight: viewport.height }}
    >
      <div className="character-overlay-wrapper">
        <div className="character-overlay-card" style={{ height: overlayCardHeight }}>
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
              <div className="character-chat-container">
                <ChatInterface userName={displayName} character={_character} />
              </div>
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

      <div className="character-canvas" style={{ height: canvasHeight }}>
        <Live2DContainer
          width={viewport.width}
          height={live2DHeight}
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
