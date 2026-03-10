import { NextResponse } from 'next/server';
import { generateAiContent } from '@/lib/ai';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const POST = withAdminAuth(async (request, user) => {
    try {
        const body = await request.json();
        const { action, prompt, context } = body;

        if (!action) {
            return NextResponse.json({ error: 'Action type is required for AI module' }, { status: 400 });
        }

        const aiContext = { action, ...context };
        const result = await generateAiContent(prompt || '', aiContext);

        return NextResponse.json({ success: true, result });
    } catch (error) {
        console.error('AI Route Error:', error);
        return NextResponse.json({ error: error.message || 'AI generation failed' }, { status: 500 });
    }
});
