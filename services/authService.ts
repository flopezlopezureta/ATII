import { User, SessionUser, DirectoryUser } from '../types.ts';

const CURRENT_USER_SESSION_KEY = 'condominiumAppCurrentUser';
export const SUPERUSER_ID_FOR_SESSION = 'superuser-active-id';

export const getUsers = async (): Promise<User[]> => {
  try {
    const res = await fetch('/api/auth/users');
    if (!res.ok) throw new Error('Error status: ' + res.status);
    return await res.json();
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};

export const isSuperuserConfigured = (): boolean => {
  return true;
};

export const registerUserWithDetailedProfile = async (
  authData: { username: string; passwordAttempt: string; email: string },
  profileData: Omit<DirectoryUser, 'id' | 'createdAt' | 'updatedAt' | 'authUserId' | 'email'>
): Promise<{ success: boolean; message: string; authUserId?: string; userEmail?: string }> => {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authData, profileData }),
    });
    if (!res.ok) throw new Error('Error status: ' + res.status);
    return await res.json();
  } catch (error) {
    console.error("Error during register:", error);
    return { success: false, message: "Error de conexión con el servidor." };
  }
};

export const loginUser = async (usernameInput: string, passwordAttempt: string): Promise<{ success: boolean; message: string; user?: SessionUser }> => {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameInput, password: passwordAttempt }),
    });
    const result = await res.json();
    if (result.success && result.user) {
      localStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(result.user));
    }
    return result;
  } catch (error) {
    console.error("Error during login:", error);
    return { success: false, message: "Error de conexión con el servidor." };
  }
};

export const logoutUser = (): void => {
  localStorage.removeItem(CURRENT_USER_SESSION_KEY);
};

export const getCurrentUser = (): SessionUser | null => {
  const userJson = localStorage.getItem(CURRENT_USER_SESSION_KEY);
  if (!userJson) return null;
  return JSON.parse(userJson) as SessionUser;
};

export const verifyPassword = async (usernameToVerify: string, passwordAttempt: string): Promise<boolean> => {
  const result = await loginUser(usernameToVerify, passwordAttempt);
  return result.success;
};

export const requestPasswordReset = async (email: string): Promise<{ success: boolean; message: string }> => {
  try {
    const res = await fetch('/api/auth/request-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return await res.json();
  } catch (error) {
    console.error("Error requesting reset:", error);
    return { success: false, message: "Error al enviar la solicitud." };
  }
};

export const resetPassword = async (token: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });
    return await res.json();
  } catch (error) {
    console.error("Error resetting password:", error);
    return { success: false, message: "Error al restablecer la contraseña." };
  }
};

export const approveUserAccount = async (authUserId: string): Promise<{ success: boolean; message: string }> => {
  try {
    const res = await fetch(`/api/auth/approve/${authUserId}`, {
      method: 'POST',
    });
    return await res.json();
  } catch (error) {
    console.error("Error approving account:", error);
    return { success: false, message: "Error de conexión al aprobar la cuenta." };
  }
};

export const disableUserAccount = async (authUserId: string): Promise<{ success: boolean; message: string }> => {
  try {
    const res = await fetch(`/api/auth/disable/${authUserId}`, {
      method: 'POST',
    });
    return await res.json();
  } catch (error) {
    console.error("Error disabling account:", error);
    return { success: false, message: "Error de conexión al deshabilitar la cuenta." };
  }
};

export const adminCreateAuthAccount = async (username: string, password: string, email?: string): Promise<{ success: boolean; message: string; user?: User }> => {
  try {
    const res = await fetch('/api/auth/admin-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email }),
    });
    return await res.json();
  } catch (error) {
    console.error("Error admin-creating account:", error);
    return { success: false, message: "Error al crear la cuenta." };
  }
};

export const adminUpdateUserPassword = async (authUserId: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
  try {
    const res = await fetch('/api/auth/update-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authUserId, newPassword }),
    });
    return await res.json();
  } catch (error) {
    console.error("Error admin-updating password:", error);
    return { success: false, message: "Error al actualizar la contraseña." };
  }
};

export const changeSuperuserPassword = async (username: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
  try {
    const res = await fetch('/api/auth/change-superuser-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, currentPassword, newPassword }),
    });
    return await res.json();
  } catch (error) {
    console.error("Error changing superuser password:", error);
    return { success: false, message: "Error al cambiar la contraseña." };
  }
};

// Functions below are placeholders for compilation compatibility, not used in async layout
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

export const setSuperuserCredentials = (username: string, password: string): { success: boolean; message: string } => {
  return { success: true, message: 'Superusuario configurado (Autoseed activo en backend).' };
};