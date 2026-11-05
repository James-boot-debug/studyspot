INSERT INTO spaces (name, type, location, total_seats, open_seats, wifi, outlets) VALUES
  ('Main Library Quiet Hall', 'Quiet', 'Library, floor 2', 60, 24, true, true),
  ('Group Study Hub', 'Group', 'Student Center, floor 1', 40, 9, true, true),
  ('Engineering Quiet Room', 'Quiet', 'Engineering Building, room 204', 20, 0, true, false),
  ('Science Commons', 'Group', 'Science Building, ground floor', 36, 17, true, true),
  ('Reading Garden Terrace', 'Quiet', 'Library, rooftop', 24, 11, false, false),
  ('Business Collaboration Lab', 'Group', 'Business School, floor 3', 30, 5, true, true),
  ('Night Study Zone', 'Quiet', 'Main Hall, floor 1', 50, 31, true, true),
  ('Arts Workshop Space', 'Group', 'Arts Building, floor 2', 28, 14, false, true)
ON CONFLICT (name) DO NOTHING;
