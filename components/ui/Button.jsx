import React from 'react';

const Button = ({ children, onClick, variant = 'primary', type = 'button', disabled = false, className = '' }) => {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`btn btn-${variant} ${className}`}
        >
            {children}
        </button>
    );
};

export default Button;
