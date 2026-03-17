DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Allow public access'
    ) THEN
        CREATE POLICY "Allow public access" ON storage.objects FOR SELECT USING (bucket_id = 'evenements-image');
    END IF;
END $$;
