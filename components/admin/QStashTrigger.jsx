'use client';
import { useState } from 'react';

export default function QStashTrigger({ label, cssClass, endpoint, payload = {} }) {
    const [loading, setLoading] = useState(false);

    const handleTrigger = async () => {
        setLoading(true);
        try {
            const token = process.env.NEXT_PUBLIC_QSTASH_TOKEN || 'missing-token';
            const res = await fetch(`https://qstash.upstash.io/v2/publish/https://bimasakhi.com${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
            
            if (res.ok) alert('QStash Trigger Successfully Dispatched!');
            else alert('Webhook Dispatch Failed.');
        } catch (error) {
            console.error('Trigger error', error);
            alert('Trigger configuration error.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button 
            onClick={handleTrigger} 
            disabled={loading} 
            className={cssClass}
        >
            {loading ? 'Executing...' : label}
        </button>
    );
}
