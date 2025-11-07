import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AvatarConfig, Character } from '../types';
import './SeedAvatar.css';

type CharacterAction = 'morning' | 'night' | 'miss' | 'blink';

declare global {
  interface Window {
    charAction?: (action: CharacterAction) => void;
  }
}

interface SeedAvatarProps {
  character: Character;
  avatar: AvatarConfig;
  variant?: 'floating' | 'inline';
  showBadge?: boolean;
}

const PET_MESSAGES = ['わん！', 'にゃー！', 'きもちいい〜', 'もっと撫でて！', '最高だよ！'];
const HAPPY_MESSAGES = ['今日もえらい！', '朝から元気いっぱい！', 'おやすみ前にばっちりだね！'];
const MISS_MESSAGES = ['だいじょうぶ、一緒にがんばろう！', 'ゆっくり整えようね。', '明日はきっとできるよ！'];

export default function SeedAvatar({ character, avatar, variant = 'floating', showBadge = true }: SeedAvatarProps) {
  const [petCount, setPetCount] = useState(0);
  const [message, setMessage] = useState('');
  const [mood, setMood] = useState<'neutral' | 'happy' | 'sad'>('neutral');
  const [isBlinking, setIsBlinking] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [sparkleVisible, setSparkleVisible] = useState(false);
  const [hairBounce, setHairBounce] = useState(false);
  const timeoutsRef = useRef<number[]>([]);
  const isFloating = variant === 'floating';

  const accessoryElement = useMemo(() => {
    const accent = avatar.accentColor;
    const outline = avatar.outlineColor;

    switch (avatar.accessory) {
      case 'hat':
        return (
          <g className="seed-accessory" transform="translate(100,45)">
            <path
              d="M-40 20 C-28 0,28 0,40 20 Z"
              fill={avatar.hairColor}
              stroke={outline}
              strokeWidth="3"
            />
            <rect x="-28" y="20" width="56" height="18" rx="6" fill={accent} stroke={outline} strokeWidth="2" />
          </g>
        );
      case 'glasses':
        return (
          <g className="seed-accessory" transform="translate(100,96)" fill="none" stroke={outline} strokeWidth="2.5">
            <circle cx="-14" r="10" />
            <circle cx="14" r="10" />
            <line x1="-24" y1="0" x2="-36" y2="-2" />
            <line x1="24" y1="0" x2="36" y2="-2" />
            <line x1="-4" y1="0" x2="4" y2="0" />
          </g>
        );
      case 'scarf':
        return (
          <g className="seed-accessory" transform="translate(100,120)">
            <path
              d="M-34 -6 C-10 10,10 10,34 -6 C30 4,28 12,20 14 C12 16,0 10,-6 14 C-12 18,-22 12,-34 -6 Z"
              fill={accent}
              stroke={outline}
              strokeWidth="2"
            />
            <path
              d="M14 6 C20 22,10 34,0 40"
              stroke={outline}
              strokeWidth="2"
              fill="none"
            />
          </g>
        );
      default:
        return null;
    }
  }, [avatar]);

  const clearScheduled = useCallback(() => {
    timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutsRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, delay: number) => {
    const id = window.setTimeout(() => {
      fn();
      timeoutsRef.current = timeoutsRef.current.filter((t) => t !== id);
    }, delay);
    timeoutsRef.current.push(id);
  }, []);

  const triggerBlink = useCallback(() => {
    setIsBlinking(true);
    schedule(() => setIsBlinking(false), 220);
  }, [schedule]);

  useEffect(() => {
    let isMounted = true;

    const loop = () => {
      const delay = 2500 + Math.random() * 3500;
      const id = window.setTimeout(() => {
        if (!isMounted) return;
        triggerBlink();
        loop();
      }, delay);
      timeoutsRef.current.push(id);
    };

    loop();
    return () => {
      isMounted = false;
      clearScheduled();
    };
  }, [triggerBlink, clearScheduled]);

  const triggerNeutral = useCallback(() => {
    setMood('neutral');
    setMessage('');
    setSparkleVisible(false);
    setHairBounce(false);
    setIsJumping(false);
  }, []);

  const triggerHappy = useCallback(
    (source: 'pet' | 'morning' | 'night') => {
      const messages = source === 'pet' ? PET_MESSAGES : HAPPY_MESSAGES;
      const index = Math.min(source === 'pet' ? petCount : Math.floor(Math.random() * messages.length), messages.length - 1);
      const nextCount = source === 'pet' ? petCount + 1 : petCount;
      if (source === 'pet') {
        setPetCount(nextCount);
      }

      setMessage(messages[index]);
      setMood('happy');
      setIsJumping(true);
      setSparkleVisible(true);
      setHairBounce(true);

      schedule(() => setIsJumping(false), 720);
      schedule(() => setHairBounce(false), 720);
      schedule(() => setSparkleVisible(false), 1400);
      schedule(() => triggerNeutral(), 1600);
    },
    [petCount, schedule, triggerNeutral]
  );

  const triggerMiss = useCallback(() => {
    const messageIndex = Math.floor(Math.random() * MISS_MESSAGES.length);
    setMessage(MISS_MESSAGES[messageIndex]);
    setMood('sad');
    schedule(() => triggerNeutral(), 1600);
  }, [schedule, triggerNeutral]);

  const handlePet = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      event.preventDefault();
      event.stopPropagation();
      triggerHappy('pet');
    },
    [triggerHappy]
  );

  useEffect(() => {
    if (!isFloating) {
      return;
    }

    const handler = (action: CharacterAction) => {
      switch (action) {
        case 'morning':
        case 'night':
          triggerHappy(action);
          break;
        case 'miss':
          triggerMiss();
          break;
        case 'blink':
          triggerBlink();
          break;
        default:
          break;
      }
    };

    window.charAction = handler;
    return () => {
      if (window.charAction === handler) {
        delete window.charAction;
      }
    };
  }, [triggerHappy, triggerMiss, triggerBlink, isFloating]);

  const mouthPath = useMemo(() => {
    if (mood === 'happy') {
      return 'M90 122 Q100 134 110 122';
    }
    if (mood === 'sad') {
      return 'M92 128 Q100 122 108 128';
    }
    return 'M92 124 Q100 130 108 124';
  }, [mood]);

  return (
    <div className={isFloating ? 'seed-avatar-fixed' : 'seed-avatar-inline'} aria-hidden={isFloating}>
      <div
        className={`seed-avatar ${mood} ${isJumping ? 'jump' : ''}`}
        onClick={handlePet}
        onTouchStart={handlePet}
      >
        <div className="seed-avatar-stage">
          <div className="seed-char-wrap">
            <svg viewBox="0 0 200 200" xmlSpace="preserve">
              <g
                className={`seed-char breath ${hairBounce ? 'hair-bounce' : ''} ${sparkleVisible ? 'glow' : ''}`}
              >
                <rect
                  x="70"
                  y="110"
                  width="60"
                  height="62"
                  rx="24"
                  className="seed-body"
                  style={{ fill: avatar.clothingColor, stroke: avatar.outlineColor }}
                />
                <rect
                  x="70"
                  y="140"
                  width="60"
                  height="18"
                  rx="9"
                  className="seed-accent"
                  style={{ fill: avatar.accentColor }}
                />

                <circle
                  cx="100"
                  cy="78"
                  r="34"
                  className="seed-head"
                  style={{ fill: avatar.skinTone, stroke: avatar.outlineColor }}
                />
                <path
                  className="seed-hair"
                  style={{ fill: avatar.hairColor }}
                  d="M60 82 C60 50,80 38,100 38 C120 38,140 50,140 82 C126 74,114 70,100 70 C86 70,72 74,60 82 Z"
                />

                <circle cx="82" cy="102" r="6" className="seed-cheek" style={{ fill: avatar.cheekColor }} />
                <circle cx="118" cy="102" r="6" className="seed-cheek" style={{ fill: avatar.cheekColor }} />

                <g className={`seed-eyes ${isBlinking ? 'blink' : ''}`}>
                  <g>
                    <ellipse cx="88" cy="96" rx="7" ry="9" className="seed-eye" />
                    <circle cx="86" cy="93" r="2.4" className="seed-eye-highlight" />
                  </g>
                  <g>
                    <ellipse cx="112" cy="96" rx="7" ry="9" className="seed-eye" />
                    <circle cx="114" cy="93" r="2.4" className="seed-eye-highlight" />
                  </g>
                </g>

                <path d={mouthPath} className="seed-mouth" stroke={avatar.outlineColor} />

                <g className={`seed-sparkles ${sparkleVisible ? 'visible' : ''}`}>
                  <circle cx="58" cy="58" r="4" fill={avatar.accentColor} />
                  <polygon
                    points="148,52 151,58 158,58 152,61 154,68 148,63 143,68 145,61 139,58 146,58"
                    fill={avatar.accentColor}
                  />
                </g>

                {accessoryElement}
              </g>
              <ellipse cx="100" cy="170" rx="50" ry="10" className="seed-shadow" />
            </svg>
          </div>
        </div>

        {message && <div className="seed-message">{message}</div>}
        {showBadge && (
          <div className="seed-badge">
            <span>Lv.{character.level}</span>
            <span>🐾 {petCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}
