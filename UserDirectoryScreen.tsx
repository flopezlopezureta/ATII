
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DirectoryUser, DirectoryVehicle, TenantDetails, OccupantDetails, User as AuthUserType, UserPermissions } from '../types.ts';
import { getDirectoryUsers, addDirectoryUser, updateDirectoryUser, deleteDirectoryUser, defaultPermissions } from '../services/directoryService.ts';
import { 
    getUsers as getAuthUsers, 
    approveUserAccount, 
    disableUserAccount, 
    getCurrentUser, 
    SUPERUSER_ID_FOR_SESSION,
} from '../services/authService.ts';
import { validateRUT, formatRUT, cleanRUT } from '../services/validationService.ts';
import AddressBookIcon from './icons/AddressBookIcon.tsx';
import UserPlusIcon from './icons/UserPlusIcon.tsx';
import EditIcon from './icons/EditIcon.tsx';
import TrashIcon from './icons/TrashIcon.tsx';
import SearchIcon from './icons/SearchIcon.tsx';
import CheckCircleIcon from './icons/CheckCircleIcon.tsx';
import ClockIcon from './icons/ClockIcon.tsx';
import XCircleIcon from './icons/XCircleIcon.tsx';


const initialUserFormState: Omit<DirectoryUser, 'id' | 'createdAt' | 'updatedAt' | 'permissions'> = {
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
  workShift: undefined,
};

const RESIDENT_ROLES_OPTIONS = ["", "Propietario", "Arrendatario", "Habitante", "Familiar", "Comité", "Otro"];


const UserDirectoryScreen: React.FC = () => {
  const [directoryUsers, setDirectoryUsers] = useState<DirectoryUser[]>([]);
  const [authUsers, setAuthUsers] = useState<AuthUserType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<DirectoryUser | null>(null);
  
  const [userFormData, setUserFormData] = useState<Omit<DirectoryUser, 'id' | 'createdAt' | 'updatedAt' | 'permissions'>>(initialUserFormState);
  
  // Error and feedback states
  const [formError, setFormError] = useState('');
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
      setUserFormData(initialUserFormState);
      setFormError('');
  };

  const handleOpenModal = (userToEdit: DirectoryUser | null = null) => {
    if (userToEdit) {
      setEditingUser(userToEdit);
      const formDataFromUser = JSON.parse(JSON.stringify(userToEdit));
      setUserFormData(formDataFromUser);
    } else {
      setEditingUser(null);
      setUserFormData(initialUserFormState);
    }
    setFormError('');
    setIsModalOpen(true);
  };


  const handleUserInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setUserFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!userFormData.name.trim()) {
        setFormError('El nombre completo es obligatorio.');
        return;
    }
    
    // This form now only handles residents, so permissions are default.
    const dataToSave = { ...userFormData, permissions: defaultPermissions };

    if (editingUser) {
        // We only update non-permission fields from this simplified form.
        const { permissions, ...restOfData } = dataToSave;
        updateDirectoryUser(editingUser.id, restOfData);
        showFeedback('success', `Residente "${userFormData.name}" actualizado.`);
    } else { 
        addDirectoryUser(dataToSave);
        showFeedback('success', `Residente "${userFormData.name}" agregado exitosamente.`);
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
  

  return (
    <>
    <div className="bg-white p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-full mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <div className="flex items-center space-x-3 mb-4 sm:mb-0">
          <AddressBookIcon className="w-8 h-8 text-cyan-600 flex-shrink-0" />
          <h2 className="text-3xl font-bold text-slate-800">Directorio de Residentes</h2>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2.5 px-5 rounded-lg"
          >
            <UserPlusIcon className="mr-2 w-5 h-5" />
            Agregar Residente
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
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">Apto/Turno</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rol</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">Contacto</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">Cuenta</th>
              {isSuperAdmin && <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">Acciones</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {filteredDirectoryUsers.length > 0 ? filteredDirectoryUsers.map(dirUser => {
              const authUser = getAuthDetails(dirUser.authUserId);
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
                <td className="px-3 py-3.5 text-sm">{dirUser.apartment || dirUser.workShift || '-'}</td>
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
              <h3 className="text-2xl font-semibold text-slate-800">{editingUser ? 'Editar Residente' : 'Agregar Nuevo Residente'}</h3>
              <button onClick={resetModalState} className="text-slate-400 text-3xl">&times;</button>
            </div>
            
              <form onSubmit={handleUserSubmit} className="space-y-6">
                  {formError && <p className="text-red-600 bg-red-100 p-2 rounded-md text-sm">{formError}</p>}
                  
                   <fieldset className="border p-3 rounded-lg">
                      <legend className="px-2 font-semibold text-cyan-700">Datos del Residente</legend>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          <div>
                              <label className="block text-sm font-medium mb-1">Nombre Completo <span className="text-red-500">*</span></label>
                              <input type="text" name="name" value={userFormData.name} onChange={handleUserInputChange} required className="w-full p-2 border rounded-md"/>
                          </div>
                          <div>
                              <label className="block text-sm font-medium mb-1">RUT (Opcional)</label>
                              <input type="text" name="idDocument" value={userFormData.idDocument || ''} onChange={handleUserInputChange} className="w-full p-2 border rounded-md"/>
                          </div>
                          <div>
                              <label className="block text-sm font-medium mb-1">Apartamento</label>
                              <input type="text" name="apartment" value={userFormData.apartment || ''} onChange={handleUserInputChange} className="w-full p-2 border rounded-md"/>
                          </div>
                          <div>
                              <label className="block text-sm font-medium mb-1">Teléfono</label>
                              <input type="text" name="phone" value={userFormData.phone || ''} onChange={handleUserInputChange} className="w-full p-2 border rounded-md"/>
                          </div>
                          <div>
                              <label className="block text-sm font-medium mb-1">Email</label>
                              <input type="email" name="email" value={userFormData.email || ''} onChange={handleUserInputChange} className="w-full p-2 border rounded-md"/>
                          </div>
                           <div>
                              <label className="block text-sm font-medium mb-1">Rol</label>
                               <select name="role" value={userFormData.role} onChange={handleUserInputChange} className="w-full p-2 border rounded-md bg-white">
                                  {RESIDENT_ROLES_OPTIONS.map(o => <option key={o} value={o}>{o || 'Seleccione...'}</option>)}
                               </select>
                          </div>
                      </div>
                  </fieldset>
                 
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                      <button type="button" onClick={resetModalState} className="px-4 py-2 bg-slate-100 rounded-lg">Cancelar</button>
                      <button type="submit" className="px-4 py-2 bg-cyan-600 text-white rounded-lg">
                          {editingUser ? 'Guardar Cambios' : 'Crear Residente'}
                      </button>
                  </div>
              </form>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default UserDirectoryScreen;
