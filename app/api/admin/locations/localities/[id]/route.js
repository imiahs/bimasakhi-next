/**
 * /api/admin/locations/localities/[id] — Manage individual locality (toggle active, set priority)
 * Bible: Section 13 (Multi-City + Pincode Micro-Local Engine)
 */
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const PATCH = withAdminAuth(async (request, user, { params }) => {
    try {
        const { id } = await params;
        const body = await request.json();
        const { active, priority } = body;

        const supabase = getServiceSupabase();
        const updates = {};

        if (typeof active === 'boolean') updates.active = active;
        if (typeof priority === 'number' && priority >= 1 && priority <= 5) updates.priority = priority;

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('localities')
            .update(updates)
            .eq('id', id)
            .select('id, locality_name, slug, priority, active')
            .single();

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        // Recalculate city locality count
        if (data) {
            const { data: locality } = await supabase
                .from('localities')
                .select('city_id')
                .eq('id', id)
                .single();

            if (locality?.city_id) {
                const { count } = await supabase
                    .from('localities')
                    .select('id', { count: 'exact', head: true })
                    .eq('city_id', locality.city_id)
                    .eq('active', true);

                await supabase
                    .from('cities')
                    .update({ locality_count: count || 0 })
                    .eq('id', locality.city_id);
            }
        }

        return NextResponse.json({ success: true, data });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}, ['super_admin']);
