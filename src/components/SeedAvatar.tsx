import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Character } from '../types';
import './SeedAvatar.css';

type CharacterAction = 'morning' | 'night' | 'miss' | 'blink';

declare global {
  interface Window {
    charAction?: (action: CharacterAction) => void;
  }
}

interface SeedAvatarProps {
  character: Character;
}

const PET_MESSAGES = ['わん！', 'にゃー！', 'きもちいい〜', 'もっと撫でて！', '最高だよ！'];
const HAPPY_MESSAGES = ['今日もえらい！', '朝から元気いっぱい！', 'おやすみ前にばっちりだね！'];
const MISS_MESSAGES = ['だいじょうぶ、一緒にがんばろう！', 'ゆっくり整えようね。', '明日はきっとできるよ！'];

export default function SeedAvatar({ character }: SeedAvatarProps) {
  const [petCount, setPetCount] = useState(0);
  const [message, setMessage] = useState('');
  const [mood, setMood] = useState<'neutral' | 'happy' | 'sad'>('neutral');
  const [isBlinking, setIsBlinking] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [sparkleVisible, setSparkleVisible] = useState(false);
  const [leafDance, setLeafDance] = useState(false);
  const timeoutsRef = useRef<number[]>([]);

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
  }, [triggerHappy, triggerMiss, triggerBlink]);

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
    <div className="seed-avatar-fixed" aria-hidden="true">
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
                <ellipse cx="100" cy="118" rx="48" ry="44" className="seed-bulb" />
                <g className="seed-leaf seed-leaf-left">
                  <path d="M88 80 C62 72,54 44,86 44 C92 44,98 48,102 54 C110 66,108 78,88 80 Z" />
                </g>
                <g className="seed-leaf seed-leaf-right">
                  <path d="M112 78 C140 72,148 44,116 44 C110 44,104 48,100 54 C92 66,94 78,112 78 Z" />
                </g>

                <circle cx="82" cy="118" r="5" className="seed-cheek" />
                <circle cx="118" cy="118" r="5" className="seed-cheek" />

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

                <path d={mouthPath} className="seed-mouth" />

                <g className={`seed-sparkles ${sparkleVisible ? 'visible' : ''}`}>
                  <circle cx="60" cy="70" r="3" />
                  <polygon points="150,60 152,66 158,66 153,69 155,76 150,71 145,76 147,69 142,66 148,66" />
                </g>
              </g>
              <ellipse cx="100" cy="170" rx="50" ry="10" className="seed-shadow" />
            </svg>
          </div>
        </div>

        {message && <div className="seed-message">{message}</div>}
        <div className="seed-badge">
          <span>Lv.{character.level}</span>
          <span>🐾 {petCount}</span>
        </div>
      </div>
    </div>
  );
}
