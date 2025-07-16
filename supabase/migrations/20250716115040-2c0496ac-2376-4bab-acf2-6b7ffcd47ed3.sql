-- Add air quality data reference to missions table
ALTER TABLE public.missions 
ADD COLUMN air_quality_data_id UUID NULL,
ADD CONSTRAINT fk_missions_air_quality_data 
    FOREIGN KEY (air_quality_data_id) 
    REFERENCES public.air_quality_data(id);