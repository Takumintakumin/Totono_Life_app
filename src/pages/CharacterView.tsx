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

  const layoutGap = viewport.width <= 520 ? 8 : 12;

  const chatAreaHeight = useMemo(() => {
    const ratio = viewport.width <= 520 ? 0.62 : 0.5;
    const minHeight = 340;
    const maxHeight = Math.max(minHeight, viewport.height - 220);
    const tentative = viewport.height * ratio;
    return Math.min(Math.max(tentative, minHeight), maxHeight);
  }, [viewport.height, viewport.width]);

  const canvasHeight = useMemo(() => {
    const available = viewport.height - chatAreaHeight - layoutGap;
    return Math.max(available, 200);
  }, [chatAreaHeight, viewport.height]);

  const live2DHeight = useMemo(() => {
    const scale = viewport.width <= 520 ? 0.36 : 0.32;
    const scaled = canvasHeight * scale;
    return Math.max(Math.min(scaled, canvasHeight * 0.6), 140);
  }, [canvasHeight, viewport.width]);

  return (
    <div
      className="character-view-fullscreen"
      style={{ height: viewport.height, minHeight: viewport.height }}
    >
      <div className="character-chat-standalone" style={{ height: chatAreaHeight }}>
        <ChatInterface userName={_user.displayName || 'ゲスト'} character={_character} />
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
