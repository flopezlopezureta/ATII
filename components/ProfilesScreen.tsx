

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DirectoryUser, User as AuthUserType, UserPermissions } from '../types.ts';
import { getDirectoryUsers, addDirectoryUser, updateDirectoryUser, defaultPermissions } from '../services/directoryService.ts';
import { adminCreateAuthAccount, adminUpdateUserPassword, validatePassword } from '../services/authService.ts';
import { getRolePermissions, saveRolePermissions } from '../services/roleService.ts';
import ShieldCheckIcon from './icons/ShieldCheckIcon.tsx';
import UserPlusIcon from './icons/UserPlusIcon.tsx';
import EditIcon from './icons/EditIcon.tsx';
import EyeIcon from './icons/EyeIcon.tsx';
import EyeSlashIcon from './icons/EyeSlashIcon.tsx';
import ClipboardDocumentCheckIcon from './icons/ClipboardDocumentCheckIcon.tsx';
import UserIcon from './icons/UserIcon.tsx';
import UsersIcon from './icons/UsersIcon.tsx';
import PasswordStrengthIndicator from './PasswordStrengthIndicator.tsx';

type ProfileType = 'admin' | 'concierge' | 'mayordomo';

const initialUserFormState: Partial<DirectoryUser> & { username?: string; password?: string } = {
  name: '',
  role: 'Conserje',
  workShift: '',
  permissions: { authorizePeople: true, authorizeVehicles: true, sendNotifications: true, manageDirectory: false, authorizeInvitations: true },
  username: '',
  password: '',
  vehicles: [],
  occupants: [],
};

const RESIDENT_ROLES = ["Propietario", "Arrendatario", "Habitante", "Familiar", "Comité"];

interface ProfilesScreenProps {
  onUsersUpdated: () => void;
}

const ProfilesScreen: React.FC<ProfilesScreenProps> = ({ onUsersUpdated }) => {
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<DirectoryUser | null>(null);
  const [formData, setFormData] = useState(initialUserFormState);
  const [selectedProfileType, setSelectedProfileType] = useState<ProfileType>('concierge');
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // State for resident role permissions
  const [rolePermissions, setRolePermissions] = useState<Record<string, UserPermissions>>({});
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<{ name: string; permissions: UserPermissions } | null>(null);

  useEffect(() => {
    setUsers(getDirectoryUsers());
    setRolePermissions(getRolePermissions());
  }, []);

  const showLocalFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  // --- Staff Modal Logic ---
  const handleOpenStaffModal = (user: DirectoryUser | null = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        ...user,
        username: '',
        password: '',
      });
      const role = user.role?.toLowerCase();
      if (role === 'administrador') setSelectedProfileType('admin');
      else if (role === 'mayordomo') setSelectedProfileType('mayordomo');
      else setSelectedProfileType('concierge');
    } else {
      setEditingUser(null);
      const initialType = 'concierge';
      setSelectedProfileType(initialType);
      const initialPermissions = { authorizePeople: true, authorizeVehicles: true, sendNotifications: true, manageDirectory: false, authorizeInvitations: true };
      const initialRole = 'Conserje';
      setFormData({
        ...initialUserFormState,
        permissions: initialPermissions,
        role: initialRole,
      });
    }
    setIsStaffModalOpen(true);
  };

  const closeStaffModal = () => {
    setIsStaffModalOpen(false);
    setEditingUser(null);
    setFormData(initialUserFormState);
  };
  
  // --- Resident Role Modal Logic ---
  const handleOpenRoleModal = (roleName: string) => {
    const permissions = rolePermissions[roleName] || defaultPermissions;
    setEditingRole({ name: roleName, permissions: { ...permissions } });
    setIsRoleModalOpen(true);
  };

  const closeRoleModal = () => {
    setIsRoleModalOpen(false);
    setEditingRole(null);
  };

  // --- Handlers ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePermissionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      permissions: { ...(prev.permissions || defaultPermissions), [name]: checked },
    }));
  };
  
  const handleRolePermissionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingRole) return;
    const { name, checked } = e.target;
    setEditingRole(prev => prev ? ({ ...prev, permissions: { ...prev.permissions, [name]: checked }}) : null);
  };
  
  const handleProfileTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value as ProfileType;
    setSelectedProfileType(type);

    let permissions: UserPermissions;
    let role: string;

    if (type === 'admin') {
      permissions = { authorizePeople: true, authorizeVehicles: true, sendNotifications: true, manageDirectory: true, authorizeInvitations: true };
      role = 'Administrador';
    } else if (type === 'mayordomo') {
      permissions = { authorizePeople: true, authorizeVehicles: true, sendNotifications: true, manageDirectory: false, authorizeInvitations: true };
      role = 'Mayordomo';
    } else { // concierge
      permissions = { authorizePeople: true, authorizeVehicles: true, sendNotifications: true, manageDirectory: false, authorizeInvitations: true };
      role = 'Conserje';
    }
    setFormData(prev => ({ ...prev, role, permissions }));
  };
  
  const handleStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!formData.name?.trim()) {
      showLocalFeedback('error', 'El Nombre Completo es obligatorio.');
      return;
    }

    if (editingUser) {
      if (formData.password) {
        if (!validatePassword(formData.password).isValid) {
          showLocalFeedback('error', `Contraseña inválida: ${validatePassword(formData.password).message}`);
          return;
        }
        if (editingUser.authUserId) adminUpdateUserPassword(editingUser.authUserId, formData.password);
        else {
          showLocalFeedback('error', 'Este perfil no tiene una cuenta de acceso para actualizar la contraseña.');
          return;
        }
      }
      const { username, password, ...dirUpdates } = formData;
      updateDirectoryUser(editingUser.id, dirUpdates);
      showLocalFeedback('success', `Perfil de ${editingUser.name} actualizado.`);
    } else {
      if (!formData.username || !formData.password || !validatePassword(formData.password).isValid) {
        showLocalFeedback('error', 'Nombre de usuario y contraseña válida son obligatorios.');
        return;
      }
      const authResult = adminCreateAuthAccount(formData.username, formData.password, formData.email);
      if (authResult.success && authResult.user) {
        addDirectoryUser({
            ...formData,
            name: formData.name!,
            authUserId: authResult.user.id,
            role: formData.role!,
            permissions: formData.permissions!,
            vehicles: [],
            occupants: []
        });
        showLocalFeedback('success', `Perfil de ${formData.role} "${formData.name}" creado.`);
      } else {
        showLocalFeedback('error', authResult.message);
        return;
      }
    }
    setUsers(getDirectoryUsers());
    onUsersUpdated();
    closeStaffModal();
  };
  
  const handleSaveRolePermissions = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    saveRolePermissions(editingRole.name, editingRole.permissions);
    setRolePermissions(getRolePermissions());
    showLocalFeedback('success', `Permisos para el rol "${editingRole.name}" guardados.`);
    closeRoleModal();
  };


  const staffUsers = useMemo(() => {
    const admins = users.filter(u => u.role === 'Administrador');
    const concierges = users.filter(u => u.role === 'Conserje');
    const mayordomos = users.filter(u => u.role === 'Mayordomo');
    return { admins, concierges, mayordomos };
  }, [users]);

  const StaffProfileList: React.FC<{ title: string, users: DirectoryUser[], icon: React.ReactNode }> = ({ title, users, icon }) => (
    <div>
      <h3 className="text-xl font-semibold text-slate-700 mb-3 flex items-center gap-2">{icon} {title} ({users.length})</h3>
      {users.length > 0 ? (
        <ul className="space-y-2">
          {users.map(user => (
            <li key={user.id} className="bg-slate-50 p-3 rounded-lg flex justify-between items-center">
              <div>
                <p className="font-bold text-slate-800">{user.name}</p>
                <p className="text-sm text-slate-500">{user.workShift || 'Sin turno especificado'}</p>
              </div>
              <button onClick={() => handleOpenStaffModal(user)} className="text-cyan-600 hover:text-cyan-800 p-1"><EditIcon className="w-5 h-5" /></button>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-md">No hay perfiles de {title.toLowerCase()} creados.</p>}
    </div>
  );

  return (
    <>
      <div className="bg-white p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
          <div className="flex items-center space-x-3 mb-4 sm:mb-0">
            <ShieldCheckIcon className="w-8 h-8 text-cyan-600" />
            <h2 className="text-3xl font-bold text-slate-800">Gestión de Perfiles</h2>
          </div>
          <button onClick={() => handleOpenStaffModal()} className="w-full sm:w-auto flex items-center justify-center bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2.5 px-5 rounded-lg">
            <UserPlusIcon className="mr-2 w-5 h-5" />
            Crear Perfil de Staff
          </button>
        </div>
        {feedback && <div className={`mb-4 p-3 rounded-md text-sm ${feedback.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{feedback.text}</div>}
        
        <div className="space-y-6">
          <StaffProfileList title="Administradores" users={staffUsers.admins} icon={<ShieldCheckIcon className="w-6 h-6" />} />
          <StaffProfileList title="Conserjes" users={staffUsers.concierges} icon={<UserIcon className="w-6 h-6" />} />
          <StaffProfileList title="Mayordomos" users={staffUsers.mayordomos} icon={<ClipboardDocumentCheckIcon className="w-6 h-6" />} />
        </div>
        
        <div className="mt-8 pt-6 border-t border-slate-200">
            <h3 className="text-xl font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <UsersIcon className="w-6 h-6"/> Perfiles de Residentes
            </h3>
            <p className="text-sm text-slate-500 mb-4">Define los permisos por defecto para cada tipo de residente. Estos se asignarán a los nuevos usuarios con ese rol y a los existentes que no tengan permisos definidos.</p>
            <ul className="space-y-2">
                {RESIDENT_ROLES.map(role => (
                    <li key={role} className="bg-slate-50 p-3 rounded-lg flex justify-between items-center">
                        <p className="font-bold text-slate-800">{role}</p>
                        <button onClick={() => handleOpenRoleModal(role)} className="text-cyan-600 hover:text-cyan-800 p-1 flex items-center text-sm font-medium">
                            <EditIcon className="w-4 h-4 mr-1"/> Editar Permisos
                        </button>
                    </li>
                ))}
            </ul>
        </div>

      </div>

      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
          <form onSubmit={handleStaffSubmit} className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-semibold mb-4">{editingUser ? 'Editar' : 'Crear'} Perfil de Staff</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo de Perfil</label>
                <select name="profileType" value={selectedProfileType} onChange={handleProfileTypeChange} disabled={!!editingUser} className="w-full p-2 border rounded-md bg-white disabled:bg-slate-100">
                  <option value="concierge">Conserje</option>
                  <option value="mayordomo">Mayordomo</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <input type="hidden" name="role" value={formData.role} />
              <div>
                <label className="block text-sm font-medium mb-1">Nombre Completo <span className="text-red-500">*</span></label>
                <input type="text" name="name" value={formData.name || ''} onChange={handleChange} required className="w-full p-2 border rounded-md"/>
              </div>
               {(selectedProfileType === 'concierge' || selectedProfileType === 'mayordomo') && (
                 <div>
                  <label className="block text-sm font-medium mb-1">Turno de Trabajo</label>
                  <input type="text" name="workShift" value={formData.workShift || ''} onChange={handleChange} placeholder="Ej: Turno Día, L-V 9-18" className="w-full p-2 border rounded-md"/>
                </div>
              )}
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre de Usuario <span className="text-red-500">*</span></label>
                  <input type="text" name="username" value={formData.username || ''} onChange={handleChange} required className="w-full p-2 border rounded-md"/>
                </div>
              )}
               <div>
                  <label className="block text-sm font-medium mb-1">{editingUser ? 'Nueva Contraseña (opcional)' : 'Contraseña *'}</label>
                  <div className="relative"><input type={showPassword ? 'text' : 'password'} name="password" value={formData.password || ''} onChange={handleChange} required={!editingUser} className="w-full p-2 border rounded-md pr-10"/><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center">{showPassword ? <EyeSlashIcon/> : <EyeIcon/>}</button></div>
                  {(formData.password || !editingUser) && <PasswordStrengthIndicator password={formData.password || ''} />}
              </div>
              <fieldset><legend className="block text-sm font-medium mb-1">Permisos</legend>
              <div className="space-y-2 p-3 border rounded-md bg-slate-50">
                <label className="flex items-center"><input type="checkbox" name="authorizePeople" checked={formData.permissions?.authorizePeople} onChange={handlePermissionChange} className="h-4 w-4 rounded" /><span className="ml-2 text-sm">Autorizar Ingreso de Personas</span></label>
                <label className="flex items-center"><input type="checkbox" name="authorizeVehicles" checked={formData.permissions?.authorizeVehicles} onChange={handlePermissionChange} className="h-4 w-4 rounded" /><span className="ml-2 text-sm">Autorizar Ingreso de Vehículos</span></label>
                <label className="flex items-center"><input type="checkbox" name="authorizeInvitations" checked={formData.permissions?.authorizeInvitations} onChange={handlePermissionChange} className="h-4 w-4 rounded" /><span className="ml-2 text-sm">Autorizar Invitaciones de Usuarios (Ver lista)</span></label>
                <label className="flex items-center"><input type="checkbox" name="sendNotifications" checked={formData.permissions?.sendNotifications} onChange={handlePermissionChange} className="h-4 w-4 rounded" /><span className="ml-2 text-sm">Enviar Notificaciones</span></label>
                <label className="flex items-center"><input type="checkbox" name="manageDirectory" checked={formData.permissions?.manageDirectory} onChange={handlePermissionChange} className="h-4 w-4 rounded" /><span className="ml-2 text-sm">Gestionar Perfiles y Directorio</span></label>
              </div></fieldset>
            </div>
            <div className="flex justify-end space-x-3 pt-5 mt-5 border-t"><button type="button" onClick={closeStaffModal} className="px-4 py-2 bg-slate-100 rounded-lg">Cancelar</button><button type="submit" className="px-4 py-2 bg-cyan-600 text-white rounded-lg">{editingUser ? 'Guardar Cambios' : 'Crear Perfil'}</button></div>
          </form>
        </div>
      )}

      {isRoleModalOpen && editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
          <form onSubmit={handleSaveRolePermissions} className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg">
            <h3 className="text-2xl font-semibold mb-1">Editar Permisos para "{editingRole.name}"</h3>
            <p className="text-sm text-slate-500 mb-4">Estos permisos se aplicarán por defecto a los nuevos usuarios con este rol.</p>
            <fieldset>
                <legend className="sr-only">Permisos</legend>
                <div className="space-y-2 p-3 border rounded-md bg-slate-50">
                    <label className="flex items-center">
                        <input type="checkbox" name="authorizePeople" checked={editingRole.permissions.authorizePeople} onChange={handleRolePermissionChange} className="h-4 w-4 rounded" />
                        <span className="ml-2 text-sm">Puede registrar visitas (personas)</span>
                    </label>
                     <label className="flex items-center">
                        <input type="checkbox" name="authorizeVehicles" checked={editingRole.permissions.authorizeVehicles} onChange={handleRolePermissionChange} className="h-4 w-4 rounded" />
                        <span className="ml-2 text-sm">Puede registrar visitas (vehículos)</span>
                    </label>
                    <p className="text-xs text-slate-500 pt-2">Los usuarios siempre podrán generar invitaciones para sus visitas. Estos permisos otorgan acceso a los formularios de registro directo.</p>
                </div>
            </fieldset>
            <div className="flex justify-end space-x-3 pt-5 mt-5 border-t">
              <button type="button" onClick={closeRoleModal} className="px-4 py-2 bg-slate-100 rounded-lg">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-cyan-600 text-white rounded-lg">Guardar Permisos</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default ProfilesScreen;