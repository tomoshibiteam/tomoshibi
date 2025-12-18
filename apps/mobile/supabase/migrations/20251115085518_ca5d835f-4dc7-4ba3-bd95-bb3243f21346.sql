-- Add new columns to events table for event details
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS event_date TEXT,
ADD COLUMN IF NOT EXISTS event_time TEXT,
ADD COLUMN IF NOT EXISTS reception_location TEXT,
ADD COLUMN IF NOT EXISTS participation_fee INTEGER;