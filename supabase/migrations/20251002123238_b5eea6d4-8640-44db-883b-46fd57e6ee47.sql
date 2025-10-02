-- Create storage bucket for quest proof files
INSERT INTO storage.buckets (id, name, public)
VALUES ('quest-proofs', 'quest-proofs', true);

-- Allow authenticated users to upload their own quest proofs
CREATE POLICY "Users can upload quest proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'quest-proofs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow everyone to view quest proofs
CREATE POLICY "Quest proofs are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'quest-proofs');

-- Allow users to update their own quest proofs
CREATE POLICY "Users can update their own quest proofs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'quest-proofs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own quest proofs
CREATE POLICY "Users can delete their own quest proofs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'quest-proofs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Update quests table to allow guild founders to create quests
DROP POLICY IF EXISTS "Quest Masters can create quests" ON quests;

CREATE POLICY "Guild founders and Quest Masters can create quests"
ON quests
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM groups
    WHERE groups.id = quests.group_id
    AND groups.created_by = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = quests.group_id
    AND group_members.user_id = auth.uid()
    AND group_members.role = 'quest_master'
  )
);

DROP POLICY IF EXISTS "Quest Masters can update quests" ON quests;

CREATE POLICY "Guild founders and Quest Masters can update quests"
ON quests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM groups
    WHERE groups.id = quests.group_id
    AND groups.created_by = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = quests.group_id
    AND group_members.user_id = auth.uid()
    AND group_members.role = 'quest_master'
  )
);

DROP POLICY IF EXISTS "Quest Masters can delete quests" ON quests;

CREATE POLICY "Guild founders and Quest Masters can delete quests"
ON quests
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM groups
    WHERE groups.id = quests.group_id
    AND groups.created_by = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = quests.group_id
    AND group_members.user_id = auth.uid()
    AND group_members.role = 'quest_master'
  )
);