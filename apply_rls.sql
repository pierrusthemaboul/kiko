-- Politiques RLS
CREATE POLICY "Users can see their own event usage" ON public.user_event_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can record their own event usage" ON public.user_event_usage FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own event usage" ON public.user_event_usage FOR UPDATE USING (auth.uid() = user_id);
