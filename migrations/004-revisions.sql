CREATE TABLE revisions (
  document_id TEXT NOT NULL REFERENCES documents(id),
  version INTEGER NOT NULL,
  snapshot TEXT NOT NULL,
  status TEXT NOT NULL,
  at TEXT NOT NULL,
  PRIMARY KEY(document_id,version)
);
INSERT INTO revisions SELECT id,version,data,status,updated FROM documents;
CREATE TRIGGER revision_created AFTER INSERT ON documents BEGIN
  INSERT INTO revisions VALUES(NEW.id,NEW.version,NEW.data,NEW.status,NEW.updated);
END;
CREATE TRIGGER revision_updated AFTER UPDATE ON documents BEGIN
  INSERT INTO revisions VALUES(NEW.id,NEW.version,NEW.data,NEW.status,NEW.updated);
END;
