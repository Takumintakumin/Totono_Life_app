import { Character, UserProfile } from '../types';
import SeedAvatar from '../components/SeedAvatar';

interface CharacterViewProps {
  character: Character;
  user: UserProfile;
}

export default function CharacterView({ character, user }: CharacterViewProps) {
  return (
    <div className="card">
      <SeedAvatar character={character} avatar={user.avatar} variant="inline" showBadge />
      <div style={{ textAlign: 'center', color: '#4d6a4d', marginBottom: '1rem' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{user.displayName || 'ゲスト'}</div>
        <div style={{ fontSize: '0.85rem', color: '#5d7b5d' }}>撫でてみてね！</div>
      </div>
      <div className="character-info" style={{ marginTop: '1.5rem' }}>
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
      </div>
    </div>
  );
}


