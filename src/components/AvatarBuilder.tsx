import { useMemo } from 'react';
import { AvatarConfig, AvatarAccessory, createDefaultAvatarConfig } from '../types';
import './AvatarBuilder.css';

interface AvatarBuilderProps {
  value: AvatarConfig;
  onChange: (value: AvatarConfig) => void;
}

const ACCESSORY_OPTIONS: { label: string; value: AvatarAccessory }[] = [
  { label: 'なし', value: 'none' },
  { label: 'ハット', value: 'hat' },
  { label: 'メガネ', value: 'glasses' },
  { label: 'マフラー', value: 'scarf' },
];

const PRESETS: { name: string; config: AvatarConfig }[] = [
  {
    name: 'スタンダード',
    config: createDefaultAvatarConfig(),
  },
  {
    name: 'カフェ',
    config: {
      skinTone: '#f1c9a5',
      hairColor: '#4b3621',
      clothingColor: '#c2825c',
      outlineColor: '#2b2119',
      accentColor: '#f2b880',
      cheekColor: '#ff8fa3',
      accessory: 'hat',
    },
  },
  {
    name: 'パステル',
    config: {
      skinTone: '#ffdacc',
      hairColor: '#ff8fab',
      clothingColor: '#a5b4ff',
      outlineColor: '#5a5d94',
      accentColor: '#ffc6ff',
      cheekColor: '#ff9bbf',
      accessory: 'glasses',
    },
  },
  {
    name: 'フォレスト',
    config: {
      skinTone: '#f0e2c6',
      hairColor: '#2f5233',
      clothingColor: '#6fbf73',
      outlineColor: '#203926',
      accentColor: '#b9d989',
      cheekColor: '#ffd4a8',
      accessory: 'scarf',
    },
  },
];

export default function AvatarBuilder({ value, onChange }: AvatarBuilderProps) {
  const accessoryNode = useMemo(() => {
    switch (value.accessory) {
      case 'hat':
        return (
          <g transform="translate(100,45)">
            <path
              d="M-40 20 C-28 0,28 0,40 20 Z"
              fill={value.hairColor}
              stroke={value.outlineColor}
              strokeWidth={3}
            />
            <rect
              x="-28"
              y="20"
              width="56"
              height="18"
              rx="6"
              fill={value.accentColor}
              stroke={value.outlineColor}
              strokeWidth={2}
            />
          </g>
        );
      case 'glasses':
        return (
          <g transform="translate(100,96)" fill="none" stroke={value.outlineColor} strokeWidth={2.5}>
            <circle cx="-14" r="10" />
            <circle cx="14" r="10" />
            <line x1="-4" y1="0" x2="4" y2="0" />
          </g>
        );
      case 'scarf':
        return (
          <g transform="translate(100,120)">
            <path
              d="M-34 -6 C-10 10,10 10,34 -6 C30 4,28 12,20 14 C12 16,0 10,-6 14 C-12 18,-22 12,-34 -6 Z"
              fill={value.accentColor}
              stroke={value.outlineColor}
              strokeWidth={2}
            />
            <path
              d="M14 6 C20 22,10 34,0 40"
              stroke={value.outlineColor}
              strokeWidth={2}
              fill="none"
            />
          </g>
        );
      default:
        return null;
    }
  }, [value]);

  const handleColor = (key: keyof AvatarConfig) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...value, [key]: event.target.value });
    };

  const applyPreset = (config: AvatarConfig) => {
    onChange({ ...config });
  };

  return (
    <div className="avatar-builder">
      <div className="avatar-builder-preview" aria-label="アバターのプレビュー">
        <svg viewBox="0 0 200 200" role="img" aria-hidden="true">
          <g className="preview-char">
            <rect
              x="70"
              y="112"
              width="60"
              height="60"
              rx="24"
              style={{ fill: value.clothingColor, stroke: value.outlineColor, strokeWidth: 3 }}
            />
            <rect
              x="70"
              y="140"
              width="60"
              height="18"
              rx="9"
              style={{ fill: value.accentColor, opacity: 0.9 }}
            />

            <circle
              cx="100"
              cy="78"
              r="34"
              style={{ fill: value.skinTone, stroke: value.outlineColor, strokeWidth: 3 }}
            />
            <path
              d="M60 82 C60 50,80 36,100 36 C120 36,140 50,140 82 C128 74,116 70,100 70 C84 70,72 74,60 82 Z"
              fill={value.hairColor}
            />

            <circle cx="82" cy="102" r="6" fill={value.cheekColor} opacity={0.85} />
            <circle cx="118" cy="102" r="6" fill={value.cheekColor} opacity={0.85} />

            <g>
              <ellipse cx="88" cy="96" rx="7" ry="9" fill="#0b3411" />
              <circle cx="86" cy="93" r="2.4" fill="#ffffff" />
            </g>
            <g>
              <ellipse cx="112" cy="96" rx="7" ry="9" fill="#0b3411" />
              <circle cx="114" cy="93" r="2.4" fill="#ffffff" />
            </g>

            <path d="M92 124 Q100 130 108 124" stroke={value.outlineColor} strokeWidth={2.5} fill="none" />

            {accessoryNode}

            <circle cx="58" cy="58" r="4" fill={value.accentColor} opacity={0.8} />
            <polygon
              points="148,52 151,58 158,58 152,61 154,68 148,63 143,68 145,61 139,58 146,58"
              fill={value.accentColor}
              opacity={0.6}
            />
          </g>
        </svg>
        <div className="avatar-builder-shadow" />
      </div>

      <div className="avatar-builder-controls">
        <section>
          <h3>カラー</h3>
          <div className="color-grid">
            <label>
              肌の色
              <input type="color" value={value.skinTone} onChange={handleColor('skinTone')} />
            </label>
            <label>
              髪の色
              <input type="color" value={value.hairColor} onChange={handleColor('hairColor')} />
            </label>
            <label>
              服の色
              <input type="color" value={value.clothingColor} onChange={handleColor('clothingColor')} />
            </label>
            <label>
              アクセント
              <input type="color" value={value.accentColor} onChange={handleColor('accentColor')} />
            </label>
            <label>
              ほっぺ
              <input type="color" value={value.cheekColor} onChange={handleColor('cheekColor')} />
            </label>
            <label>
              アウトライン
              <input type="color" value={value.outlineColor} onChange={handleColor('outlineColor')} />
            </label>
          </div>
        </section>

        <section>
          <h3>アクセサリー</h3>
          <div className="accessory-grid">
            {ACCESSORY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`accessory-button ${value.accessory === option.value ? 'selected' : ''}`}
                onClick={() => onChange({ ...value, accessory: option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3>プリセット</h3>
          <div className="preset-grid">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset.config)}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
