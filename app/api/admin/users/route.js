import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

export const dynamic = 'force-dynamic';

// Fix 4d: Real user list from admin_users table
export const GET = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('admin_users')
            .select('id, email, name, role, is_active, last_login_at, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({
            users: (data || []).map(u => ({
                id: u.id,
                email: u.email,
                name: u.name || u.email.split('@')[0],
                role: u.role,
                active: u.is_active,
                lastLogin: u.last_login_at,
                createdAt: u.created_at,
            }))
        });
    } catch (error) {
        console.error('API /admin/users GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}, ['super_admin']);

// Fix 4d: Create new admin user
export const POST = withAdminAuth(async (request, user) => {
    try {
        const { email, name, role, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        const validRoles = ['super_admin', 'admin', 'editor', 'agent'];
        if (role && !validRoles.includes(role)) {
            return NextResponse.json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
        }

        // Hash password using bcrypt (dynamic import for edge compat)
        const bcrypt = await import('bcryptjs');
        const password_hash = await bcrypt.hash(password, 12);

        const supabase = getServiceSupabase();

        const { data, error } = await supabase
            .from('admin_users')
            .insert({
                email: email.toLowerCase().trim(),
                name: name || null,
                role: role || 'editor',
                password_hash,
                is_active: true,
            })
            .select('id, email, name, role')
            .single();

        if (error) {
            if (error.code === '23505') {
                return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
            }
            throw error;
        }

        return NextResponse.json({ success: true, user: data });
    } catch (error) {
        console.error('API /admin/users POST error:', error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}, ['super_admin']);
