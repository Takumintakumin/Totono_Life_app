import { VercelRequest, VercelResponse } from '@vercel/node';
import { getDbPool } from '../src/lib/db-neon';
import { handleCors, setCorsHeaders } from './utils/cors';

const DEFAULT_AVATAR = {
  bodyColor: '#fffbe6',
  leafPrimary: '#9be07a',
  leafSecondary: '#6fb44f',
  outlineColor: '#2b3a2b',
  accentColor: '#ffd56b',
  cheekColor: '#ffd0d0',
  accessory: 'none',
};

const DEFAULT_CHARACTER = {
  level: 1,
  experience: 0,
  experienceToNext: 100,
  theme: 'animal',
  evolutionStage: 0,
  lastActiveDate: new Date().toISOString().split('T')[0],
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res);

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { userId, displayName, email, avatar } = req.body || {};

  if (!userId || !displayName) {
    res.status(400).json({ error: 'userId と displayName は必須です' });
    return;
  }

  try {
    const pool = getDbPool();
    const trimmedName = String(displayName).trim();
    const trimmedEmail = email ? String(email).trim() : null;
    const avatarConfig = avatar || DEFAULT_AVATAR;

    await pool.query(
      `INSERT INTO users (id, display_name, email, avatar_config)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         email = EXCLUDED.email,
         avatar_config = EXCLUDED.avatar_config,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, trimmedName, trimmedEmail, avatarConfig]
    );

    await pool.query(
      `INSERT INTO characters (user_id, level, experience, experience_to_next, theme, evolution_stage, last_active_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id) DO NOTHING`,
      [
        userId,
        DEFAULT_CHARACTER.level,
        DEFAULT_CHARACTER.experience,
        DEFAULT_CHARACTER.experienceToNext,
        DEFAULT_CHARACTER.theme,
        DEFAULT_CHARACTER.evolutionStage,
        DEFAULT_CHARACTER.lastActiveDate,
      ]
    );

    res.status(200).json({ message: 'registered' });
  } catch (error: any) {
    console.error('register API error', error);
    res.status(500).json({ error: error.message });
  }
}
