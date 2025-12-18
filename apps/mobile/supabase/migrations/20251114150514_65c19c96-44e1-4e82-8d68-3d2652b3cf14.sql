
-- Change current_step from integer to numeric to support decimal steps like 4.1, 4.2, etc.
ALTER TABLE user_progress 
ALTER COLUMN current_step TYPE numeric USING current_step::numeric;
