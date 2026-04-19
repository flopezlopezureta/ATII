
import React, { useState } from 'react';
import { loginUser } from '../../services/authService.ts';
import EyeIcon from '../icons/EyeIcon.tsx';
import EyeSlashIcon from '../icons/EyeSlashIcon.tsx';
import LoginLogoIcon from '../icons/LoginLogoIcon.tsx'; 

interface LoginScreenProps {
  onLoginSuccess: () => void;
  switchToRegister: () => void;
  switchToForgotPassword: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, switchToRegister, switchToForgotPassword }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const appVersion = "v1.0.0"; // Definición de la versión

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Nombre de usuario y contraseña son obligatorios.');
      return;
    }
    setLoading(true);
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 500));
    const result = loginUser(username, password);
    setLoading(false);
    if (result.success) {
      onLoginSuccess();
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-200 via-slate-100 to-sky-100 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl">
        <div className="text-center mb-6">
            <LoginLogoIcon className="mx-auto mb-4" /> 
          {/* El título h1 anterior se eliminó ya que su contenido está ahora integrado en LoginLogoIcon */}
          <p className="text-slate-500 text-lg mt-1">Inicia sesión para continuar</p>
        </div>

        {error && <p className="mb-4 text-center text-red-600 bg-red-100 p-3 rounded-md text-sm">{error}</p>}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1">Nombre de Usuario</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition duration-150"
              placeholder="Tu nombre de usuario"
              required
              aria-required="true"
            />
          </div>
          <div>
             <div className="flex justify-between items-center">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                <button 
                  type="button" 
                  onClick={switchToForgotPassword} 
                  className="text-xs text-sky-600 hover:underline focus:outline-none"
                >
                    ¿Olvidaste tu contraseña?
                </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition duration-150 pr-10"
                placeholder="Tu contraseña"
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
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50 transition duration-150 transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Iniciando...' : 'Iniciar Sesión'}
          </button>
        </form>
        <p className="mt-8 text-center text-sm text-slate-600">
          ¿No tienes una cuenta?{' '}
          <button onClick={switchToRegister} className="font-medium text-sky-600 hover:text-sky-500 hover:underline">
            Regístrate aquí
          </button>
        </p>
      </div>
       <footer className="w-full max-w-md mt-8 text-center">
        <p className="text-sm text-slate-500">&copy; {new Date().getFullYear()} CondoAccess App. Todos los derechos reservados.</p>
        <p className="text-xs text-slate-500 mt-1">Versión {appVersion} - SELCOM LTDA.</p>
      </footer>
    </div>
  );
};

export default LoginScreen;