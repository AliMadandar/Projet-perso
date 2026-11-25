CREATE TABLE reminders (
  document_id TEXT PRIMARY KEY REFERENCES documents(id), due TEXT NOT NULL, message TEXT NOT NULL,
  version INTEGER NOT NULL, completed INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE mail_actions (
  id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES documents(id),
  state TEXT NOT NULL, gmail_id TEXT, at TEXT NOT NULL
);
