-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  level INTEGER DEFAULT 1 NOT NULL,
  quest_points INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create groups table
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  privacy TEXT DEFAULT 'public' CHECK (privacy IN ('public', 'private', 'invite-only')),
  member_limit INTEGER DEFAULT 50 NOT NULL,
  category TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create group_members table
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'quest_master', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(group_id, user_id)
);

-- Create messages table (dual chatroom)
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  chatroom_type TEXT NOT NULL CHECK (chatroom_type IN ('normal', 'quest')),
  content TEXT NOT NULL,
  file_url TEXT,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create quests table
CREATE TABLE public.quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  points INTEGER NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  deadline TIMESTAMP WITH TIME ZONE,
  is_auto_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create quest_submissions table
CREATE TABLE public.quest_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID REFERENCES public.quests(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  proof_text TEXT,
  proof_file_url TEXT,
  proof_file_type TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approval_count INTEGER DEFAULT 0,
  rejection_count INTEGER DEFAULT 0,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(quest_id, user_id)
);

-- Create quest_ratings table
CREATE TABLE public.quest_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES public.quest_submissions(id) ON DELETE CASCADE NOT NULL,
  rated_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('approve', 'reject')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(submission_id, rated_by)
);

-- Create quest_master_history table
CREATE TABLE public.quest_master_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Create votes table
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  election_start TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  election_end TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create vote_choices table
CREATE TABLE public.vote_choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id UUID REFERENCES public.votes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  candidate_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(vote_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_master_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_choices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for groups
CREATE POLICY "Groups are viewable by everyone" ON public.groups FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create groups" ON public.groups FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Group creators can update groups" ON public.groups FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Group creators can delete groups" ON public.groups FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for group_members
CREATE POLICY "Group members are viewable by everyone" ON public.group_members FOR SELECT USING (true);
CREATE POLICY "Users can join groups" ON public.group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave groups" ON public.group_members FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage members" ON public.group_members FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm 
    WHERE gm.group_id = group_members.group_id 
    AND gm.user_id = auth.uid() 
    AND gm.role = 'admin'
  )
);

-- RLS Policies for messages
CREATE POLICY "Messages viewable by group members" ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = messages.group_id AND user_id = auth.uid()
  )
);
CREATE POLICY "Group members can send messages" ON public.messages FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = messages.group_id AND user_id = auth.uid()
  )
);

-- RLS Policies for quests
CREATE POLICY "Quests viewable by group members" ON public.quests FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = quests.group_id AND user_id = auth.uid()
  )
);
CREATE POLICY "Quest Masters can create quests" ON public.quests FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = quests.group_id AND user_id = auth.uid() AND role = 'quest_master'
  )
);
CREATE POLICY "Quest Masters can update quests" ON public.quests FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = quests.group_id AND user_id = auth.uid() AND role = 'quest_master'
  )
);
CREATE POLICY "Quest Masters can delete quests" ON public.quests FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = quests.group_id AND user_id = auth.uid() AND role = 'quest_master'
  )
);

-- RLS Policies for quest_submissions
CREATE POLICY "Submissions viewable by group members" ON public.quest_submissions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.quests q
    JOIN public.group_members gm ON q.group_id = gm.group_id
    WHERE q.id = quest_submissions.quest_id AND gm.user_id = auth.uid()
  )
);
CREATE POLICY "Users can submit quests" ON public.quest_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own submissions" ON public.quest_submissions FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for quest_ratings
CREATE POLICY "Ratings viewable by group members" ON public.quest_ratings FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.quest_submissions qs
    JOIN public.quests q ON qs.quest_id = q.id
    JOIN public.group_members gm ON q.group_id = gm.group_id
    WHERE qs.id = quest_ratings.submission_id AND gm.user_id = auth.uid()
  )
);
CREATE POLICY "Group members can rate submissions" ON public.quest_ratings FOR INSERT WITH CHECK (auth.uid() = rated_by);

-- RLS Policies for quest_master_history
CREATE POLICY "Quest Master history viewable by group members" ON public.quest_master_history FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = quest_master_history.group_id AND user_id = auth.uid()
  )
);

-- RLS Policies for votes
CREATE POLICY "Votes viewable by group members" ON public.votes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = votes.group_id AND user_id = auth.uid()
  )
);

-- RLS Policies for vote_choices
CREATE POLICY "Vote choices viewable by group members" ON public.vote_choices FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.votes v
    JOIN public.group_members gm ON v.group_id = gm.group_id
    WHERE v.id = vote_choices.vote_id AND gm.user_id = auth.uid()
  )
);
CREATE POLICY "Users can vote" ON public.vote_choices FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quest_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quest_ratings;