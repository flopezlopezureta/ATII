import React, { useState, useEffect } from 'react';
import EyeIcon from '../icons/EyeIcon.tsx';
import EyeSlashIcon from '../icons/EyeSlashIcon.tsx';

interface PasswordConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  loading: boolean;
  errorMessage?: string;
}

const PasswordConfirmModal: React.FC<PasswordConfirmModalProps> = ({ isOpen, onClose, onConfirm, loading, errorMessage }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword(''); // Reset password field when modal opens
      setShowPassword(false); // Reset showPassword state
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(password);
  };

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out"
        aria-modal="true"
        role="dialog"
        aria-labelledby="password-confirm-title"
    >
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm transform transition-all duration-300 ease-in-out scale-100">
        <h2 id="password-confirm-title" className="text-xl font-semibold text-slate-800 mb-1">Confirmar Acción</h2>
        <p className="text-sm text-slate-600 mb-4">Por seguridad, por favor ingresa tu contraseña para continuar.</p>
        
        {errorMessage && <p className="mb-3 text-red-600 bg-red-100 p-2 rounded-md text-sm">{errorMessage}</p>}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="confirm-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 pr-10"
                required
                aria-required="true"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-slate-500 hover:text-slate-700 focus:outline-none"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-70"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !password}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Verificando...' : 'Confirmar Borrado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordConfirmModal;