import React from 'react';

const QrCodeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75h3.75a.75.75 0 0 0 .75-.75V5.25a.75.75 0 0 0-.75-.75H3.75Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 15a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75h3.75a.75.75 0 0 0 .75-.75V15.75a.75.75 0 0 0-.75-.75H3.75Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 4.5a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75h3.75a.75.75 0 0 0 .75-.75V5.25a.75.75 0 0 0-.75-.75H15Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 15a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75h3.75a.75.75 0 0 0 .75-.75V15.75a.75.75 0 0 0-.75-.75H15Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75h4.5v4.5h-4.5v-4.5Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 12h.008v.008H5.25V12Zm0 0h.008v.008H5.25V12Zm-1.5 1.5h.008v.008H3.75v-.008Zm0 0h.008v.008H3.75v-.008Zm1.5 1.5h.008v.008H5.25v-.008Zm0 0h.008v.008H5.25v-.008Zm1.5 1.5h.008v.008H6.75v-.008Zm0 0h.008v.008H6.75v-.008Zm1.5 1.5h.008v.008H8.25v-.008Zm0 0h.008v.008H8.25v-.008Zm1.5 1.5h.008v.008H9.75v-.008ZM9.75 9h.008v.008H9.75V9Zm-1.5 0h.008v.008H8.25V9Zm-1.5 0h.008v.008H6.75V9Zm-1.5 0h.008v.008H5.25V9ZM12 5.25h.008v.008H12V5.25Zm0 0h.008v.008H12V5.25Zm1.5 1.5h.008v.008H13.5v-.008Zm0 0h.008v.008H13.5v-.008Zm1.5 1.5h.008v.008H15v-.008Zm0 0h.008v.008H15v-.008ZM12 15h.008v.008H12V15Zm0 0h.008v.008H12V15Zm1.5 1.5h.008v.008H13.5v-.008Zm0 0h.008v.008H13.5v-.008Zm1.5 1.5h.008v.008H15v-.008Zm0 0h.008v.008H15v-.008Zm1.5 1.5h.008v.008H16.5v-.008Zm0 0h.008v.008H16.5v-.008Zm1.5 1.5h.008v.008H18v-.008Zm0 0h.008v.008H18v-.008Z" />
  </svg>
);

export default QrCodeIcon;
