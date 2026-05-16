'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import MetricCard from '@/components/admin/ui/MetricCard';
import ContentInventoryContent from '@/features/admin/content/ContentInventoryContent';
import { buildPagePrompt, getSystemPrompt } from '@/lib/ai/promptTemplates';

import ContentInventoryContent from '@/features/admin/content/ContentInventoryContent';

export default function CCCOverview() {
    return <ContentInventoryContent showHeader={true} />;
}
                            <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs leading-6 text-slate-200">{singlePagePromptPreview.systemPrompt}</pre>
                        </details>
                    </div>
                )}
            </div>

            <ContentInventoryContent showHeader={false} />
        </div>
    );
}
