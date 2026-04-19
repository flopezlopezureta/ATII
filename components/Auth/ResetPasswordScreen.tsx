import React, { useState } from 'react';
import { resetPassword, validatePassword } from '../../services/authService.ts';
import EyeIcon from '../icons/EyeIcon.tsx';
import EyeSlashIcon from '../icons/EyeSlashIcon.tsx';
import PasswordStrengthIndicator from '../PasswordStrengthIndicator.tsx';


interface ResetPasswordScreenProps {
  switchToLogin: () => void;
}

const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ switchToLogin }) => {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setError('Todos los campos son obligatorios.');
      return;
    }
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
        setError(passwordValidation.message);
        return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    const result = resetPassword(token, newPassword);
    setLoading(false);
    
    if (result.success) {
      alert(result.message); // Show success message
      switchToLogin(); // Redirect to login
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-200 via-slate-100 to-sky-100 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-slate-800">Restablecer Contraseña</h1>
          <p className="text-slate-500 mt-2">Ingresa tu token y tu nueva contraseña.</p>
        </div>

        {error && <p className="mb-4 text-center text-red-600 bg-red-100 p-3 rounded-md text-sm">{error}</p>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="token" className="block text-sm font-medium text-slate-700 mb-1">Token de Recuperación</label>
            <input
              type="text"
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg"
              placeholder="Pega el token de tu correo"
              required
            />
          </div>
          <div>
            <label htmlFor="newPassword"  className="block text-sm font-medium text-slate-700 mb-1">Nueva Contraseña</label>
            <div className="relative">
                <input
                type={showPassword ? 'text' : 'password'}
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg pr-10"
                required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500">
                    {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                </button>
            </div>
          </div>
          <div>
            <label htmlFor="confirmPassword"  className="block text-sm font-medium text-slate-700 mb-1">Confirmar Nueva Contraseña</label>
            <div className="relative">
                <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg pr-10"
                required
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500">
                    {showConfirmPassword ? <EyeSlashIcon /> : <EyeIcon />}
                </button>
            </div>
          </div>

          <PasswordStrengthIndicator password={newPassword} />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md disabled:opacity-70"
          >
            {loading ? 'Restableciendo...' : 'Restablecer Contraseña'}
          </button>
        </form>
         <p className="mt-8 text-center text-sm text-slate-600">
          <button onClick={switchToLogin} className="font-medium text-sky-600 hover:text-sky-500 hover:underline">
            Volver a Iniciar Sesión
          </button>
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordScreen;