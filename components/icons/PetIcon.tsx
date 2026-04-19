import React from 'react';

const PetIcon: React.FC<{className?: string}> = ({className}) => ( 
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 ${className}`}>
        <path d="M11.226 10.284S11.205 10 11.005 10A2.002 2.002 0 0 0 9 12.005V13H8V9.673A3.004 3.004 0 0 1 10.995 6.7H11a1 1 0 0 1 .809.4L13 9h1.565A1.5 1.5 0 0 1 16 10.5v1.518A1.5 1.5 0 0 1 14.788 13H13v3.496A2.504 2.504 0 0 1 10.5 19H3a1 1 0 0 1-1-1V8.28C2 5.043 4.03 3 6.282 3 7.85 3 9.87 4.028 11.226 5.56V10.284ZM6.5 7A1.5 1.5 0 1 0 5 8.5 1.5 1.5 0 0 0 6.5 7Z" />
    </svg>
);

export default PetIcon;
