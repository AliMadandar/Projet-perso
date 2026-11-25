CREATE TABLE signatures(document_id TEXT PRIMARY KEY REFERENCES documents(id), data TEXT NOT NULL, snapshot TEXT NOT NULL);
CREATE TABLE invoices(seq INTEGER PRIMARY KEY AUTOINCREMENT, document_id TEXT NOT NULL REFERENCES documents(id), request_id TEXT UNIQUE NOT NULL, data TEXT NOT NULL);
CREATE INDEX invoices_document ON invoices(document_id);
CREATE TABLE settlements(request_id TEXT PRIMARY KEY, invoice INTEGER NOT NULL REFERENCES invoices(seq), amount INTEGER NOT NULL, day TEXT NOT NULL, method TEXT NOT NULL);
