import { Character } from '../types';

const EXP_PER_ROUTINE = 10;
const EXP_BONUS_FULL_COMPLETE = 20;

export const calculateExperience = (
  completedRoutines: number,
  _totalRoutines: number,
  isFullComplete: boolean
): number => {
  let exp = completedRoutines * EXP_PER_ROUTINE;
  if (isFullComplete) {
    exp += EXP_BONUS_FULL_COMPLETE;
  }
  return exp;
};

export const addExperience = (
  character: Character,
  exp: number
): Character => {
  let newExp = character.experience + exp;
  let newLevel = character.level;
  let newExpToNext = character.experienceToNext;
  let newEvolutionStage = character.evolutionStage;

  // レベルアップ処理
  while (newExp >= newExpToNext) {
    newExp -= newExpToNext;
    newLevel += 1;
    newExpToNext = Math.floor(newExpToNext * 1.5); // 次のレベルに必要な経験値が増加

    // 5レベルごとに進化
    if (newLevel % 5 === 0) {
      newEvolutionStage += 1;
    }
  }

  return {
    ...character,
    level: newLevel,
    experience: newExp,
    experienceToNext: newExpToNext,
    evolutionStage: newEvolutionStage,
    lastActiveDate: new Date().toISOString().split('T')[0],
  };
};

export const getCharacterAppearance = (character: Character): string => {
  const { theme, evolutionStage } = character;
  const daysSinceActive = Math.floor(
    (Date.now() - new Date(character.lastActiveDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  let state = 'normal';
  if (daysSinceActive > 0) {
    state = daysSinceActive === 1 ? 'sleepy' : 'cloudy';
  }

  // テーマと進化段階に基づいて見た目を決定（可愛い動物メイン）
  const appearances: Record<string, Record<number, Record<string, string>>> = {
    plant: {
      0: { normal: '🌱', sleepy: '😴', cloudy: '☁️' },
      1: { normal: '🌿', sleepy: '😴', cloudy: '☁️' },
      2: { normal: '🌳', sleepy: '😴', cloudy: '☁️' },
      3: { normal: '🌸', sleepy: '😴', cloudy: '☁️' },
    },
    animal: {
      0: { normal: '🐾', sleepy: '😴', cloudy: '☁️' }, // 子犬・子猫
      1: { normal: '🐶', sleepy: '😴', cloudy: '☁️' }, // 犬
      2: { normal: '🐱', sleepy: '😴', cloudy: '☁️' }, // 猫
      3: { normal: '🐰', sleepy: '😴', cloudy: '☁️' }, // うさぎ
    },
    robot: {
      0: { normal: '🤖', sleepy: '😴', cloudy: '☁️' },
      1: { normal: '⚙️', sleepy: '😴', cloudy: '☁️' },
      2: { normal: '🚀', sleepy: '😴', cloudy: '☁️' },
      3: { normal: '🌟', sleepy: '😴', cloudy: '☁️' },
    },
  };

  const stage = Math.min(evolutionStage, 3);
  return (
    appearances[theme]?.[stage]?.[state] || appearances.plant[0].normal
  );
};


