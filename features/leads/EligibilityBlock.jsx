'use client';

import React, { useState, useEffect, useContext } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

const EligibilityBlock = ({ id }) => {
    const { language } = useContext(LanguageContext);
    const [canProceed, setCanProceed] = useState(false);
    const [checks, setChecks] = useState({
        age: false,
        education: false,
        delhi: false,
        understanding: false
    });

    useEffect(() => {
        setCanProceed(
            checks.age &&
            checks.education &&
            checks.delhi &&
            checks.understanding
        );
    }, [checks]);

    const handleCheck = (field) => {
        setChecks(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleProceed = () => {
        const applySection = document.getElementById('apply_default');
        if (applySection) {
            applySection.scrollIntoView({ behavior: 'smooth' });
        } else {
            console.warn("Apply Form section not found (ID: apply_default)");
        }
    };


    const content = {
        en: {
            title: "Check Your Eligibility",
            sub: "This opportunity is not suitable for everyone. Please proceed only if you meet all conditions.",
            l_age: "I am a woman between 18 and 70 years of age.",
            l_edu: "I have completed at least 10th standard education.",
            l_loc: "I currently live in Delhi NCR and can serve clients locally.",
            l_com: "I understand that this is a commission-based career, not a fixed-salary job.",
            btn_active: "Proceed to Application ↓",
            btn_disabled: "Confirm All Conditions to Proceed"
        },
        hi: {
            title: "क्या आप योग्य हैं?",
            sub: "यह अवसर सभी के लिए नहीं है। कृपया तभी आगे बढ़ें जब आप ये शर्तें पूरी करती हों।",
            l_age: "मैं एक महिला हूँ और मेरी उम्र 18 से 70 वर्ष के बीच है।",
            l_edu: "मैं कम से कम 10वीं कक्षा पास हूँ।",
            l_loc: "मैं दिल्ली NCR में रहती हूँ।",
            l_com: "मैं समझती हूँ कि यह कमीशन-आधारित काम है, फिक्स सैलरी वाली नौकरी नहीं।",
            btn_active: "आवेदन के लिए आगे बढ़ें ↓",
            btn_disabled: "आगे बढ़ने के लिए सभी शर्तें चुनें"
        }
    };

    const t = content[language];

    return (
        <div className="section-eligibility container py-8">
            <h2 className="text-center mb-4 text-2xl font-bold text-gray-800">
                {t.title}
            </h2>

            <p className="text-center mb-6 opacity-80 max-w-2xl mx-auto">
                {t.sub}
            </p>

            <Card className="checklist max-w-2xl mx-auto border-t-4 border-pink-500 shadow-lg">
                <div className="checkbox-group mb-4 flex items-start gap-3">
                    <input
                        type="checkbox"
                        id={`${id}_age`}
                        checked={checks.age}
                        onChange={() => handleCheck('age')}
                        className="mt-1 w-5 h-5 accent-pink-600"
                    />
                    <label htmlFor={`${id}_age`} className="cursor-pointer select-none">
                        {t.l_age}
                    </label>
                </div>

                <div className="checkbox-group mb-4 flex items-start gap-3">
                    <input
                        type="checkbox"
                        id={`${id}_education`}
                        checked={checks.education}
                        onChange={() => handleCheck('education')}
                        className="mt-1 w-5 h-5 accent-pink-600"
                    />
                    <label htmlFor={`${id}_education`} className="cursor-pointer select-none">
                        {t.l_edu}
                    </label>
                </div>

                <div className="checkbox-group mb-4 flex items-start gap-3">
                    <input
                        type="checkbox"
                        id={`${id}_delhi`}
                        checked={checks.delhi}
                        onChange={() => handleCheck('delhi')}
                        className="mt-1 w-5 h-5 accent-pink-600"
                    />
                    <label htmlFor={`${id}_delhi`} className="cursor-pointer select-none">
                        {t.l_loc}
                    </label>
                </div>

                <div className="checkbox-group flex items-start gap-3 bg-yellow-50 p-3 rounded border border-yellow-200">
                    <input
                        type="checkbox"
                        id={`${id}_understanding`}
                        checked={checks.understanding}
                        onChange={() => handleCheck('understanding')}
                        className="mt-1 w-5 h-5 accent-pink-600"
                    />
                    <label htmlFor={`${id}_understanding`} className="cursor-pointer select-none font-medium text-gray-800">
                        {t.l_com}
                    </label>
                </div>
            </Card>

            <div className="action-area text-center mt-8">
                <Button
                    variant="primary"
                    disabled={!canProceed}
                    onClick={handleProceed}
                    className="w-full sm:w-auto px-8 py-3 text-lg transition-all"
                >
                    {canProceed ? t.btn_active : t.btn_disabled}
                </Button>
            </div>
        </div>
    );
};

export default EligibilityBlock;
