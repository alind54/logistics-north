import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_ROLES = ['admin', 'manager', 'logistics'];

function fail(msg: string, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

async function getTargetRole(
  adminClient: ReturnType<typeof createClient>,
  userId: string
): Promise<string | null> {
  const { data } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  return data?.role ?? null;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return fail('Missing auth header', 401, corsHeaders);
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user: caller } } = await supabaseUser.auth.getUser();
    if (!caller) {
      return fail('Invalid token', 401, corsHeaders);
    }

    const { data: callerProfile } = await supabaseUser
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (!['admin', 'manager'].includes(callerProfile?.role)) {
      return fail('Admin or manager access required', 403, corsHeaders);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const payload = await req.json();

    switch (payload.action) {
      case 'create-user': {
        if (!payload.email || !EMAIL_RE.test(payload.email)) {
          return fail('Invalid email format', 400, corsHeaders);
        }
        if (!payload.password || typeof payload.password !== 'string' || payload.password.length < 8) {
          return fail('Password must be at least 8 characters', 400, corsHeaders);
        }
        if (!payload.full_name || typeof payload.full_name !== 'string' || payload.full_name.length > 200) {
          return fail('Full name is required (max 200 characters)', 400, corsHeaders);
        }
        if (!VALID_ROLES.includes(payload.role)) {
          return fail('Invalid role', 400, corsHeaders);
        }
        // Managers cannot create admin accounts
        if (callerProfile.role === 'manager' && payload.role === 'admin') {
          return fail('Managers cannot assign the admin role', 403, corsHeaders);
        }

        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: payload.email,
          password: payload.password,
          email_confirm: true,
          user_metadata: {
            full_name: payload.full_name,
            role: payload.role,
          },
        });
        if (error) throw error;

        // Fallback: if the trigger didn't create the profile, do it manually
        if (data.user) {
          const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('id', data.user.id)
            .single();

          if (!existingProfile) {
            await supabaseAdmin.from('profiles').insert({
              id: data.user.id,
              email: payload.email,
              full_name: payload.full_name,
              role: payload.role,
            });
          }
        }

        return new Response(JSON.stringify({ user: data.user }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update-user': {
        if (!payload.user_id || !UUID_RE.test(payload.user_id)) {
          return fail('Invalid user ID', 400, corsHeaders);
        }
        if (payload.full_name !== undefined && (typeof payload.full_name !== 'string' || payload.full_name.length > 200)) {
          return fail('Full name must be a string (max 200 characters)', 400, corsHeaders);
        }
        if (payload.role !== undefined && !VALID_ROLES.includes(payload.role)) {
          return fail('Invalid role', 400, corsHeaders);
        }
        // Managers cannot edit admin accounts at all, and cannot promote to admin
        if (callerProfile.role === 'manager') {
          const targetRole = await getTargetRole(supabaseAdmin, payload.user_id);
          if (targetRole === 'admin') {
            return fail('Managers cannot modify admin accounts', 403, corsHeaders);
          }
          if (payload.role === 'admin') {
            return fail('Managers cannot assign the admin role', 403, corsHeaders);
          }
        }
        // Prevent self-role-change
        if (payload.user_id === caller.id && payload.role !== undefined) {
          const { data: selfProfile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', caller.id)
            .single();
          if (selfProfile && payload.role !== selfProfile.role) {
            return fail('Cannot change your own role', 400, corsHeaders);
          }
        }
        if (payload.email !== undefined && !EMAIL_RE.test(payload.email)) {
          return fail('Invalid email format', 400, corsHeaders);
        }

        const updates: Record<string, unknown> = {};
        if (payload.full_name !== undefined) updates.full_name = payload.full_name;
        if (payload.role !== undefined) updates.role = payload.role;
        if (payload.email !== undefined) updates.email = payload.email;

        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update(updates)
          .eq('id', payload.user_id);
        if (profileError) throw profileError;

        if (payload.email) {
          const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
            payload.user_id,
            { email: payload.email }
          );
          if (authError) throw authError;
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete-user': {
        if (!payload.user_id || !UUID_RE.test(payload.user_id)) {
          return fail('Invalid user ID', 400, corsHeaders);
        }
        if (payload.user_id === caller.id) {
          return fail('Cannot delete your own account', 400, corsHeaders);
        }
        // Managers cannot delete admin accounts
        if (callerProfile.role === 'manager') {
          const targetRole = await getTargetRole(supabaseAdmin, payload.user_id);
          if (targetRole === 'admin') {
            return fail('Managers cannot modify admin accounts', 403, corsHeaders);
          }
        }
        const { error } = await supabaseAdmin.auth.admin.deleteUser(payload.user_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'list-users': {
        const { data, error } = await supabaseAdmin
          .from('profiles')
          .select('id, email, full_name, role, created_at')
          .order('created_at', { ascending: true });
        if (error) throw error;
        return new Response(JSON.stringify({ users: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'reset-password': {
        if (!payload.user_id || !UUID_RE.test(payload.user_id)) {
          return fail('Invalid user ID', 400, corsHeaders);
        }
        if (!payload.new_password || typeof payload.new_password !== 'string' || payload.new_password.length < 8) {
          return fail('Password must be at least 8 characters', 400, corsHeaders);
        }
        // Managers cannot reset admin passwords
        if (callerProfile.role === 'manager') {
          const targetRole = await getTargetRole(supabaseAdmin, payload.user_id);
          if (targetRole === 'admin') {
            return fail('Managers cannot modify admin accounts', 403, corsHeaders);
          }
        }
        const { error } = await supabaseAdmin.auth.admin.updateUserById(
          payload.user_id,
          { password: payload.new_password }
        );
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return fail('Unknown action', 400, corsHeaders);
    }
  } catch (err) {
    console.error('admin-user-management error:', err);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
