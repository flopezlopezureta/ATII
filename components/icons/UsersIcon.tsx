import React from 'react';

const UsersIcon: React.FC<{className?: string}> = ({className}) => ( 
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 ${className}`}>
        <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.095a1.23 1.23 0 0 0 .411-1.412A9.99 9.99 0 0 0 10 12c-2.31 0-4.438.784-6.131 2.095Z" />
        <path d="M15 6.953a1.5 1.5 0 0 1-1.061 1.061 11.458 11.458 0 0 0-8.878 0A1.5 1.5 0 0 1 4 6.953V6.5A1.5 1.5 0 0 1 5.5 5h9A1.5 1.5 0 0 1 16 6.5v.453Z" />
    </svg>
);

export default UsersIcon;
