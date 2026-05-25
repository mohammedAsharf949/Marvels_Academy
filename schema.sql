-- Railway/Production Setup: 
-- 1. Create a MySQL database in Railway.
-- 2. Use the provided connection details (Host, User, Password, Port, Database Name).
-- 3. Import this schema (starting from CREATE TABLE).
-- NOTE: Comment out or remove the DROP/CREATE DATABASE lines below if you are importing into an existing database.

-- DROP DATABASE IF EXISTS marvels_academy;
-- CREATE DATABASE marvels_academy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE marvels_academy;

CREATE TABLE roles (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_roles_name (name)
) ENGINE=InnoDB;

CREATE TABLE grades (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_grades_name (name)
) ENGINE=InnoDB;

CREATE TABLE users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id INT UNSIGNED NOT NULL,
  grade_id INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_email (email),
  KEY idx_users_role_id (role_id),
  KEY idx_users_grade_id (grade_id),
  CONSTRAINT fk_users_role
    FOREIGN KEY (role_id) REFERENCES roles (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_users_grade
    FOREIGN KEY (grade_id) REFERENCES grades (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE live_rooms (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  meeting_link VARCHAR(500) NOT NULL,
  grade_id INT UNSIGNED NOT NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_live_rooms_grade_id (grade_id),
  KEY idx_live_rooms_created_by (created_by),
  CONSTRAINT fk_live_rooms_grade
    FOREIGN KEY (grade_id) REFERENCES grades (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_live_rooms_created_by
    FOREIGN KEY (created_by) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE recorded_sessions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  video_url VARCHAR(800) NOT NULL,
  grade_id INT UNSIGNED NOT NULL,
  uploaded_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_recorded_sessions_grade_id (grade_id),
  KEY idx_recorded_sessions_uploaded_by (uploaded_by),
  CONSTRAINT fk_recorded_sessions_grade
    FOREIGN KEY (grade_id) REFERENCES grades (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_recorded_sessions_uploaded_by
    FOREIGN KEY (uploaded_by) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE ai_chat_sessions (
  id CHAR(36) NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  page_path VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ai_chat_sessions_user (user_id),
  CONSTRAINT fk_ai_chat_sessions_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE ai_chat_messages (
  id CHAR(36) NOT NULL,
  session_id CHAR(36) NOT NULL,
  sender VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ai_chat_messages_session (session_id),
  CONSTRAINT fk_ai_chat_messages_session
    FOREIGN KEY (session_id) REFERENCES ai_chat_sessions (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO roles (name) VALUES
  ('administrator'),
  ('teacher'),
  ('live_student'),
  ('recorded_student');

INSERT INTO grades (name) VALUES
  ('Grade 3'),
  ('Grade 4'),
  ('Grade 5'),
  ('Grade 6'),
  ('Grade 7'),
  ('Grade 8'),
  ('Grade 9');

INSERT INTO users (name, email, password_hash, role_id, grade_id)
SELECT
  'Admin',
  'admin@marvels.local',
  '$2a$10$UTC1bqRfvF2meV/AguP15.td8Wx.qW.2lCFAYva69tU.miBHzA1Dq',
  r.id,
  NULL
FROM roles r
WHERE r.name = 'administrator'
LIMIT 1;
