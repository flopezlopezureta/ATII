


import React, { useState } from 'react';
import { DirectoryUser, DirectoryVehicle, TenantDetails, OccupantDetails } from '../../types.ts';
import { registerUserWithDetailedProfile, validatePassword } from '../../services/authService.ts';
import { validateRUT, formatRUT, cleanRUT, formatPhoneNumber } from '../../services/validationService.ts';
import { defaultPermissions } from '../../services/directoryService.ts';
import EyeIcon from '../icons/EyeIcon.tsx';
import EyeSlashIcon from '../icons/EyeSlashIcon.tsx';
import UserPlusIcon from '../icons/UserPlusIcon.tsx';
import TrashIcon from '../icons/TrashIcon.tsx';
import CarIcon from '../icons/CarIcon.tsx';
import RutErrorModal from '../RutErrorModal.tsx';
import PasswordStrengthIndicator from '../PasswordStrengthIndicator.tsx';

const ROLES_OPTIONS = ["", "Propietario", "Arrendatario", "Familiar", "Habitante", "Otro"];

const initialAuthData = { username: '', email: '', password: '', confirmPassword: '' };
const initialProfileData: Omit<DirectoryUser, 'id' | 'createdAt' | 'updatedAt' | 'authUserId' | 'email'> = {
  name: '',
  idDocument: '',
  apartment: '',
  phone: '',
  role: '',
  roleNotes: '',
  notes: '',
  vehicles: [],
  tenant: null,
  occupants: [],
  petsInfo: '',
  unitParkingSpots: [],
  permissions: { ...defaultPermissions },
};
const initialVehicleSubForm: Omit<DirectoryVehicle, 'id'> = { licensePlate: '', parkingSpot: '', notes: '' };

interface RegisterScreenProps {
  switchToLogin: () => void;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ switchToLogin }) => {
  const [authData, setAuthData] = useState(initialAuthData);
  const [profileData, setProfileData] = useState(initialProfileData);
  const [vehicleSubForm, setVehicleSubForm] = useState(initialVehicleSubForm);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [rutError, setRutError] = useState('');
  const [isRutErrorModalOpen, setIsRutErrorModalOpen] = useState(false);
  const [rutModalMessage, setRutModalMessage] = useState('');

  const [vehiclePlateError, setVehiclePlateError] = useState('');
  const appVersion = "v1.0.0";

  const [registrationSubmitted, setRegistrationSubmitted] = useState(false);
  const [submittedUsername, setSubmittedUsername] = useState('');

  const handleAuthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAuthData({ ...authData, [e.target.name]: e.target.value });
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'idDocument') {
      const formatted = formatRUT(value);
      setProfileData({ ...profileData, idDocument: formatted });
      const validation = validateRUT(formatted);
      if (value && !validation.isValid) {
        setRutError(validation.message || 'RUT inválido');
      } else {
        setRutError('');
      }
    } else {
      setProfileData({ ...profileData, [name]: value });
    }
  };
  
  const handleRutBlur = () => {
    if (profileData.idDocument && rutError) {
      setRutModalMessage(rutError);
      setIsRutErrorModalOpen(true);
    }
  };

  const handlePhoneBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData({ ...profileData, [name]: formatPhoneNumber(value) });
  };

  const handleVehicleSubFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setVehicleSubForm({ ...vehicleSubForm, [name]: value.toUpperCase() });
     if(name === 'licensePlate' && value) {
        setVehiclePlateError('');
     }
  };

  const handleAddVehicle = () => {
    const trimmedPlate = vehicleSubForm.licensePlate.trim();
    if (!trimmedPlate) {
      setVehiclePlateError('La placa es obligatoria.');
      return;
    }
    if (profileData.vehicles.some(v => v.licensePlate === trimmedPlate)) {
      setVehiclePlateError('Esta placa ya ha sido agregada.');
      return;
    }
    setVehiclePlateError('');
    const newVehicle: DirectoryVehicle = {
      id: `temp-${Date.now()}`,
      licensePlate: trimmedPlate,
      parkingSpot: vehicleSubForm.parkingSpot?.trim() || undefined,
      notes: vehicleSubForm.notes?.trim() || undefined,
    };
    setProfileData(prev => ({ ...prev, vehicles: [...prev.vehicles, newVehicle] }));
    setVehicleSubForm(initialVehicleSubForm);
  };

  const handleRemoveVehicle = (id: string) => {
    setProfileData(prev => ({
      ...prev,
      vehicles: prev.vehicles.filter(v => v.id !== id),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    
    // --- Validations ---
    const { username, email, password, confirmPassword } = authData;
    if (!username.trim() || !email.trim() || !password.trim() || !profileData.name.trim()) {
        setError("Nombre de usuario, email, contraseña y nombre completo son obligatorios.");
        return;
    }
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
        setError(passwordValidation.message);
        return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    
    if (profileData.idDocument && rutError) {
      setError(`Corrija el RUT principal: ${rutError}`);
      setRutModalMessage(`Corrija el RUT principal: ${rutError}`);
      setIsRutErrorModalOpen(true);
      return;
    }
    // Check for global uniqueness of RUTs and other data can be done in authService

    setLoading(true);
    const result = await registerUserWithDetailedProfile(
      { username: authData.username, passwordAttempt: authData.password, email: authData.email },
      profileData
    );
    setLoading(false);

    if (result.success) {
      setSuccessMessage(result.message || '¡Registro enviado exitosamente!');
      setSubmittedUsername(authData.username);
      setRegistrationSubmitted(true);
    } else {
      setError(result.message || 'Ocurrió un error durante el registro.');
    }
  };

  if (registrationSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-200 via-slate-100 to-sky-100 p-4">
        <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl text-center">
          <UserPlusIcon className="mx-auto w-12 h-12 text-green-500 mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">¡Registro Enviado!</h1>
          <p className="text-slate-600 mb-4">
            Gracias por registrarte, <span className="font-semibold">{submittedUsername}</span>.
          </p>
          <p className="text-sm bg-blue-100 text-blue-700 p-3 rounded-md mb-6">{successMessage}</p>
          <button
            onClick={switchToLogin}
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50 transition duration-150 transform hover:scale-105"
          >
            Volver a Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-200 via-slate-100 to-sky-100 p-4">
      <div className="w-full max-w-xl bg-white p-8 rounded-xl shadow-2xl">
        <div className="text-center mb-6">
          <UserPlusIcon className="mx-auto w-10 h-10 text-sky-600 mb-3"/>
          <h1 className="text-3xl font-bold text-sky-700">Crear Nueva Cuenta</h1>
          <p className="text-slate-500 mt-1">Completa los datos para registrarte.</p>
        </div>

        {error && <p className="mb-4 text-center text-red-600 bg-red-100 p-3 rounded-md text-sm">{error}</p>}
        
        <form onSubmit={handleSubmit} className="space-y-6">
            <fieldset className="border border-slate-200 p-4 rounded-lg">
                <legend className="text-lg font-semibold text-sky-700 px-2">Datos de Autenticación</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1">Nombre de Usuario <span className="text-red-500">*</span></label>
                        <input type="text" id="username" name="username" value={authData.username} onChange={handleAuthChange} required className="w-full px-4 py-2 border border-slate-300 rounded-lg"/>
                    </div>
                     <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email <span className="text-red-500">*</span></label>
                        <input type="email" id="email" name="email" value={authData.email} onChange={handleAuthChange} required className="w-full px-4 py-2 border border-slate-300 rounded-lg"/>
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="password"  className="block text-sm font-medium text-slate-700 mb-1">Contraseña <span className="text-red-500">*</span></label>
                         <div className="relative">
                            <input type={showPassword ? 'text' : 'password'} id="password" name="password" value={authData.password} onChange={handleAuthChange} required className="w-full px-4 py-2 border border-slate-300 rounded-lg pr-10"/>
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500">
                                {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                            </button>
                        </div>
                    </div>
                     <div className="md:col-span-2">
                        <label htmlFor="confirmPassword"  className="block text-sm font-medium text-slate-700 mb-1">Confirmar Contraseña <span className="text-red-500">*</span></label>
                         <div className="relative">
                            <input type={showConfirmPassword ? 'text' : 'password'} id="confirmPassword" name="confirmPassword" value={authData.confirmPassword} onChange={handleAuthChange} required className="w-full px-4 py-2 border border-slate-300 rounded-lg pr-10"/>
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500">
                                {showConfirmPassword ? <EyeSlashIcon /> : <EyeIcon />}
                            </button>
                        </div>
                    </div>
                     <div className="md:col-span-2">
                       <PasswordStrengthIndicator password={authData.password} />
                    </div>
                </div>
            </fieldset>

            <fieldset className="border border-slate-200 p-4 rounded-lg">
                <legend className="text-lg font-semibold text-sky-700 px-2">Datos de Perfil Principal</legend>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="md:col-span-2">
                        <label htmlFor="profileName" className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo <span className="text-red-500">*</span></label>
                        <input type="text" id="profileName" name="name" value={profileData.name} onChange={handleProfileChange} required className="w-full px-4 py-2 border border-slate-300 rounded-lg"/>
                    </div>
                    <div>
                        <label htmlFor="idDocument" className="block text-sm font-medium text-slate-700 mb-1">RUT</label>
                        <input type="text" id="idDocument" name="idDocument" value={profileData.idDocument} onChange={handleProfileChange} onBlur={handleRutBlur}
                            className={`w-full px-4 py-2 border rounded-lg ${rutError ? 'border-red-500' : 'border-slate-300'}`}/>
                         {rutError && <p className="mt-1 text-xs text-red-600">{rutError}</p>}
                    </div>
                    <div>
                        <label htmlFor="apartment" className="block text-sm font-medium text-slate-700 mb-1">Apartamento/Unidad</label>
                        <input type="text" id="apartment" name="apartment" value={profileData.apartment} onChange={handleProfileChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg"/>
                    </div>
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                        <input type="tel" id="phone" name="phone" value={profileData.phone} onChange={handleProfileChange} onBlur={handlePhoneBlur} className="w-full px-4 py-2 border border-slate-300 rounded-lg"/>
                    </div>
                     <div>
                        <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                        <select id="role" name="role" value={profileData.role} onChange={handleProfileChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white">
                            {ROLES_OPTIONS.map(o => <option key={o} value={o}>{o || 'Seleccione...'}</option>)}
                        </select>
                    </div>
                 </div>
            </fieldset>

             <fieldset className="border border-slate-200 p-4 rounded-lg">
                <legend className="text-lg font-semibold text-sky-700 px-2">Vehículos Asociados</legend>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mt-2">
                     <div className="md:col-span-1">
                        <label htmlFor="licensePlate" className="block text-sm font-medium text-slate-700 mb-1">Placa <span className="text-red-500">*</span></label>
                        <input type="text" name="licensePlate" value={vehicleSubForm.licensePlate} onChange={handleVehicleSubFormChange} className={`w-full px-4 py-2 border rounded-lg ${vehiclePlateError ? 'border-red-500' : 'border-slate-300'}`}/>
                        {vehiclePlateError && <p className="mt-1 text-xs text-red-600">{vehiclePlateError}</p>}
                    </div>
                    <div className="md:col-span-1">
                        <label htmlFor="parkingSpot" className="block text-sm font-medium text-slate-700 mb-1">Estacionamiento</label>
                        <input type="text" name="parkingSpot" value={vehicleSubForm.parkingSpot || ''} onChange={handleVehicleSubFormChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg"/>
                    </div>
                    <div className="md:col-span-1">
                         <button type="button" onClick={handleAddVehicle} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg">Agregar Vehículo</button>
                    </div>
                 </div>
                 {profileData.vehicles.length > 0 && (
                     <ul className="mt-4 space-y-2">
                         {profileData.vehicles.map(v => (
                             <li key={v.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-md text-sm">
                                 <div><CarIcon className="w-4 h-4 mr-2 inline"/>{v.licensePlate} {v.parkingSpot ? `(${v.parkingSpot})` : ''}</div>
                                 <button type="button" onClick={() => handleRemoveVehicle(v.id)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4"/></button>
                             </li>
                         ))}
                     </ul>
                 )}
            </fieldset>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50 transition duration-150 transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Registrando...' : 'Enviar Registro'}
          </button>
        </form>
        <p className="mt-8 text-center text-sm text-slate-600">
          ¿Ya tienes una cuenta?{' '}
          <button onClick={switchToLogin} className="font-medium text-sky-600 hover:text-sky-500 hover:underline">
            Inicia sesión aquí
          </button>
        </p>
      </div>
       <footer className="w-full max-w-md mt-8 text-center">
        <p className="text-sm text-slate-500">&copy; {new Date().getFullYear()} CondoAccess App. Todos los derechos reservados.</p>
        <p className="text-xs text-slate-500 mt-1">Versión {appVersion} - SELCOM LTDA.</p>
      </footer>
    </div>
    <RutErrorModal 
        isOpen={isRutErrorModalOpen}
        onClose={() => setIsRutErrorModalOpen(false)}
        message={rutModalMessage}
    />
    </>
  );
};

export default RegisterScreen;