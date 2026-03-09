import { NextResponse } from 'next/server';
import { generateAiContent } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const { title, is_campaign_page } = await request.json();

        if (!title) {
            return NextResponse.json({ error: 'Page Title is required for AI generation.' }, { status: 400 });
        }

        const systemPrompt = `You are an expert marketing web architect for Bima Sakhi, an empowering network that helps women in India earn independent income flexibly by selling insurance. Generate a high-converting landing page block structure based on the subject title provided. The block types you can use MUST ONLY BE from this list: ['HeroBlock', 'ContentBlock', 'BenefitsBlock', 'TestimonialBlock', 'CTABlock', 'FAQBlock', 'CalculatorBlock', 'DownloadBlock']. Output should be a raw valid JSON Array of objects matching this exact format:
[
  {
    "block_type": "HeroBlock",
    "block_data": {
       "headline": "String",
       "subheadline": "String"
    }
  },
  {
    "block_type": "BenefitsBlock",
    "block_data": {}
  },
  {
    "block_type": "CTABlock",
    "block_data": {
       "label": "String",
       "href": "String",
       "buttonText": "String"
    }
  }
]
No markdown wrapping, just JSON.`;

        const userPrompt = `Page Objective: ${title}\nIs Campaign Driven Layout: ${is_campaign_page ? 'Yes' : 'No'}`;

        let aiResponse = await generateAiContent(systemPrompt, userPrompt);

        // Clean JSON formatting
        let clean = aiResponse.trim();
        if (clean.startsWith('```json')) clean = clean.substring(7, clean.length - 3).trim();
        else if (clean.startsWith('```')) clean = clean.substring(3, clean.length - 3).trim();

        const generatedBlocks = JSON.parse(clean);

        // Map array with unique DB identifiers
        const uniqueBlocks = generatedBlocks.map(b => ({
            ...b,
            id: crypto.randomUUID(),
            block_data: b.block_data || {}
        }));

        return NextResponse.json({ success: true, blocks: uniqueBlocks });

    } catch (error) {
        console.error("AI Page Generator Error:", error);
        return NextResponse.json({ error: 'Internal AI Routing Error' }, { status: 500 });
    }
}
