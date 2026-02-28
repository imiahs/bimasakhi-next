import React from 'react';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';

const GlobalSettingsTab = ({ formData, setFormData }) => {
    return (
        <div className="grid-2-col">
            <Card>
                <h2>Kill Switches</h2>
                <div className="toggle-group">
                    <label>
                        <input
                            type="checkbox"
                            checked={!!formData.isAppPaused}
                            onChange={(e) => setFormData(prev => ({ ...prev, isAppPaused: e.target.checked }))}
                        /> Pause All Applications
                    </label>
                </div>
            </Card>
            <Card>
                <h2>Global Texts</h2>
                <Input
                    label="Delhi Only Message"
                    value={formData.delhiOnlyMessage || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, delhiOnlyMessage: e.target.value }))}
                />
            </Card>
        </div>
    );
};

export default GlobalSettingsTab;
