import React from 'react';

const Input = ({ label, name, type = 'text', value, onChange, placeholder, error, ...props }) => {
    return (
        <div className="form-group">
            {label && <label htmlFor={name} className="form-label">{label}</label>}
            <input
                id={name}
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`form-input ${error ? 'has-error' : ''}`}
                {...props}
            />
            {error && <span className="form-error">{error}</span>}
        </div>
    );
};

export default Input;
