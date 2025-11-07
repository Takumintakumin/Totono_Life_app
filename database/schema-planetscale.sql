-- Totono Life App Database Schema (PlanetScale版)
-- PlanetScaleはFOREIGN KEY制約をサポートしていないため、制約なしで作成

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- キャラクターテーブル
CREATE TABLE IF NOT EXISTS characters (
  user_id VARCHAR(255) PRIMARY KEY,
  level INT DEFAULT 1,
  experience INT DEFAULT 0,
  experience_to_next INT DEFAULT 100,
  theme ENUM('plant', 'animal', 'robot') DEFAULT 'plant',
  evolution_stage INT DEFAULT 0,
  last_active_date DATE,
  INDEX idx_user_id (user_id)
);

-- ルーティン設定テーブル
CREATE TABLE IF NOT EXISTS routine_settings (
  user_id VARCHAR(255) PRIMARY KEY,
  morning_routines JSON,
  evening_routines JSON,
  morning_notification_time TIME DEFAULT '08:00:00',
  evening_notification_time TIME DEFAULT '22:00:00',
  INDEX idx_user_id (user_id)
);

-- 日次ログテーブル
CREATE TABLE IF NOT EXISTS day_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255),
  date DATE NOT NULL,
  morning_routines JSON,
  morning_completed BOOLEAN DEFAULT FALSE,
  evening_routines JSON,
  evening_completed BOOLEAN DEFAULT FALSE,
  mood ENUM('happy', 'neutral', 'sad'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_date (user_id, date),
  INDEX idx_user_id (user_id),
  INDEX idx_date (date)
);

-- インデックス追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_day_logs_user_date ON day_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_characters_last_active ON characters(last_active_date);

