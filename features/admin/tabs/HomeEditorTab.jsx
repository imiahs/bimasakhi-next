import React from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Card from '../../../components/ui/Card';
import { SECTION_SCHEMAS, AVAILABLE_SECTIONS } from '../../../config/sectionSchemas';

const HomeEditorTab = ({ formData, setFormData }) => {

    // --- Page Editor Logic ---

    const getSections = () => formData.pages?.home?.sections || [];

    const updateSections = (newSections) => {
        setFormData(prev => ({
            ...prev,
            pages: {
                ...prev.pages,
                home: {
                    ...prev.pages?.home,
                    sections: newSections
                }
            }
        }));
    };

    const handleMoveSection = (index, direction) => {
        const sections = [...getSections()];
        if (direction === 'up' && index > 0) {
            [sections[index], sections[index - 1]] = [sections[index - 1], sections[index]];
        } else if (direction === 'down' && index < sections.length - 1) {
            [sections[index], sections[index + 1]] = [sections[index + 1], sections[index]];
        }
        updateSections(sections);
    };

    const handleDeleteSection = (index) => {
        if (!window.confirm("Are you sure you want to delete this section?")) return;
        const sections = [...getSections()];
        sections.splice(index, 1);
        updateSections(sections);
    };

    const handleAddSection = (type) => {
        const schema = SECTION_SCHEMAS[type];
        const newSection = {
            id: `${type.toLowerCase()}_${Date.now()}`,
            type: type,
            props: {} // Initialize with defaults ideally, but schema handles defaults in UI for now
        };
        // Pre-fill defaults
        if (schema && schema.fields) {
            schema.fields.forEach(f => {
                newSection.props[f.name] = f.default;
            });
        }
        updateSections([...getSections(), newSection]);
    };

    const handlePropChange = (sectionIndex, fieldName, value) => {
        const sections = [...getSections()];
        sections[sectionIndex] = {
            ...sections[sectionIndex],
            props: {
                ...sections[sectionIndex].props,
                [fieldName]: value
            }
        };
        updateSections(sections);
    };

    // --- Renderer ---

    return (
        <div className="page-editor">
            <Card>
                <h2>Home Page Sections</h2>
                <div className="sections-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {getSections().map((section, index) => {
                        const schema = SECTION_SCHEMAS[section.type];
                        return (
                            <div key={section.id} style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <strong>{index + 1}. {schema ? schema.name : section.type}</strong>
                                    <div className="actions">
                                        <button onClick={() => handleMoveSection(index, 'up')} disabled={index === 0}>⬆</button>
                                        <button onClick={() => handleMoveSection(index, 'down')} disabled={index === getSections().length - 1}>⬇</button>
                                        <button onClick={() => handleDeleteSection(index)} style={{ color: 'red', marginLeft: '10px' }}>Delete</button>
                                    </div>
                                </div>

                                {/* Auto-Generated Form */}
                                <div className="props-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    {schema && schema.fields.map(field => (
                                        <div key={field.name}>
                                            <label style={{ fontSize: '12px', color: '#666' }}>{field.label}</label>
                                            <Input
                                                type={field.type}
                                                value={section.props[field.name] || ''}
                                                onChange={(e) => handlePropChange(index, field.name, e.target.value)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="add-section" style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                    <h3>Add Section</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <select id="newSectionSelect" style={{ padding: '8px' }}>
                            {AVAILABLE_SECTIONS.map(s => <option key={s.type} value={s.type}>{s.label}</option>)}
                        </select>
                        <Button onClick={() => {
                            const select = document.getElementById('newSectionSelect');
                            handleAddSection(select.value);
                        }}>Add +</Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default HomeEditorTab;
