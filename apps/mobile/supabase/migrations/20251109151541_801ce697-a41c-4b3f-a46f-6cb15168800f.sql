-- Create friendships table
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(requester_id, receiver_id)
);

-- Create praises table
CREATE TABLE public.praises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id uuid NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  praiser_user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(log_id, praiser_user_id)
);

-- Enable RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.praises ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friendships
CREATE POLICY "Users can view their own friendships"
  ON public.friendships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create friendship requests"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update received friendship requests"
  ON public.friendships FOR UPDATE
  USING (auth.uid() = receiver_id);

CREATE POLICY "Users can delete their own friendships"
  ON public.friendships FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- RLS Policies for praises
CREATE POLICY "Users can view praises"
  ON public.praises FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own praises"
  ON public.praises FOR INSERT
  WITH CHECK (auth.uid() = praiser_user_id);

CREATE POLICY "Users can delete their own praises"
  ON public.praises FOR DELETE
  USING (auth.uid() = praiser_user_id);

-- Trigger for updated_at
CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();