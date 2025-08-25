-- Add processing tracking to missions table
ALTER TABLE public.missions 
ADD COLUMN processed_by_robot BOOLEAN DEFAULT FALSE,
ADD COLUMN robot_processed_at TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN robot_processing_attempts INTEGER DEFAULT 0;