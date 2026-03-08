'use client';

import { useState, useEffect } from 'react';

const TableOfContents = ({ contentRef }) => {
    const [headings, setHeadings] = useState([]);
    const [activeId, setActiveId] = useState('');

    useEffect(() => {
        if (!contentRef.current) return;

        // Find all h2 and h3 elements inside the content
        const elements = Array.from(contentRef.current.querySelectorAll('h2, h3'));

        // Add IDs to elements if they don't have one and collect them
        const parsedHeadings = elements.map((elem, index) => {
            if (!elem.id) {
                // Generate a safe slug from the text content
                elem.id = elem.innerText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            }
            return {
                id: elem.id,
                text: elem.innerText,
                level: Number(elem.tagName.substring(1))
            };
        });

        setHeadings(parsedHeadings);

        // Intersection Observer to highlight active section
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id);
                    }
                });
            },
            { rootMargin: '-100px 0px -80% 0px' }
        );

        elements.forEach((elem) => observer.observe(elem));

        return () => observer.disconnect();
    }, [contentRef]);

    if (headings.length === 0) return null;

    return (
        <div className="table-of-contents">
            <h3 className="toc-title">Table of Contents</h3>
            <ul className="toc-list">
                {headings.map((heading) => (
                    <li
                        key={heading.id}
                        className={`toc-item toc-level-${heading.level} ${activeId === heading.id ? 'active' : ''}`}
                    >
                        <a
                            href={`#${heading.id}`}
                            onClick={(e) => {
                                e.preventDefault();
                                document.getElementById(heading.id)?.scrollIntoView({ behavior: 'smooth' });
                            }}
                        >
                            {heading.text}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default TableOfContents;
