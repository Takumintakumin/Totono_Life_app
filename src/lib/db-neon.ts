import { Pool } from 'pg';

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    // DATABASE_URLが設定されている場合はそれを使用（推奨）
    if (process.env.DATABASE_URL) {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false, // NeonのSSL証明書用
        },
      });
    } else {
      // 個別の環境変数から接続情報を構築
      pool = new Pool({
        host: process.env.POSTGRES_HOST || process.env.MYSQL_HOST,
        port: parseInt(process.env.POSTGRES_PORT || process.env.MYSQL_PORT || '5432'),
        user: process.env.POSTGRES_USER || process.env.MYSQL_USER,
        password: process.env.POSTGRES_PASSWORD || process.env.MYSQL_PASSWORD,
        database: process.env.POSTGRES_DATABASE || process.env.MYSQL_DATABASE,
        ssl: (process.env.POSTGRES_SSL === 'true' || process.env.MYSQL_SSL === 'true') 
          ? { rejectUnauthorized: false }
          : false,
      });
    }
  }
  return pool;
}

export async function initDatabase(): Promise<void> {
  const pool = getDbPool();
  
  // ユーザーテーブル
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS display_name VARCHAR(255)
  `);
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email VARCHAR(255)
  `);
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS avatar_config JSONB DEFAULT '{}'::jsonb
  `);

  // 更新日時を自動更新する関数
  await pool.query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql'
  `);

  // ユーザーテーブルの更新日時トリガー
  await pool.query(`
    DROP TRIGGER IF EXISTS update_users_updated_at ON users
  `);
  await pool.query(`
    CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
  `);

  // テーマのENUM型を作成
  await pool.query(`
    DO $$ BEGIN
      CREATE TYPE theme_type AS ENUM ('plant', 'animal', 'robot');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await pool.query(`
    DO $$ BEGIN
      CREATE TYPE mood_type AS ENUM ('happy', 'neutral', 'sad');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // キャラクターテーブル
  await pool.query(`
    CREATE TABLE IF NOT EXISTS characters (
      user_id VARCHAR(255) PRIMARY KEY,
      level INT DEFAULT 1,
      experience INT DEFAULT 0,
      experience_to_next INT DEFAULT 100,
      theme theme_type DEFAULT 'plant',
      evolution_stage INT DEFAULT 0,
      last_active_date DATE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // ルーティン設定テーブル
  await pool.query(`
    CREATE TABLE IF NOT EXISTS routine_settings (
      user_id VARCHAR(255) PRIMARY KEY,
      morning_routines JSONB,
      evening_routines JSONB,
      morning_notification_time TIME DEFAULT '08:00:00',
      evening_notification_time TIME DEFAULT '22:00:00',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 日次ログテーブル
  await pool.query(`
    CREATE TABLE IF NOT EXISTS day_logs (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255),
      date DATE NOT NULL,
      morning_routines JSONB,
      morning_completed BOOLEAN DEFAULT FALSE,
      evening_routines JSONB,
      evening_completed BOOLEAN DEFAULT FALSE,
      mood mood_type,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (user_id, date)
    )
  `);

  // 日次ログテーブルの更新日時トリガー
  await pool.query(`
    DROP TRIGGER IF EXISTS update_day_logs_updated_at ON day_logs
  `);
  await pool.query(`
    CREATE TRIGGER update_day_logs_updated_at BEFORE UPDATE ON day_logs
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
  `);

  // インデックス追加
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_day_logs_user_date ON day_logs(user_id, date)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_characters_last_active ON characters(last_active_date)
  `);
}

