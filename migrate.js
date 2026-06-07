const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data', 'yukleda.db'));

const migrations = [
  "ALTER TABLE posts ADD COLUMN post_type TEXT DEFAULT 'photo'",
  "ALTER TABLE posts ADD COLUMN text_content TEXT DEFAULT NULL",
  "ALTER TABLE posts ADD COLUMN text_bg TEXT DEFAULT '#1a1a24'",
  "ALTER TABLE posts ADD COLUMN text_color TEXT DEFAULT '#f1f0f5'",
  `CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  "ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0"
];

migrations.forEach(sql => {
  try {
    db.prepare(sql).run();
    console.log('OK:', sql.substring(0, 60));
  } catch(e) {
    console.log('SKIP (zaten var):', sql.substring(0, 60));
  }
});

// Varsayılan site ayarları
const defaults = [
  ['accent_color', '#7c3aed'],
  ['accent_color2', '#a855f7'],
  ['accent_color3', '#c084fc'],
  ['site_name', 'TeaTok']
];
const ins = db.prepare('INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)');
defaults.forEach(([k, v]) => ins.run(k, v));

console.log('\nMigration tamamlandi.');
process.exit(0);
