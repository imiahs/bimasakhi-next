'use client';
import { useState } from 'react';

export default function QueueControls() {
    const [loading, setLoading] = useState(false);

    const handleQueue = async (action) => {
        if(!confirm(`Are you sure you want to ${action} the queue?`)) return;
        setLoading(true);
        try {
            const res = await fetch('/api/admin/seo/queue', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })  
            });
            
            // Reusing existing API routes to avoid creating new endpoints:
            // Since we deleted old logic, we'll patch a DB execute here directly using standard Next conventions in the caller, or just do it generically
        } catch(error) {
            console.error('Queue action failed', error);
        } finally {
            setLoading(false);
            window.location.reload();
        }
    };

    return (
        <div className="flex gap-4 mt-4 mb-6">
            <button disabled={loading} onClick={() => handleQueue('pause')} className="bg-orange-100 text-orange-800 px-4 py-2 rounded font-bold hover:bg-orange-200">Pause Queue</button>
            <button disabled={loading} onClick={() => handleQueue('resume')} className="bg-blue-100 text-blue-800 px-4 py-2 rounded font-bold hover:bg-blue-200">Resume Queue</button>
            <button disabled={loading} onClick={() => handleQueue('clear')} className="bg-red-100 text-red-800 px-4 py-2 rounded font-bold hover:bg-red-200">Clear Safely</button>
        </div>
    );
}
