
import React from 'react';

interface AddressBookIconProps {
  className?: string;
}

const AddressBookIcon: React.FC<AddressBookIconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={`w-6 h-6 ${className}`}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5M2.25 3.75h19.5a.75.75 0 0 1 .75.75v15a.75.75 0 0 1-.75.75H2.25a.75.75 0 0 1-.75-.75V4.5a.75.75 0 0 1 .75-.75Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V16.5M15.75 7.5V16.5" />
  </svg>
);

export default AddressBookIcon;
