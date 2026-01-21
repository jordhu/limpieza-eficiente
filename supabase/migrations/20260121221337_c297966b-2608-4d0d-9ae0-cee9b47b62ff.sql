-- Enable realtime for time_entries and incidents tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.time_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;