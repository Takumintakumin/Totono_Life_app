import { useEffect, useState } from 'react';
import Live2DContainer from '../components/Live2DContainer';
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

  return (
    <div className="character-view-fullscreen">
      <div className="character-canvas">
        <Live2DContainer
          width={viewport.width}
          height={viewport.height}
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
