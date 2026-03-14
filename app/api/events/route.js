import { NextResponse } from 'next/server';
import { rateLimit } from '@/utils/rateLimiter';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

export const dynamic = 'force-dynamic';

// Allowed event types for validation
const ALLOWED_EVENT_TYPES = [
    'page_view', 'form_submit', 'calculator_used', 'resource_download',
    'apply_submit', 'cta_click', 'scroll_depth', 'session_start',
    'session_end', 'video_play', 'share_click'
];

const MAX_BODY_SIZE = 2048; // 2KB max body size
const MAX_STRING_LENGTH = 500; // Max length for string fields

// POST /api/events
export async function POST(request) {
    try {
        // 1. Rate limiting — 30 events per minute per IP
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'anon';
        const limitRes = await rateLimit(`events_api:${ip}`, 30, 60);
        if (!limitRes.success) {
            return NextResponse.json(
                { error: 'Rate limit exceeded. Max 30 events per minute.' },
                { status: 429 }
            );
        }

        // 2. Request size guard
        const contentLength = parseInt(request.headers.get('content-length') || '0');
        if (contentLength > MAX_BODY_SIZE) {
            return NextResponse.json(
                { error: `Request body too large. Max ${MAX_BODY_SIZE} bytes.` },
                { status: 413 }
            );
        }

        const body = await request.json();
        const { event_type, session_id, route_path, metadata } = body;

        // 3. Input validation
        if (!event_type || !route_path) {
            return NextResponse.json({ error: 'Missing required fields: event_type, route_path' }, { status: 400 });
        }

        if (!ALLOWED_EVENT_TYPES.includes(event_type)) {
            return NextResponse.json({ error: `Invalid event_type. Allowed: ${ALLOWED_EVENT_TYPES.join(', ')}` }, { status: 400 });
        }

        if (typeof route_path !== 'string' || route_path.length > MAX_STRING_LENGTH) {
            return NextResponse.json({ error: `route_path must be a string under ${MAX_STRING_LENGTH} chars.` }, { status: 400 });
        }

        if (session_id && (typeof session_id !== 'string' || session_id.length > MAX_STRING_LENGTH)) {
            return NextResponse.json({ error: `session_id must be a string under ${MAX_STRING_LENGTH} chars.` }, { status: 400 });
        }

        // Sanitize metadata — limit size
        let sanitizedMetadata = null;
        if (metadata) {
            const metadataStr = JSON.stringify(metadata);
            if (metadataStr.length > 1024) {
                return NextResponse.json({ error: 'metadata payload too large. Max 1KB.' }, { status: 400 });
            }
            sanitizedMetadata = metadata;
        }

        // 4. Check if telemetry is enabled
        const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({ success: true, message: 'Event dropped (Telemetry Disabled)' });
        }

        const supabase = getServiceSupabase();

        const { error: eventErr } = await supabase.from('event_stream').insert({
            event_type,
            session_id: session_id || 'anonymous',
            route_path,
            metadata: sanitizedMetadata
        });

        if (eventErr) throw eventErr;

        // Fire-and-forget metric updates using atomic DB operations
        if (event_type === 'page_view') {
            const source = sanitizedMetadata?.source || 'direct';

            // Atomic increment for content_metrics via RPC
            supabase.rpc('increment_content_views', { path: route_path }).then();

            // Atomic increment for traffic_sources via RPC
            supabase.rpc('increment_traffic_source', { src: source }).then();
        }

        return NextResponse.json({ success: true, message: 'Event logged successfully' });
    } catch (error) {
        console.error('Event logging error:', error);

        // Log to observability_logs as fallback
        try {
            const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            if (supabaseUrl && supabaseKey) {
                const supabase = getServiceSupabase();
                await supabase.from('observability_logs').insert({
                    level: 'ERROR',
                    message: error.message,
                    source: 'api_events'
                });
            }
        } catch (e) {
            console.error('Critical Telemetry failure:', e);
        }

        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
