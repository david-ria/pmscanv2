-- Drop unused tables for My Settings functionality
DROP TABLE IF EXISTS user_locations CASCADE;
DROP TABLE IF EXISTS user_activities CASCADE; 
DROP TABLE IF EXISTS user_events CASCADE;
DROP TABLE IF EXISTS user_alarms CASCADE;
DROP TABLE IF EXISTS location_activity_mappings CASCADE;