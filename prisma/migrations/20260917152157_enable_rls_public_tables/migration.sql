-- Supabase's linter flags every table in `public` as exposed via PostgREST
-- with RLS disabled — meaning anyone holding the public anon key (it's
-- meant to be public, it ships in the browser bundle) could call the
-- auto-generated REST API directly and read/write every row in every table,
-- completely bypassing this app's own workspace-scoped authorization
-- (requireWorkspace()), which only exists inside the Next.js server code.
--
-- This app never queries these tables through PostgREST/supabase-js (only
-- through Prisma, over DATABASE_URL/DIRECT_URL, which connects as the
-- `postgres` role — that role has BYPASSRLS and is therefore unaffected by
-- any of this). So enabling RLS with zero policies is a safe, complete fix:
-- it denies all access from the anon/authenticated PostgREST roles (the
-- default when RLS is enabled and no policy grants anything), while the
-- app's own Prisma connection keeps working exactly as before.
ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Workspace" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."WorkspaceMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."PipelineStage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Contact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ApiToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Sequence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."SequenceStep" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."SequenceEnrollment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Signal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ContactAudit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ContactList" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ContactListMember" ENABLE ROW LEVEL SECURITY;
