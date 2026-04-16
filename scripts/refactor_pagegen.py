import re

with open('app/api/jobs/pagegen/route.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
imports_replacement = """import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { generateAiContent } from '@/lib/ai/generateContent';
import { getSystemPrompt, buildPagePrompt } from '@/lib/ai/promptTemplates';
import { getSystemConfig, logSystemAction } from '@/lib/systemConfig';
import crypto from 'crypto';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { enqueuePageGeneration } from '@/lib/queue/publisher';"""

content = re.sub(r'import \{ NextResponse \}.*?import crypto from \'crypto\';', imports_replacement, content, flags=re.DOTALL)

# 2. remove isAuthorizedRequest
content = re.sub(
    r'function isAuthorizedRequest\(request\) \{.*?return authHeader === `Bearer \$\{process\.env\.QSTASH_TOKEN\}`;.*?\}',
    '', content, flags=re.DOTALL
)

# 3. Change POST to handler and get body queueId
handler_target = r"export async function POST\(request\) \{[\s]*if \(\!isAuthorizedRequest\(request\)\) \{[\s]*return NextResponse\.json\(\{ error: 'Unauthorized QStash Hook' \}, \{ status: 401 \}\);[\s]*\}"
handler_replacement = """async function handler(request) {
    let body = {};
    try {
        body = await request.json();
    } catch {
        body = {};
    }
    const { queueId } = body;

    if (!queueId) {
        return NextResponse.json({ error: 'Missing queueId payload from QStash' }, { status: 400 });
    }"""
content = re.sub(handler_target, handler_replacement, content)

# 4. Update the supabase lookup
queue_query_target = r"const queueRes = await supabase\.from\('generation_queue'\)[\s]*\.select\('\*'\)[\s]*\.in\('task_type', \[CANONICAL_TASK_TYPE, LEGACY_TASK_TYPE\]\)[\s]*\.in\('status', \['pending', 'processing'\]\)[\s]*\.order\('created_at', \{ ascending: true \}\)[\s]*\.limit\(1\)[\s]*\.maybeSingle\(\);"
queue_query_replacement = """const queueRes = await supabase.from('generation_queue')
            .select('*')
            .eq('id', queueId)
            .maybeSingle();"""
content = re.sub(queue_query_target, queue_query_replacement, content)

# 5. Fix "Queue job not found or already completed."
no_queue_target = r"if \(\!queueJob\) \{[\s]*return NextResponse\.json\(\{ success: true, message: 'No pending queue\.' \}\);[\s]*\}"
no_queue_replacement = """if (!queueJob || queueJob.status === 'completed') {
            return NextResponse.json({ success: true, message: 'Queue job not found or already completed.' });
        }"""
content = re.sub(no_queue_target, no_queue_replacement, content)

# 6. Change limit
limit_target = r"const limit = Math\.min\(config\.batch_size \|\| 5, 50\);"
limit_replacement = "const limit = 1; // Process exactly one page per QStash event"
content = re.sub(limit_target, limit_replacement, content)

# 7. Add chain enqueue inside isComplete check
chain_target = r"        await finalizeJobRun\(supabase, jobRunId, 'completed'\);\n        return NextResponse\.json\(\{ success: true, processed: processedCount, reviews: reviewCount \}\);"
chain_replacement = """        await finalizeJobRun(supabase, jobRunId, 'completed');

        // CHAIN EXECUTION: If not complete, automatically dispatch the next QStash event!
        if (!isComplete) {
            await enqueuePageGeneration({ queueId: queueJob.id }).catch((e) => console.error("[PageGen] Chained enqueue error:", e));
        }

        return NextResponse.json({ success: true, processed: processedCount, reviews: reviewCount });"""
content = re.sub(chain_target, chain_replacement, content)

# 8. Add export POST at the end
content += "\nexport const POST = process.env.NODE_ENV === 'development' ? handler : verifySignatureAppRouter(handler);\n"

with open('app/api/jobs/pagegen/route.js', 'w', encoding='utf-8') as f:
    f.write(content)
