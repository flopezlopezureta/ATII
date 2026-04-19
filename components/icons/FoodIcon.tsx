import React from 'react';

const FoodIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${className}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 0 1-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 0 0 1.183 1.981l6.478 3.488m8.862-1.182a2.25 2.25 0 0 1 1.183 1.981V18c0 1.242-.988 2.25-2.21 2.25H4.21C2.988 20.25 2 19.242 2 18V6.75a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 20 6.75v1.182c0 .635-.322 1.214-.862 1.554l-2.218.887a2.25 2.25 0 0 0-1.634 2.158V16.5h-1.5V12.43z" />
    </svg>
);

export default FoodIcon;