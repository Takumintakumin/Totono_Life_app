-- Totono Life App Database Schema (Neon PostgreSQL版)

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 更新日時を自動更新する関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ユーザーテーブルの更新日時トリガー
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- テーマのENUM型を作成
CREATE TYPE theme_type AS ENUM ('plant', 'animal', 'robot');
CREATE TYPE mood_type AS ENUM ('happy', 'neutral', 'sad');

-- キャラクターテーブル
CREATE TABLE IF NOT EXISTS characters (
  user_id VARCHAR(255) PRIMARY KEY,
  level INT DEFAULT 1,
  experience INT DEFAULT 0,
  experience_to_next INT DEFAULT 100,
  theme theme_type DEFAULT 'plant',
  evolution_stage INT DEFAULT 0,
  last_active_date DATE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ルーティン設定テーブル
CREATE TABLE IF NOT EXISTS routine_settings (
  user_id VARCHAR(255) PRIMARY KEY,
  morning_routines JSONB,
  evening_routines JSONB,
  morning_notification_time TIME DEFAULT '08:00:00',
  evening_notification_time TIME DEFAULT '22:00:00',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 日次ログテーブル
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
);

-- 日次ログテーブルの更新日時トリガー
CREATE TRIGGER update_day_logs_updated_at BEFORE UPDATE ON day_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- インデックス追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_day_logs_user_date ON day_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_characters_last_active ON characters(last_active_date);
CREATE INDEX IF NOT EXISTS idx_day_logs_user_id ON day_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_day_logs_date ON day_logs(date);

