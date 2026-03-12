import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

export async function GET() {
    try {
        console.log("[DebugAPI] Direct Error Log Attempt...");
        const supabase = getServiceSupabase();

        // Try inserting into system_runtime_errors with CORRECT column 'error_message'
        const res1 = await supabase.from('system_runtime_errors').insert({
            component: 'ProdReadinessFinalTest',
            error_message: 'FINAL_DEBUG_ERROR: Verifying corrected table mapping.',
            stack_trace: 'Final verification stack trace',
            resolved: false
        }).select();

        return NextResponse.json({
            success: true,
            runtime_errors: { data: res1.data, error: res1.error }
        });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
