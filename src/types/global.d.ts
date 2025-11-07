export {};

declare global {
  type CharacterAction = 'morning' | 'night' | 'miss' | 'blink';

  interface Window {
    charAction?: (action: CharacterAction) => void;
  }
}
