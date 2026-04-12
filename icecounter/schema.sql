-- ════════════════════════════════════════════
-- SECTION: ICECOUNTER SCHEMA
--
-- Run this once against your database to set
-- up the required table before using the app.
--
-- passwordA acts as a username (stored plaintext
-- for efficient lookup via UNIQUE index).
-- passwordB is stored as a bcrypt hash — the
-- raw password is never written to the database.
-- ════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS icecounter (

    -- ── Identity ──────────────────────────────
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,

    -- ── Credentials ───────────────────────────
    -- passwordA: the "username" half of the key pair
    passwordA       VARCHAR(64)     NOT NULL,
    -- passwordB_hash: bcrypt hash produced by PHP password_hash()
    passwordB_hash  VARCHAR(255)    NOT NULL,

    -- ── Counters ──────────────────────────────
    -- UNSIGNED guarantees neither value can go below zero
    icecream        INT UNSIGNED    NOT NULL DEFAULT 0,
    monster         INT UNSIGNED    NOT NULL DEFAULT 0,

    -- ── Constraints ───────────────────────────
    PRIMARY KEY (id),
    UNIQUE KEY unique_user (passwordA)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ════════════════════════════════════════════
-- SECTION: ICECOUNTER LOGS TABLE
--
-- key_a maps to icecounter.passwordA so each
-- key pair has its own logical log stream.
--
-- Run this schema file multiple times safely;
-- CREATE TABLE IF NOT EXISTS is idempotent.
-- ════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS icecounter_logs (

    -- ── Identity ──────────────────────────────
    log_id           INT UNSIGNED    NOT NULL AUTO_INCREMENT,

    -- ── Link to key pair ─────────────────────
    key_a            VARCHAR(64)     NOT NULL,

    -- ── Event details ────────────────────────
    entry_type       ENUM('monster', 'icecream') NOT NULL,
    description      VARCHAR(280)    NOT NULL,
    created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- ── Constraints / indexes ────────────────
    PRIMARY KEY (log_id),
    KEY idx_logs_key_time (key_a, log_id),
    CONSTRAINT fk_icecounter_logs_key
        FOREIGN KEY (key_a)
        REFERENCES icecounter (passwordA)
        ON UPDATE CASCADE
        ON DELETE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
