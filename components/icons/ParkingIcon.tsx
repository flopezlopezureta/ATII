
import React from 'react';

interface ParkingIconProps {
  className?: string;
}

const ParkingIcon: React.FC<ParkingIconProps> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    className={`w-5 h-5 ${className}`} // Default size, can be overridden
    aria-hidden="true"
  >
    {/* Simple P inside a circle, common for parking signs */}
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 15a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1h-1v2a1 1 0 0 1-1 1Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.5H9.5A1.5 1.5 0 0 0 8 11v0A1.5 1.5 0 0 0 9.5 12.5h1A1.5 1.5 0 0 1 12 14v0a1.5 1.5 0 0 1-1.5 1.5H8" />
  </svg>
);

export default ParkingIcon;