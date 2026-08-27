-- SpeakUp — DP World Kigali Safety Reporting System
-- MySQL 8.0+  |  Character set utf8mb4

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS speakup
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE speakup;

-- ------------------------------------------------------------
-- Users & authentication
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              CHAR(36)      NOT NULL PRIMARY KEY,
  username        VARCHAR(80)   NOT NULL UNIQUE,
  password_hash   VARCHAR(255)  NOT NULL,
  full_name       VARCHAR(160)  NOT NULL,
  email           VARCHAR(160)  NOT NULL UNIQUE,
  phone           VARCHAR(40)   NULL,
  department      VARCHAR(80)   NULL,
  role            ENUM(
                    'employee',
                    'safety_officer',
                    'safety_manager',
                    'administrator'
                  ) NOT NULL DEFAULT 'employee',
  is_active       TINYINT(1)    NOT NULL DEFAULT 1,
  last_login_at   DATETIME      NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by      CHAR(36)      NULL,
  must_change_password TINYINT(1) NOT NULL DEFAULT 0,
  INDEX idx_users_role (role),
  INDEX idx_users_active (is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS login_otps (
  id              CHAR(36)      NOT NULL PRIMARY KEY,
  user_id         CHAR(36)      NOT NULL,
  otp_hash        VARCHAR(255)  NOT NULL,
  expires_at      DATETIME      NOT NULL,
  consumed_at     DATETIME      NULL,
  attempts        INT           NOT NULL DEFAULT 0,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_otp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_otp_user (user_id),
  INDEX idx_otp_expires (expires_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id              CHAR(36)      NOT NULL PRIMARY KEY,
  user_id         CHAR(36)      NOT NULL,
  token_hash      VARCHAR(255)  NOT NULL,
  expires_at      DATETIME      NOT NULL,
  revoked_at      DATETIME      NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_agent      VARCHAR(255)  NULL,
  ip_address      VARCHAR(64)   NULL,
  CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_rt_user (user_id),
  INDEX idx_rt_expires (expires_at)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Master data
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locations (
  id              CHAR(36)      NOT NULL PRIMARY KEY,
  code            VARCHAR(40)   NOT NULL UNIQUE,
  name            VARCHAR(120)  NOT NULL,
  qr_slug         VARCHAR(80)   NOT NULL UNIQUE,
  latitude        DECIMAL(10,7) NULL,
  longitude       DECIMAL(10,7) NULL,
  is_active       TINYINT(1)    NOT NULL DEFAULT 1,
  sort_order      INT           NOT NULL DEFAULT 0,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS report_categories (
  id              CHAR(36)      NOT NULL PRIMARY KEY,
  code            VARCHAR(60)   NOT NULL UNIQUE,
  name            VARCHAR(120)  NOT NULL,
  module          ENUM(
                    'general',
                    'forklift',
                    'traffic',
                    'container_yard',
                    'warehouse',
                    'damaged_container'
                  ) NOT NULL DEFAULT 'general',
  is_active       TINYINT(1)    NOT NULL DEFAULT 1,
  sort_order      INT           NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS system_settings (
  setting_key     VARCHAR(80)   NOT NULL PRIMARY KEY,
  setting_value   TEXT          NOT NULL,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by      CHAR(36)      NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS report_sequences (
  year_key        INT           NOT NULL PRIMARY KEY,
  last_number     INT           NOT NULL DEFAULT 0
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Hazard reports
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
  id                    CHAR(36)      NOT NULL PRIMARY KEY,
  report_no             VARCHAR(24)   NOT NULL UNIQUE,
  reporter_category     ENUM(
                          'visitor',
                          'customer',
                          'contractor',
                          'driver',
                          'employee',
                          'safety_officer',
                          'safety_manager',
                          'administrator'
                        ) NOT NULL,
  is_anonymous          TINYINT(1)    NOT NULL DEFAULT 0,
  reporter_name         VARCHAR(160)  NULL,
  company               VARCHAR(160)  NULL,
  phone                 VARCHAR(40)   NULL,
  email                 VARCHAR(160)  NULL,
  vehicle_registration  VARCHAR(40)   NULL,
  reporter_user_id      CHAR(36)      NULL,
  report_type           VARCHAR(60)   NOT NULL,
  module                VARCHAR(40)   NOT NULL DEFAULT 'general',
  severity              ENUM('low','medium','high','critical') NOT NULL,
  location_id           CHAR(36)      NOT NULL,
  location_other        VARCHAR(160)  NULL,
  description           TEXT          NOT NULL,
  latitude              DECIMAL(10,7) NULL,
  longitude             DECIMAL(10,7) NULL,
  status                ENUM(
                          'open',
                          'assigned',
                          'under_investigation',
                          'corrective_action',
                          'awaiting_verification',
                          'closed'
                        ) NOT NULL DEFAULT 'open',
  assigned_to           CHAR(36)      NULL,
  assigned_department   VARCHAR(80)   NULL,
  occurred_at           DATETIME      NOT NULL,
  closed_at             DATETIME      NULL,
  first_response_at     DATETIME      NULL,
  extra_fields          TEXT          NULL,
  created_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_rep_loc FOREIGN KEY (location_id) REFERENCES locations(id),
  CONSTRAINT fk_rep_user FOREIGN KEY (reporter_user_id) REFERENCES users(id),
  CONSTRAINT fk_rep_assignee FOREIGN KEY (assigned_to) REFERENCES users(id),
  INDEX idx_rep_status (status),
  INDEX idx_rep_severity (severity),
  INDEX idx_rep_type (report_type),
  INDEX idx_rep_loc (location_id),
  INDEX idx_rep_created (created_at),
  INDEX idx_rep_module (module)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS report_images (
  id              CHAR(36)      NOT NULL PRIMARY KEY,
  report_id       CHAR(36)      NOT NULL,
  file_name       VARCHAR(255)  NOT NULL,
  mime_type       VARCHAR(80)   NOT NULL,
  file_size       INT           NOT NULL,
  storage_path    VARCHAR(255)  NOT NULL,
  file_data       LONGBLOB      NULL,
  caption         VARCHAR(255)  NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_img_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS report_status_history (
  id              CHAR(36)      NOT NULL PRIMARY KEY,
  report_id       CHAR(36)      NOT NULL,
  from_status     VARCHAR(40)   NULL,
  to_status       VARCHAR(40)   NOT NULL,
  note            TEXT          NULL,
  changed_by      CHAR(36)      NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_hist_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Investigations & RCA
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS investigations (
  id                    CHAR(36)      NOT NULL PRIMARY KEY,
  report_id             CHAR(36)      NOT NULL UNIQUE,
  incident_summary      TEXT          NULL,
  findings              TEXT          NULL,
  root_cause            TEXT          NULL,
  corrective_actions    TEXT          NULL,
  preventive_actions    TEXT          NULL,
  lessons_learned       TEXT          NULL,
  why_1                 TEXT          NULL,
  why_2                 TEXT          NULL,
  why_3                 TEXT          NULL,
  why_4                 TEXT          NULL,
  why_5                 TEXT          NULL,
  fishbone_people       TEXT          NULL,
  fishbone_equipment    TEXT          NULL,
  fishbone_methods      TEXT          NULL,
  fishbone_materials    TEXT          NULL,
  fishbone_environment  TEXT          NULL,
  fishbone_management   TEXT          NULL,
  status                ENUM('draft','submitted','approved','rejected') NOT NULL DEFAULT 'draft',
  investigator_id       CHAR(36)      NULL,
  approved_by           CHAR(36)      NULL,
  approved_at           DATETIME      NULL,
  created_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inv_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  CONSTRAINT fk_inv_investigator FOREIGN KEY (investigator_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS investigation_attachments (
  id                CHAR(36)      NOT NULL PRIMARY KEY,
  investigation_id  CHAR(36)      NOT NULL,
  file_name         VARCHAR(255)  NOT NULL,
  mime_type         VARCHAR(80)   NOT NULL,
  file_size         INT           NOT NULL,
  storage_path      VARCHAR(255)  NOT NULL,
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_invatt_inv FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Corrective actions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS corrective_actions (
  id                  CHAR(36)      NOT NULL PRIMARY KEY,
  report_id           CHAR(36)      NOT NULL,
  title               VARCHAR(200)  NOT NULL,
  description         TEXT          NOT NULL,
  department          VARCHAR(80)   NOT NULL,
  responsible_user_id CHAR(36)      NULL,
  responsible_name    VARCHAR(160)  NULL,
  due_date            DATE          NOT NULL,
  priority            ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  status              ENUM('open','in_progress','completed','overdue') NOT NULL DEFAULT 'open',
  completed_at        DATETIME      NULL,
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ca_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  CONSTRAINT fk_ca_user FOREIGN KEY (responsible_user_id) REFERENCES users(id),
  INDEX idx_ca_status (status),
  INDEX idx_ca_due (due_date)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Communications
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS announcements (
  id              CHAR(36)      NOT NULL PRIMARY KEY,
  title           VARCHAR(200)  NOT NULL,
  body            TEXT          NOT NULL,
  is_published    TINYINT(1)    NOT NULL DEFAULT 1,
  created_by      CHAR(36)      NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ann_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS training_materials (
  id              CHAR(36)      NOT NULL PRIMARY KEY,
  title           VARCHAR(200)  NOT NULL,
  description     TEXT          NULL,
  url             VARCHAR(500)  NULL,
  category        VARCHAR(80)   NULL,
  is_published    TINYINT(1)    NOT NULL DEFAULT 1,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notification_log (
  id              CHAR(36)      NOT NULL PRIMARY KEY,
  report_id       CHAR(36)      NULL,
  channel         ENUM('email','whatsapp','in_app') NOT NULL,
  recipient       VARCHAR(200)  NOT NULL,
  subject         VARCHAR(255)  NULL,
  body            TEXT          NOT NULL,
  status          ENUM('queued','sent','failed') NOT NULL DEFAULT 'queued',
  error_message   TEXT          NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_nl_report (report_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Audit
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id              CHAR(36)      NOT NULL PRIMARY KEY,
  actor_id        CHAR(36)      NULL,
  actor_name      VARCHAR(160)  NULL,
  actor_role      VARCHAR(40)   NULL,
  action          VARCHAR(80)   NOT NULL,
  entity          VARCHAR(80)   NOT NULL,
  entity_id       VARCHAR(64)   NULL,
  ip_address      VARCHAR(64)   NULL,
  user_agent      VARCHAR(255)  NULL,
  metadata        TEXT          NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_created (created_at),
  INDEX idx_audit_actor (actor_id),
  INDEX idx_audit_entity (entity, entity_id)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
