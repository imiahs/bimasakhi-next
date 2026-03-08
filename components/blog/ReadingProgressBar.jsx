'use client';

import { useState, useEffect } from 'react';

const ReadingProgressBar = () => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const updateProgress = () => {
            const currentScrollY = window.scrollY;
            const scrollHeight = document.body.scrollHeight - window.innerHeight;

            if (scrollHeight > 0) {
                const calculatedProgress = (currentScrollY / scrollHeight) * 100;
                setProgress(calculatedProgress);
            }
        };

        window.addEventListener('scroll', updateProgress);
        return () => window.removeEventListener('scroll', updateProgress);
    }, []);

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                height: '4px',
                width: `${progress}%`,
                backgroundColor: 'var(--color-primary)',
                zIndex: 9999,
                transition: 'width 0.1s ease-out'
            }}
        />
    );
};

export default ReadingProgressBar;
