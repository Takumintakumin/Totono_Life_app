import { useState, useEffect } from 'react';
import { Character } from '../types';
import { getCharacterAppearance } from '../utils/character';
import './InteractiveCharacter.css';

interface InteractiveCharacterProps {
  character: Character;
}

type CharacterState = 'idle' | 'happy' | 'sleepy' | 'excited' | 'petting';

export default function InteractiveCharacter({ character }: InteractiveCharacterProps) {
  const [state, setState] = useState<CharacterState>('idle');
  const [petCount, setPetCount] = useState(0);
  const [showMessage, setShowMessage] = useState<string>('');
  const [isPetting, setIsPetting] = useState(false);

  const appearance = getCharacterAppearance(character);

  // 撫でる処理
  const handlePet = () => {
    if (isPetting) return;
    
    setIsPetting(true);
    setState('petting');
    setPetCount(prev => prev + 1);
    
    // 撫でた回数に応じたメッセージ
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
      setState('happy');
      setTimeout(() => {
        setIsPetting(false);
        setState('idle');
        setShowMessage('');
      }, 1500);
    }, 800);
  };

  // レベルアップ時の反応
  useEffect(() => {
    if (character.level > 1) {
      setState('excited');
      setShowMessage('レベルアップおめでとう！');
      setTimeout(() => {
        setState('idle');
        setShowMessage('');
      }, 2000);
    }
  }, [character.level]);

  // 眠そうな状態のチェック
  useEffect(() => {
    const daysSinceActive = Math.floor(
      (Date.now() - new Date(character.lastActiveDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceActive > 0) {
      setState('sleepy');
    }
  }, [character.lastActiveDate]);

  // アニメーションクラスの決定
  const getAnimationClass = (): string => {
    switch (state) {
      case 'happy':
        return 'character-bounce';
      case 'excited':
        return 'character-excited';
      case 'sleepy':
        return 'character-sleepy';
      case 'petting':
        return 'character-petting';
      default:
        return 'character-idle';
    }
  };

  return (
    <div className="interactive-character-container">
      <div className="character-display-area">
        <div
          className={`character-emoji ${getAnimationClass()}`}
          onClick={handlePet}
          onTouchStart={handlePet}
          style={{ cursor: 'pointer', userSelect: 'none' }}
          title="クリック/タップして撫でてね"
        >
          {appearance}
        </div>
        
        {showMessage && (
          <div className="character-message">
            {showMessage}
          </div>
        )}

        {isPetting && (
          <div className="pet-effect">
            <span className="heart">💕</span>
            <span className="heart">💕</span>
            <span className="heart">💕</span>
          </div>
        )}
      </div>

      <div className="character-info">
        <div className="character-level">
          Level {character.level}
        </div>
        {character.evolutionStage > 0 && (
          <div className="evolution-badge">
            ✨ 進化段階: {character.evolutionStage} ✨
          </div>
        )}
        <div className="exp-info">
          経験値: {character.experience} / {character.experienceToNext}
        </div>
        <div className="exp-bar-container">
          <div
            className="exp-bar"
            style={{
              width: `${(character.experience / character.experienceToNext) * 100}%`,
            }}
          >
            {((character.experience / character.experienceToNext) * 100).toFixed(0)}%
          </div>
        </div>
        <div className="pet-counter">
          🐾 撫でた回数: {petCount}回
        </div>
      </div>
    </div>
  );
}

