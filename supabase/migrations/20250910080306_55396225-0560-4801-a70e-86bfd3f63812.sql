-- Add new particle count and external sensor fields to measurements table
ALTER TABLE public.measurements 
ADD COLUMN particles_02_05 real, -- 0.2µm to 0.5µm particle count (Nb/L)
ADD COLUMN particles_05_10 real, -- 0.5µm to 1.0µm particle count (Nb/L)  
ADD COLUMN particles_10_25 real, -- 1.0µm to 2.5µm particle count (Nb/L)
ADD COLUMN particles_25_50 real, -- 2.5µm to 5.0µm particle count (Nb/L)
ADD COLUMN particles_50_100 real, -- 5.0µm to 10.0µm particle count (Nb/L)
ADD COLUMN external_temperature real, -- External temperature (°C)
ADD COLUMN external_humidity real; -- External humidity (%)