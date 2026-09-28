import { DatabaseSync } from 'node:sqlite'

export type DB = DatabaseSync

export function createDb(location = ':memory:'): DB {
  const db = new DatabaseSync(location)
  db.exec('PRAGMA foreign_keys = ON;')
  migrate(db)
  return db
}

export function migrate(db: DB): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS accessions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      scientific_name TEXT NOT NULL,
      family TEXT NOT NULL DEFAULT '',
      genus TEXT NOT NULL DEFAULT '',
      crop TEXT NOT NULL,
      source_type TEXT NOT NULL,
      country TEXT NOT NULL DEFAULT '',
      region TEXT NOT NULL DEFAULT '',
      latitude REAL NOT NULL DEFAULT 0,
      longitude REAL NOT NULL DEFAULT 0,
      altitude INTEGER NOT NULL DEFAULT 0,
      collector TEXT NOT NULL DEFAULT '',
      collected_at TEXT NOT NULL,
      storage_type TEXT NOT NULL,
      status TEXT NOT NULL,
      introduced_at TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS lots (
      id TEXT PRIMARY KEY,
      accession_id TEXT NOT NULL REFERENCES accessions(id),
      storage_type TEXT NOT NULL,
      room TEXT NOT NULL,
      cabinet TEXT NOT NULL,
      layer TEXT NOT NULL,
      position TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT '粒',
      thousand_grain_weight REAL NOT NULL DEFAULT 0,
      moisture REAL NOT NULL DEFAULT 0,
      stored_at TEXT NOT NULL,
      viability_rate REAL NOT NULL DEFAULT 0,
      pure_live_seed INTEGER NOT NULL DEFAULT 0,
      critical_amount INTEGER NOT NULL DEFAULT 100,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS viability_tests (
      id TEXT PRIMARY KEY,
      lot_id TEXT NOT NULL REFERENCES lots(id),
      accession_id TEXT NOT NULL REFERENCES accessions(id),
      method TEXT NOT NULL,
      replicates INTEGER NOT NULL,
      seeds_per_replicate INTEGER NOT NULL,
      germinated INTEGER NOT NULL,
      viability_rate REAL NOT NULL,
      tested_at TEXT NOT NULL,
      tester TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS regenerations (
      id TEXT PRIMARY KEY,
      accession_id TEXT NOT NULL REFERENCES accessions(id),
      reason TEXT NOT NULL,
      planned_quantity INTEGER NOT NULL,
      plot TEXT NOT NULL,
      stage TEXT NOT NULL,
      owner TEXT NOT NULL,
      sowing_date TEXT NOT NULL,
      expected_harvest TEXT NOT NULL,
      actual_harvest INTEGER
    );

    CREATE TABLE IF NOT EXISTS distributions (
      id TEXT PRIMARY KEY,
      accession_id TEXT NOT NULL REFERENCES accessions(id),
      lot_id TEXT NOT NULL REFERENCES lots(id),
      applicant TEXT NOT NULL,
      organization TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      purpose TEXT NOT NULL,
      status TEXT NOT NULL,
      applied_at TEXT NOT NULL,
      review_comment TEXT
    );

    CREATE TABLE IF NOT EXISTS distribution_approvals (
      id TEXT PRIMARY KEY,
      distribution_id TEXT NOT NULL REFERENCES distributions(id),
      round INTEGER NOT NULL DEFAULT 1,
      seq INTEGER NOT NULL,
      node_name TEXT NOT NULL,
      role TEXT NOT NULL,
      approver TEXT NOT NULL,
      comment TEXT,
      status TEXT NOT NULL,
      acted_at TEXT,
      UNIQUE (distribution_id, round, seq)
    );

    CREATE TABLE IF NOT EXISTS storage_rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      storage_type TEXT NOT NULL,
      temp_min REAL NOT NULL,
      temp_max REAL NOT NULL,
      humidity_max REAL NOT NULL,
      online INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS env_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT NOT NULL REFERENCES storage_rooms(id),
      room_name TEXT NOT NULL,
      temperature REAL NOT NULL,
      humidity REAL NOT NULL,
      recorded_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      level TEXT NOT NULL,
      target TEXT NOT NULL,
      target_id TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      operator TEXT NOT NULL,
      action TEXT NOT NULL,
      object_type TEXT NOT NULL,
      object_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      ip TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      account TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      roles TEXT NOT NULL,
      status TEXT NOT NULL,
      last_login TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      permissions TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_lots_accession ON lots(accession_id);
    CREATE INDEX IF NOT EXISTS idx_tests_lot ON viability_tests(lot_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
  `)
}
