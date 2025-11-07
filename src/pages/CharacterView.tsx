import { Character } from '../types';
import { getCharacterAppearance } from '../utils/character';

interface CharacterViewProps {
  character: Character;
}

export default function CharacterView({ character }: CharacterViewProps) {
  const appearance = getCharacterAppearance(character);
  const expPercentage = (character.experience / character.experienceToNext) * 100;

  const getThemeName = (theme: string) => {
    switch (theme) {
      case 'plant':
        return '植物系';
      case 'animal':
        return '動物系';
      case 'robot':
        return 'ロボット系';
      default:
        return '植物系';
    }
  };

  return (
    <div className="card">
      <div className="character-display">
        <div className="character-emoji">{appearance}</div>
        <div className="character-info">
          <div className="character-level">
            Level {character.level}
          </div>
          <div style={{ marginBottom: '1rem', color: '#666' }}>
            テーマ: {getThemeName(character.theme)}
          </div>
          {character.evolutionStage > 0 && (
            <div style={{ marginBottom: '1rem', color: '#667eea', fontWeight: 600 }}>
              ✨ 進化段階: {character.evolutionStage} ✨
            </div>
          )}
          <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
            経験値: {character.experience} / {character.experienceToNext}
          </div>
          <div className="exp-bar-container">
            <div
              className="exp-bar"
              style={{ width: `${expPercentage}%` }}
            >
              {expPercentage > 10 ? `${Math.round(expPercentage)}%` : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

