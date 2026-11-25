CREATE TABLE public_links(token_hash TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES documents(id), expires INTEGER NOT NULL);
CREATE INDEX public_links_document ON public_links(document_id);
CREATE TABLE replies(document_id TEXT PRIMARY KEY REFERENCES documents(id), decision TEXT NOT NULL, name TEXT NOT NULL, at TEXT NOT NULL);
