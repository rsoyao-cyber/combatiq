-- Add optional sex column to athlete table
ALTER TABLE public.athlete
  ADD COLUMN IF NOT EXISTS sex text CHECK (sex IN ('male', 'female'));
