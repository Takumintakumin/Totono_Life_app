import { Character } from '../types';
import InteractiveCharacter from '../components/InteractiveCharacter';

interface CharacterViewProps {
  character: Character;
}

export default function CharacterView({ character }: CharacterViewProps) {
  return (
    <div className="card">
      <InteractiveCharacter character={character} />
    </div>
  );
}


