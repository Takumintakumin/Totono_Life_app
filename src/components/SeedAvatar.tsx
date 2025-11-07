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
  const [leafDance, setLeafDance] = useState(false);
  const timeoutsRef = useRef<number[]>([]);
  const isFloating = variant === 'floating';

  const accessoryElement = useMemo(() => {
    const accent = avatar.accentColor;
    const outline = avatar.outlineColor;

    switch (avatar.accessory) {
      case 'flower':
        return (
          <g className="seed-accessory" transform="translate(135,70)">
            <circle r="10" fill={accent} stroke={outline} strokeWidth="2" />
            <circle r="4" fill={outline} />
          </g>
        );
      case 'ribbon':
        return (
          <g className="seed-accessory" transform="translate(100,80)">
            <path
              d="M-16 0 C-28 -10,-28 12,-12 8 C-8 2,-4 -2,0 -4 C4 -2,8 2,12 8 C28 12,28 -10,16 0"
              fill={accent}
              stroke={outline}
              strokeWidth="2"
            />
            <circle cx="0" cy="-2" r="4" fill={outline} />
          </g>
        );
      case 'sprout':
        return (
          <g className="seed-accessory" transform="translate(100,58)">
            <path
              d="M0 0 C-18 -18,-26 -6,-14 4 C-10 8,-4 10,0 12 C4 10,10 8,14 4 C26 -6,18 -18,0 0"
              fill={avatar.leafPrimary}
              stroke={avatar.leafSecondary}
              strokeWidth="2"
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
    setLeafDance(false);
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
      setLeafDance(true);

      schedule(() => setIsJumping(false), 720);
      schedule(() => setLeafDance(false), 720);
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
                className={`seed-char breath ${leafDance ? 'leaf-dance' : ''} ${sparkleVisible ? 'glow' : ''}`}
              >
                <ellipse
                  cx="100"
                  cy="118"
                  rx="48"
                  ry="44"
                  className="seed-bulb"
                  style={{ fill: avatar.bodyColor, stroke: avatar.outlineColor }}
                />
                <g className="seed-leaf seed-leaf-left">
                  <path
                    d="M88 80 C62 72,54 44,86 44 C92 44,98 48,102 54 C110 66,108 78,88 80 Z"
                    style={{ fill: avatar.leafPrimary, stroke: avatar.leafSecondary }}
                  />
                </g>
                <g className="seed-leaf seed-leaf-right">
                  <path
                    d="M112 78 C140 72,148 44,116 44 C110 44,104 48,100 54 C92 66,94 78,112 78 Z"
                    style={{ fill: avatar.leafPrimary, stroke: avatar.leafSecondary }}
                  />
                </g>

                <circle cx="82" cy="118" r="5" className="seed-cheek" style={{ fill: avatar.cheekColor }} />
                <circle cx="118" cy="118" r="5" className="seed-cheek" style={{ fill: avatar.cheekColor }} />

                <g className={`seed-eyes ${isBlinking ? 'blink' : ''}`}>
                  <g>
                    <ellipse cx="88" cy="106" rx="7" ry="9" className="seed-eye" />
                    <circle cx="86" cy="103" r="2.4" className="seed-eye-highlight" />
                  </g>
                  <g>
                    <ellipse cx="112" cy="106" rx="7" ry="9" className="seed-eye" />
                    <circle cx="114" cy="103" r="2.4" className="seed-eye-highlight" />
                  </g>
                </g>

                <path d={mouthPath} className="seed-mouth" stroke={avatar.outlineColor} />

                <g className={`seed-sparkles ${sparkleVisible ? 'visible' : ''}`}>
                  <circle cx="60" cy="70" r="3" fill={avatar.accentColor} />
                  <polygon
                    points="150,60 152,66 158,66 153,69 155,76 150,71 145,76 147,69 142,66 148,66"
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
