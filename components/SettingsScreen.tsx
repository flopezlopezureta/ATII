
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppSettings, SessionUser, DirectoryUser, DirectoryVehicle, Notification, NotificationStatus, NotificationType } from '../types.ts';
import { getAppSettings, saveAppSettings } from '../services/settingsService.ts';
import { findDirectoryUserByAuthId, updateDirectoryUser, getDirectoryUsers } from '../services/directoryService.ts';
import { updateNotification } from '../services/notificationService.ts';
import { formatPhoneNumber } from '../services/validationService.ts';
import SettingsIcon from './icons/SettingsIcon.tsx'; 
import PasswordConfirmModal from './Auth/PasswordConfirmModal.tsx';
import { verifyPassword, changeSuperuserPassword, validatePassword } from '../services/authService.ts';
import UserIcon from './icons/UserIcon.tsx';
import CarIcon from './icons/CarIcon.tsx';
import TrashIcon from './icons/TrashIcon.tsx';
import EyeIcon from './icons/EyeIcon.tsx';
import EyeSlashIcon from './icons/EyeSlashIcon.tsx';
import BellIcon from './icons/BellIcon.tsx';
import PackageIcon from './icons/PackageIcon.tsx';
import FoodIcon from './icons/FoodIcon.tsx';
import PasswordStrengthIndicator from './PasswordStrengthIndicator.tsx';
import CheckCircleIcon from './icons/CheckCircleIcon.tsx';
import ParkingLoanManager from './Parking/ParkingLoanManager.tsx';
import ParkingIcon from './icons/ParkingIcon.tsx';


interface SettingsScreenProps {
  onSettingsSaved: (settings: AppSettings) => void;
  onSendManualReport: () => { success: boolean; message: string };
  entryCount: number;
  currentGlobalSettings: AppSettings | null;
  isCondominiumNameRequired?: boolean;
  isCurrentUserSuperuser: boolean;
  onClearEntries: () => void;
  currentUser: SessionUser | null;
  notifications: Notification[];
  onNotificationsUpdated: () => void;
}

const initialVehicleFormState: Omit<DirectoryVehicle, 'id'> = {
  licensePlate: '',
  parkingSpot: '',
  notes: '',
};

const UserProfileEditor: React.FC<{
  currentUser: SessionUser;
  notifications: Notification[];
  onProfileUpdated: (msg: string) => void;
  onNotificationsUpdated: () => void;
  showFeedback: (type: 'success' | 'error', text: string) => void;
}> = ({ currentUser, notifications, onProfileUpdated, onNotificationsUpdated, showFeedback }) => {
  
  const [profileData, setProfileData] = useState<DirectoryUser | null>(null);
  const [vehicleFormData, setVehicleFormData] = useState<Omit<DirectoryVehicle, 'id'>>(initialVehicleFormState);
  const [vehiclePlateError, setVehiclePlateError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'parking'>('profile');

  useEffect(() => {
    const userProfile = findDirectoryUserByAuthId(currentUser.id);
    if (userProfile) {
      setProfileData(JSON.parse(JSON.stringify(userProfile))); 
    }
    setIsLoading(false);
  }, [currentUser.id]);
  
  const userNotifications = useMemo(() => {
    if (!profileData) return [];
    return notifications
        .filter(n => n.recipientDirUserId === profileData.id && n.status !== NotificationStatus.DELIVERED)
        .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notifications, profileData]);
  
  const handleAcknowledgeNotification = (notificationId: string) => {
    updateNotification(notificationId, { 
      status: NotificationStatus.ACKNOWLEDGED,
      acknowledgedAt: new Date().toISOString(),
    });
    onNotificationsUpdated();
    showFeedback('success', 'Notificación marcada como leída.');
  };


  const handleProfileInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => prev ? { ...prev, [name]: value } : null);
  };
  
  const handlePhoneBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => prev ? { ...prev, [name]: formatPhoneNumber(value) } : null);
  };
  
  const handleVehicleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setVehicleFormData(prev => ({...prev, [name]: value.toUpperCase()}));
    if (name === 'licensePlate' && value) setVehiclePlateError('');
  };

  const handleAddVehicle = () => {
    if (!profileData) return;
    const trimmedPlate = vehicleFormData.licensePlate.trim();
    if (!trimmedPlate) {
        setVehiclePlateError('La placa es obligatoria.');
        return;
    }
    if (profileData.vehicles.some(v => v.licensePlate === trimmedPlate)) {
        setVehiclePlateError('Esta placa ya ha sido agregada.');
        return;
    }
    const allUsers = getDirectoryUsers();
    const isGloballyUnique = !allUsers.some(user => user.id !== profileData.id && user.vehicles.some(v => v.licensePlate === trimmedPlate));
    if (!isGloballyUnique) {
      setVehiclePlateError('Esta placa ya está registrada por otro usuario en el directorio.');
      return;
    }

    setVehiclePlateError('');
    const newVehicle: DirectoryVehicle = {
        id: `temp-${Date.now()}`,
        ...vehicleFormData,
        licensePlate: trimmedPlate,
    };
    setProfileData(prev => prev ? { ...prev, vehicles: [...prev.vehicles, newVehicle] } : null);
    setVehicleFormData(initialVehicleFormState);
  };

  const handleRemoveVehicle = (vehicleId: string) => {
    setProfileData(prev => prev ? { ...prev, vehicles: prev.vehicles.filter(v => v.id !== vehicleId) } : null);
  };
  
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData) {
      showFeedback('error', 'No se pudo guardar, perfil no encontrado.');
      return;
    }
    if (!profileData.name.trim()) {
      showFeedback('error', 'El nombre no puede estar vacío.');
      return;
    }

    const finalVehicles = profileData.vehicles.map(v => ({
      ...v,
      id: v.id.startsWith('temp-') ? Date.now().toString() + Math.random().toString(36).substring(2, 9) : v.id,
    }));

    const updates: Partial<DirectoryUser> = {
      name: profileData.name,
      phone: profileData.phone,
      notes: profileData.notes,
      vehicles: finalVehicles,
    };
    
    updateDirectoryUser(profileData.id, updates);
    onProfileUpdated('Tu perfil ha sido actualizado exitosamente.');
  };

  if (isLoading) {
    return <p className="text-center text-slate-500">Cargando perfil...</p>;
  }
  if (!profileData) {
    return <p className="text-center text-red-600">No se pudo encontrar tu perfil en el directorio. Por favor, contacta al administrador.</p>;
  }

  return (
    <div className="space-y-6">
      {userNotifications.length > 0 && (
          <fieldset className="border-2 border-indigo-300 bg-indigo-50 p-4 rounded-lg">
            <legend className="text-lg font-semibold text-indigo-700 px-2 flex items-center gap-2">
                <BellIcon className="w-5 h-5"/>Notificaciones Pendientes
            </legend>
            <div className="space-y-3 mt-2 max-h-60 overflow-y-auto pr-2">
                {userNotifications.map(n => (
                    <div key={n.id} className="bg-white p-3 rounded-md shadow-sm border flex justify-between items-start gap-3">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 pt-0.5">
                                {n.type === NotificationType.PACKAGE ? <PackageIcon className="w-6 h-6 text-sky-600"/> : <FoodIcon className="w-6 h-6 text-orange-500"/>}
                            </div>
                            <div>
                                <p className="font-semibold text-slate-800">
                                    {n.type === NotificationType.PACKAGE ? 'Llegó una encomienda' : 'Llegó un pedido de comida'}
                                </p>
                                <p className="text-sm text-slate-600">{n.notes || 'Sin notas adicionales.'}</p>
                                <p className="text-xs text-slate-500 mt-1">Recibido por {n.createdByUsername} el {new Date(n.createdAt).toLocaleString('es-CL')}</p>
                            </div>
                        </div>
                        {n.status === NotificationStatus.PENDING && (
                            <button onClick={() => handleAcknowledgeNotification(n.id)} className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 font-semibold py-1 px-2.5 rounded-md whitespace-nowrap">
                                OK, Enterado
                            </button>
                        )}
                    </div>
                ))}
            </div>
          </fieldset>
      )}

      <div className="flex gap-2 mb-4 bg-slate-100 p-1 rounded-lg">
        <button onClick={() => setActiveTab('profile')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'profile' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <UserIcon className="w-4 h-4"/> Mis Datos
        </button>
        <button onClick={() => setActiveTab('parking')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'parking' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <ParkingIcon className="w-4 h-4"/> Préstamos Estac.
        </button>
      </div>

      {activeTab === 'profile' ? (
        <form onSubmit={handleProfileSubmit} className="space-y-6">
          <fieldset className="border border-slate-200 p-4 rounded-lg">
            <legend className="text-lg font-semibold text-purple-700 px-2">Mis Datos</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div>
                  <label htmlFor="profileName" className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo <span className="text-red-500">*</span></label>
                  <input type="text" name="name" id="profileName" value={profileData.name} onChange={handleProfileInputChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg"/>
                </div>
                <div>
                  <label htmlFor="profilePhone" className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                  <input type="tel" name="phone" id="profilePhone" value={profileData.phone || ''} onChange={handleProfileInputChange} onBlur={handlePhoneBlur} className="w-full px-3 py-2 border border-slate-300 rounded-lg"/>
                </div>
                <div className="p-3 bg-slate-50 rounded-md">
                    <label className="block text-sm font-medium text-slate-500">Apartamento/Unidad</label>
                    <p className="text-slate-800 font-semibold">{profileData.apartment || 'No asignado'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-md">
                    <label className="block text-sm font-medium text-slate-500">Rol</label>
                    <p className="text-slate-800 font-semibold">{profileData.role || 'No asignado'}</p>
                </div>
                <div className="md:col-span-2">
                    <label htmlFor="profileNotes" className="block text-sm font-medium text-slate-700 mb-1">Notas Personales</label>
                    <textarea name="notes" id="profileNotes" value={profileData.notes || ''} onChange={handleProfileInputChange} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg"></textarea>
                </div>
            </div>
          </fieldset>
          
          <fieldset className="border border-slate-200 p-4 rounded-lg">
              <legend className="text-lg font-semibold text-purple-700 px-2">Mis Vehículos</legend>
              <div className="bg-slate-50 p-3 my-2 rounded-md border border-slate-100 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                          <label htmlFor="userVehiclePlate" className="block text-xs font-medium text-slate-600 mb-0.5">Placa Patente <span className="text-red-500">*</span></label>
                          <input type="text" name="licensePlate" id="userVehiclePlate" value={vehicleFormData.licensePlate} onChange={handleVehicleInputChange} className={`w-full px-2.5 py-1.5 border rounded-md text-sm ${vehiclePlateError ? 'border-red-500' : 'border-slate-300'}`}/>
                          {vehiclePlateError && <p className="mt-0.5 text-xs text-red-600">{vehiclePlateError}</p>}
                      </div>
                      <div>
                          <label htmlFor="userVehicleSpot" className="block text-xs font-medium text-slate-600 mb-0.5">Estacionamiento Asignado</label>
                          <input type="text" name="parkingSpot" id="userVehicleSpot" value={vehicleFormData.parkingSpot || ''} onChange={handleVehicleInputChange} className="w-full px-2.5 py-1.5 border rounded-md text-sm"/>
                      </div>
                  </div>
                  <button type="button" onClick={handleAddVehicle} className="w-full md:w-auto px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md">Agregar Vehículo</button>
              </div>
              {profileData.vehicles.length > 0 && (
                  <ul className="max-h-32 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-md p-1 mt-2 text-sm">
                      {profileData.vehicles.map(v => (
                          <li key={v.id} className="p-1.5 flex justify-between items-center hover:bg-slate-50">
                              <div><CarIcon className="w-4 h-4 mr-1.5 inline text-slate-500" /> <span className="font-medium">{v.licensePlate}</span> {v.parkingSpot ? `(${v.parkingSpot})` : ''}</div>
                              <button type="button" onClick={() => handleRemoveVehicle(v.id)} className="text-red-500 hover:text-red-700 p-0.5"><TrashIcon className="w-3.5 h-3.5"/></button>
                          </li>
                      ))}
                  </ul>
              )}
          </fieldset>

          <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md">
              Guardar Mis Cambios
          </button>
        </form>
      ) : (
        <ParkingLoanManager currentUser={currentUser} userProfile={profileData} />
      )}
    </div>
  );
};


const SuperuserPasswordChanger: React.FC<{
  currentUser: SessionUser;
  showFeedback: (type: 'success' | 'error', text: string) => void;
}> = ({ currentUser, showFeedback }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showFeedback('error', 'Las nuevas contraseñas no coinciden.');
      return;
    }
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      showFeedback('error', validation.message);
      return;
    }

    const result = changeSuperuserPassword(currentUser.username, currentPassword, newPassword);
    showFeedback(result.success ? 'success' : 'error', result.message);
    if (result.success) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="currentPassword"  className="block text-sm font-medium text-slate-700 mb-1">Contraseña Actual</label>
        <div className="relative">
            <input type={showCurrent ? 'text' : 'password'} id="currentPassword" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-lg pr-10"/>
            <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500">{showCurrent ? <EyeSlashIcon/> : <EyeIcon/>}</button>
        </div>
      </div>
       <div>
        <label htmlFor="newPassword"  className="block text-sm font-medium text-slate-700 mb-1">Nueva Contraseña</label>
        <div className="relative">
            <input type={showNew ? 'text' : 'password'} id="newPassword" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-lg pr-10"/>
            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500">{showNew ? <EyeSlashIcon/> : <EyeIcon/>}</button>
        </div>
        {newPassword && <PasswordStrengthIndicator password={newPassword} />}
      </div>
       <div>
        <label htmlFor="confirmPassword"  className="block text-sm font-medium text-slate-700 mb-1">Confirmar Nueva Contraseña</label>
        <input type="password" id="confirmPassword" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-lg"/>
      </div>
      <button type="submit" className="w-full sm:w-auto bg-slate-700 hover:bg-slate-800 text-white font-semibold py-2 px-4 rounded-lg">
        Cambiar Contraseña
      </button>
    </form>
  )
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onSettingsSaved, onClearEntries, entryCount, currentUser, notifications, onNotificationsUpdated
}) => {
  const [settings, setSettings] = useState<AppSettings>(getAppSettings());
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordModalLoading, setPasswordModalLoading] = useState(false);
  const [passwordModalError, setPasswordModalError] = useState('');
  const [isSaveSuccess, setIsSaveSuccess] = useState(false);

  const showLocalFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings.condominiumName.trim()) {
      showLocalFeedback('error', 'El Nombre del Condominio es obligatorio.');
      return;
    }
    
    const sendInterval = Number(settings.sendIntervalHours) || 0;
    const totalSpots = Number(settings.totalParkingSpots) || 0;

    if (!settings.recipientEmail.trim() && sendInterval > 0) {
        showLocalFeedback('error', 'El correo destinatario es obligatorio si el intervalo de envío es mayor a 0.');
        return;
    }

    const settingsToSave: AppSettings = {
      ...settings,
      totalParkingSpots: totalSpots,
      sendIntervalHours: sendInterval,
    };

    saveAppSettings(settingsToSave);
    onSettingsSaved(settingsToSave);
    setIsSaveSuccess(true);
    setTimeout(() => {
        setIsSaveSuccess(false);
    }, 2500);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };
  
  const handleClearEntriesAttempt = () => {
    if (currentUser) {
      setIsPasswordModalOpen(true);
    } else {
      showLocalFeedback('error', 'Error: No se pudo identificar al usuario actual.');
    }
  };

  const handleConfirmClearEntries = async (password: string) => {
    if (!currentUser) {
      setPasswordModalError("No se pudo verificar la identidad del usuario.");
      return;
    }
    setPasswordModalLoading(true);
    setPasswordModalError('');
    await new Promise(resolve => setTimeout(resolve, 300));
    const isPasswordValid = verifyPassword(currentUser.username, password);
    setPasswordModalLoading(false);

    if (isPasswordValid) {
      onClearEntries();
      setIsPasswordModalOpen(false);
      showLocalFeedback('success', `Todos los ${entryCount} registros han sido borrados.`);
    } else {
      setPasswordModalError('Contraseña incorrecta. No se borraron los registros.');
    }
  };

  if (!currentUser) return null;

  if (!currentUser.role || (currentUser.role !== 'Superuser' && currentUser.role !== 'Conserje')) {
    return (
      <div className="bg-white p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-2xl mx-auto">
        <div className="flex items-center justify-center space-x-3 mb-8">
          <UserIcon className="w-8 h-8 text-purple-600" />
          <h2 className="text-3xl font-bold text-slate-800">Mi Perfil</h2>
        </div>
        {feedback && <p className={`mb-4 p-3 rounded-md text-sm ${feedback.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{feedback.text}</p>}
        <UserProfileEditor 
            currentUser={currentUser} 
            notifications={notifications}
            onProfileUpdated={(msg) => showLocalFeedback('success', msg)} 
            onNotificationsUpdated={onNotificationsUpdated}
            showFeedback={showLocalFeedback} 
        />
      </div>
    );
  }

  // Superuser or Concierge Settings View
  return (
    <>
      <div className="bg-white p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-3xl mx-auto space-y-8">
        <div className="text-center">
          <SettingsIcon className="w-10 h-10 text-purple-600 mx-auto mb-2" />
          <h2 className="text-3xl font-bold text-slate-800">Configuración General</h2>
        </div>

        {feedback && <p className={`mb-4 p-3 rounded-md text-sm ${feedback.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{feedback.text}</p>}
        
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <fieldset className="border border-slate-200 p-4 rounded-lg">
            <legend className="text-lg font-semibold text-purple-700 px-2">Configuración Principal</legend>
            <div className="space-y-4 mt-2">
              <div>
                <label htmlFor="condominiumName" className="block text-sm font-medium text-slate-700 mb-1">Nombre del Condominio <span className="text-red-500">*</span></label>
                <input type="text" id="condominiumName" name="condominiumName" value={settings.condominiumName} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg"/>
              </div>
              <div>
                <label htmlFor="totalParkingSpots" className="block text-sm font-medium text-slate-700 mb-1">Número Total de Estacionamientos</label>
                <input type="number" id="totalParkingSpots" name="totalParkingSpots" value={settings.totalParkingSpots ?? ''} onChange={handleInputChange} min="0" className="w-full px-3 py-2 border border-slate-300 rounded-lg"/>
                <p className="mt-1 text-xs text-slate-500">Define cuántos estacionamientos se mostrarán en la vista de Estacionamientos.</p>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                <input type="checkbox" id="conciergeModeEnabled" name="conciergeModeEnabled" checked={!!settings.conciergeModeEnabled} onChange={handleInputChange} className="h-5 w-5 text-purple-600 border-slate-300 rounded focus:ring-purple-500"/>
                <div>
                  <label htmlFor="conciergeModeEnabled" className="font-medium text-slate-700">Habilitar modo conserje para aprobación de ingresos</label>
                  <p className="text-xs text-slate-500">Si está activo, los registros de usuarios normales quedarán pendientes de aprobación.</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                <input 
                  type="checkbox" 
                  id="whatsappNotificationsEnabled" 
                  name="whatsappNotificationsEnabled" 
                  checked={!!settings.whatsappNotificationsEnabled} 
                  onChange={handleInputChange} 
                  className="h-5 w-5 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                />
                <div>
                  <label htmlFor="whatsappNotificationsEnabled" className="font-medium text-slate-700">Habilitar notificaciones por WhatsApp</label>
                  <p className="text-xs text-slate-500">Al autorizar un ingreso con invitación, se intentará abrir WhatsApp para notificar al residente.</p>
                </div>
              </div>
            </div>
          </fieldset>
          
          <fieldset className="border border-slate-200 p-4 rounded-lg">
            <legend className="text-lg font-semibold text-purple-700 px-2">Cambiar Contraseña de Administrador</legend>
             <SuperuserPasswordChanger currentUser={currentUser} showFeedback={showLocalFeedback} />
          </fieldset>

          <button 
            type="submit" 
            className={`w-full text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors duration-200 flex items-center justify-center ${
              isSaveSuccess
                ? 'bg-green-500'
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
            disabled={isSaveSuccess}
          >
            {isSaveSuccess ? (
              <>
                <CheckCircleIcon className="w-5 h-5 mr-2" />
                ¡Guardado!
              </>
            ) : (
              'Guardar Ajustes Generales'
            )}
          </button>
        </form>

        <div className="mt-8 border-t border-slate-200 pt-6">
            <h3 className="text-xl font-semibold text-red-600 mb-4">Zona Peligrosa</h3>
             <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-lg">
                <p className="font-bold">Advertencia</p>
                <p className="text-sm">La siguiente acción no se puede deshacer. Proceda con precaución.</p>
            </div>
            <div className="mt-4">
                <button onClick={handleClearEntriesAttempt} disabled={entryCount === 0}
                        className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-5 rounded-lg disabled:opacity-60">
                  Borrar Todos los Registros ({entryCount})
                </button>
            </div>
        </div>
      </div>

      <PasswordConfirmModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} onConfirm={handleConfirmClearEntries}
          loading={passwordModalLoading} errorMessage={passwordModalError}
      />
    </>
  );
};

export default SettingsScreen;
