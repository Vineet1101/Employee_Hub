
CREATE POLICY "Users manage own employee docs"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'employee-docs' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'employee-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users manage own candidate resumes"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'candidate-resumes' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'candidate-resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
