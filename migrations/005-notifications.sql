CREATE TABLE delivery_queue (
  event_id INTEGER PRIMARY KEY REFERENCES events(id),
  attempts INTEGER NOT NULL DEFAULT 0,
  retry_after INTEGER NOT NULL DEFAULT 0
);
