import React from 'react';

const CheckIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);

const XIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

interface PasswordRequirement {
  text: string;
  regex: RegExp;
}

const requirements: PasswordRequirement[] = [
  { text: 'Al menos 8 caracteres', regex: /.{8,}/ },
  { text: 'Al menos una letra mayúscula (A-Z)', regex: /[A-Z]/ },
  { text: 'Al menos una letra minúscula (a-z)', regex: /[a-z]/ },
  { text: 'Al menos un número (0-9)', regex: /[0-9]/ },
  { text: 'Al menos un símbolo (ej: !@#$%)', regex: /[!@#$%^&*(),.?":{}|<>]/ },
];


const PasswordStrengthIndicator: React.FC<{ password?: string }> = ({ password = '' }) => {
  return (
    <div className="text-xs text-slate-500 space-y-1.5 mt-2 p-3 bg-slate-50 rounded-lg">
      <ul className="space-y-1">
        {requirements.map((req, index) => {
          const isValid = req.regex.test(password);
          return (
            <li key={index} className={`flex items-center transition-colors duration-200 ${isValid ? 'text-green-600' : 'text-slate-500'}`}>
              <div className="w-4 h-4 mr-2 flex-shrink-0 flex items-center justify-center">
                {isValid ? <CheckIcon /> : <XIcon />}
              </div>
              <span>{req.text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default PasswordStrengthIndicator;
