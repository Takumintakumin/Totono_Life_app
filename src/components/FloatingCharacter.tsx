import { useState, useEffect } from 'react';
import { Character } from '../types';
import { getCharacterAppearance } from '../utils/character';
import './FloatingCharacter.css';

interface FloatingCharacterProps {
  character: Character;
}

type Direction = 'up' | 'down' | 'left' | 'right';

export default function FloatingCharacter({ character }: FloatingCharacterProps) {
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [direction, setDirection] = useState<Direction>('right');
  const [isMoving, setIsMoving] = useState(true);
  const [isPetting, setIsPetting] = useState(false);
  const [showMessage, setShowMessage] = useState<string>('');
  const [petCount, setPetCount] = useState(0);

  const appearance = getCharacterAppearance(character);

  // 自動移動の処理
  useEffect(() => {
    if (!isMoving || isPetting) return;

    const moveInterval = setInterval(() => {
      setPosition((prev) => {
        let newX = prev.x;
        let newY = prev.y;
        let newDirection = direction;

        // ランダムに方向を変更
        if (Math.random() < 0.1) {
          const directions: Direction[] = ['up', 'down', 'left', 'right'];
          newDirection = directions[Math.floor(Math.random() * directions.length)];
          setDirection(newDirection);
        }

        // 方向に応じて移動
        const speed = 0.5;
        switch (newDirection) {
          case 'right':
            newX = Math.min(prev.x + speed, 90);
            if (newX >= 90) newDirection = 'left';
            break;
          case 'left':
            newX = Math.max(prev.x - speed, 10);
            if (newX <= 10) newDirection = 'right';
            break;
          case 'down':
            newY = Math.min(prev.y + speed, 85);
            if (newY >= 85) newDirection = 'up';
            break;
          case 'up':
            newY = Math.max(prev.y - speed, 15);
            if (newY <= 15) newDirection = 'down';
            break;
        }

        setDirection(newDirection);
        return { x: newX, y: newY };
      });
    }, 50);

    return () => clearInterval(moveInterval);
  }, [isMoving, isPetting, direction]);

  // 撫でる処理
  const handlePet = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (isPetting) return;

    setIsPetting(true);
    setIsMoving(false);
    setPetCount(prev => prev + 1);

    const messages = [
      'わん！',
      'にゃー！',
      'きもちいい〜',
      'もっと撫でて！',
      '最高だよ！',
    ];
    const message = messages[Math.min(petCount, messages.length - 1)];
    setShowMessage(message);

    setTimeout(() => {
      setIsPetting(false);
      setIsMoving(true);
      setShowMessage('');
    }, 2000);
  };

  // キャラクターの状態に応じたクラス
  const getCharacterClass = (): string => {
    if (isPetting) return 'character-petting';
    if (!isMoving) return 'character-idle';
    return `character-moving character-${direction}`;
  };

  return (
    <div
      className={`floating-character ${getCharacterClass()}`}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
      }}
      onClick={handlePet}
      onTouchStart={handlePet}
    >
      <div className="character-avatar">
        <div className="character-face">{appearance}</div>
        {isPetting && (
          <div className="pet-hearts">
            <span className="heart">💕</span>
            <span className="heart">💕</span>
            <span className="heart">💕</span>
          </div>
        )}
      </div>
      {showMessage && (
        <div className="character-bubble">
          {showMessage}
        </div>
      )}
      {petCount > 0 && (
        <div className="pet-badge">
          🐾 {petCount}
        </div>
      )}
    </div>
  );
}

