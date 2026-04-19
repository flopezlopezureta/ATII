import { User, DirectoryUser, SessionUser } from '../types.ts';
import { addDirectoryUser as addDirectoryUserProfile, findDirectoryUserByAuthId } from './directoryService.ts';
import { sendWhatsappAccountApproval } from './notificationService.ts';

const USERS_STORAGE_KEY = 'condominiumAppUsers';
const CURRENT_USER_SESSION_KEY = 'condominiumAppCurrentUser';
const SUPERUSER_CREDENTIALS_KEY = 'condominiumSuperuserCredentials';
export const SUPERUSER_ID_FOR_SESSION = 'superuser-active-id';

const DEFAULT_SUPERUSER_USERNAME = "admin";
const DEFAULT_SUPERUSER_PASSWORD = "Dan15223."; // Contraseña por defecto

// --- Helper Functions ---
export const getUsers = (): User[] => { // Exported to be used in UserDirectoryScreen
  const usersJson = localStorage.getItem(USERS_STORAGE_KEY);
  return usersJson ? JSON.parse(usersJson) : [];
};

const saveUsers = (users: User[]): void => {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
};

// simulateSendEmail ahora puede manejar más tipos
export const simulateSendEmail = (
    to: string, 
    subject: string, 
    body: string, 
    type: 'welcome' | 'password_reset' | 'password_changed' | 'account_approved' | 'account_disabled' | 'account_pending_approval'
): void => {
  const emailContent = `
    --- SIMULACIÓN DE CORREO (${type}) ---
    Para: ${to}
    Asunto: ${subject}
    Cuerpo:
    ${body}
    ---------------------------------
  `;
  console.log(emailContent);
  alert(`SIMULACIÓN DE CORREO (${type}):\n\nAsunto: ${subject}\n\n${body}\n\n(Revisa la consola para ver el contenido completo del correo simulado)`);
};

export const validatePassword = (password: string): { isValid: boolean; message: string } => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
        return { isValid: false, message: 'La contraseña debe tener al menos 8 caracteres.' };
    }
    if (!hasUpperCase) {
        return { isValid: false, message: 'La contraseña debe contener al menos una letra mayúscula.' };
    }
    if (!hasLowerCase) {
        return { isValid: false, message: 'La contraseña debe contener al menos una letra minúscula.' };
    }
    if (!hasNumber) {
        return { isValid: false, message: 'La contraseña debe contener al menos un número.' };
    }
    if (!hasSymbol) {
        return { isValid: false, message: 'La contraseña debe contener al menos un símbolo (ej: !@#$%).' };
    }
    return { isValid: true, message: 'La contraseña es válida.' };
};


// --- Core Authentication Logic ---

export const isSuperuserConfigured = (): boolean => {
  // Forzamos a que siempre esté configurado para evitar la pantalla de setup inicial
  // y usar las credenciales por defecto. El primer login las guardará en localStorage.
  return true;
};

export const getSuperuserCredentials = (): { username: string; passwordHash: string } | null => {
  const storedCredsJson = localStorage.getItem(SUPERUSER_CREDENTIALS_KEY);
  if (storedCredsJson) {
      return JSON.parse(storedCredsJson);
  }
  // Fallback for first run or if creds are not stored
  const defaultCreds = { username: DEFAULT_SUPERUSER_USERNAME, passwordHash: DEFAULT_SUPERUSER_PASSWORD };
  localStorage.setItem(SUPERUSER_CREDENTIALS_KEY, JSON.stringify(defaultCreds));
  return defaultCreds;
};

export const setSuperuserCredentials = (username: string, passwordAttempt: string): { success: boolean; message: string } => {
  const trimmedUsername = username.trim();
  const trimmedPassword = passwordAttempt.trim();
  if (!trimmedUsername || !trimmedPassword) {
    return { success: false, message: 'El nombre de superusuario y la contraseña no pueden estar vacíos.' };
  }
  const passwordValidation = validatePassword(trimmedPassword);
    if (!passwordValidation.isValid) {
        return { success: false, message: `Contraseña de superusuario inválida: ${passwordValidation.message}` };
    }
  const newCreds = { username: trimmedUsername, passwordHash: trimmedPassword };
  localStorage.setItem(SUPERUSER_CREDENTIALS_KEY, JSON.stringify(newCreds));
  return { success: true, message: 'Superusuario configurado exitosamente.' };
};

export const changeSuperuserPassword = (username: string, currentPasswordAttempt: string, newPasswordAttempt: string): { success: boolean; message: string } => {
    const creds = getSuperuserCredentials();
    if (!creds || creds.username.toLowerCase() !== username.toLowerCase()) {
        return { success: false, message: 'Nombre de usuario no coincide con el superusuario actual.' };
    }
    if (creds.passwordHash !== currentPasswordAttempt) {
        return { success: false, message: 'La contraseña actual es incorrecta.' };
    }
    const passwordValidation = validatePassword(newPasswordAttempt);
    if (!passwordValidation.isValid) {
        return { success: false, message: `Nueva contraseña inválida: ${passwordValidation.message}` };
    }
    
    const newCreds = { username: creds.username, passwordHash: newPasswordAttempt };
    localStorage.setItem(SUPERUSER_CREDENTIALS_KEY, JSON.stringify(newCreds));

    return { success: true, message: 'Contraseña de superusuario actualizada exitosamente.' };
};

export const adminUpdateUserPassword = (authUserId: string, newPasswordAttempt: string): { success: boolean, message: string } => {
    const passwordValidation = validatePassword(newPasswordAttempt);
    if (!passwordValidation.isValid) {
        return { success: false, message: `Nueva contraseña inválida: ${passwordValidation.message}` };
    }
    
    let users = getUsers();
    const userIndex = users.findIndex(u => u.id === authUserId);
    if (userIndex === -1) {
        return { success: false, message: "Usuario no encontrado para actualizar contraseña." };
    }

    users[userIndex].passwordHash = newPasswordAttempt;
    saveUsers(users);
    return { success: true, message: "Contraseña actualizada exitosamente." };
};


export const adminCreateAuthAccount = (username: string, passwordAttempt: string, email?: string): { success: boolean, message: string, user?: User } => {
  const trimmedUsername = username.trim();
  if (!trimmedUsername || !passwordAttempt) {
    return { success: false, message: "Nombre de usuario y contraseña son obligatorios." };
  }
  const superuserCreds = getSuperuserCredentials();
  if (superuserCreds && trimmedUsername.toLowerCase() === superuserCreds.username.toLowerCase()) {
    return { success: false, message: 'Este nombre de usuario está reservado para el superusuario.' };
  }
  const users = getUsers();
  if (users.find(u => u.username.toLowerCase() === trimmedUsername.toLowerCase())) {
    return { success: false, message: 'El nombre de usuario ya existe.' };
  }
  const passwordValidation = validatePassword(passwordAttempt);
  if (!passwordValidation.isValid) {
      return { success: false, message: `Contraseña inválida: ${passwordValidation.message}` };
  }

  const newUser: User = {
    id: Date.now().toString() + Math.random().toString(36).substring(2,7),
    username: trimmedUsername,
    passwordHash: passwordAttempt,
    email: email || '', // Email is optional for admin-created accounts
    isApprovedByAdmin: true, // Approved by default when created by an admin
  };

  saveUsers([...users, newUser]);
  return { success: true, message: 'Cuenta de autenticación creada.', user: newUser };
};


// Renamed from original registerUser to be more specific
const internalCreateAuthUserAccount = (
  usernameInput: string,
  passwordAttempt: string,
  emailInput: string
): { success: boolean; message: string; userId?: string; } => {
  const superuserCreds = getSuperuserCredentials();
  const trimmedUsernameInput = usernameInput.trim();
  const trimmedEmailInput = emailInput.trim().toLowerCase();

  if (superuserCreds && trimmedUsernameInput.toLowerCase() === superuserCreds.username.toLowerCase()) {
    return { success: false, message: 'Este nombre de usuario está reservado para el superusuario.' };
  }

  const users = getUsers();
  if (users.find(u => u.username.toLowerCase() === trimmedUsernameInput.toLowerCase())) {
    return { success: false, message: 'El nombre de usuario ya existe.' };
  }
  if (users.find(u => u.email.toLowerCase() === trimmedEmailInput)) {
    return { success: false, message: 'El correo electrónico ya está registrado.' };
  }
  
  const passwordValidation = validatePassword(passwordAttempt);
  if (!passwordValidation.isValid) {
      return { success: false, message: passwordValidation.message };
  }

  if (!/\S+@\S+\.\S+/.test(trimmedEmailInput)) {
    return { success: false, message: 'El formato del correo electrónico no es válido.' };
  }

  const newUser: User = {
    id: Date.now().toString() + Math.random().toString(36).substring(2,7),
    username: trimmedUsernameInput,
    passwordHash: passwordAttempt, // En una app real, hashear la contraseña aquí
    email: trimmedEmailInput,
    isApprovedByAdmin: false, // Nueva cuenta pendiente de aprobación
  };
  saveUsers([...users, newUser]);
  
  // No se envía correo de verificación aquí, se notificará al usuario de la espera
  simulateSendEmail(
    newUser.email,
    'Tu cuenta está pendiente de aprobación - CondoAccess App',
    `Hola ${newUser.username},\n\nTu registro ha sido recibido y está pendiente de aprobación por la administración.\nRecibirás una notificación cuando tu cuenta sea activada.\n\nGracias,\nEl equipo de CondoAccess App`,
    'account_pending_approval'
  );

  return { 
    success: true, 
    message: 'Cuenta de autenticación creada y pendiente de aprobación.', 
    userId: newUser.id,
  };
};


export const registerUserWithDetailedProfile = (
  authData: { username: string, passwordAttempt: string, email: string },
  profileData: Omit<DirectoryUser, 'id' | 'createdAt' | 'updatedAt' | 'authUserId' | 'email'>
): { success: boolean; message: string; authUserId?: string; userEmail?: string; } => {
  
  const authResult = internalCreateAuthUserAccount(authData.username, authData.passwordAttempt, authData.email);

  if (!authResult.success || !authResult.userId) {
    return { success: false, message: authResult.message || "Error al crear la cuenta de autenticación." };
  }

  const directoryProfileData: Omit<DirectoryUser, 'id' | 'createdAt' | 'updatedAt'> = {
    ...profileData,
    authUserId: authResult.userId,
    email: authData.email.trim().toLowerCase(),
  };

  try {
    addDirectoryUserProfile(directoryProfileData);
  } catch (e) {
    let users = getUsers();
    users = users.filter(u => u.id !== authResult.userId);
    saveUsers(users);
    console.error("Error creating directory profile, auth user rolled back:", e);
    return { success: false, message: "Error al guardar el perfil del directorio. Se ha cancelado el registro." };
  }

  return { 
    success: true, 
    message: '¡Registro enviado! Tu cuenta está pendiente de aprobación por la administración. Serás notificado una vez que esté activa.', 
    authUserId: authResult.userId,
    userEmail: authData.email.trim().toLowerCase(),
  };
};

export const loginUser = (usernameInput: string, passwordAttempt: string): { success: boolean; message: string; user?: SessionUser } => {
  const superuserCreds = getSuperuserCredentials(); 
  const trimmedUsernameInput = usernameInput.trim();
  const trimmedPasswordAttempt = passwordAttempt.trim(); 

  if (superuserCreds) {
    if (trimmedUsernameInput.toLowerCase() === superuserCreds.username.toLowerCase()) {
      if (trimmedPasswordAttempt === superuserCreds.passwordHash) { 
        const superuserSessionData: SessionUser = { 
          id: SUPERUSER_ID_FOR_SESSION, 
          username: superuserCreds.username,
          isApprovedByAdmin: true,
          role: 'Superuser'
        };
        localStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(superuserSessionData));
        return { success: true, message: 'Inicio de sesión de superusuario exitoso.', user: superuserSessionData };
      } else {
        return { success: false, message: 'Contraseña de superusuario incorrecta.' };
      }
    }
  }

  const users = getUsers();
  const user = users.find(u => u.username.toLowerCase() === trimmedUsernameInput.toLowerCase());

  if (!user) {
    return { success: false, message: 'Usuario no encontrado.' };
  }
  if (user.passwordHash !== passwordAttempt) { 
    return { success: false, message: 'Contraseña incorrecta.' };
  }

  if (!user.isApprovedByAdmin) {
    return { success: false, message: 'Esta cuenta está pendiente de aprobación por la administración. No puedes iniciar sesión aún.' };
  }

  const directoryProfile = findDirectoryUserByAuthId(user.id);

  const userSessionData: SessionUser = { 
    id: user.id, 
    username: user.username,
    isApprovedByAdmin: user.isApprovedByAdmin,
    role: directoryProfile?.role || 'Habitante'
  };
  localStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(userSessionData));
  return { success: true, message: 'Inicio de sesión exitoso.', user: userSessionData };
};

export const logoutUser = (): void => {
  localStorage.removeItem(CURRENT_USER_SESSION_KEY);
};

export const getCurrentUser = (): SessionUser | null => {
  const userJson = localStorage.getItem(CURRENT_USER_SESSION_KEY);
  if (!userJson) {
    return null;
  }

  const sessionUser = JSON.parse(userJson) as SessionUser;

  // Si es superusuario, la sesión es válida tal cual.
  if (sessionUser.id === SUPERUSER_ID_FOR_SESSION) {
    return sessionUser;
  }

  // Para usuarios regulares, verificar contra la lista maestra de usuarios.
  const allUsers = getUsers();
  const actualUser = allUsers.find(u => u.id === sessionUser.id);

  if (!actualUser || !actualUser.isApprovedByAdmin) {
    // Si el usuario no existe o ya no está aprobado, invalidar la sesión.
    logoutUser(); // Elimina CURRENT_USER_SESSION_KEY
    return null;
  }
  
  return sessionUser; 
};


export const verifyPassword = (usernameToVerify: string, passwordAttempt: string): boolean => {
  const superuserCreds = getSuperuserCredentials();
  const trimmedPasswordAttempt = passwordAttempt.trim();

  if (superuserCreds && usernameToVerify.toLowerCase() === superuserCreds.username.toLowerCase()) {
    return trimmedPasswordAttempt === superuserCreds.passwordHash;
  }

  const users = getUsers();
  const user = users.find(u => u.username.toLowerCase() === usernameToVerify.toLowerCase());

  if (!user) {
    return false;
  }

  return user.passwordHash === passwordAttempt;
};

// --- Password Recovery ---

export const requestPasswordReset = (email: string): { success: boolean; message: string } => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());

    if (userIndex === -1) {
        // Don't reveal if email exists for security, but for this app it's fine.
        return { success: false, message: 'Si existe una cuenta con este correo, se ha enviado un enlace de recuperación.' };
    }

    const token = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2)}`;
    const expires = Date.now() + 3600000; // 1 hour expiry

    users[userIndex].passwordResetToken = token;
    users[userIndex].passwordResetTokenExpires = expires;
    saveUsers(users);
    
    const user = users[userIndex];
    simulateSendEmail(
        user.email,
        'Recuperación de Contraseña - CondoAccess App',
        `Hola ${user.username},\n\nHas solicitado restablecer tu contraseña.\nUsa el siguiente token para continuar. Expira en 1 hora.\n\nToken: ${token}\n\nSi no solicitaste esto, ignora este mensaje.`,
        'password_reset'
    );
    
    return { success: true, message: 'Si existe una cuenta con este correo, se ha enviado un enlace de recuperación.' };
};

export const resetPassword = (token: string, newPassword: string): { success: boolean; message: string } => {
    if (!token.trim()) {
        return { success: false, message: 'El token no puede estar vacío.' };
    }
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
        return { success: false, message: passwordValidation.message };
    }

    const users = getUsers();
    const userIndex = users.findIndex(u => u.passwordResetToken === token);

    if (userIndex === -1) {
        return { success: false, message: 'Token inválido o no encontrado.' };
    }

    const user = users[userIndex];
    if (user.passwordResetTokenExpires && user.passwordResetTokenExpires < Date.now()) {
        users[userIndex].passwordResetToken = undefined;
        users[userIndex].passwordResetTokenExpires = undefined;
        saveUsers(users);
        return { success: false, message: 'El token ha expirado. Por favor, solicita uno nuevo.' };
    }

    users[userIndex].passwordHash = newPassword;
    users[userIndex].passwordResetToken = undefined;
    users[userIndex].passwordResetTokenExpires = undefined;
    saveUsers(users);

    simulateSendEmail(
        user.email,
        'Tu contraseña ha sido restablecida - CondoAccess App',
        `Hola ${user.username},\n\nTu contraseña ha sido restablecida exitosamente. Ahora puedes iniciar sesión con tu nueva contraseña.`,
        'password_changed'
    );

    return { success: true, message: 'Contraseña restablecida exitosamente. Ahora puedes iniciar sesión.' };
};


// --- Funciones de Administración de Cuentas ---
export const approveUserAccount = (authUserId: string): { success: boolean; message: string } => {
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === authUserId);

  if (userIndex === -1) {
    return { success: false, message: 'Usuario de autenticación no encontrado.' };
  }

  const user = users[userIndex];
  if (user.isApprovedByAdmin) {
    return { success: false, message: 'La cuenta ya está aprobada.' };
  }

  users[userIndex] = { ...user, isApprovedByAdmin: true };
  saveUsers(users);

  simulateSendEmail(
    user.email,
    '¡Tu cuenta ha sido aprobada! - CondoAccess App',
    `Hola ${user.username},\n\nTu cuenta en CondoAccess App ha sido aprobada por la administración. ¡Ya puedes iniciar sesión!\n\nGracias,\nEl equipo de CondoAccess App`,
    'account_approved'
  );
  
  const directoryProfile = findDirectoryUserByAuthId(authUserId);
  if (directoryProfile) {
    sendWhatsappAccountApproval(directoryProfile);
  }

  return { success: true, message: `Cuenta de ${user.username} aprobada.` };
};

export const disableUserAccount = (authUserId: string): { success: boolean; message: string } => {
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === authUserId);

  if (userIndex === -1) {
    return { success: false, message: 'Usuario de autenticación no encontrado.' };
  }

  const user = users[userIndex];
  if (!user.isApprovedByAdmin) {
    return { success: false, message: 'La cuenta ya está deshabilitada (o pendiente de aprobación inicial).' };
  }
   if (user.id === SUPERUSER_ID_FOR_SESSION){ // Prevent disabling superuser
      return { success: false, message: 'No se puede deshabilitar la cuenta del superusuario.' };
  }


  users[userIndex] = { ...user, isApprovedByAdmin: false };
  saveUsers(users);

  simulateSendEmail(
    user.email,
    'Tu cuenta ha sido deshabilitada - CondoAccess App',
    `Hola ${user.username},\n\nTu cuenta en CondoAccess App ha sido deshabilitada por la administración. Contacta con ellos si crees que es un error.\n\nGracias,\nEl equipo de CondoAccess App`,
    'account_disabled'
  );
  return { success: true, message: `Cuenta de ${user.username} deshabilitada.` };
};