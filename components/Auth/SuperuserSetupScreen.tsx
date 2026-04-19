

import React, { useState } from 'react';
import { setSuperuserCredentials, validatePassword } from '../../services/authService.ts';
import EyeIcon from '../icons/EyeIcon.tsx';
import EyeSlashIcon from '../icons/EyeSlashIcon.tsx';
import PasswordStrengthIndicator from '../PasswordStrengthIndicator.tsx';

interface SuperuserSetupScreenProps {
  onSetupComplete: () => void;
}

const SuperuserSetupScreen: React.FC<SuperuserSetupScreenProps> = ({ onSetupComplete }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const appVersion = "v1.0.0"; // Definición de la versión

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!username.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Todos los campos son obligatorios.');
      return;
    }
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
        setError(passwordValidation.message);
        return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    
    setLoading(true);
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 500));
    const result = setSuperuserCredentials(username, password);
    setLoading(false);

    if (result.success) {
      setSuccessMessage(result.message + ' Serás redirigido para iniciar sesión.');
      setUsername('');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onSetupComplete();
      }, 2500);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-200 via-slate-100 to-sky-100 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl">
        <div className="text-center mb-8">
           <div className="inline-flex items-center justify-center p-3 bg-sky-500 rounded-lg mb-4">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="w-10 h-10 text-white flex-shrink-0">
                 <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
               </svg>
           </div>
          <h1 className="text-3xl font-bold text-sky-700">Configurar Superusuario</h1>
          <p className="text-slate-500">Es necesario configurar un superusuario para administrar la aplicación.</p>
        </div>

        {error && <p className="mb-4 text-center text-red-600 bg-red-100 p-3 rounded-md text-sm" role="alert">{error}</p>}
        {successMessage && <p className="mb-4 text-center text-green-700 bg-green-100 p-3 rounded-md text-sm" role="status">{successMessage}</p>}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="su-username" className="block text-sm font-medium text-slate-700 mb-1">Nombre de Superusuario</label>
            <input
              type="text"
              id="su-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition duration-150"
              placeholder="Elige un nombre de superusuario"
              required
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="su-password" className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="su-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition duration-150 pr-10"
                placeholder="Mínimo 8 caracteres"
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
          <div>
            <label htmlFor="su-confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">Confirmar Contraseña</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="su-confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition duration-150 pr-10"
                placeholder="Repite tu contraseña"
                required
                aria-required="true"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-slate-500 hover:text-slate-700 focus:outline-none"
                aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showConfirmPassword ? <EyeSlashIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
           <PasswordStrengthIndicator password={password} />
          <button
            type="submit"
            disabled={loading || !!successMessage}
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50 transition duration-150 transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Configurando...' : 'Guardar Superusuario'}
          </button>
        </form>
      </div>
      <footer className="w-full max-w-md mt-8 text-center">
        <p className="text-sm text-slate-500">&copy; {new Date().getFullYear()} CondoAccess App. Configuración Inicial.</p>
        <p className="text-xs text-slate-500 mt-1">Versión {appVersion} - SELCOM LTDA.</p>
      </footer>
    </div>
  );
};

export default SuperuserSetupScreen;