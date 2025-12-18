-- Add '終了' as a valid status for events
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE events ADD CONSTRAINT events_status_check CHECK (status IN ('受付中', '近日公開', '終了'));