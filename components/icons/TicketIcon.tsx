import React from 'react';

const TicketIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-1.5h5.25m-5.25 0h5.25m-5.25 0h5.25m-5.25 0h5.25m-5.25 0h5.25M3 13.5a9 9 0 1 1 18 0a9 9 0 0 1-18 0Zm5.25-1.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 3a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 3a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" />
  </svg>
);

export default TicketIcon;
