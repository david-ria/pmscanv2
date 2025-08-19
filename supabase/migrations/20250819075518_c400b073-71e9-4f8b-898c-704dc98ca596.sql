-- Create subscription tier enum
CREATE TYPE public.subscription_tier AS ENUM ('free', 'premium', 'enterprise');

-- Add subscription tier to profiles table
ALTER TABLE public.profiles 
ADD COLUMN subscription_tier subscription_tier DEFAULT 'free'::subscription_tier,
ADD COLUMN custom_locations JSONB DEFAULT NULL,
ADD COLUMN custom_activities JSONB DEFAULT NULL;

-- Add subscription tier to groups table  
ALTER TABLE public.groups
ADD COLUMN subscription_tier subscription_tier DEFAULT 'free'::subscription_tier,
ADD COLUMN custom_locations JSONB DEFAULT NULL,
ADD COLUMN custom_activities JSONB DEFAULT NULL;