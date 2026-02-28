'use client';

import React, { useContext } from 'react';
import { LanguageContext } from '../../../../context/LanguageContext';

const Gallery = () => {
    const { language } = useContext(LanguageContext);

    // Using placeholders or existing hero image re-cropped via CSS if needed.
    // Since I don't have new images, I will cleanly failover to styling.

    return (
        <section className="py-12 bg-white border-t border-gray-100">
            <div className="container px-4 mx-auto">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold text-gray-800">
                        {language === 'hi' ? 'LIC महिला एजेंट्स – कार्यरत झलकियाँ' : 'LIC Lady Agents – Glimpses of Work'}
                    </h2>
                    <p className="text-gray-500 mt-2">
                        {language === 'hi' ? 'Bima Sakhi कम्युनिटी' : 'Bima Sakhi Community'}
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Image 1: Training */}
                    <div className="bg-gray-100 rounded-xl h-48 md:h-64 overflow-hidden relative group">
                        <img
                            src="/hero-woman-professional.jpg"
                            alt="Training"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <div className="absolute bottom-0 w-full bg-black/50 p-2 text-white text-xs text-center backdrop-blur-sm">
                            Training
                        </div>
                    </div>

                    {/* Image 2: Digital Work (Placeholder) */}
                    <div className="bg-blue-50 rounded-xl h-48 md:h-64 flex items-center justify-center text-blue-300 relative overflow-hidden">
                        <span className="text-4xl">📱</span>
                        <div className="absolute bottom-0 w-full bg-black/50 p-2 text-white text-xs text-center backdrop-blur-sm">
                            Digital Work
                        </div>
                    </div>

                    {/* Image 3: Recognition (Placeholder) */}
                    <div className="bg-purple-50 rounded-xl h-48 md:h-64 flex items-center justify-center text-purple-300 relative overflow-hidden">
                        <span className="text-4xl">🏆</span>
                        <div className="absolute bottom-0 w-full bg-black/50 p-2 text-white text-xs text-center backdrop-blur-sm">
                            Success
                        </div>
                    </div>

                    {/* Image 4: Community (Placeholder) */}
                    <div className="bg-pink-50 rounded-xl h-48 md:h-64 flex items-center justify-center text-pink-300 relative overflow-hidden">
                        <span className="text-4xl">🤝</span>
                        <div className="absolute bottom-0 w-full bg-black/50 p-2 text-white text-xs text-center backdrop-blur-sm">
                            Community
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Gallery;
