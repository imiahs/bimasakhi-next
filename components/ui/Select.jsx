import React from 'react';

const Select = ({ label, name, value, onChange, options = [], defaultOption = "Select an option", error, ...props }) => {
    return (
        <div className="form-group">
            {label && <label htmlFor={name} className="form-label">{label}</label>}
            <select
                id={name}
                name={name}
                value={value}
                onChange={onChange}
                className={`form-select ${error ? 'has-error' : ''}`}
                {...props}
            >
                <option value="" disabled>{defaultOption}</option>
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            {error && <span className="form-error">{error}</span>}
        </div>
    );
};

export default Select;
