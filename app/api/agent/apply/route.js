import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabase';
import { systemLogger } from '@/lib/logger/systemLogger';

export async function POST(req) {
    try {
        const body = await req.json();
        const { name, mobile } = body;
        let { ref_code } = body;

        if (!name || !mobile) {
            return NextResponse.json({ error: 'Name and mobile are required.' }, { status: 400 });
        }

        const supabase = getServiceSupabase();

        // Optional: If ref_code is provided, verify it exists to ensure proper hierarchy
        if (ref_code) {
            const { data: agent } = await supabase
                .from('agents')
                .select('agent_id')
                .eq('ref_code', ref_code)
                .single();

            if (!agent) {
                // We'll log a warning but still accept the application without failing the prospect organically
                systemLogger.logWarning('AgentApplyAPI', `Invalid referral code used: ${ref_code}`);
                ref_code = null; // Prevent FK constraint violation
            }
        }

        // Insert into recruitment_pipeline
        const { data, error } = await supabase
            .from('recruitment_pipeline')
            .insert({
                name,
                mobile,
                ref_code: ref_code || null,
                stage: 'apply'
            })
            .select()
            .single();

        if (error) {
            systemLogger.logError('AgentApplyAPI', 'Supabase Insert Failed', error);
            return NextResponse.json({ error: 'Application submission failed' }, { status: 500 });
        }

        return NextResponse.json({ success: true, application: data });
    } catch (error) {
        systemLogger.logError('AgentApplyAPI', 'Failed to process application', error.message);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
