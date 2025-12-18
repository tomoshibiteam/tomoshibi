-- Create role audit log table
CREATE TABLE IF NOT EXISTS public.role_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('grant', 'revoke')),
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.role_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit log
CREATE POLICY "Admins can view audit logs"
ON public.role_audit_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit logs"
ON public.role_audit_log
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') AND auth.uid() = admin_user_id);

-- Add index for better query performance
CREATE INDEX idx_role_audit_log_target_user ON public.role_audit_log(target_user_id);
CREATE INDEX idx_role_audit_log_created_at ON public.role_audit_log(created_at DESC);