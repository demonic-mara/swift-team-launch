-- Fix quest_ratings check constraint to allow 'approved' and 'rejected' values
ALTER TABLE quest_ratings DROP CONSTRAINT IF EXISTS quest_ratings_rating_check;

ALTER TABLE quest_ratings ADD CONSTRAINT quest_ratings_rating_check 
CHECK (rating IN ('approved', 'rejected'));