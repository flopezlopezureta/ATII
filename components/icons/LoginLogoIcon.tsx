import React from 'react';

interface LoginLogoIconProps {
  className?: string;
}

const LoginLogoIcon: React.FC<LoginLogoIconProps> = ({ className }) => (
  <div 
    className={`flex flex-col items-center justify-center font-sans text-center ${className}`}
    aria-label="Logo del Condominio Atlántico II Viña del Mar"
  >
    <span 
      className="font-bold text-6xl tracking-tight text-sky-600"
      aria-hidden="true"
    >
      AT II
    </span>
    <span 
      className="text-2xl font-semibold mt-1 text-sky-700"
      aria-hidden="true"
    >
      Condominio Atlántico II
    </span>
    <span 
      className="text-lg text-slate-500"
      aria-hidden="true"
    >
      Viña del Mar
    </span>
  </div>
);

export default LoginLogoIcon;