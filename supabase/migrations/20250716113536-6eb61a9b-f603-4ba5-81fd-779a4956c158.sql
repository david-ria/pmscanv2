-- Add weather data to missions table
ALTER TABLE public.missions 
ADD COLUMN weather_data_id uuid REFERENCES public.weather_data(id);

-- Remove weather_data_id from measurements table  
ALTER TABLE public.measurements 
DROP COLUMN weather_data_id;