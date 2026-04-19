import { addDirectoryUser as addDirectoryUserProfile } from './directoryService.js';

const USERS_STORAGE_KEY = 'condominiumAppUsers';
const CURRENT_USER_SESSION_KEY = 'condominiumAppCurrentUser';
export const SUPERUSER_ID_FOR_SESSION = 'superuser-active-id';

const DEFAULT_SUPERUSER_USERNAME = "admin";
const DEFAULT_SUPERUSER_PASSWORD = "Dan15223."; // Contraseña por defecto

// --- Helper Functions ---
export const getUsers = () => { 
  const usersJson = localStorage.getItem(USERS_STORAGE_KEY);
  return usersJson ? JSON.parse(usersJson) : [];
};

const saveUsers = (users) => {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
};

export const simulateSendEmail = (to, subject, body, type) => {
  const emailContent = `
    --- SIMULACIÓN DE CORREO (${type}) ---
    Para: ${to}
    Asunto: ${subject}
    Cuerpo:
    ${body}
    ---------------------------------
  `;
  console.log(emailContent);
  alert(`SIMULACIÓN DE CORREO (${type}):\n\nAsunto: ${subject}\n\n(Revisa la consola para ver el contenido completo del correo simulado)`);
};


// --- Core Authentication Logic ---

export const isSuperuserConfigured = () => {
  return true; 
};

export const getSuperuserCredentials = () => {
  return { username: DEFAULT_SUPERUSER_USERNAME, passwordHash: DEFAULT_SUPERUSER_PASSWORD };
};

export const setSuperuserCredentials = (username, passwordAttempt) => {
  const trimmedUsername = username.trim();
  const trimmedPassword = passwordAttempt.trim();
  if (!trimmedUsername || !trimmedPassword) {
    return { success: false, message: 'El nombre de superusuario y la contraseña no pueden estar vacíos.' };
  }
  if (trimmedPassword.length < 6) {
      return { success: false, message: 'La contraseña del superusuario debe tener al menos 6 caracteres.' };
  }
  console.warn("setSuperuserCredentials fue llamado, pero las credenciales del superusuario están actualmente hardcodeadas.");
  return { success: true, message: 'Superusuario (hardcodeado) se mantiene. Esta función no tiene efecto práctico con la configuración actual.' };
};

const internalCreateAuthUserAccount = (usernameInput, passwordAttempt, emailInput) => {
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
  
  if (passwordAttempt.length < 6) {
    return { success: false, message: 'La contraseña debe tener al menos 6 caracteres.' };
  }
  if (!/\S+@\S+\.\S+/.test(trimmedEmailInput)) {
    return { success: false, message: 'El formato del correo electrónico no es válido.' };
  }

  const newUser = {
    id: Date.now().toString() + Math.random().toString(36).substring(2,7),
    username: trimmedUsernameInput,
    passwordHash: passwordAttempt, // En una app real, hashear la contraseña aquí
    email: trimmedEmailInput,
    isApprovedByAdmin: false, // Nueva cuenta pendiente de aprobación
  };
  saveUsers([...users, newUser]);
  
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

export const registerUserWithDetailedProfile = (authData, profileData) => {
  const authResult = internalCreateAuthUserAccount(authData.username, authData.passwordAttempt, authData.email);

  if (!authResult.success || !authResult.userId) {
    return { success: false, message: authResult.message || "Error al crear la cuenta de autenticación." };
  }

  const directoryProfileData = {
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

export const loginUser = (usernameInput, passwordAttempt) => {
  const superuserCreds = getSuperuserCredentials(); 
  const trimmedUsernameInput = usernameInput.trim();
  const trimmedPasswordAttempt = passwordAttempt.trim(); 

  if (superuserCreds) {
    if (trimmedUsernameInput.toLowerCase() === superuserCreds.username.toLowerCase()) {
      if (trimmedPasswordAttempt === superuserCreds.passwordHash) { 
        const superuserSessionData = { 
          id: SUPERUSER_ID_FOR_SESSION, 
          username: superuserCreds.username,
          isApprovedByAdmin: true // Superusuario siempre está aprobado
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

  const userSessionData = { 
    id: user.id, 
    username: user.username,
    isApprovedByAdmin: user.isApprovedByAdmin 
  };
  localStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(userSessionData));
  return { success: true, message: 'Inicio de sesión exitoso.', user: userSessionData };
};

export const logoutUser = () => {
  localStorage.removeItem(CURRENT_USER_SESSION_KEY);
};

export const getCurrentUser = () => {
  const userJson = localStorage.getItem(CURRENT_USER_SESSION_KEY);
  if (!userJson) {
    return null;
  }

  const sessionUser = JSON.parse(userJson);

  if (sessionUser.id === SUPERUSER_ID_FOR_SESSION) {
    return sessionUser;
  }

  const allUsers = getUsers();
  const actualUser = allUsers.find(u => u.id === sessionUser.id);

  if (!actualUser || !actualUser.isApprovedByAdmin) {
    logoutUser();
    return null;
  }
  
  return sessionUser; 
};

export const verifyPassword = (usernameToVerify, passwordAttempt) => {
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

export const approveUserAccount = (authUserId) => {
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
  return { success: true, message: `Cuenta de ${user.username} aprobada.` };
};

export const disableUserAccount = (authUserId) => {
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === authUserId);

  if (userIndex === -1) {
    return { success: false, message: 'Usuario de autenticación no encontrado.' };
  }

  const user = users[userIndex];
  if (!user.isApprovedByAdmin) {
    return { success: false, message: 'La cuenta ya está deshabilitada (o pendiente de aprobación inicial).' };
  }
   if (user.id === SUPERUSER_ID_FOR_SESSION || user.username.toLowerCase() === DEFAULT_SUPERUSER_USERNAME.toLowerCase()){
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
