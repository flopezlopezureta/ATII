

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DirectoryUser, DirectoryVehicle, TenantDetails, OccupantDetails, User as AuthUserType, UserPermissions } from '../types.ts';
// FIX: deleteDirectoryUser was missing from this import.
import { getDirectoryUsers, addDirectoryUser, updateDirectoryUser, deleteDirectoryUser, defaultPermissions } from '../services/directoryService.ts';
import { 
    getUsers as getAuthUsers, 
    approveUserAccount, 
    disableUserAccount, 
    getCurrentUser, 
    SUPERUSER_ID_FOR_SESSION,
    adminCreateAuthAccount,
    validatePassword, 
} from '../services/authService.ts';
import { validateRUT, formatRUT, cleanRUT, formatPhoneNumber } from '../services/validationService.ts';
import AddressBookIcon from './icons/AddressBookIcon.tsx';
import UserPlusIcon from './icons/UserPlusIcon.tsx';
import EditIcon from './icons/EditIcon.tsx';
import TrashIcon from './icons/TrashIcon.tsx';
import SearchIcon from './icons/SearchIcon.tsx';
import CarIcon from './icons/CarIcon.tsx'; 
import ParkingIcon from './icons/ParkingIcon.tsx'; 
import RutErrorModal from './RutErrorModal.tsx'; 
import CheckCircleIcon from './icons/CheckCircleIcon.tsx';
import ClockIcon from './icons/ClockIcon.tsx';
import XCircleIcon from './icons/XCircleIcon.tsx';
import PetIcon from './icons/PetIcon.tsx';
import UsersIcon from './icons/UsersIcon.tsx';
import EyeIcon from './icons/EyeIcon.tsx';
import EyeSlashIcon from './icons/EyeSlashIcon.tsx';
import PasswordStrengthIndicator from './PasswordStrengthIndicator.tsx';

// Define profile types
type ProfileType = 'admin' | 'concierge' | 'resident';

const initialVehicleFormState: Omit<DirectoryVehicle, 'id'> = {
  licensePlate: '', parkingSpot: '', notes: ''
};
const initialOccupantSubFormState: Omit<OccupantDetails, 'id'> = {
  name: '', relationship: '', idDocument: ''
};
const initialUserFormState: Omit<DirectoryUser, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  idDocument: '',
  apartment: '',
  phone: '',
  email: '',
  role: '',
  roleNotes: '',
  notes: '',
  vehicles: [],
  tenant: null,
  occupants: [],
  petsInfo: '',
  unitParkingSpots: [],
  permissions: { ...defaultPermissions },
  workShift: undefined,
};
const initialAuthFormData = { username: '', password: '' };

const ROLES_OPTIONS = ["", "Propietario", "Arrendatario", "Habitante", "Familiar", "Conserje", "Comité", "Administrador", "Otro"];
const RESIDENT_ROLES_OPTIONS = ["", "Propietario", "Arrendatario", "Habitante", "Familiar", "Comité", "Otro"];
const OCCUPANT_RELATIONSHIP_OPTIONS = ["", "Familiar", "Hijo/a", "Cónyuge", "Roommate", "Otro"];


const UserDirectoryScreen: React.FC = () => {
  const [directoryUsers, setDirectoryUsers] = useState<DirectoryUser[]>([]);
  const [authUsers, setAuthUsers] = useState<AuthUserType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<DirectoryUser | null>(null);
  
  // Modal state
  const [modalStep, setModalStep] = useState(1);
  const [selectedProfile, setSelectedProfile] = useState<ProfileType | null>(null);
  const [userFormData, setUserFormData] = useState<Omit<DirectoryUser, 'id' | 'createdAt' | 'updatedAt'>>(initialUserFormState);
  const [authFormData, setAuthFormData] = useState(initialAuthFormData);
  const [showPassword, setShowPassword] = useState(false);
  const [hasTenant, setHasTenant] = useState(false);

  // Sub-form states
  const [vehicleFormData, setVehicleFormData] = useState<Omit<DirectoryVehicle, 'id'>>(initialVehicleFormState);
  const [occupantSubFormData, setOccupantSubFormData] = useState<Omit<OccupantDetails, 'id'>>(initialOccupantSubFormState);
  const [unitParkingSpotInput, setUnitParkingSpotInput] = useState('');
  
  // Error and feedback states
  const [formError, setFormError] = useState('');
  const [rutError, setRutError] = useState('');
  const [tenantRutError, setTenantRutError] = useState('');
  const [isRutModalOpen, setIsRutModalOpen] = useState(false);
  const [rutModalMessage, setRutModalMessage] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const sessionUser = getCurrentUser();
  const isSuperAdmin = sessionUser?.id === SUPERUSER_ID_FOR_SESSION;

  const loadData = useCallback(() => {
    setDirectoryUsers(getDirectoryUsers());
    setAuthUsers(getAuthUsers());
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const showFeedback = (type: 'success' | 'error', text: string, duration: number = 4000) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), duration);
  };
  
  const resetModalState = () => {
      setIsModalOpen(false);
      setEditingUser(null);
      setModalStep(1);
      setSelectedProfile(null);
      setUserFormData(initialUserFormState);
      setAuthFormData(initialAuthFormData);
      setHasTenant(false);
      setShowPassword(false);
      setFormError('');
      setRutError('');
      setTenantRutError('');
  };

  const handleOpenModal = (userToEdit: DirectoryUser | null = null) => {
    if (userToEdit) {
      setEditingUser(userToEdit);
      const formDataFromUser = JSON.parse(JSON.stringify(userToEdit));
      setUserFormData({
          ...initialUserFormState,
          ...formDataFromUser
      });
      setHasTenant(!!formDataFromUser.tenant);
      
      if(formDataFromUser.role === 'Administrador') setSelectedProfile('admin');
      else if (formDataFromUser.role === 'Conserje') setSelectedProfile('concierge');
      else setSelectedProfile('resident');
      setModalStep(2); 
    } else {
      setEditingUser(null);
      setModalStep(1);
      setSelectedProfile(null);
      setUserFormData(initialUserFormState);
      setHasTenant(false);
    }
    setAuthFormData(initialAuthFormData);
    setShowPassword(false);
    setFormError('');
    setRutError('');
    setTenantRutError('');
    setIsModalOpen(true);
  };

  const handleProfileSelect = (profile: ProfileType) => {
    setSelectedProfile(profile);
    let permissions = { ...defaultPermissions };
    let role = '';

    if (profile === 'admin') {
      permissions = { authorizePeople: true, authorizeVehicles: true, sendNotifications: true, manageDirectory: true, authorizeInvitations: true };
      role = 'Administrador';
    } else if (profile === 'concierge') {
      permissions = { authorizePeople: true, authorizeVehicles: true, sendNotifications: true, manageDirectory: false, authorizeInvitations: true };
      role = 'Conserje';
    } else { // resident
      role = 'Propietario'; 
    }
    setUserFormData(prev => ({ ...prev, permissions, role }));
    setModalStep(2);
  };

  const handlePermissionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setUserFormData(prev => ({
        ...prev,
        permissions: { ...prev.permissions, [name]: checked }
    }));
  };

  const handleUserInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
     if (name === 'idDocument') {
        const formatted = formatRUT(value);
        setUserFormData(prev => ({ ...prev, idDocument: formatted }));
        const validation = validateRUT(formatted);
        setRutError(value && !validation.isValid ? (validation.message || 'RUT inválido') : '');
    } else {
        setUserFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAuthInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAuthFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRutBlur = (type: 'main' | 'tenant') => {
    if (type === 'main' && rutError) {
        setRutModalMessage(rutError);
        setIsRutModalOpen(true);
    } else if (type === 'tenant' && tenantRutError) {
        setRutModalMessage(tenantRutError);
        setIsRutModalOpen(true);
    }
  };

  // --- Sub-form handlers ---
  const handleToggleTenant = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setHasTenant(isChecked);
    setUserFormData(prev => ({ ...prev, tenant: isChecked ? { name: '' } : null }));
    if (!isChecked) {
        setTenantRutError('');
    }
  };
  const handleTenantChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'idDocument') {
        const formatted = formatRUT(value);
        setUserFormData(prev => ({ ...prev, tenant: prev.tenant ? { ...prev.tenant, [name]: formatted } : null }));
        const validation = validateRUT(formatted);
        setTenantRutError(value && !validation.isValid ? (validation.message || 'RUT de arrendatario inválido') : '');
    } else {
        setUserFormData(prev => ({ ...prev, tenant: prev.tenant ? { ...prev.tenant, [name]: value } : null }));
    }
  };
  const handleTenantPhoneBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserFormData(prev => ({ ...prev, tenant: prev.tenant ? { ...prev.tenant, [name]: formatPhoneNumber(value) } : null }));
  };
  const handleAddVehicle = () => {
    if (!vehicleFormData.licensePlate.trim()) return;
    setUserFormData(prev => ({ ...prev, vehicles: [...prev.vehicles, { id: `temp-${Date.now()}`, ...vehicleFormData }] }));
    setVehicleFormData(initialVehicleFormState);
  };
  const handleRemoveVehicle = (id: string) => {
    setUserFormData(prev => ({ ...prev, vehicles: prev.vehicles.filter(v => v.id !== id) }));
  };
  const handleAddOccupant = () => {
    if(!occupantSubFormData.name.trim()) return;
    setUserFormData(prev => ({ ...prev, occupants: [...prev.occupants, { id: `temp-${Date.now()}`, ...occupantSubFormData }] }));
    setOccupantSubFormData(initialOccupantSubFormState);
  };
  const handleRemoveOccupant = (id: string) => {
    setUserFormData(prev => ({ ...prev, occupants: prev.occupants.filter(o => o.id !== id)}));
  };
  const handleAddParkingSpot = () => {
    if(!unitParkingSpotInput.trim()) return;
    setUserFormData(prev => ({...prev, unitParkingSpots: [...(prev.unitParkingSpots || []), unitParkingSpotInput.trim().toUpperCase()]}));
    setUnitParkingSpotInput('');
  };
  const handleRemoveParkingSpot = (spot: string) => {
    setUserFormData(prev => ({...prev, unitParkingSpots: (prev.unitParkingSpots || []).filter(s => s !== spot)}));
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!userFormData.name.trim()) {
        setFormError('El nombre completo es obligatorio.');
        return;
    }
    if (rutError) {
        setFormError('Corrija el RUT principal: ' + rutError);
        handleRutBlur('main');
        return;
    }
    if (tenantRutError) {
        setFormError('Corrija el RUT del arrendatario: ' + tenantRutError);
        handleRutBlur('tenant');
        return;
    }

    if (editingUser) {
      updateDirectoryUser(editingUser.id, userFormData);
      showFeedback('success', `Usuario "${userFormData.name}" actualizado.`);
    } else {
      // Creating a new user (any type)
      const { username, password } = authFormData;
      if (selectedProfile === 'resident' && (!username || !password)) {
        setFormError('El nombre de usuario y la contraseña son obligatorios para crear un nuevo residente.');
        return;
      }
      if (password && !validatePassword(password).isValid) {
        setFormError(validatePassword(password).message);
        return;
      }

      if (selectedProfile === 'resident') {
        const authResult = adminCreateAuthAccount(username, password, userFormData.email);
        if (authResult.success && authResult.user) {
          const finalUserData = { ...userFormData, authUserId: authResult.user.id };
          addDirectoryUser(finalUserData);
          showFeedback('success', `Usuario "${finalUserData.name}" (${finalUserData.role}) creado exitosamente.`);
        } else {
          setFormError(authResult.message);
          return;
        }
      } else { // Admin or Concierge
        if(username && password) {
            const authResult = adminCreateAuthAccount(username, password, userFormData.email);
            if (authResult.success && authResult.user) {
                const finalUserData = { ...userFormData, authUserId: authResult.user.id };
                addDirectoryUser(finalUserData);
                 showFeedback('success', `Usuario "${finalUserData.name}" (${finalUserData.role}) creado exitosamente.`);
            } else {
                setFormError(authResult.message);
                return;
            }
        } else {
            // Staff without auth account
            addDirectoryUser(userFormData);
            showFeedback('success', `Perfil de Staff "${userFormData.name}" creado sin cuenta de acceso.`);
        }
      }
    }

    loadData();
    resetModalState();
  };
  
   const handleDeleteUser = (userId: string, userName: string) => {
    if (window.confirm(`¿Está seguro de que desea eliminar a ${userName} del directorio? Esta acción no se puede deshacer.`)) {
      const updatedDirUsers = deleteDirectoryUser(userId);
      setDirectoryUsers(updatedDirUsers); 
      setAuthUsers(getAuthUsers()); 
      showFeedback('success', `Usuario ${userName} eliminado exitosamente.`);
    }
  };

  const handleApproveAccount = (authUserId: string) => {
    const result = approveUserAccount(authUserId);
    showFeedback(result.success ? 'success' : 'error', result.message);
    if (result.success) {
      loadData();
    }
  };

  const handleDisableAccount = (authUserId: string) => {
    const result = disableUserAccount(authUserId);
    showFeedback(result.success ? 'success' : 'error', result.message);
    if (result.success) {
      loadData();
    }
  };

  const getAuthDetails = useCallback((authUserId?: string) => {
    if (!authUserId) return null;
    return authUsers.find(au => au.id === authUserId);
  }, [authUsers]);


  const filteredDirectoryUsers = useMemo(() => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    if (!lowerSearchTerm) return directoryUsers;
    return directoryUsers.filter(user =>
      user.name.toLowerCase().includes(lowerSearchTerm) ||
      (user.idDocument && user.idDocument.toLowerCase().includes(lowerSearchTerm)) ||
      (user.apartment && user.apartment.toLowerCase().includes(lowerSearchTerm)) ||
      (user.role && user.role.toLowerCase().includes(lowerSearchTerm)) ||
      (user.workShift && user.workShift.toLowerCase().includes(lowerSearchTerm)) ||
      (user.email && user.email.toLowerCase().includes(lowerSearchTerm)) ||
      (getAuthDetails(user.authUserId)?.username.toLowerCase().includes(lowerSearchTerm)) 
    );
  }, [directoryUsers, searchTerm, getAuthDetails]);
  
  const renderPermissionsCheckboxes = (disabled: boolean) => (
    <div className="space-y-2 mt-3">
        <h4 className="text-sm font-medium text-slate-700">Permisos de Funcionalidad:</h4>
        <label className="flex items-center space-x-2">
            <input type="checkbox" name="authorizePeople" checked={userFormData.permissions.authorizePeople} onChange={handlePermissionChange} disabled={disabled} className="h-4 w-4 rounded" />
            <span className="text-sm">Autorizar Ingreso de Personas</span>
        </label>
         <label className="flex items-center space-x-2">
            <input type="checkbox" name="authorizeVehicles" checked={userFormData.permissions.authorizeVehicles} onChange={handlePermissionChange} disabled={disabled} className="h-4 w-4 rounded" />
            <span className="text-sm">Autorizar Ingreso de Vehículos</span>
        </label>
        <label className="flex items-center space-x-2">
            <input type="checkbox" name="sendNotifications" checked={userFormData.permissions.sendNotifications} onChange={handlePermissionChange} disabled={disabled} className="h-4 w-4 rounded" />
            <span className="text-sm">Enviar Notificaciones (Paquetes, Comida)</span>
        </label>
        <label className="flex items-center space-x-2">
            <input type="checkbox" name="manageDirectory" checked={userFormData.permissions.manageDirectory} onChange={handlePermissionChange} disabled={disabled} className="h-4 w-4 rounded" />
            <span className="text-sm">Administrar Directorio de Usuarios</span>
        </label>
    </div>
  );

  return (
    <>
    <div className="bg-white p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-full mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <div className="flex items-center space-x-3 mb-4 sm:mb-0">
          <AddressBookIcon className="w-8 h-8 text-cyan-600 flex-shrink-0" />
          <h2 className="text-3xl font-bold text-slate-800">Directorio de Usuarios</h2>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2.5 px-5 rounded-lg"
          >
            <UserPlusIcon className="mr-2 w-5 h-5" />
            Agregar Usuario
          </button>
        )}
      </div>

      {feedbackMessage && (
        <div className={`mb-4 p-3 rounded-md text-sm ${feedbackMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
          {feedbackMessage.text}
        </div>
      )}

      <div className="mb-4 relative">
        <input
          type="text"
          placeholder="Buscar en directorio..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg shadow-sm"/>
        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">Usuario</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">Depto/Est.</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rol</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">Contacto</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">Cuenta</th>
              {isSuperAdmin && <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">Acciones</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {filteredDirectoryUsers.length > 0 ? filteredDirectoryUsers.map(dirUser => {
              const authUser = getAuthDetails(dirUser.authUserId);

              const allParkingSpots = [
                ...(dirUser.unitParkingSpots || []),
                ...(dirUser.vehicles || []).map(v => v.parkingSpot).filter((p): p is string => !!p)
              ];
              const uniqueParkingSpots = [...new Set(allParkingSpots)];

              let accountStatusDisplay;
              if (authUser) {
                if (authUser.isApprovedByAdmin) {
                  accountStatusDisplay = <span className="flex items-center text-xs text-green-700"><CheckCircleIcon className="w-4 h-4 mr-1"/>Aprobada</span>;
                } else {
                  accountStatusDisplay = <span className="flex items-center text-xs text-amber-700"><ClockIcon className="w-4 h-4 mr-1"/>Pendiente</span>;
                }
              } else if (dirUser.authUserId) { 
                accountStatusDisplay = <span className="flex items-center text-xs text-red-700"><XCircleIcon className="w-4 h-4 mr-1"/>Error</span>;
              }
              else {
                accountStatusDisplay = <span className="text-xs text-slate-400">No Vinculada</span>;
              }

              return (
              <tr key={dirUser.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-3 py-3.5 whitespace-nowrap">
                  <div className="text-sm font-semibold text-slate-900">{dirUser.name}</div>
                  <div className="text-xs text-slate-500">{dirUser.idDocument || 'S/RUT'}</div>
                </td>
                <td className="px-3 py-3.5 whitespace-nowrap">
                  <div className="text-sm font-semibold text-slate-900">{dirUser.apartment || dirUser.workShift || <span className="text-slate-400">-</span>}</div>
                  {!dirUser.workShift && (
                    <div className="text-xs text-slate-500">
                      {uniqueParkingSpots.length > 0 ? uniqueParkingSpots.join(', ') : <span className="text-slate-400">S/Est.</span>}
                    </div>
                  )}
                </td>
                <td className="px-3 py-3.5 text-sm">{dirUser.role || '-'}</td>
                <td className="px-3 py-3.5 whitespace-nowrap">
                  {dirUser.phone && <div className="text-sm">{dirUser.phone}</div>}
                  {dirUser.email && <div className="text-xs truncate max-w-[120px]">{dirUser.email}</div>}
                </td>
                <td className="px-3 py-3.5 whitespace-nowrap">
                  <div className="text-sm">{authUser?.username || <span className="text-xs text-slate-400">N/A</span>}</div>
                  <div className="text-xs">{accountStatusDisplay}</div>
                </td>
                {isSuperAdmin && (
                  <td className="px-3 py-3.5 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-1">
                      <button onClick={() => handleOpenModal(dirUser)} className="text-cyan-600 p-1" title="Editar"><EditIcon className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteUser(dirUser.id, dirUser.name)} className="text-red-500 p-1" title="Eliminar"><TrashIcon className="w-4 h-4" /></button>
                      {authUser && (authUser.isApprovedByAdmin ? (
                        <button onClick={() => handleDisableAccount(authUser.id)} className="text-orange-500 p-1" title="Deshabilitar"><XCircleIcon className="w-4 h-4" /></button>
                      ) : (
                        <button onClick={() => handleApproveAccount(authUser.id)} className="text-green-500 p-1" title="Aprobar"><CheckCircleIcon className="w-4 h-4" /></button>
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            )
            }) : (
              <tr>
                <td colSpan={isSuperAdmin ? 6 : 5} className="px-4 py-10 text-center text-sm text-slate-500">
                  No se encontraron usuarios.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="text-2xl font-semibold text-slate-800">{editingUser ? 'Editar Usuario' : 'Agregar Nuevo Usuario'}</h3>
              <button onClick={resetModalState} className="text-slate-400 text-3xl">&times;</button>
            </div>
            
            {modalStep === 1 && (
                <div className="space-y-4">
                    <h4 className="text-lg font-medium text-center text-slate-700">Seleccione un tipo de perfil para crear:</h4>
                    <button onClick={() => handleProfileSelect('admin')} className="w-full text-left p-4 border rounded-lg hover:bg-slate-50">
                        <p className="font-semibold text-slate-800">Administrador</p>
                        <p className="text-sm text-slate-500">Acceso completo para gestionar la aplicación (no superusuario).</p>
                    </button>
                    <button onClick={() => handleProfileSelect('concierge')} className="w-full text-left p-4 border rounded-lg hover:bg-slate-50">
                        <p className="font-semibold text-slate-800">Conserje</p>
                        <p className="text-sm text-slate-500">Usuario para registrar y autorizar visitas, y enviar notificaciones.</p>
                    </button>
                    <button onClick={() => handleProfileSelect('resident')} className="w-full text-left p-4 border rounded-lg hover:bg-slate-50">
                        <p className="font-semibold text-slate-800">Residente</p>
                        <p className="text-sm text-slate-500">Perfil estándar para un propietario, arrendatario o habitante.</p>
                    </button>
                </div>
            )}
            
            {modalStep === 2 && (
                <form onSubmit={handleUserSubmit} className="space-y-6">
                    {formError && <p className="text-red-600 bg-red-100 p-2 rounded-md text-sm">{formError}</p>}
                    
                    <button type="button" onClick={() => editingUser ? resetModalState() : setModalStep(1)} className="text-sm text-cyan-600 hover:underline mb-2">&larr; Volver</button>

                    {(selectedProfile === 'admin' || selectedProfile === 'concierge') && (
                        <div className="space-y-4">
                            <fieldset className="border p-3 rounded-lg">
                                <legend className="px-2 font-semibold text-cyan-700">{selectedProfile === 'admin' ? 'Datos del Administrador' : 'Datos del Conserje'}</legend>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Nombre Completo <span className="text-red-500">*</span></label>
                                        <input type="text" name="name" value={userFormData.name} onChange={handleUserInputChange} required className="w-full p-2 border rounded-md"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">RUT (Opcional)</label>
                                        <input type="text" name="idDocument" value={userFormData.idDocument || ''} onChange={handleUserInputChange} className="w-full p-2 border rounded-md"/>
                                    </div>
                                    {selectedProfile === 'concierge' && (
                                         <div>
                                            <label className="block text-sm font-medium mb-1">Turno de Trabajo</label>
                                            <input type="text" name="workShift" value={userFormData.workShift || ''} onChange={handleUserInputChange} placeholder="Ej: Turno Día, L-V 9-18" className="w-full p-2 border rounded-md"/>
                                        </div>
                                    )}
                                </div>
                            </fieldset>
                            {!editingUser && (
                               <fieldset className="border p-3 rounded-lg">
                                    <legend className="px-2 font-semibold text-cyan-700">Cuenta de Acceso</legend>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Nombre de Usuario <span className="text-red-500">*</span></label>
                                            <input type="text" name="username" value={authFormData.username} onChange={handleAuthInputChange} required className="w-full p-2 border rounded-md"/>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Contraseña <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <input type={showPassword ? 'text' : 'password'} name="password" value={authFormData.password} onChange={handleAuthInputChange} required className="w-full p-2 border rounded-md pr-10"/>
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-500">{showPassword ? <EyeSlashIcon/> : <EyeIcon/>}</button>
                                            </div>
                                        </div>
                                    </div>
                                    <PasswordStrengthIndicator password={authFormData.password} />
                                </fieldset>
                            )}
                             <fieldset className="border p-3 rounded-lg">
                                <legend className="px-2 font-semibold text-cyan-700">Permisos</legend>
                                {renderPermissionsCheckboxes(selectedProfile === 'admin' || !!editingUser?.authUserId)}
                            </fieldset>
                        </div>
                    )}

                    {selectedProfile === 'resident' && (
                        <div className="space-y-4">
                           <fieldset className="border p-3 rounded-lg">
                                <legend className="px-2 font-semibold text-cyan-700">Datos del Residente</legend>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                    <div><label className="block text-sm font-medium mb-1">Nombre Completo <span className="text-red-500">*</span></label><input type="text" name="name" value={userFormData.name} onChange={handleUserInputChange} required className="w-full p-2 border rounded-md"/></div>
                                    <div><label className="block text-sm font-medium mb-1">RUT</label><input type="text" name="idDocument" value={userFormData.idDocument} onBlur={() => handleRutBlur('main')} onChange={handleUserInputChange} className={`w-full p-2 border rounded-md ${rutError ? 'border-red-500' : ''}`}/>{rutError && <p className="text-xs text-red-500 mt-1">{rutError}</p>}</div>
                                    <div><label className="block text-sm font-medium mb-1">Apartamento/Unidad</label><input type="text" name="apartment" value={userFormData.apartment} onChange={handleUserInputChange} className="w-full p-2 border rounded-md"/></div>
                                    <div><label className="block text-sm font-medium mb-1">Teléfono</label><input type="tel" name="phone" value={userFormData.phone} onChange={handleUserInputChange} onBlur={(e) => setUserFormData(prev => ({...prev, phone: formatPhoneNumber(e.target.value)}))} className="w-full p-2 border rounded-md"/></div>
                                    <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" name="email" value={userFormData.email} onChange={handleUserInputChange} className="w-full p-2 border rounded-md"/></div>
                                    <div><label className="block text-sm font-medium mb-1">Rol</label><select name="role" value={userFormData.role} onChange={handleUserInputChange} className="w-full p-2 border rounded-md bg-white">{RESIDENT_ROLES_OPTIONS.map(o=><option key={o} value={o}>{o || 'Seleccione...'}</option>)}</select></div>
                                </div>
                            </fieldset>
                            {!editingUser && (
                                <fieldset className="border p-3 rounded-lg">
                                    <legend className="px-2 font-semibold text-cyan-700">Cuenta de Acceso</legend>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Nombre de Usuario <span className="text-red-500">*</span></label>
                                            <input type="text" name="username" value={authFormData.username} onChange={handleAuthInputChange} required className="w-full p-2 border rounded-md"/>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Contraseña <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <input type={showPassword ? 'text' : 'password'} name="password" value={authFormData.password} onChange={handleAuthInputChange} required className="w-full p-2 border rounded-md pr-10"/>
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-500">{showPassword ? <EyeSlashIcon/> : <EyeIcon/>}</button>
                                            </div>
                                        </div>
                                    </div>
                                    <PasswordStrengthIndicator password={authFormData.password} />
                                </fieldset>
                            )}
                            {userFormData.role === 'Propietario' && <div className="p-3 border rounded-lg"><label className="flex items-center gap-2"><input type="checkbox" checked={hasTenant} onChange={handleToggleTenant} className="h-4 w-4" /> <span>Registrar Arrendatario para esta unidad</span></label>
                                {hasTenant && <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-3">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Nombre Arrendatario</label>
                                        <input name="name" value={userFormData.tenant?.name || ''} onChange={handleTenantChange} placeholder="Nombre Completo" className="w-full p-2 border rounded-md"/>
                                    </div>
                                     <div>
                                        <label className="block text-sm font-medium mb-1">RUT Arrendatario</label>
                                        <input name="idDocument" value={userFormData.tenant?.idDocument || ''} onChange={handleTenantChange} onBlur={() => handleRutBlur('tenant')} placeholder="RUT" className={`w-full p-2 border rounded-md ${tenantRutError ? 'border-red-500' : ''}`}/>
                                        {tenantRutError && <p className="text-xs text-red-500 mt-1">{tenantRutError}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Teléfono Arrendatario</label>
                                        <input name="phone" value={userFormData.tenant?.phone || ''} onChange={handleTenantChange} onBlur={handleTenantPhoneBlur} placeholder="Teléfono" className="w-full p-2 border rounded-md"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Email Arrendatario</label>
                                        <input name="email" type="email" value={userFormData.tenant?.email || ''} onChange={handleTenantChange} placeholder="Email" className="w-full p-2 border rounded-md"/>
                                    </div>
                                </div>}
                            </div>}
                            <fieldset className="border p-3 rounded-lg"><legend className="px-2 font-semibold">Vehículos</legend><div className="flex gap-2 items-end"><input value={vehicleFormData.licensePlate} onChange={e => setVehicleFormData({...vehicleFormData, licensePlate: e.target.value.toUpperCase()})} placeholder="Placa" className="p-2 border rounded w-1/3"/><input value={vehicleFormData.parkingSpot} onChange={e => setVehicleFormData({...vehicleFormData, parkingSpot: e.target.value})} placeholder="Estacionamiento" className="p-2 border rounded w-1/3"/><button type="button" onClick={handleAddVehicle} className="px-3 py-2 bg-blue-500 text-white rounded">Agregar</button></div>
                                <ul className="mt-2 space-y-1">{userFormData.vehicles.map(v => <li key={v.id} className="flex justify-between items-center text-sm p-1 bg-slate-50 rounded"><span>{v.licensePlate} {v.parkingSpot && `(${v.parkingSpot})`}</span><button type="button" onClick={()=>handleRemoveVehicle(v.id)} className="text-red-500"><TrashIcon className="w-4 h-4"/></button></li>)}</ul>
                            </fieldset>
                            <fieldset className="border p-3 rounded-lg"><legend className="px-2 font-semibold">Estacionamientos de la Unidad</legend><div className="flex gap-2 items-end"><input value={unitParkingSpotInput} onChange={e => setUnitParkingSpotInput(e.target.value)} placeholder="Ej: E-101" className="p-2 border rounded flex-grow"/><button type="button" onClick={handleAddParkingSpot} className="px-3 py-2 bg-blue-500 text-white rounded">Agregar</button></div>
                                <ul className="mt-2 space-y-1">{userFormData.unitParkingSpots?.map(s => <li key={s} className="flex justify-between items-center text-sm p-1 bg-slate-50 rounded"><span>{s}</span><button type="button" onClick={()=>handleRemoveParkingSpot(s)} className="text-red-500"><TrashIcon className="w-4 h-4"/></button></li>)}</ul>
                            </fieldset>
                        </div>
                    )}

                    <div className="flex justify-end space-x-3 pt-4 border-t">
                        <button type="button" onClick={resetModalState} className="px-4 py-2 bg-slate-100 rounded-lg">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-cyan-600 text-white rounded-lg">
                            {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                        </button>
                    </div>
                </form>
            )}
          </div>
        </div>
      )}
    </div>
    <RutErrorModal
        isOpen={isRutModalOpen}
        onClose={() => setIsRutModalOpen(false)}
        message={rutModalMessage}
    />
    </>
  );
};

export default UserDirectoryScreen;