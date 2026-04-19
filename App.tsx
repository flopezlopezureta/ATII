import React, { useState, useEffect, useCallback, useMemo } from 'react';
import EntryList from './components/EntryList.tsx';
import LoginScreen from './components/Auth/LoginScreen.tsx';
import RegisterScreen from './components/Auth/RegisterScreen.tsx';
import ForgotPasswordScreen from './components/Auth/ForgotPasswordScreen.tsx';
import ResetPasswordScreen from './components/Auth/ResetPasswordScreen.tsx';
import SettingsScreen from './components/SettingsScreen.tsx';
import SuperuserSetupScreen from './components/Auth/SuperuserSetupScreen.tsx';
import QuickAccessForm from './components/QuickAccessForm.tsx';
import UserDirectoryScreen from './components/UserDirectoryScreen.tsx';
import InvitationsScreen from './components/InvitationsScreen.tsx';
import NotificationsScreen from './components/NotificationsScreen.tsx';
import ProfilesScreen from './components/ProfilesScreen.tsx';
import VisitorAuthorizationScreen from './components/VisitorAuthorizationScreen.tsx';
import ParkingScreen from './components/ParkingScreen.tsx';
import VisitRegistrationScreen from './components/VisitRegistrationScreen.tsx';
import { View, CondominiumEntry, AuthView, SessionUser, EntryType, PersonEntry, VehicleEntry, AppSettings, Notification, NotificationStatus, DirectoryUser } from './types.ts';
import { getEntries as getEntriesFromStorage, clearEntries as clearEntriesFromStorage } from './services/storageService.ts';
import { getCurrentUser, logoutUser, isSuperuserConfigured, SUPERUSER_ID_FOR_SESSION } from './services/authService.ts';
import { getAppSettings, saveAppSettings } from './services/settingsService.ts';
import { getNotifications } from './services/notificationService.ts';
import { findDirectoryUserByAuthId } from './services/directoryService.ts';
import UserIcon from './components/icons/UserIcon.tsx';
import SettingsIcon from './components/icons/SettingsIcon.tsx';
import BoltIcon from './components/icons/BoltIcon.tsx';
import AddressBookIcon from './components/icons/AddressBookIcon.tsx';
import TicketIcon from './components/icons/TicketIcon.tsx';
import BellIcon from './components/icons/BellIcon.tsx';
import AppLogoIcon from './components/icons/AppLogoIcon.tsx';
import ListBulletIcon from './components/icons/ListBulletIcon.tsx';
import LogoutIcon from './components/icons/LogoutIcon.tsx';
import HamburgerIcon from './components/icons/HamburgerIcon.tsx';
import CloseIcon from './components/icons/CloseIcon.tsx';
import ShieldCheckIcon from './components/icons/ShieldCheckIcon.tsx';
import ClipboardDocumentCheckIcon from './components/icons/ClipboardDocumentCheckIcon.tsx';
import ParkingIcon from './components/icons/ParkingIcon.tsx';
import UserPlusIcon from './components/icons/UserPlusIcon.tsx';


const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [authView, setAuthView] = useState<AuthView>(AuthView.LOGIN);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [needsSuperuserSetup, setNeedsSuperuserSetup] = useState(false); 

  const [currentView, setCurrentView] = useState<View>(View.VIEW_ENTRIES); // Default to View Entries
  const [entries, setEntries] = useState<CondominiumEntry[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [appSettings, setAppSettings] = useState<AppSettings>(getAppSettings()); // Initialize with defaults
  const [invitationIdToProcess, setInvitationIdToProcess] = useState<string | null>(null);
  const [initialVisitType, setInitialVisitType] = useState<'person' | 'vehicle'>('person');


  const userDirectoryProfile = useMemo(() => currentUser ? findDirectoryUserByAuthId(currentUser.id) : null, [currentUser]);
  const isCurrentUserSuperuser = currentUser?.id === SUPERUSER_ID_FOR_SESSION;
  
  // Combine superuser status with directory profile for a complete permission set
  const activeUser: (DirectoryUser & { isSuperuser?: boolean }) | null = useMemo(() => {
    if (isCurrentUserSuperuser) {
      return {
        id: SUPERUSER_ID_FOR_SESSION,
        name: currentUser?.username || 'Superuser',
        role: 'Superuser',
        permissions: { authorizePeople: true, authorizeVehicles: true, sendNotifications: true, manageDirectory: true, authorizeInvitations: true },
        isSuperuser: true,
        // Fill with default values for other DirectoryUser properties
        vehicles: [],
        occupants: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    return userDirectoryProfile;
  }, [currentUser, userDirectoryProfile, isCurrentUserSuperuser]);


  const checkAuth = useCallback(() => {
      setIsLoadingAuth(true);
      setNeedsSuperuserSetup(!isSuperuserConfigured()); 

      const user = getCurrentUser();
      setCurrentUser(user);
      const currentSettings = getAppSettings(); 
      setAppSettings(currentSettings);
      
      if (user) {
          const profile = findDirectoryUserByAuthId(user.id);
          if (user.id === SUPERUSER_ID_FOR_SESSION || profile?.permissions?.authorizePeople) {
              setCurrentView(View.VIEW_ENTRIES);
          } else {
              setCurrentView(View.INVITATIONS);
          }
      }
      setIsLoadingAuth(false);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  
  const fetchAllData = useCallback(() => {
    if (currentUser) {
      setEntries(getEntriesFromStorage());
      setNotifications(getNotifications());
    }
  }, [currentUser]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleSuperuserSetupComplete = () => {
    setNeedsSuperuserSetup(false);
    setAuthView(AuthView.LOGIN); 
  };

  const handleLoginSuccess = () => {
    checkAuth();
    fetchAllData();
  };
  
  const handleDirectoryOrUsersUpdated = () => {
    checkAuth();
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setEntries([]);
    setNotifications([]);
    setAuthView(AuthView.LOGIN);
    setIsSidebarOpen(false); 
  };

  const handleEntryAdded = (newEntries: CondominiumEntry[]) => {
    setEntries(newEntries);
  };
  
  const handleEntriesUpdated = () => {
    fetchAllData();
  };
  
  const handleNotificationsUpdated = () => {
    setNotifications(getNotifications());
  };

  const handleClearAllEntries = () => {
    const remainingEntries = clearEntriesFromStorage();
    setEntries(remainingEntries);
  };
  
  const handleSettingsSaved = (newSettings: AppSettings) => {
    setAppSettings(newSettings);
    if (newSettings.condominiumName && newSettings.condominiumName !== "ATLÁNTICO II" &&
        currentView === View.SETTINGS && 
        isCurrentUserSuperuser
    ) {
        setCurrentView(View.VIEW_ENTRIES);
    }
  };

  const handleProcessInvitation = (invitationId: string, type: 'person' | 'vehicle') => {
    setInvitationIdToProcess(invitationId);
    setInitialVisitType(type);
    setCurrentView(View.REGISTER_VISIT);
  };

  const handleInvitationProcessed = useCallback(() => {
    setInvitationIdToProcess(null);
  }, []);

  const condominiumNameIsEffectivelySet = appSettings.condominiumName && appSettings.condominiumName !== "ATLÁNTICO II";

  const escapeCsvField = (field: string | undefined | null): string => {
    if (field === undefined || field === null) return '""';
    const stringField = String(field);
    const escapedField = stringField.replace(/"/g, '""');
    return `"${escapedField}"`;
  };

  const formatEntriesForEmail = useCallback((currentEntries: CondominiumEntry[], settings: AppSettings): string => {
    if (!currentEntries.length) return "No hay registros para generar en CSV.";
    const headers = ["Tipo", "Fecha", "Hora", "Nombre", "Documento ID", "Apartamento/Unidad", "Placa Patente", "Nombre del Conductor", "Estacionamiento", "Autorizado Por", "ID Invitacion"];
    const csvRows: string[] = [headers.map(escapeCsvField).join(',')];
    currentEntries.forEach(entry => {
      const date = new Date(entry.timestamp);
      const formattedDate = date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const formattedTime = date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      let rowValues: (string | undefined)[] = [];
      if (entry.type === EntryType.PERSON) {
        const p = entry as PersonEntry;
        rowValues = ["Persona", formattedDate, formattedTime, p.name, p.idDocument, p.apartment, undefined, undefined, undefined, p.authorizedBy, p.invitationId];
      } else if (entry.type === EntryType.VEHICLE) {
        const v = entry as VehicleEntry;
        rowValues = ["Vehículo", formattedDate, formattedTime, undefined, undefined, undefined, v.licensePlate, v.driverName, v.parkingSpot, v.authorizedBy, v.invitationId];
      }
      csvRows.push(rowValues.map(field => escapeCsvField(field)).join(','));
    });
    return csvRows.join('\n');
  }, []);

  const triggerEmailClient = useCallback((recipient: string | undefined, sender: string | undefined, subject: string, body: string, isAutoSend: boolean) => {
    const mailtoRecipient = recipient ? encodeURIComponent(recipient) : '';
    let mailtoLink = `mailto:${mailtoRecipient}?subject=${encodeURIComponent(subject)}`;
    if (sender) mailtoLink += `&from=${encodeURIComponent(sender)}`; 
    mailtoLink += `&body=${encodeURIComponent(body)}`;
    const mailWindow = window.open(mailtoLink, '_blank');
    if (!mailWindow && !isAutoSend) {
        alert("No se pudo abrir su cliente de correo. Copie los datos y guárdelos manualmente en un archivo .csv:\n\n" + body);
    }
    return !!mailWindow;
  }, []);

  useEffect(() => {
    if (!appSettings.recipientEmail || !appSettings.sendIntervalHours || appSettings.sendIntervalHours <= 0 || !appSettings.condominiumName) return;
    const checkAndSendEmail = () => {
      const now = Date.now();
      const intervalMs = appSettings.sendIntervalHours * 60 * 60 * 1000;
      const lastSent = appSettings.lastSentTimestamp || 0;
      if (now - lastSent >= intervalMs && entries.length > 0) {
        const emailBody = formatEntriesForEmail(entries, appSettings);
        const subjectDate = new Date().toLocaleDateString('es-CL', { year: 'numeric', month: '2-digit', day: '2-digit' });
        const subject = `[Automático] Reporte CSV Ingresos ${appSettings.condominiumName} - ${subjectDate}`;
        if (triggerEmailClient(appSettings.recipientEmail, appSettings.senderEmail, subject, emailBody, true)) {
          const updatedSettings = { ...appSettings, lastSentTimestamp: now };
          saveAppSettings(updatedSettings);
          setAppSettings(updatedSettings);
        }
      }
    };
    const timerId = setInterval(checkAndSendEmail, 60 * 1000 * 5);
    return () => clearInterval(timerId);
  }, [appSettings, entries, formatEntriesForEmail, triggerEmailClient]);

  const handleSendManualEmailReport = (): { success: boolean; message: string } => {
    if (!appSettings.recipientEmail) return { success: false, message: "Configure un correo destinatario en los ajustes." };
    if (entries.length === 0) return { success: false, message: "No hay registros para enviar." };
    const emailBody = formatEntriesForEmail(entries, appSettings);
    const subjectDate = new Date().toLocaleDateString('es-CL');
    const subject = `Reporte CSV de Ingresos ${appSettings.condominiumName} - ${subjectDate}`;
    if (triggerEmailClient(appSettings.recipientEmail, appSettings.senderEmail, subject, emailBody, false)) {
      return { success: true, message: "Abriendo cliente de correo..." };
    }
    return { success: false, message: "No se pudo abrir su cliente de correo." };
  };

  const renderMainAppView = () => {
    switch (currentView) {
      case View.SETTINGS:
        return <SettingsScreen 
          onSettingsSaved={handleSettingsSaved} onSendManualReport={handleSendManualEmailReport}
          entryCount={entries.length} currentGlobalSettings={appSettings}
          isCurrentUserSuperuser={isCurrentUserSuperuser} onClearEntries={handleClearAllEntries}
          currentUser={currentUser} notifications={notifications} onNotificationsUpdated={handleNotificationsUpdated}
        />;
      case View.REGISTER_VISIT: 
        return <VisitRegistrationScreen 
            entries={entries}
            onEntryAdded={handleEntryAdded} 
            currentUser={currentUser!} 
            appSettings={appSettings} 
            userProfile={activeUser} 
            invitationIdToProcess={invitationIdToProcess} 
            onInvitationProcessed={handleInvitationProcessed}
            initialVisitType={initialVisitType}
        />;
      case View.QUICK_ACCESS: return <QuickAccessForm onEntryAdded={handleEntryAdded} />;
      case View.USER_DIRECTORY: return <UserDirectoryScreen />;
      case View.INVITATIONS: return <InvitationsScreen currentUser={currentUser!} />;
      case View.NOTIFICATIONS: return <NotificationsScreen currentUser={currentUser!} onNotificationsUpdated={handleNotificationsUpdated}/>;
      case View.PROFILES: return <ProfilesScreen onUsersUpdated={handleDirectoryOrUsersUpdated} />;
      case View.VISITOR_AUTHORIZATION: return <VisitorAuthorizationScreen onProcessInvitation={handleProcessInvitation} />;
      case View.PARKING: return <ParkingScreen appSettings={appSettings} />;
      case View.VIEW_ENTRIES: default: return <EntryList entries={entries} currentUser={currentUser!} appSettings={appSettings} onEntriesUpdated={handleEntriesUpdated} userDirectoryProfile={activeUser} />;
    }
  };

  const NavButton: React.FC<{
    onClick: () => void; active?: boolean; children: React.ReactNode; icon?: React.ReactNode; disabled?: boolean; badgeCount?: number; title?: string;
  }> = ({ onClick, active, children, icon, disabled, badgeCount, title }) => (
    <button
      onClick={() => !disabled && (onClick(), setIsSidebarOpen(false))}
      className={`relative flex items-center space-x-3 w-full text-left px-3 py-3 rounded-md transition-all duration-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-opacity-75 ${
        disabled ? 'opacity-60 cursor-not-allowed text-sky-300' : 
        active ? 'bg-sky-700 text-white shadow-md' : 'text-sky-100 hover:bg-sky-700 focus:ring-sky-500'}`}
      aria-current={active ? "page" : undefined} title={title} disabled={disabled}
    >
      {icon}
      <span className="flex-1">{children}</span>
      {badgeCount && badgeCount > 0 && <span className="absolute top-1 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white text-xs">{badgeCount}</span>}
    </button>
  );

  if (isLoadingAuth) {
    return <div className="flex items-center justify-center min-h-screen"><p>Cargando...</p></div>;
  }
  if (needsSuperuserSetup) {
    return <SuperuserSetupScreen onSetupComplete={handleSuperuserSetupComplete} />;
  }
  if (!currentUser) {
    switch (authView) {
      case AuthView.REGISTER: return <RegisterScreen switchToLogin={() => setAuthView(AuthView.LOGIN)} />;
      case AuthView.FORGOT_PASSWORD: return <ForgotPasswordScreen switchToLogin={() => setAuthView(AuthView.LOGIN)} switchToReset={() => setAuthView(AuthView.RESET_PASSWORD)} />;
      case AuthView.RESET_PASSWORD: return <ResetPasswordScreen switchToLogin={() => setAuthView(AuthView.LOGIN)} />;
      default: return <LoginScreen onLoginSuccess={handleLoginSuccess} switchToRegister={() => setAuthView(AuthView.REGISTER)} switchToForgotPassword={() => setAuthView(AuthView.FORGOT_PASSWORD)} />;
    }
  }

  const currentViewTitle = {
    [View.REGISTER_VISIT]: "Registrar Visita",
    [View.QUICK_ACCESS]: "Acceso Rápido", [View.INVITATIONS]: "Generar Invitaciones",
    [View.VIEW_ENTRIES]: "Ver Registros de Ingreso", [View.USER_DIRECTORY]: "Directorio de Residentes",
    [View.NOTIFICATIONS]: "Notificar Entregas", [View.SETTINGS]: "Mi Perfil / Ajustes",
    [View.PROFILES]: "Gestión de Perfiles", [View.VISITOR_AUTHORIZATION]: "Autorizar Visitas",
    [View.PARKING]: "Estado de Estacionamientos",
  }[currentView] || appSettings.condominiumName;
  
  const pendingNotificationsCount = userDirectoryProfile 
    ? notifications.filter(n => n.recipientDirUserId === userDirectoryProfile.id && n.status === NotificationStatus.PENDING).length 
    : 0;

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <aside className={`fixed inset-y-0 left-0 z-30 flex flex-col w-64 bg-sky-800 text-white shadow-lg transform transition-transform md:translate-x-0 md:static ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-sky-700">
          <div className="flex items-center space-x-2"><AppLogoIcon className="text-white" /><span className="text-xl font-semibold">{appSettings.condominiumName}</span></div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-sky-200"><CloseIcon/></button>
        </div>
        <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
          {(activeUser?.permissions.authorizePeople || activeUser?.permissions.authorizeVehicles) && (
            <NavButton 
              onClick={() => {
                setCurrentView(View.REGISTER_VISIT);
                setInitialVisitType('person');
              }} 
              active={currentView === View.REGISTER_VISIT} 
              icon={<UserPlusIcon className="w-5 h-5"/>}
            >
              Registrar Visita
            </NavButton>
          )}
          {(activeUser?.permissions.authorizePeople || activeUser?.permissions.authorizeVehicles) && <NavButton onClick={() => setCurrentView(View.QUICK_ACCESS)} active={currentView === View.QUICK_ACCESS} icon={<BoltIcon className="w-5 h-5"/>}>Acceso Rápido</NavButton>}
          {(activeUser?.permissions.sendNotifications) && <NavButton onClick={() => setCurrentView(View.NOTIFICATIONS)} active={currentView === View.NOTIFICATIONS} icon={<BellIcon className="w-5 h-5"/>}>Notificaciones</NavButton>}
          <NavButton onClick={() => setCurrentView(View.INVITATIONS)} active={currentView === View.INVITATIONS} icon={<TicketIcon className="w-5 h-5"/>}>Invitaciones</NavButton>
          {(activeUser?.permissions.authorizeInvitations) && (
            <NavButton onClick={() => setCurrentView(View.VISITOR_AUTHORIZATION)} active={currentView === View.VISITOR_AUTHORIZATION} icon={<ClipboardDocumentCheckIcon className="w-5 h-5"/>}>Autorizar Visitas</NavButton>
          )}
          <NavButton onClick={() => setCurrentView(View.VIEW_ENTRIES)} active={currentView === View.VIEW_ENTRIES} icon={<ListBulletIcon className="w-5 h-5"/>}>Registros</NavButton>
          {(activeUser?.permissions.manageDirectory) && <NavButton onClick={() => setCurrentView(View.USER_DIRECTORY)} active={currentView === View.USER_DIRECTORY} icon={<AddressBookIcon className="w-5 h-5"/>}>Directorio</NavButton>}
          {(activeUser?.permissions.manageDirectory) && <NavButton onClick={() => setCurrentView(View.PARKING)} active={currentView === View.PARKING} icon={<ParkingIcon className="w-5 h-5"/>}>Estacionamientos</NavButton>}
          {(activeUser?.permissions.manageDirectory) && <NavButton onClick={() => setCurrentView(View.PROFILES)} active={currentView === View.PROFILES} icon={<ShieldCheckIcon className="w-5 h-5"/>}>Perfiles</NavButton>}
          
          <NavButton onClick={() => setCurrentView(View.SETTINGS)} active={currentView === View.SETTINGS} icon={isCurrentUserSuperuser ? <SettingsIcon className="w-5 h-5"/> : <UserIcon className="w-5 h-5"/>} badgeCount={!isCurrentUserSuperuser ? pendingNotificationsCount : 0}>
            {isCurrentUserSuperuser ? 'Ajustes' : 'Mi Perfil'}
          </NavButton>
        </nav>
        <div className="p-4 border-t border-sky-700">
          <div className="flex items-center space-x-2 mb-3"><UserIcon className="w-5 h-5"/><span className="text-sm truncate">{currentUser.username}</span></div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 bg-sky-700 hover:bg-red-600 rounded-md"><LogoutIcon/><span >Cerrar Sesión</span></button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-md md:shadow-none h-16 flex items-center justify-between px-4 sm:px-6 shrink-0">
          <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-slate-600"><HamburgerIcon/></button>
          <h2 className="text-xl font-semibold text-slate-700">{currentViewTitle}</h2>
          <div className="md:hidden w-8"></div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {currentUser && renderMainAppView()}
        </main>
      </div>
      {isSidebarOpen && <div className="fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
    </div>
  );
};

export default App;
