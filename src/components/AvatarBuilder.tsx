import { useMemo } from 'react';
import { AvatarConfig, AvatarAccessory, createDefaultAvatarConfig } from '../types';
import './AvatarBuilder.css';

interface AvatarBuilderProps {
  value: AvatarConfig;
  onChange: (value: AvatarConfig) => void;
}

const ACCESSORY_OPTIONS: { label: string; value: AvatarAccessory }[] = [
  { label: 'なし', value: 'none' },
  { label: 'お花', value: 'flower' },
  { label: 'リボン', value: 'ribbon' },
  { label: '新芽', value: 'sprout' },
];

const PRESETS: { name: string; config: AvatarConfig }[] = [
  {
    name: 'スタンダード',
    config: createDefaultAvatarConfig(),
  },
  {
    name: 'さくら',
    config: {
      bodyColor: '#fff0f6',
      leafPrimary: '#ffb7c5',
      leafSecondary: '#e08a9b',
      outlineColor: '#b05a6f',
      accentColor: '#ffc6d3',
      cheekColor: '#ff9baa',
      accessory: 'flower',
    },
  },
  {
    name: 'ウッド',
    config: {
      bodyColor: '#fff6db',
      leafPrimary: '#96c76f',
      leafSecondary: '#5a8b3c',
      outlineColor: '#4b3b2f',
      accentColor: '#f4b860',
      cheekColor: '#ffb199',
      accessory: 'sprout',
    },
  },
  {
    name: 'ネオン',
    config: {
      bodyColor: '#f6f7ff',
      leafPrimary: '#8b93f5',
      leafSecondary: '#5d63d1',
      outlineColor: '#31357c',
      accentColor: '#f592f3',
      cheekColor: '#f5a8fb',
      accessory: 'ribbon',
    },
  },
];

export default function AvatarBuilder({ value, onChange }: AvatarBuilderProps) {
  const accessoryNode = useMemo(() => {
    switch (value.accessory) {
      case 'flower':
        return (
          <g transform="translate(135,70)">
            <circle r="10" fill={value.accentColor} stroke={value.outlineColor} strokeWidth="2" />
            <circle r="4" fill={value.outlineColor} />
          </g>
        );
      case 'ribbon':
        return (
          <g transform="translate(100,80)">
            <path
              d="M-16 0 C-28 -10,-28 12,-12 8 C-8 2,-4 -2,0 -4 C4 -2,8 2,12 8 C28 12,28 -10,16 0"
              fill={value.accentColor}
              stroke={value.outlineColor}
              strokeWidth="2"
            />
            <circle cx="0" cy="-2" r="4" fill={value.outlineColor} />
          </g>
        );
      case 'sprout':
        return (
          <g transform="translate(100,58)">
            <path
              d="M0 0 C-18 -18,-26 -6,-14 4 C-10 8,-4 10,0 12 C4 10,10 8,14 4 C26 -6,18 -18,0 0"
              fill={value.leafPrimary}
              stroke={value.leafSecondary}
              strokeWidth="2"
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
            <ellipse
              cx="100"
              cy="118"
              rx="50"
              ry="46"
              style={{ fill: value.bodyColor, stroke: value.outlineColor, strokeWidth: 3 }}
            />
            <g transform="translate(-6,-18)">
              <path
                d="M88 80 C62 72,54 44,86 44 C92 44,98 48,102 54 C110 66,108 78,88 80 Z"
                style={{ fill: value.leafPrimary, stroke: value.leafSecondary, strokeWidth: 2 }}
              />
            </g>
            <g transform="translate(8,-14)">
              <path
                d="M112 78 C140 72,148 44,116 44 C110 44,104 48,100 54 C92 66,94 78,112 78 Z"
                style={{ fill: value.leafPrimary, stroke: value.leafSecondary, strokeWidth: 2 }}
              />
            </g>

            <circle cx="82" cy="118" r="6" fill={value.cheekColor} opacity={0.85} />
            <circle cx="118" cy="118" r="6" fill={value.cheekColor} opacity={0.85} />

            <g>
              <ellipse cx="88" cy="106" rx="8" ry="10" fill="#0b3411" />
              <circle cx="86" cy="103" r="2.6" fill="#ffffff" />
            </g>
            <g>
              <ellipse cx="112" cy="106" rx="8" ry="10" fill="#0b3411" />
              <circle cx="114" cy="103" r="2.6" fill="#ffffff" />
            </g>

            <path d="M92 124 Q100 130 108 124" stroke={value.outlineColor} strokeWidth={2.5} fill="none" />

            {accessoryNode}

            <circle cx="60" cy="70" r="4" fill={value.accentColor} opacity={0.8} />
            <polygon
              points="150,60 152,66 158,66 153,69 155,76 150,71 145,76 147,69 142,66 148,66"
              fill={value.accentColor}
              opacity={0.6}
            />
          </g>
        </svg>
        <div className="avatar-builder-shadow" />
      </div>

      <div className="avatar-builder-controls">
        <section>
          <h3>カラーパレット</h3>
          <div className="color-grid">
            <label>
              ボディ
              <input type="color" value={value.bodyColor} onChange={handleColor('bodyColor')} />
            </label>
            <label>
              リーフ
              <input type="color" value={value.leafPrimary} onChange={handleColor('leafPrimary')} />
            </label>
            <label>
              リーフ（縁）
              <input type="color" value={value.leafSecondary} onChange={handleColor('leafSecondary')} />
            </label>
            <label>
              アクセント
              <input type="color" value={value.accentColor} onChange={handleColor('accentColor')} />
            </label>
            <label>
              おてもち
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
