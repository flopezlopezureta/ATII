import React, { useState } from 'react';
import { requestPasswordReset } from '../../services/authService.ts';
import MailIcon from '../icons/MailIcon.tsx'; 

interface ForgotPasswordScreenProps {
  switchToLogin: () => void;
  switchToReset: () => void;
}

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ switchToLogin, switchToReset }) => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!email.trim()) {
      setError('El correo electrónico es obligatorio.');
      return;
    }
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    const result = requestPasswordReset(email);
    setLoading(false);

    if (result.success) {
      setMessage(result.message);
      setRequestSent(true);
    } else {
      // For security, often the same message is shown regardless of success or failure
      setMessage(result.message);
      setRequestSent(true);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-200 via-slate-100 to-sky-100 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl">
        <div className="text-center mb-6">
          <MailIcon className="mx-auto w-12 h-12 text-sky-600 mb-4" />
          <h1 className="text-3xl font-bold text-slate-800">Recuperar Contraseña</h1>
          {!requestSent ? (
            <p className="text-slate-500 mt-2">Ingresa tu correo electrónico para recibir un token de recuperación.</p>
          ) : (
             <p className="text-slate-500 mt-2">Revisa la alerta con tu token y sigue las instrucciones.</p>
          )}
        </div>

        {error && <p className="mb-4 text-center text-red-600 bg-red-100 p-3 rounded-md text-sm">{error}</p>}
        {message && <p className="mb-4 text-center text-blue-700 bg-blue-100 p-3 rounded-md text-sm">{message}</p>}
        
        {!requestSent ? (
            <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
                <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder="tu-correo@ejemplo.com"
                required
                />
            </div>
            <button
                type="submit"
                disabled={loading}
                className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md disabled:opacity-70"
            >
                {loading ? 'Enviando...' : 'Enviar Token'}
            </button>
            </form>
        ) : (
            <div className="text-center">
                 <button
                    onClick={switchToReset}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md"
                >
                    Ya tengo mi token, restablecer contraseña
                </button>
            </div>
        )}

        <p className="mt-8 text-center text-sm text-slate-600">
          ¿Recordaste tu contraseña?{' '}
          <button onClick={switchToLogin} className="font-medium text-sky-600 hover:text-sky-500 hover:underline">
            Volver a Iniciar Sesión
          </button>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordScreen;