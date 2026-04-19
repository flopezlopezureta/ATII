
import React from 'react';

interface RutErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

const RutErrorModal: React.FC<RutErrorModalProps> = ({ isOpen, onClose, message }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]"
      aria-modal="true"
      role="dialog"
      aria-labelledby="rut-error-title"
    >
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm transform transition-all duration-300 ease-in-out">
        <h3 id="rut-error-title" className="text-lg font-semibold text-red-700 mb-3">Error de RUT</h3>
        <p className="text-sm text-slate-700 mb-5 whitespace-pre-wrap">{message}</p>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};

export default RutErrorModal;
