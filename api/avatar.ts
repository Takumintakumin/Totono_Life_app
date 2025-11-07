import { VercelRequest, VercelResponse } from '@vercel/node';
import { getDbPool } from './lib/db';
import { handleCors, setCorsHeaders } from './utils/cors';
import { getUserId } from './utils/user';

const DEFAULT_AVATAR = {
  skinTone: '#fcd7b8',
  hairColor: '#5d4632',
  clothingColor: '#7fb4ff',
  outlineColor: '#2b3a2b',
  accentColor: '#ffb26b',
  cheekColor: '#ff9bb3',
  accessory: 'none',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res);

  const userId = getUserId(req);
  const pool = getDbPool();

  try {
    if (req.method === 'GET') {
      const result = await pool.query(
        'SELECT id, display_name, email, avatar_config FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        res.status(200).json({
          user: {
            id: userId,
            displayName: 'ゲスト',
            email: '',
            avatar: DEFAULT_AVATAR,
            isRegistered: false,
          },
        });
        return;
      }

      const row = result.rows[0];
      const avatarConfig = row.avatar_config || DEFAULT_AVATAR;
      res.status(200).json({
        user: {
          id: row.id,
          displayName: row.display_name || 'ゲスト',
          email: row.email || '',
          avatar: typeof avatarConfig === 'string' ? JSON.parse(avatarConfig) : avatarConfig,
          isRegistered: Boolean(row.display_name),
        },
      });
      return;
    }

    if (req.method === 'PUT') {
      const { displayName, email, avatar } = req.body || {};

      if (!displayName) {
        res.status(400).json({ error: '表示名は必須です' });
        return;
      }

      const trimmedName = String(displayName).trim();
      if (!trimmedName) {
        res.status(400).json({ error: '表示名は必須です' });
        return;
      }

      const trimmedEmail = email ? String(email).trim() : null;
      const avatarConfig = avatar || DEFAULT_AVATAR;

      await pool.query(
        `UPDATE users
         SET display_name = $1,
             email = $2,
             avatar_config = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [trimmedName, trimmedEmail, avatarConfig, userId]
      );

      res.status(200).json({
        user: {
          id: userId,
          displayName: trimmedName,
          email: trimmedEmail || '',
          avatar: avatarConfig,
          isRegistered: true,
        },
      });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('avatar API error', error);
    res.status(500).json({ error: error.message });
  }
}
