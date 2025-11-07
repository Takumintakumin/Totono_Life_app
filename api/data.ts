import { VercelRequest, VercelResponse } from '@vercel/node';
import { getDbPool } from '../src/lib/db-neon';
import { handleCors, setCorsHeaders } from './utils/cors';
import { getUserId } from './utils/user';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res);

  const userId = getUserId(req);
  const pool = getDbPool();

  try {
    if (req.method === 'GET') {
      // データ取得
      const usersResult = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );
      
      if (usersResult.rows.length === 0) {
        // ユーザーが存在しない場合は初期データを返す
        return res.status(200).json({
          character: {
            level: 1,
            experience: 0,
            experienceToNext: 100,
            theme: 'plant',
            evolutionStage: 0,
            lastActiveDate: new Date().toISOString().split('T')[0],
          },
          defaultMorningRoutines: ['歯磨き', '水を飲む', '布団をたたむ', 'ストレッチ'],
          defaultEveningRoutines: ['日記を書く', 'スマホを置く', '明日の準備', '深呼吸'],
          dayLogs: [],
          settings: {
            morningNotificationTime: '08:00',
            eveningNotificationTime: '22:00',
          },
        });
      }

      // キャラクター情報取得
      const charactersResult = await pool.query(
        'SELECT * FROM characters WHERE user_id = $1',
        [userId]
      );
      const character = charactersResult.rows[0] || null;

      // ルーティン設定取得
      const settingsResult = await pool.query(
        'SELECT * FROM routine_settings WHERE user_id = $1',
        [userId]
      );
      const routineSettings = settingsResult.rows[0] || null;

      // 日次ログ取得（過去30日）
      const dayLogsResult = await pool.query(
        'SELECT * FROM day_logs WHERE user_id = $1 ORDER BY date DESC LIMIT 30',
        [userId]
      );

      res.status(200).json({
        character: character ? {
          level: character.level,
          experience: character.experience,
          experienceToNext: character.experience_to_next,
          theme: character.theme,
          evolutionStage: character.evolution_stage,
          lastActiveDate: character.last_active_date?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        } : {
          level: 1,
          experience: 0,
          experienceToNext: 100,
          theme: 'plant',
          evolutionStage: 0,
          lastActiveDate: new Date().toISOString().split('T')[0],
        },
        defaultMorningRoutines: routineSettings?.morning_routines 
          ? (Array.isArray(routineSettings.morning_routines) 
              ? routineSettings.morning_routines 
              : JSON.parse(routineSettings.morning_routines as string)) 
          : ['歯磨き', '水を飲む', '布団をたたむ', 'ストレッチ'],
        defaultEveningRoutines: routineSettings?.evening_routines 
          ? (Array.isArray(routineSettings.evening_routines) 
              ? routineSettings.evening_routines 
              : JSON.parse(routineSettings.evening_routines as string)) 
          : ['日記を書く', 'スマホを置く', '明日の準備', '深呼吸'],
        dayLogs: dayLogsResult.rows.map(log => ({
          date: typeof log.date === 'string' ? log.date : log.date.toISOString().split('T')[0],
          morning: {
            routines: Array.isArray(log.morning_routines) 
              ? log.morning_routines 
              : JSON.parse(log.morning_routines || '[]'),
            completed: log.morning_completed,
          },
          evening: {
            routines: Array.isArray(log.evening_routines) 
              ? log.evening_routines 
              : JSON.parse(log.evening_routines || '[]'),
            completed: log.evening_completed,
            mood: log.mood,
          },
        })),
        settings: routineSettings ? {
          morningNotificationTime: routineSettings.morning_notification_time,
          eveningNotificationTime: routineSettings.evening_notification_time,
        } : {
          morningNotificationTime: '08:00',
          eveningNotificationTime: '22:00',
        },
      });
    } else if (req.method === 'POST') {
      // データ保存
      const data = req.body;

      // ユーザー作成（存在しない場合）
      await pool.query(
        'INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING',
        [userId]
      );

      // キャラクター保存
      await pool.query(
        `INSERT INTO characters (user_id, level, experience, experience_to_next, theme, evolution_stage, last_active_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id) DO UPDATE SET
         level = EXCLUDED.level,
         experience = EXCLUDED.experience,
         experience_to_next = EXCLUDED.experience_to_next,
         theme = EXCLUDED.theme,
         evolution_stage = EXCLUDED.evolution_stage,
         last_active_date = EXCLUDED.last_active_date`,
        [
          userId,
          data.character.level,
          data.character.experience,
          data.character.experienceToNext,
          data.character.theme,
          data.character.evolutionStage,
          data.character.lastActiveDate,
        ]
      );

      // ルーティン設定保存
      await pool.query(
        `INSERT INTO routine_settings (user_id, morning_routines, evening_routines, morning_notification_time, evening_notification_time)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id) DO UPDATE SET
         morning_routines = EXCLUDED.morning_routines,
         evening_routines = EXCLUDED.evening_routines,
         morning_notification_time = EXCLUDED.morning_notification_time,
         evening_notification_time = EXCLUDED.evening_notification_time`,
        [
          userId,
          JSON.stringify(data.defaultMorningRoutines),
          JSON.stringify(data.defaultEveningRoutines),
          data.settings.morningNotificationTime,
          data.settings.eveningNotificationTime,
        ]
      );

      // 日次ログ保存
      for (const log of data.dayLogs) {
        await pool.query(
          `INSERT INTO day_logs (user_id, date, morning_routines, morning_completed, evening_routines, evening_completed, mood)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (user_id, date) DO UPDATE SET
           morning_routines = EXCLUDED.morning_routines,
           morning_completed = EXCLUDED.morning_completed,
           evening_routines = EXCLUDED.evening_routines,
           evening_completed = EXCLUDED.evening_completed,
           mood = EXCLUDED.mood`,
          [
            userId,
            log.date,
            JSON.stringify(log.morning.routines),
            log.morning.completed,
            JSON.stringify(log.evening.routines),
            log.evening.completed,
            log.evening.mood || null,
          ]
        );
      }

      res.status(200).json({ message: 'Data saved successfully' });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('API error:', error);
    res.status(500).json({ error: error.message });
  }
}

